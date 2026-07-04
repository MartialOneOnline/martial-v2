import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyRevolutWebhook, getRevolutOrder } from '@/lib/revolut'
import { MembershipStatus } from '@/lib/prisma-client/client'
import { sendMembershipReceiptEmail } from '@/lib/email/sendEmails'

// POST /api/webhooks/revolut
// Each school registers this URL in their Revolut Merchant dashboard.
// We extract the schoolId from the order's merchant_order_ext_ref (= membershipId),
// load the school's revolutSecretKey + webhookSecret, verify signature, then act.
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signatureHeader = req.headers.get('Revolut-Signature') ?? ''

  let payload: { event: string; order_id: string }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const HANDLED = new Set(['ORDER_COMPLETED', 'ORDER_PAYMENT_DECLINED', 'ORDER_CANCELLED'])
  if (!HANDLED.has(payload.event)) return NextResponse.json({ received: true })

  // merchant_order_ext_ref = membershipId (set at order creation)
  const membership = await prisma.membership.findFirst({
    where: { revolutOrderId: payload.order_id },
    select: {
      id: true, userId: true, schoolId: true, status: true,
      plan: { select: { validityDays: true } },
      school: { select: { revolutSecretKey: true, name: true, city: true, language: true } },
    },
  })

  if (!membership) return NextResponse.json({ error: 'Membership not found' }, { status: 404 })

  const { school } = membership
  if (!school?.revolutSecretKey)
    return NextResponse.json({ error: 'School Revolut not configured' }, { status: 400 })

  // Verify webhook signature if secret is configured
  // (Revolut sandbox may not send signatures — skip if header absent)
  if (signatureHeader) {
    // Revolut webhook secret = the signing secret shown in the Merchant dashboard
    // We reuse revolutSecretKey as the signing secret for now;
    // schools can set a dedicated webhook secret in settings later
    const valid = await verifyRevolutWebhook(rawBody, signatureHeader, school.revolutSecretKey)
    if (!valid) return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 })
  }

  if (payload.event === 'ORDER_COMPLETED') {
    if (membership.status !== 'PENDING') return NextResponse.json({ received: true })

    // Fetch the order to confirm it's actually paid
    const order = await getRevolutOrder(school.revolutSecretKey, payload.order_id)
    if (order.state !== 'COMPLETED') return NextResponse.json({ received: true })

    const endDate = membership.plan?.validityDays
      ? new Date(Date.now() + membership.plan.validityDays * 86_400_000)
      : undefined

    await prisma.$transaction(async (tx) => {
      await tx.membership.update({
        where: { id: membership.id },
        data: {
          status:    MembershipStatus.ACTIVE,
          startDate: new Date(),
          ...(endDate && { endDate }),
        },
      })
      await tx.schoolMember.updateMany({
        where: { userId: membership.userId, schoolId: membership.schoolId },
        data:  { status: 'ACTIVE' },
      })
    })

    // Send receipt email (fire-and-forget)
    prisma.membership.findUnique({
      where: { id: membership.id },
      select: {
        planName: true, price: true, currency: true, startDate: true, endDate: true,
        user:   { select: { email: true, name: true } },
        school: { select: { name: true, city: true, language: true } },
      },
    }).then(m => {
      if (!m?.user?.email) return
      sendMembershipReceiptEmail({
        to:            m.user.email,
        studentName:   m.user.name,
        schoolName:    m.school.name,
        schoolCity:    m.school.city,
        planName:      m.planName,
        amount:        Number(m.price),
        currency:      m.currency,
        paymentMethod: 'REVOLUT',
        startDate:     m.startDate,
        endDate:       m.endDate,
        membershipId:  membership.id,
        lang:          m.school.language,
      })
    }).catch(err => console.error('[revolut webhook] receipt email failed:', err))
  }

  if (payload.event === 'ORDER_PAYMENT_DECLINED' || payload.event === 'ORDER_CANCELLED') {
    await prisma.membership.update({
      where: { id: membership.id },
      data:  { status: MembershipStatus.CANCELLED, cancelledAt: new Date() },
    })
  }

  return NextResponse.json({ received: true })
}
