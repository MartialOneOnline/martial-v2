import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { memberHasPermission } from '@/lib/auth/customRoles'

// POST /api/dashboard/leads/[id]/notes — log a follow-up note on this lead
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })

  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!await memberHasPermission(member, 'school.leads.manage')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (!text) return NextResponse.json({ error: 'Note text is required' }, { status: 400 })

  const lead = await prisma.lead.findFirst({ where: { id, schoolId }, select: { id: true } })
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const note = await prisma.leadNote.create({
    data: { leadId: id, authorId: user.id, text },
    include: { author: { select: { name: true } } },
  })
  return NextResponse.json({ note })
}
