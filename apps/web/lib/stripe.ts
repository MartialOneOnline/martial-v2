import Stripe from 'stripe'

export function getStripe(secretKey: string) {
  return new Stripe(secretKey, { apiVersion: '2026-06-24.dahlia' })
}

// Martial's own Stripe account — used for the platform's SaaS billing of
// schools. Distinct from getStripe(school.stripeSecretKey), which each
// school uses to charge its own members.
export function getPlatformStripe() {
  return getStripe(process.env.STRIPE_PLATFORM_SECRET_KEY!)
}
