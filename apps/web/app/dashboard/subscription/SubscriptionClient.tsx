'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// This page used to show a fake 4-tier plan picker (Free/Starter/Pro/Enterprise)
// and fake invoice history — none of it backed by real data. The real Martial
// SaaS subscription (single plan, monthly/quarterly/annual, live Stripe
// checkout + billing portal via /api/dashboard/billing/*) already lives in
// Settings → Billing (see BillingTab in SettingsClient.tsx). Redirect there
// instead of duplicating that logic in a second, easily-drifting copy.
export default function SubscriptionClient() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/settings?tab=billing')
  }, [router])

  return null
}
