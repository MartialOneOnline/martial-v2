import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { hasPermission } from '@/lib/auth/permissions'

// POST /api/dashboard/campaigns/[id]/queue — flips a DRAFT campaign to QUEUED
// so /process (and the safety-net cron) are allowed to start sending it.
// Kept as its own step rather than folding into PATCH so "save changes"
// (stay DRAFT) and "send" are always two distinct, explicit actions.
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
  const campaign = await prisma.campaign.findFirst({ where: { id, schoolId }, select: { id: true, status: true } })
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  if (campaign.status !== 'DRAFT') return NextResponse.json({ error: 'Only draft campaigns can be queued' }, { status: 400 })

  await prisma.campaign.update({ where: { id }, data: { status: 'QUEUED' } })
  return NextResponse.json({ ok: true })
}
