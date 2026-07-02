import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'

async function authorise(roles = ['OWNER', 'ADMIN']) {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 }
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!roles.includes(member.role)) return { error: 'Forbidden', status: 403 }
    } catch {
      return { error: 'Forbidden', status: 403 }
    }
  }
  return { user, schoolId }
}

// PUT /api/dashboard/membership-plans/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const existing = await prisma.membershipPlan.findFirst({ where: { id, schoolId: auth.schoolId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const {
    name, description, price, currency, planType, billingCycle,
    validityDays, isPublic, isPopular, isActive, sortOrder,
    classAccess, stripePriceId, imageUrl, paymentMethods,
  } = body

  const plan = await prisma.membershipPlan.update({
    where: { id },
    data: {
      name: name?.trim() ?? existing.name,
      description: description !== undefined ? (description?.trim() || null) : existing.description,
      price: price !== undefined && price !== '' ? Number(price) : existing.price,
      currency: currency ?? existing.currency,
      planType: planType ?? existing.planType,
      billingCycle: billingCycle ?? existing.billingCycle,
      validityDays: validityDays !== undefined ? (validityDays ? Number(validityDays) : null) : existing.validityDays,
      isPublic: isPublic ?? existing.isPublic,
      isPopular: isPopular ?? existing.isPopular,
      isActive: isActive ?? existing.isActive,
      sortOrder: sortOrder ?? existing.sortOrder,
      classAccess: classAccess !== undefined ? classAccess : existing.classAccess,
      stripePriceId: stripePriceId !== undefined ? (stripePriceId?.trim() || null) : existing.stripePriceId,
      imageUrl: imageUrl !== undefined ? (imageUrl?.trim() || null) : existing.imageUrl,
      paymentMethods: Array.isArray(paymentMethods) ? paymentMethods : existing.paymentMethods,
    },
  })

  return NextResponse.json(plan)
}

// DELETE /api/dashboard/membership-plans/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const existing = await prisma.membershipPlan.findFirst({ where: { id, schoolId: auth.schoolId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.membershipPlan.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
