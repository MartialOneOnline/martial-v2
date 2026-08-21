import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import type { Permission } from '@/lib/auth/permissions'
import { memberHasPermission } from '@/lib/auth/customRoles'
import type { CampaignType } from '@/lib/prisma-client/enums'

async function authorise(schoolId: string, permission: Permission) {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 } as const
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!await memberHasPermission(member, permission)) return { error: 'Forbidden', status: 403 } as const
    } catch {
      return { error: 'Forbidden', status: 403 } as const
    }
  }
  return {}
}

const CAMPAIGN_TYPES = new Set(['REMINDER', 'DISCOUNT_OFFER', 'BELT_PROGRESS', 'SEASONAL', 'ANNIVERSARY', 'CUSTOM'])

// GET /api/dashboard/campaigns/[id] — campaign detail + paginated recipient list
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })

  const auth = await authorise(schoolId, 'school.campaigns.view')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const pageSize = 50

  const campaign = await prisma.campaign.findFirst({ where: { id, schoolId } })
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  const [recipients, recipientTotal, allRecipients] = await Promise.all([
    prisma.campaignRecipient.findMany({
      where: { campaignId: id },
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, status: true, sentAt: true, failedReason: true, convertedAt: true, statusAtSend: true,
        schoolMember: { select: { id: true, belt: true, user: { select: { name: true, email: true } } } },
      },
    }),
    prisma.campaignRecipient.count({ where: { campaignId: id } }),
    // Unpaginated — only member ids, used by the composer to restore the full
    // selection when editing a DRAFT campaign with more recipients than one page.
    prisma.campaignRecipient.findMany({ where: { campaignId: id }, select: { schoolMemberId: true } }),
  ])

  return NextResponse.json({
    campaign, recipients, recipientTotal, page, pageSize,
    recipientMemberIds: allRecipients.map(r => r.schoolMemberId),
  })
}

// PATCH /api/dashboard/campaigns/[id] — edit a campaign that hasn't been sent
// yet. Only DRAFT campaigns are editable: once a campaign has been queued,
// its recipients may already have emails in flight, so content/audience are
// frozen at that point (renaming isn't offered separately — there's no
// scenario here where content is locked but the internal label isn't).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })

  const auth = await authorise(schoolId, 'school.campaigns.manage')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const existing = await prisma.campaign.findFirst({ where: { id, schoolId }, select: { id: true, status: true } })
  if (!existing) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  if (existing.status !== 'DRAFT') return NextResponse.json({ error: 'Only draft campaigns can be edited' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const type = typeof body.type === 'string' && CAMPAIGN_TYPES.has(body.type) ? (body.type as CampaignType) : null
  const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const memberIds = body.memberIds

  if (!name || !type) return NextResponse.json({ error: 'name and a valid type are required' }, { status: 400 })
  if (!subject || !message) return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 })
  if (!Array.isArray(memberIds) || memberIds.length === 0 || !memberIds.every((mid: unknown) => typeof mid === 'string')) {
    return NextResponse.json({ error: 'memberIds must be a non-empty array of strings' }, { status: 400 })
  }

  const members = await prisma.schoolMember.findMany({
    where: { id: { in: memberIds }, schoolId },
    select: { id: true, status: true, user: { select: { email: true } } },
  })
  if (members.length === 0) return NextResponse.json({ error: 'No valid members in the selection' }, { status: 400 })

  await prisma.$transaction([
    prisma.campaignRecipient.deleteMany({ where: { campaignId: id } }),
    prisma.campaign.update({
      where: { id },
      data: {
        name, type, subject, bodyHtml: message,
        audienceFilter: { manual: true, count: members.length },
        totalRecipients: members.length,
        recipients: {
          createMany: {
            data: members.map(m => ({
              schoolMemberId: m.id,
              statusAtSend: m.status,
              status: m.user.email ? 'PENDING' : 'SKIPPED',
            })),
          },
        },
      },
    }),
  ])

  const skipped = members.filter(m => !m.user.email).length
  return NextResponse.json({ ok: true, totalRecipients: members.length, skipped })
}

// DELETE /api/dashboard/campaigns/[id] — remove a campaign and its recipient
// rows. Blocked only while actively SENDING, so a batch in flight can't have
// its recipient rows pulled out from under it.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })

  const auth = await authorise(schoolId, 'school.campaigns.manage')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const existing = await prisma.campaign.findFirst({ where: { id, schoolId }, select: { id: true, status: true } })
  if (!existing) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  if (existing.status === 'SENDING') return NextResponse.json({ error: 'Cannot delete a campaign while it is sending' }, { status: 400 })

  await prisma.campaign.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
