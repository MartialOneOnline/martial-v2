import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { memberHasPermission } from '@/lib/auth/customRoles'
import { monthKeyInTz, schoolTimeZone } from '@/lib/memberActivity'
import { cleanPhone, whatsappNumber } from '@/lib/phone'
import {
  compareFollowUp, funnelCounts, leadProgress, rate,
  type FollowUp, type LeadEvidence, type LeadProgress,
} from '@/lib/leads/funnel'

// Same permission as the Leads CRM page: the report lists prospects' contact details.
async function authorise() {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 }
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!await memberHasPermission(member, 'school.leads.view')) return { error: 'Forbidden', status: 403 }
    } catch {
      return { error: 'Forbidden', status: 403 }
    }
  }
  return { schoolId }
}

const PERIOD_DAYS: Record<string, number | null> = { '30d': 30, '90d': 90, '12m': 365, all: null }
const FOLLOW_UPS: FollowUp[] = ['NOT_CONTACTED', 'UPCOMING_TRIAL', 'NO_SHOW', 'TRIED_NOT_JOINED']

// GET /api/dashboard/reports/leads?period=30d|90d|12m|all&includeInvites=1
// Leads created in the period: funnel, by source, by month and the
// follow-up lists ("not contacted", "no-show", "tried but didn't join"…).
// Staff invites (source INVITE) are existing students being onboarded, not
// prospects, so they're left out unless includeInvites=1.
export async function GET(req: NextRequest) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { schoolId } = auth

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') ?? '90d'
  const periodDays = period in PERIOD_DAYS ? PERIOD_DAYS[period]! : 90
  const includeInvites = searchParams.get('includeInvites') === '1'
  const now = new Date()
  const from = periodDays === null ? null : new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)

  const [school, leads] = await Promise.all([
    prisma.school.findUnique({ where: { id: schoolId }, select: { country: true } }),
    prisma.lead.findMany({
      where: {
        schoolId,
        ...(from ? { createdAt: { gte: from } } : {}),
        ...(includeInvites ? {} : { source: { not: 'INVITE' } }),
      },
      select: {
        id: true, name: true, email: true, phone: true, source: true, status: true,
        interestedIn: true, createdAt: true, convertedAt: true, convertedUserId: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])
  const tz = schoolTimeZone(school?.country)

  // ── Evidence: notes, matching users, their bookings and payments here ─────
  const leadIds = leads.map(l => l.id)
  const emails = [...new Set(leads.map(l => l.email?.trim().toLowerCase()).filter((e): e is string => !!e))]
  const [notes, users] = await Promise.all([
    leadIds.length
      ? prisma.leadNote.groupBy({ by: ['leadId'], where: { leadId: { in: leadIds } }, _count: { _all: true }, _max: { createdAt: true } })
      : Promise.resolve([]),
    emails.length
      ? prisma.$queryRaw<Array<{ id: string; email: string }>>`SELECT id, lower(email) AS email FROM "users" WHERE lower(email) = ANY(${emails}::text[])`
      : Promise.resolve([]),
  ])
  const notesBy = new Map(notes.map(n => [n.leadId, { count: n._count._all, last: n._max.createdAt }]))
  const userByEmail = new Map(users.map(u => [u.email, u.id]))
  const userOf = (l: (typeof leads)[number]) =>
    l.convertedUserId ?? (l.email ? userByEmail.get(l.email.trim().toLowerCase()) ?? null : null)
  const userIds = [...new Set(leads.map(userOf).filter((id): id is string => !!id))]

  const [bookings, payments, staff] = userIds.length ? await Promise.all([
    prisma.booking.findMany({
      where: { userId: { in: userIds }, class: { schoolId } },
      select: { userId: true, scheduledAt: true, status: true, attendedAt: true },
    }),
    // All dates: leadProgress() keeps only those from when each lead got in touch
    prisma.transaction.findMany({
      where: { schoolId, userId: { in: userIds }, type: 'INCOME', category: 'MEMBERSHIP', status: 'PAID', deletedAt: null },
      select: { userId: true, date: true },
    }),
    // Staff of this school (owner, instructors…) who show up as a lead — usually a test
    prisma.schoolMember.findMany({
      where: { schoolId, userId: { in: userIds }, role: { not: 'STUDENT' } },
      select: { userId: true },
    }),
  ]) : [[], [], []]
  const bookingsBy = new Map<string, LeadEvidence['bookings']>()
  for (const b of bookings) {
    const list = bookingsBy.get(b.userId) ?? []
    list.push({ scheduledAt: b.scheduledAt, status: b.status, attended: b.status === 'COMPLETED' || !!b.attendedAt })
    bookingsBy.set(b.userId, list)
  }
  const paidBy = new Map<string, Date[]>()
  for (const p of payments) {
    if (!p.userId) continue
    const list = paidBy.get(p.userId) ?? []
    list.push(p.date)
    paidBy.set(p.userId, list)
  }
  const staffIds = new Set(staff.map(m => m.userId))

  // ── Per lead (staff of the school are left out) ───────────────────────────
  const rows = leads.filter(l => { const u = userOf(l); return !u || !staffIds.has(u) }).map(l => {
    const userId = userOf(l)
    const n = notesBy.get(l.id)
    const progress: LeadProgress = leadProgress({
      id: l.id, status: l.status, createdAt: l.createdAt, convertedAt: l.convertedAt,
      notesCount: n?.count ?? 0, lastNoteAt: n?.last ?? null,
      bookings: userId ? bookingsBy.get(userId) ?? [] : [],
      payments: userId ? paidBy.get(userId) ?? [] : [],
    }, now)
    return { lead: l, userId, notesCount: n?.count ?? 0, progress }
  })

  const funnel = funnelCounts(rows.map(r => r.progress))
  const rates = {
    contacted: rate(funnel.contacted, funnel.total),
    trialBooked: rate(funnel.trialBooked, funnel.total),
    tried: rate(funnel.tried, funnel.total),
    joined: rate(funnel.joined, funnel.total),
    // Of those who came to try a class, how many joined — the "nudge" metric
    joinedOfTried: rate(funnel.triedAndJoined, funnel.tried),
  }

  const bySourceMap = new Map<string, LeadProgress[]>()
  for (const r of rows) {
    const list = bySourceMap.get(r.lead.source) ?? []
    list.push(r.progress)
    bySourceMap.set(r.lead.source, list)
  }
  const bySource = [...bySourceMap.entries()]
    .map(([source, list]) => { const c = funnelCounts(list); return { source, ...c, joinedRate: rate(c.joined, c.total) } })
    .sort((a, b) => b.total - a.total)

  // Leads created each month (school calendar) and how many of them joined
  const monthMap = new Map<string, LeadProgress[]>()
  for (const r of rows) {
    const k = monthKeyInTz(r.lead.createdAt, tz)
    const list = monthMap.get(k) ?? []
    list.push(r.progress)
    monthMap.set(k, list)
  }
  const monthly = [...monthMap.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, 12)
    .map(([month, list]) => { const c = funnelCounts(list); return { month, ...c, joinedRate: rate(c.joined, c.total) } })

  const followUps = Object.fromEntries(FOLLOW_UPS.map(kind => {
    const list = rows
      .filter(r => r.progress.followUps.includes(kind))
      .sort((a, b) => compareFollowUp(
        { followUpDays: a.progress.followUpDays, createdAt: a.lead.createdAt, upcomingAt: a.progress.upcomingAt },
        { followUpDays: b.progress.followUpDays, createdAt: b.lead.createdAt, upcomingAt: b.progress.upcomingAt },
        kind,
      ))
      .map(r => ({
        id: r.lead.id,
        name: r.lead.name,
        email: r.lead.email,
        phone: cleanPhone(r.lead.phone),
        whatsapp: whatsappNumber(r.lead.phone, school?.country),
        source: r.lead.source,
        status: r.lead.status,
        interestedIn: r.lead.interestedIn,
        createdAt: r.lead.createdAt.toISOString(),
        stage: r.progress.stage,
        followUpDays: r.progress.followUpDays,
        upcomingAt: r.progress.upcomingAt?.toISOString() ?? null,
        lastAttendedAt: r.progress.lastAttendedAt?.toISOString() ?? null,
        notesCount: r.notesCount,
      }))
    return [kind, list]
  })) as Record<FollowUp, unknown[]>

  return NextResponse.json({ period, includeInvites, funnel, rates, bySource, monthly, followUps })
}
