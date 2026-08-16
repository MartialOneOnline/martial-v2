import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { hasPermission } from '@/lib/auth/permissions'
import { LeadStatus, LeadSource } from '@/lib/prisma-client/enums'

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

const VALID_STATUSES: string[] = Object.values(LeadStatus)
const VALID_SOURCES: string[] = Object.values(LeadSource)

// GET /api/dashboard/leads/[id] — full detail for the drawer, including notes
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const lead = await prisma.lead.findFirst({
    where: { id, schoolId: auth.schoolId },
    include: {
      notes: { orderBy: { createdAt: 'desc' }, include: { author: { select: { name: true } } } },
      convertedUser: { select: { id: true, name: true } },
    },
  })
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  return NextResponse.json({ lead })
}

// PATCH /api/dashboard/leads/[id] — update status and/or profile fields
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const body = await req.json().catch(() => ({}))

  const existing = await prisma.lead.findFirst({ where: { id, schoolId: auth.schoolId }, select: { id: true, convertedAt: true } })
  if (!existing) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const data: Record<string, unknown> = {}

  if ('status' in body) {
    if (!VALID_STATUSES.includes(body.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    data.status = body.status
    // A manual convert (no linked membership) still deserves a timestamp for the timeline.
    if (body.status === LeadStatus.CONVERTED && !existing.convertedAt) data.convertedAt = new Date()
  }
  if ('name' in body) {
    if (typeof body.name !== 'string' || !body.name.trim()) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    data.name = body.name.trim()
  }
  if ('email' in body) data.email = typeof body.email === 'string' && body.email.trim() ? body.email.trim() : null
  if ('phone' in body) data.phone = typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim() : null
  if ('source' in body) {
    if (!VALID_SOURCES.includes(body.source)) return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
    data.source = body.source
  }

  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const lead = await prisma.lead.update({ where: { id }, data })
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
