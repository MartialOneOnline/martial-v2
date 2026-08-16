import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { hasPermission } from '@/lib/auth/permissions'
import { processPendingCampaignRecipients } from '@/lib/services/campaigns'

export const maxDuration = 60

// POST /api/dashboard/campaigns/[id]/process — send the next batch of PENDING
// recipients. The composer calls this repeatedly (polling) right after
// creating a campaign, showing a progress bar until `remaining` hits 0.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })

  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!hasPermission(member.role, 'school.campaigns.manage')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { id } = await params
  const campaign = await prisma.campaign.findFirst({ where: { id, schoolId }, select: { id: true } })
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  const result = await processPendingCampaignRecipients(id)
  return NextResponse.json(result)
}
