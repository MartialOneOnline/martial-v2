/**
 * Stripe webhook handler — Phase 5.
 *
 * Events handled:
 *  - checkout.session.completed  → assignPlan()
 *  - invoice.paid                → renewMembership()
 *  - customer.subscription.deleted → cancelMembership()
 *
 * To enable: set STRIPE_WEBHOOK_SECRET in .env.local and Vercel.
 * Install: npm add stripe  (not yet added — Phase 5)
 */

import { NextRequest, NextResponse } from 'next/server'

// Stripe imports are commented out until Phase 5 to keep the bundle clean.
// import Stripe from 'stripe'
// import { assignPlan, cancelMembership, renewMembership } from '@/lib/services/membership'
// import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 501 })
  }

  // ── Phase 5 implementation ─────────────────────────────────────────────────
  //
  // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  // const sig = req.headers.get('stripe-signature')!
  // const body = await req.text()
  //
  // let event: Stripe.Event
  // try {
  //   event = stripe.webhooks.constructEvent(body, sig, secret)
  // } catch {
  //   return NextResponse.json({ error: 'Signature invalid' }, { status: 400 })
  // }
  //
  // switch (event.type) {
  //   case 'checkout.session.completed': {
  //     const session = event.data.object as Stripe.Checkout.Session
  //     // Metadata set when creating the checkout session:
  //     // { schoolMemberId, schoolId, planId }
  //     const { schoolMemberId, schoolId, planId } = session.metadata ?? {}
  //     if (schoolMemberId && schoolId && planId) {
  //       await assignPlan({
  //         schoolMemberId, schoolId, planId,
  //         paymentMethod: 'STRIPE',
  //         stripeSubId: session.subscription as string,
  //       })
  //     }
  //     break
  //   }
  //   case 'invoice.paid': {
  //     const invoice = event.data.object as Stripe.Invoice
  //     const stripeSubId = invoice.subscription as string
  //     const existing = await prisma.membership.findFirst({
  //       where: { stripeSubId, status: 'ACTIVE' },
  //       select: { id: true, schoolId: true },
  //     })
  //     if (existing) {
  //       await renewMembership(existing.id, existing.schoolId)
  //     }
  //     break
  //   }
  //   case 'customer.subscription.deleted': {
  //     const sub = event.data.object as Stripe.Subscription
  //     const membership = await prisma.membership.findFirst({
  //       where: { stripeSubId: sub.id, status: 'ACTIVE' },
  //       select: { id: true, schoolId: true },
  //     })
  //     if (membership) {
  //       await cancelMembership({ membershipId: membership.id, schoolId: membership.schoolId, reason: 'Stripe subscription cancelled' })
  //     }
  //     break
  //   }
  // }

  return NextResponse.json({ received: true })
}
