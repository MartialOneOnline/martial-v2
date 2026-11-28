import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { evaluatePlanForPurchase, isOfferableForClass, type ClassCheck } from '@/lib/services/planEligibility'
import { loadClassContext, providerConfigOf } from '@/lib/services/planPurchase'

// GET /api/public/schools/[slug]/plans?classId=<optional>
//
// Public, read-only presentation of which plans can be bought online and on
// what terms. It never authorises anything: POST /api/my/checkout re-runs the
// same evaluation (lib/services/planEligibility.ts) before any write.
// Exposes no provider credentials — only which offers exist.
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const classId = req.nextUrl.searchParams.get('classId')

  const school = await prisma.school.findUnique({
    where: { slug },
    select: {
      id: true, name: true, slug: true, status: true,
      stripeSecretKey: true, revolutSecretKey: true, revolutWebhookSecret: true,
    },
  })
  if (!school || ['SUSPENDED', 'ARCHIVED'].includes(school.status))
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const now = new Date()
  const providers = providerConfigOf(school)
  const loadedClass = classId ? await loadClassContext(school.id, classId, now) : null

  const plans = await prisma.membershipPlan.findMany({
    where: { schoolId: school.id, isActive: true, isPublic: true },
    orderBy: [{ isPopular: 'desc' }, { price: 'asc' }],
    select: {
      id: true, name: true, description: true, price: true, currency: true,
      planType: true, billingCycle: true, validityDays: true, isPopular: true,
      paymentMethods: true, classAccess: true,
    },
  })

  return NextResponse.json({
    school: { id: school.id, name: school.name, slug: school.slug },
    // classId given but unusable (other school, inactive, unpublished, unknown):
    // say so explicitly instead of silently evaluating without the class.
    class: classId
      ? (loadedClass
          ? { id: loadedClass.id, name: loadedClass.name, nextSession: loadedClass.context.nextSession?.toISOString() ?? null }
          : { id: classId, unavailable: true })
      : null,
    plans: plans.map(p => {
      const e = evaluatePlanForPurchase(
        { ...p, price: Number(p.price), classAccess: p.classAccess },
        providers, now, loadedClass?.context,
      )
      return {
        id: p.id, name: p.name, description: p.description,
        price: Number(p.price), currency: p.currency,
        planType: p.planType, billingCycle: p.billingCycle, validityDays: p.validityDays,
        isPopular: p.isPopular,
        purchase: e.purchase,
        offers: e.offers,
        validity: e.validity,
        classCheck: e.classCheck ? serializeClassCheck(e.classCheck) : null,
        offerableForClass: loadedClass ? isOfferableForClass(e) : null,
      }
    }),
  })
}

function serializeClassCheck(c: ClassCheck) {
  switch (c.status) {
    case 'not_included':
    case 'no_upcoming_session':
      return { status: c.status }
    case 'subscription':
      return { status: c.status, nextSession: c.nextSession.toISOString() }
    case 'covered':
      return { status: c.status, nextSession: c.nextSession.toISOString(), accessEndsAt: c.accessEndsAt?.toISOString() ?? null }
    case 'expires_before_session':
      return { status: c.status, nextSession: c.nextSession.toISOString(), accessEndsAt: c.accessEndsAt.toISOString() }
  }
}
