'use client'

import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

// The old /onboarding?token= wizard created a school + owner from an
// invitation token with no proof of the invited mailbox; it was retired with
// the 2026-11 ownership flow (owner invitations now open /claim/<token>). No
// Martial email ever linked here, but a bookmarked/copied URL gets an
// explanation and the two ways forward instead of a 404.
export default function RetiredOnboardingPage() {
  const { t } = useLanguage()
  const c = t.claimFlow
  return (
    <main className="min-h-screen bg-[#F9FAFB] flex items-start sm:items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <p className="text-center text-xs font-extrabold tracking-[0.18em] text-[#0E3A7A] mb-6">MARTIAL</p>
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 text-center">
          <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#101828]">{c.retiredOnboarding}</p>
          <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
            <a href="/login?redirect=/dashboard" className="inline-flex items-center justify-center h-11 px-6 rounded-full border border-gray-200 text-sm font-semibold text-[#101828]">{c.signIn}</a>
            <Link href="/claim" prefetch={false} className="inline-flex items-center justify-center h-11 px-6 rounded-full bg-[#0870E2] text-white text-sm font-semibold">{c.requestNew}</Link>
          </div>
          <p className="text-xs text-gray-400 mt-4">{c.contactSupport}</p>
        </div>
      </div>
    </main>
  )
}
