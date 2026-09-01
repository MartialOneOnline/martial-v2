import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { notifyPaymentReceived } from '@/lib/notifications/create'
import { applyPaidMembershipTransaction, revertMembershipForDeletedTransaction } from '@/lib/services/membership'
import { fmtPrice } from '@/lib/format'

// The Student Profile page renders the transaction list from a one-time SSR
// snapshot (see app/dashboard/users/[id]/page.tsx), so mutating a Transaction
// here leaves any already-fetched/prefetched copy of that page stale until
// its route cache is invalidated.
async function revalidateStudentProfile(schoolId: string, userId: string | null) {
  if (!userId) return
  const member = await prisma.schoolMember.findFirst({
    where: { userId, schoolId },
    select: { id: true },
  })
  if (member) revalidatePath(`/dashboard/users/${member.id}`)
}

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

    await revalidateStudentProfile(auth.schoolId, resolved.userId)

    return NextResponse.json({
      id: resolved.id,
      status: resolved.status,
      resolvedAt: resolved.resolvedAt,
      resolvedBy: resolved.resolvedBy,
      resolvedByName: resolved.resolvedByUser?.name ?? resolved.resolvedByUser?.email ?? null,
      resolutionNote: resolved.resolutionNote,
    })
  }

  // ── Edit a manually-entered mistake (wrong date/amount/method) ──────────
  // Deliberately separate from the status-transition branch below: this
  // never touches status, so it can't accidentally trigger the PAID
  // side-effects (notification, applyPaidMembershipTransaction) further
  // down. Blocked once the row is soft-deleted or REFUNDED — those stay
  // the frozen record.
  if (body.action === 'edit') {
    const tx = await prisma.transaction.findFirst({ where: { id, schoolId: auth.schoolId } })
    if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (tx.deletedAt) return NextResponse.json({ error: 'Cannot edit a deleted transaction' }, { status: 400 })
    if (tx.status === 'REFUNDED') {
      return NextResponse.json({ error: 'Refunded transactions cannot be edited' }, { status: 403 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {}

    if (body.date !== undefined) {
      const date = new Date(body.date)
      if (isNaN(date.getTime())) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
      data.date = date
    }
    if (body.amount !== undefined) {
      const amount = parseFloat(body.amount)
      if (!isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
      data.amount = amount
    }
    if (body.paymentMethod !== undefined) {
      const allowedMethods = ['STRIPE', 'CASH', 'BANK_TRANSFER', 'DIRECT_DEBIT', 'OTHER']
      if (body.paymentMethod !== null && !allowedMethods.includes(body.paymentMethod)) {
        return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 })
      }
      data.paymentMethod = body.paymentMethod
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const updated = await prisma.transaction.update({ where: { id }, data })
    await revalidateStudentProfile(auth.schoolId, tx.userId)

    return NextResponse.json({
      id: updated.id,
      date: updated.date.toISOString(),
      amount: Number(updated.amount),
      paymentMethod: updated.paymentMethod,
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
  if (tx.deletedAt) return NextResponse.json({ error: 'Cannot change status of a deleted transaction' }, { status: 400 })

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
    if (tx.membershipId) {
      await applyPaidMembershipTransaction({ transactionId: id, schoolId: auth.schoolId })
    }
  }

  await revalidateStudentProfile(auth.schoolId, tx.userId)

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
  if (tx.deletedAt) return NextResponse.json({ error: 'Already deleted' }, { status: 400 })

  // REFUNDED rows go through their own accounting workflow and stay put.
  if (tx.status === 'REFUNDED') {
    return NextResponse.json(
      { error: 'Refunded transactions cannot be deleted. Use the refund workflow instead.' },
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

  // Soft delete: keeps the row (and the audit stamp of who removed it) for
  // history while taking it out of every list/stat query, which all filter
  // on deletedAt: null (see GET /api/dashboard/transactions). If this was a
  // paid renewal that pushed the linked Membership's endDate forward, undo
  // that too — otherwise the membership stays "renewed" even though the
  // payment that justified it no longer exists.
  await prisma.$transaction(async (trx) => {
    await trx.transaction.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: auth.userId },
    })
    await revertMembershipForDeletedTransaction(trx, tx, auth.schoolId)
  })
  await revalidateStudentProfile(auth.schoolId, tx.userId)
  return NextResponse.json({ ok: true })
}
