import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { getSchoolModules } from '@/lib/school-modules'

async function getEnabledPaymentMethods() {
  const settings = await prisma.platformSettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton' },
    update: {},
    select: { enabledPaymentMethods: true },
  })
  return settings.enabledPaymentMethods
}

// GET /api/dashboard/school — returns active school data for dashboard
export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // SUPERADMIN can pass ?schoolId= query param
  const { searchParams } = new URL(req.url)
  const schoolId = searchParams.get('schoolId') ?? (await getCurrentSchoolId())

  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })

  // Validate access (SUPERADMIN bypasses membership check)
  // Only OWNER/ADMIN (or SUPERADMIN) may see the payment provider secret keys —
  // everyone else with school access gets the public fields only.
  let canViewPaymentSecrets = user.role === 'SUPERADMIN'
  if (!canViewPaymentSecrets) {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      canViewPaymentSecrets = ['OWNER', 'ADMIN'].includes(member.role)
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const baseSelect = {
    id: true,
    name: true,
    slug: true,
    status: true,
    city: true,
    country: true,
    address: true,
    postcode: true,
    logoUrl: true,
    coverUrl: true,
    email: true,
    phone: true,
    website: true,
    description: true,
    tagline: true,
    instagram: true,
    facebook: true,
    youtube: true,
    tiktok: true,
    language: true,
    defaultBookingSettings: true,
    cancelPolicy: true,
    stripePublishableKey: true,
    revolutPublicKey: true,
    modules: true,
  } as const

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: canViewPaymentSecrets
      ? { ...baseSelect, stripeSecretKey: true, stripeWebhookSecret: true, revolutSecretKey: true }
      : baseSelect,
  }) as Record<string, unknown> | null

  if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 })

  const enabledPaymentMethods = await getEnabledPaymentMethods()

  // Never send these three fields to the browser in full — a school owner's own
  // settings page loads this on every visit, so anyone with devtools access to a
  // dashboard session would otherwise see live payment-provider credentials.
  const { stripeSecretKey, stripeWebhookSecret, revolutSecretKey, ...publicSchool } = school as
    Record<string, unknown> & { stripeSecretKey?: string | null; stripeWebhookSecret?: string | null; revolutSecretKey?: string | null }

  return NextResponse.json({
    school: {
      ...publicSchool,
      modules: getSchoolModules(publicSchool.modules as string | null),
      ...(canViewPaymentSecrets && {
        stripeSecretKeyConfigured:     !!stripeSecretKey,
        stripeSecretKeyMasked:         maskSecret(stripeSecretKey),
        stripeWebhookSecretConfigured: !!stripeWebhookSecret,
        stripeWebhookSecretMasked:     maskSecret(stripeWebhookSecret),
        revolutSecretKeyConfigured:    !!revolutSecretKey,
        revolutSecretKeyMasked:        maskSecret(revolutSecretKey),
      }),
    },
    enabledPaymentMethods,
  })
}

function maskSecret(value: string | null | undefined): string | null {
  if (!value) return null
  return value.length <= 4 ? '••••' : `••••${value.slice(-4)}`
}

// PATCH /api/dashboard/school — update school settings (language, etc.)
export async function PATCH(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })

  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!['OWNER', 'ADMIN'].includes(member.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const body = await req.json()
  const { language, name, phone, email, website, instagram, facebook, youtube, tiktok,
          description, tagline, address, postcode, city, country, logoUrl,
          defaultBookingSettings, cancelPolicy, modules,
          stripePublishableKey, stripeSecretKey, stripeWebhookSecret,
          revolutPublicKey, revolutSecretKey } = body

  const VALID_LANGS = ['en', 'es', 'pt', 'fr']
  const VALID_CANCEL_POLICIES = ['IMMEDIATE', 'UNTIL_END_OF_PERIOD']

  // Server-side gating: a school can only accept payment methods the platform
  // has enabled, regardless of what the UI sends (defense against direct API calls).
  let gatedBookingSettings = defaultBookingSettings
  if (defaultBookingSettings !== undefined && Array.isArray(defaultBookingSettings?.acceptedMethods)) {
    const enabledPaymentMethods = await getEnabledPaymentMethods()
    gatedBookingSettings = {
      ...defaultBookingSettings,
      acceptedMethods: defaultBookingSettings.acceptedMethods.filter((m: string) => enabledPaymentMethods.includes(m)),
    }
  }

  const updated = await prisma.school.update({
    where: { id: schoolId },
    data: {
      ...(language    !== undefined && VALID_LANGS.includes(language) && { language }),
      ...(name        !== undefined && { name: name.trim() }),
      ...(phone       !== undefined && { phone:       phone?.trim()       || null }),
      ...(email       !== undefined && { email:       email?.trim()       || null }),
      ...(website     !== undefined && { website:     website?.trim()     || null }),
      ...(instagram   !== undefined && { instagram:   instagram?.trim()   || null }),
      ...(facebook    !== undefined && { facebook:    facebook?.trim()    || null }),
      ...(youtube     !== undefined && { youtube:     youtube?.trim()     || null }),
      ...(tiktok      !== undefined && { tiktok:      tiktok?.trim()      || null }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(tagline     !== undefined && { tagline:     tagline?.trim()     || null }),
      ...(address     !== undefined && { address:     address?.trim()     || null }),
      ...(postcode    !== undefined && { postcode:    postcode?.trim()    || null }),
      ...(city        !== undefined && { city:        city?.trim()        || null }),
      ...(country     !== undefined && { country:     country?.trim()     || null }),
      ...(logoUrl                !== undefined && { logoUrl: logoUrl?.trim() || null }),
      ...(defaultBookingSettings !== undefined && { defaultBookingSettings: gatedBookingSettings }),
      ...(cancelPolicy !== undefined && VALID_CANCEL_POLICIES.includes(cancelPolicy) && { cancelPolicy }),
      ...(modules !== undefined && { modules: getSchoolModules(modules) }),
      ...(stripePublishableKey !== undefined && { stripePublishableKey: stripePublishableKey?.trim() || null }),
      ...(stripeSecretKey      !== undefined && { stripeSecretKey:      stripeSecretKey?.trim()      || null }),
      ...(stripeWebhookSecret  !== undefined && { stripeWebhookSecret:  stripeWebhookSecret?.trim()  || null }),
      ...(revolutPublicKey     !== undefined && { revolutPublicKey:     revolutPublicKey?.trim()     || null }),
      ...(revolutSecretKey     !== undefined && { revolutSecretKey:     revolutSecretKey?.trim()     || null }),
    },
    select: { id: true, language: true, name: true, cancelPolicy: true, modules: true },
  })

  return NextResponse.json({ school: { ...updated, modules: getSchoolModules(updated.modules) } })
}
