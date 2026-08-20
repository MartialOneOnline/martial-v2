import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth/server'
import { getStripe, getPlatformStripe } from '@/lib/stripe'
import { MarketplaceSellerType, CollectionStatus } from '@/lib/prisma-client/enums'
import { reserveUnit, RESERVATION_TTL_MS } from '@/lib/services/collectibles/reservation'
import { resolveUnitPrice } from '@/lib/services/collectibles/pricing'

// POST /api/my/collectibles/reserve
// Body: { collectionSlug, tierId?, size?, editionNumber? }
// Atomically reserves one unit, then creates a Stripe Checkout Session —
// school-sold collections settle through the school's own Stripe account,
// Martial-sold collections (sellerType MARTIAL, e.g. Buchecha) settle
// through Martial's platform account. Mirrors apps/web/app/api/my/events/checkout/route.ts.
export async function POST(req: NextRequest) {
  const dbUser = await getAuthUser()
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { collectionSlug, tierId, size, editionNumber } = await req.json() as {
    collectionSlug: string; tierId?: string; size?: string; editionNumber?: number
  }
  if (!collectionSlug) return NextResponse.json({ error: 'collectionSlug required' }, { status: 400 })

  const collection = await prisma.limitedCollection.findUnique({
    where: { slug: collectionSlug },
    include: {
      product: true,
      school: { select: { name: true, stripeSecretKey: true } },
    },
  })
  if (!collection || collection.status !== CollectionStatus.LIVE) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
  }
  if (editionNumber != null && !collection.numberSelectionEnabled) {
    return NextResponse.json({ error: 'This collection does not allow choosing a specific number' }, { status: 400 })
  }
  if (size && !collection.sizeSelectionEnabled) {
    return NextResponse.json({ error: 'This collection does not offer size selection' }, { status: 400 })
  }

  const isMartial = collection.sellerType === MarketplaceSellerType.MARTIAL
  if (!isMartial && !collection.school?.stripeSecretKey) {
    return NextResponse.json({ error: 'School has not configured Stripe' }, { status: 400 })
  }

  const reservation = await prisma.$transaction(async tx => {
    const unit = await reserveUnit(tx, { collectionId: collection.id, tierId, size, editionNumber })
    if (!unit) return null
    const tier = await tx.limitedCollectionTier.findUniqueOrThrow({ where: { id: unit.tierId } })
    return { unit, tier }
  })

  if (!reservation) {
    return NextResponse.json({ error: 'No matching unit is currently available' }, { status: 409 })
  }
  const { unit, tier } = reservation

  const resolved = resolveUnitPrice({
    unit: { specificPrice: unit.specificPrice, currency: unit.currency },
    tier: { price: tier.price, currency: tier.currency },
    product: { price: collection.product.price, currency: collection.product.currency },
  })

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const metadata = {
    collectibleUnitId: unit.id,
    collectionId:       collection.id,
    userId:             dbUser.id,
    sellerType:         collection.sellerType,
    ...(collection.schoolId ? { schoolId: collection.schoolId } : {}),
  }

  try {
    const stripe = isMartial ? getPlatformStripe() : getStripe(collection.school!.stripeSecretKey!)
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: dbUser.email ?? undefined,
      expires_at: Math.floor((Date.now() + RESERVATION_TTL_MS) / 1000),
      line_items: [{
        price_data: {
          currency: resolved.currency.toLowerCase(),
          unit_amount: Math.round(resolved.price * 100),
          product_data: {
            name: `${collection.name} — ${tier.name} #${unit.editionNumber}`,
            description: isMartial ? 'Martial — Limited Collection' : `${collection.school?.name} — Limited Collection`,
          },
        },
        quantity: 1,
      }],
      metadata,
      success_url: `${origin}/marketplace/${collection.slug}?checkout=success&unit=${unit.id}`,
      cancel_url:  `${origin}/marketplace/${collection.slug}?checkout=cancelled`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    // Compensate: release the claim so it doesn't sit RESERVED for the full
    // TTL just because Stripe session creation itself failed.
    await prisma.collectibleUnit.updateMany({
      where: { id: unit.id, status: 'RESERVED' },
      data: { status: 'AVAILABLE', reservedAt: null, reservationExpiresAt: null },
    })
    console.error('[my/collectibles/reserve] Stripe session creation failed:', err)
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 500 })
  }
}
