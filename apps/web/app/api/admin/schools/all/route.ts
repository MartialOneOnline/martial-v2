import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guardSuperadmin } from '@/lib/auth/server'

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  STRIPE: 'Stripe',
  BANK_TRANSFER: 'Bank transfer',
  REVOLUT: 'Revolut',
}

export async function GET(req: NextRequest) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''
  const country = searchParams.get('country') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 20

  const where: Record<string, unknown> = {}

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (status) where.status = status
  if (country) where.country = country

  const [schools, total] = await Promise.all([
    prisma.school.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, name: true, slug: true, status: true, type: true, source: true,
        city: true, country: true, email: true, phone: true, claimedById: true,
        createdAt: true, updatedAt: true,
        stripePublishableKey: true, stripeSecretKey: true,
        revolutPublicKey: true, revolutSecretKey: true,
        defaultBookingSettings: true,
        _count: {
          select: {
            members: true,
            classes: { where: { isActive: true } },
            membershipPlans: true,
            waivers: true,
          },
        },
        subscription: { select: { status: true } },
      },
    }),
    prisma.school.count({ where }),
  ])

  const countries = await prisma.school.findMany({
    where: { country: { not: null } },
    select: { country: true },
    distinct: ['country'],
    orderBy: { country: 'asc' },
  })

  // "Staff" excludes STUDENT and the OWNER row every claimed school already
  // has — it only counts once someone has actually invited help. Grouped
  // separately since Prisma can't alias the same `members` relation twice
  // with different filters inside one `_count.select`.
  const staffCounts = await prisma.schoolMember.groupBy({
    by: ['schoolId'],
    where: {
      schoolId: { in: schools.map(s => s.id) },
      role: { in: ['ADMIN', 'MANAGER', 'INSTRUCTOR', 'ASSISTANT_INSTRUCTOR', 'RECEPTIONIST'] },
    },
    _count: true,
  })
  const staffCountBySchool = new Map(staffCounts.map(c => [c.schoolId, c._count]))

  // Setup completeness — mirrors the school-facing Getting Started checklist
  // (see /api/dashboard/stats) but adds staff + waivers, which that checklist
  // doesn't track, for a super-admin-facing view of what's still missing.
  // Each step carries the actual figure (count / method names), not just a
  // done flag, so the admin sees what the school entered, not just that they
  // entered something.
  const schoolsWithSetup = schools.map(s => {
    const acceptedMethods = (s.defaultBookingSettings as { acceptedMethods?: string[] } | null)?.acceptedMethods ?? []
    const stripeConnected = Boolean(s.stripePublishableKey && s.stripeSecretKey)
    const revolutConnected = Boolean(s.revolutPublicKey && s.revolutSecretKey)
    const methodLabels = new Set<string>()
    for (const m of acceptedMethods) methodLabels.add(PAYMENT_METHOD_LABELS[m] ?? m)
    if (stripeConnected) methodLabels.add('Stripe')
    if (revolutConnected) methodLabels.add('Revolut')

    const staffCount = staffCountBySchool.get(s.id) ?? 0

    const setup = {
      classes: { done: s._count.classes > 0, count: s._count.classes },
      memberships: { done: s._count.membershipPlans > 0, count: s._count.membershipPlans },
      payments: { done: methodLabels.size > 0, methods: Array.from(methodLabels) },
      staff: { done: staffCount > 0, count: staffCount },
      waivers: { done: s._count.waivers > 0, count: s._count.waivers },
    }
    const {
      stripePublishableKey: _sp, stripeSecretKey: _ss,
      revolutPublicKey: _rp, revolutSecretKey: _rs,
      defaultBookingSettings: _dbs,
      ...rest
    } = s
    return { ...rest, setup }
  })

  return NextResponse.json({
    schools: schoolsWithSetup,
    total,
    pages: Math.ceil(total / limit),
    countries: countries.map(c => c.country).filter(Boolean),
  })
}
