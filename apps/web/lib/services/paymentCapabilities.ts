import { prisma } from '@/lib/db'
import { BOOKING_PAYMENT_OPTIONS } from '@/lib/paymentMethods'

// Resolves which payment methods a school can actually offer on a membership
// plan, class, or event: must be accepted in Settings → Payments AND, for
// online providers, actually connected (keys configured).
export async function getSchoolPaymentCapabilities(schoolId: string) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { defaultBookingSettings: true, stripeSecretKey: true, revolutSecretKey: true, revolutWebhookSecret: true },
  })

  const raw = (school?.defaultBookingSettings as { acceptedMethods?: unknown } | null)?.acceptedMethods
  const acceptedMethods = Array.isArray(raw) ? raw.filter((m): m is string => typeof m === 'string') : []
  const stripeConfigured = !!school?.stripeSecretKey
  const revolutConfigured = !!(school?.revolutSecretKey && school?.revolutWebhookSecret)

  const availableMethods = BOOKING_PAYMENT_OPTIONS
    .map(o => o.value as string)
    .filter(m => acceptedMethods.includes(m)
      && (m !== 'STRIPE' || stripeConfigured)
      && (m !== 'REVOLUT' || revolutConfigured))

  return { acceptedMethods, availableMethods, stripeConfigured, revolutConfigured }
}

// Strips out any requested payment method the school hasn't actually made
// available — defense in depth against direct API calls or a stale UI state
// that still shows a method that was since disabled in Settings.
export function sanitizePaymentMethods(requested: unknown, availableMethods: string[]): string[] {
  if (!Array.isArray(requested)) return []
  return requested.filter((m): m is string => typeof m === 'string' && availableMethods.includes(m))
}
