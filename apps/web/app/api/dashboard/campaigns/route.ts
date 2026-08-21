import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import type { Permission } from '@/lib/auth/permissions'
import { memberHasPermission } from '@/lib/auth/customRoles'
import type { CampaignType } from '@/lib/prisma-client/enums'

async function authorise(permission: Permission) {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 } as const
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 } as const
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!await memberHasPermission(member, permission)) return { error: 'Forbidden', status: 403 } as const
    } catch {
      return { error: 'Forbidden', status: 403 } as const
    }
  }
  return { schoolId, userId: user.id }
}

const CAMPAIGN_TYPES = new Set(['REMINDER', 'DISCOUNT_OFFER', 'BELT_PROGRESS', 'SEASONAL', 'ANNIVERSARY', 'CUSTOM'])

// POST /api/dashboard/campaigns — create a campaign + its recipient snapshot.
// Sending is a separate step: the composer calls /[id]/process right after this.
export async function POST(req: NextRequest) {
  const auth = await authorise('school.campaigns.manage')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await req.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const type = typeof body.type === 'string' && CAMPAIGN_TYPES.has(body.type) ? (body.type as CampaignType) : null
  const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const language = typeof body.language === 'string' ? body.language : 'en'
  const memberIds = body.memberIds
  const conversionWindowDays = Number.isInteger(body.conversionWindowDays) ? body.conversionWindowDays : 30
  const saveAsDraft = body.saveAsDraft === true

  if (!name || !type) return NextResponse.json({ error: 'name and a valid type are required' }, { status: 400 })
  if (!subject || !message) return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 })
  if (!Array.isArray(memberIds) || memberIds.length === 0 || !memberIds.every((id: unknown) => typeof id === 'string')) {
    return NextResponse.json({ error: 'memberIds must be a non-empty array of strings' }, { status: 400 })
  }

  const members = await prisma.schoolMember.findMany({
    where: { id: { in: memberIds }, schoolId: auth.schoolId },
    select: { id: true, status: true, user: { select: { email: true } } },
  })
  if (members.length === 0) return NextResponse.json({ error: 'No valid members in the selection' }, { status: 400 })

  const campaign = await prisma.campaign.create({
    data: {
      schoolId: auth.schoolId,
      name,
      type,
      status: saveAsDraft ? 'DRAFT' : 'QUEUED',
      subject,
      bodyHtml: message,
      language,
      audienceFilter: { manual: true, count: members.length },
      createdByUserId: auth.userId,
      conversionWindowDays,
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
    select: { id: true },
  })

  const skipped = members.filter(m => !m.user.email).length
  return NextResponse.json({ campaignId: campaign.id, totalRecipients: members.length, skipped })
}

// GET /api/dashboard/campaigns — paginated campaign history for the current school
export async function GET(req: NextRequest) {
  const auth = await authorise('school.campaigns.view')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const pageSize = 20

  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({
      where: { schoolId: auth.schoolId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, name: true, type: true, status: true,
        totalRecipients: true, sentCount: true, failedCount: true, convertedCount: true,
        createdAt: true, createdBy: { select: { name: true } },
      },
    }),
    prisma.campaign.count({ where: { schoolId: auth.schoolId } }),
  ])

  return NextResponse.json({ campaigns, total, page, pageSize })
}
