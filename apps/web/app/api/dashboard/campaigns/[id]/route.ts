import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { hasPermission } from '@/lib/auth/permissions'

async function authorise(schoolId: string) {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 } as const
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!hasPermission(member.role, 'school.campaigns.view')) return { error: 'Forbidden', status: 403 } as const
    } catch {
      return { error: 'Forbidden', status: 403 } as const
    }
  }
  return {}
}

// GET /api/dashboard/campaigns/[id] — campaign detail + paginated recipient list
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })

  const auth = await authorise(schoolId)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const pageSize = 50

  const campaign = await prisma.campaign.findFirst({ where: { id, schoolId } })
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  const [recipients, recipientTotal] = await Promise.all([
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
  ])

  return NextResponse.json({ campaign, recipients, recipientTotal, page, pageSize })
}
