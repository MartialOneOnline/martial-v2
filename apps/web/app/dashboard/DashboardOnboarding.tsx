'use client'

import Link from 'next/link'
import { Building2, ArrowRight } from 'lucide-react'
import { useT } from '../../lib/i18n/LanguageContext'

/**
 * Shown when an authenticated user has no school associated.
 * Guides them toward creating or claiming a school.
 */
export default function DashboardOnboarding() {
  const t = useT()
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#EFF6FF] flex items-center justify-center mb-4">
        <Building2 className="w-8 h-8 text-[#0870E2]" />
      </div>
      <h1 className="text-2xl font-bold text-[#111827] mb-2">{t.onboarding.title}</h1>
      <p className="text-sm text-[#6B7280] max-w-sm mb-6">
        {t.onboarding.description}
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/dashboard/school/create"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0870E2] text-white text-sm font-semibold hover:bg-[#005580] transition-colors"
        >
          {t.onboarding.createSchool}
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-[#E5E7EB] text-[#374151] text-sm font-semibold hover:bg-[#F9FAFB] transition-colors"
        >
          {t.onboarding.exploreSchools}
        </Link>
      </div>
    </div>
  )
}
