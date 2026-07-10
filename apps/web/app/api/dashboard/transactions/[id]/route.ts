import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { notifyPaymentReceived } from '@/lib/notifications/create'
import { fmtPrice } from '@/lib/format'

async function authorise() {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 }
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!['OWNER', 'ADMIN', 'MANAGER'].includes(member.role)) return { error: 'Forbidden', status: 403 }
    } catch {
      return { error: 'Forbidden', status: 403 }
    }
  }
  return { schoolId, userId: user.id }
}

// PATCH /api/dashboard/transactions/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const body = await req.json()

  // ── Resolve a FLAGGED transaction (manual review) ────────────────────────
  // Doesn't change status — FLAGGED stays FLAGGED, this only stamps
  // who/when/why so admins can tell resolved cases apart from ones still
  // pending review (see the "Needs review" tab, which filters to
  // resolvedAt IS NULL). No refund, no membership/booking reactivation
  // happens here — those remain manual actions the admin takes elsewhere
  // (Stripe/Revolut dashboard, or reactivating the SchoolMember and
  // granting access by hand); this just records that the case was handled.
  if (body.action === 'resolve') {
    const tx = await prisma.transaction.findFirst({ where: { id, schoolId: auth.schoolId } })
    if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (tx.status !== 'FLAGGED') {
      return NextResponse.json({ error: 'Only flagged transactions can be resolved' }, { status: 400 })
    }
    if (tx.resolvedAt) {
      return NextResponse.json({ error: 'Already resolved' }, { status: 400 })
    }

    const note = typeof body.note === 'string' ? (body.note.trim().slice(0, 2000) || null) : null

    const resolved = await prisma.transaction.update({
      where: { id },
      data: {
        resolvedAt: new Date(),
        resolvedBy: auth.userId,
        resolutionNote: note,
      },
      include: { resolvedByUser: { select: { name: true, email: true } } },
    })

    return NextResponse.json({
      id: resolved.id,
      status: resolved.status,
      resolvedAt: resolved.resolvedAt,
      resolvedBy: resolved.resolvedBy,
      resolvedByName: resolved.resolvedByUser?.name ?? resolved.resolvedByUser?.email ?? null,
      resolutionNote: resolved.resolutionNote,
    })
  }

  const { status } = body

  const allowed = ['PAID', 'PENDING', 'FAILED']
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  // TODO(phase-5-refunds): implement compensating transaction + membership void
  // before allowing REFUNDED status transitions.
  if (status === 'REFUNDED') {
    return NextResponse.json(
      { error: 'Refunds require Phase 5 accounting workflow.' },
      { status: 403 },
    )
  }

  const tx = await prisma.transaction.findFirst({
    where: { id, schoolId: auth.schoolId },
    include: { user: { select: { name: true } } },
  })
  if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.transaction.update({
    where: { id },
    data: { status },
  })

  if (status === 'PAID' && tx.status !== 'PAID') {
    notifyPaymentReceived(
      auth.schoolId,
      tx.user?.name ?? 'Alumno',
      fmtPrice(Number(tx.amount), tx.currency ?? 'EUR'),
      tx.description ?? 'pago',
    )
  }

  return NextResponse.json({ id: updated.id, status: updated.status })
}

// DELETE /api/dashboard/transactions/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params

  const tx = await prisma.transaction.findFirst({
    where: { id, schoolId: auth.schoolId },
  })
  if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // TODO(phase-5-audit-trail): replace hard delete with soft delete (deletedAt/deletedBy)
  // and restrict deletion to PENDING/FAILED only once audit trail is implemented.
  if (['PAID', 'REFUNDED'].includes(tx.status)) {
    return NextResponse.json(
      { error: 'Paid transactions cannot be deleted. Use Phase 5 refund workflow.' },
      { status: 403 },
    )
  }
  // FLAGGED rows are the auditable record of a payment captured for an
  // ARCHIVED member — deleting one would erase the trace of it, even after
  // it's been handled. Unconditional: resolving a FLAGGED transaction
  // (action=resolve above) never changes its status away from FLAGGED, by
  // design, specifically so this guard keeps blocking it too — a resolved
  // case is still history, not a candidate for deletion.
  if (tx.status === 'FLAGGED') {
    return NextResponse.json(
      { error: 'Flagged transactions cannot be deleted — mark it resolved instead once you\'ve handled it (refund or reactivation).' },
      { status: 403 },
    )
  }

  await prisma.transaction.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
