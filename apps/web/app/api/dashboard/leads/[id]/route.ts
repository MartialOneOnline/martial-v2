import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { hasPermission } from '@/lib/auth/permissions'

async function authorise() {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 }
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!hasPermission(member.role, 'school.leads.manage')) return { error: 'Forbidden', status: 403 }
    } catch {
      return { error: 'Forbidden', status: 403 }
    }
  }
  return { schoolId }
}

const VALID_STATUSES = ['NEW', 'CONTACTED', 'TRIAL_BOOKED', 'CONVERTED', 'LOST']

// PATCH /api/dashboard/leads/[id] — update status
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const { status } = await req.json()
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const existing = await prisma.lead.findFirst({ where: { id, schoolId: auth.schoolId }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const lead = await prisma.lead.update({ where: { id }, data: { status } })
  return NextResponse.json({ lead })
}

// DELETE /api/dashboard/leads/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const existing = await prisma.lead.findFirst({ where: { id, schoolId: auth.schoolId }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  await prisma.lead.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
