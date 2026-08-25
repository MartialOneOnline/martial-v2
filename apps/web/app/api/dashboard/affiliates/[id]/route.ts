import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { memberHasPermission } from '@/lib/auth/customRoles'
import { AffiliateStatus } from '@/lib/prisma-client/enums'

async function authorise() {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 }
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!await memberHasPermission(member, 'school.affiliates.manage')) return { error: 'Forbidden', status: 403 }
    } catch {
      return { error: 'Forbidden', status: 403 }
    }
  }
  return { schoolId }
}

const VALID_STATUSES: string[] = Object.values(AffiliateStatus)

// PATCH /api/dashboard/affiliates/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const body = await req.json().catch(() => ({}))

  const existing = await prisma.affiliate.findFirst({ where: { id, schoolId: auth.schoolId }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 })

  const data: Record<string, unknown> = {}

  if ('status' in body) {
    if (!VALID_STATUSES.includes(body.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    data.status = body.status
  }
  if ('name' in body) {
    if (typeof body.name !== 'string' || !body.name.trim()) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    data.name = body.name.trim()
  }
  if ('city' in body) {
    if (typeof body.city !== 'string' || !body.city.trim()) return NextResponse.json({ error: 'City cannot be empty' }, { status: 400 })
    data.city = body.city.trim()
  }
  if ('country' in body) {
    if (typeof body.country !== 'string' || !body.country.trim()) return NextResponse.json({ error: 'Country cannot be empty' }, { status: 400 })
    data.country = body.country.trim()
  }
  if ('contactName' in body) {
    if (typeof body.contactName !== 'string' || !body.contactName.trim()) return NextResponse.json({ error: 'Contact name cannot be empty' }, { status: 400 })
    data.contactName = body.contactName.trim()
  }
  if ('contactEmail' in body) {
    if (typeof body.contactEmail !== 'string' || !body.contactEmail.trim()) return NextResponse.json({ error: 'Contact email cannot be empty' }, { status: 400 })
    data.contactEmail = body.contactEmail.trim()
  }
  if ('notes' in body) data.notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null
  if ('studentCount' in body) {
    const n = Number(body.studentCount)
    if (!Number.isFinite(n) || n < 0) return NextResponse.json({ error: 'Invalid studentCount' }, { status: 400 })
    data.studentCount = Math.round(n)
  }

  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const affiliate = await prisma.affiliate.update({ where: { id }, data })
  return NextResponse.json({ affiliate })
}

// DELETE /api/dashboard/affiliates/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const existing = await prisma.affiliate.findFirst({ where: { id, schoolId: auth.schoolId }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 })

  await prisma.affiliate.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
