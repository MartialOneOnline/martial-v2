'use client'

import Link from 'next/link'
import { useT } from '@/lib/i18n/LanguageContext'

// Shown only on listings without an owner. Starts an ownership request that
// keeps a reference to this school — a hint for the reviewer, never access.
export default function ClaimListingLink({ slug, name }: { slug: string; name: string }) {
  const c = useT().claimFlow
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 pt-6 pb-28 md:pb-10 text-center">
      <p className="text-xs text-gray-400">
        {c.ownThis}{' '}
        <Link href={`/claim?school=${encodeURIComponent(slug)}&name=${encodeURIComponent(name)}`} prefetch={false} className="font-semibold text-[#0870E2] hover:underline">
          {c.ownThisCta}
        </Link>
      </p>
    </div>
  )
}
