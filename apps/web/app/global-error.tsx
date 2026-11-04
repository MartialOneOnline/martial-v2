'use client'

import { useEffect, useState } from 'react'
import { translations, type Locale } from '@/lib/i18n/translations'
import { AppErrorScreen } from '@/components/AppErrorScreen'

// Replaces the root layout when it fails, so LanguageProvider isn't
// available here — read the same saved locale it uses directly.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  const [locale, setLocale] = useState<Locale>('en')

  useEffect(() => {
    console.error(error)
    try {
      const saved = localStorage.getItem('martial_locale') as Locale | null
      if (saved && saved in translations) setLocale(saved)
    } catch { /* storage blocked: keep English */ }
  }, [error])

  return (
    <html lang={locale}>
      <body style={{ margin: 0 }}>
        <AppErrorScreen t={translations[locale].appErrors} onRetry={() => window.location.reload()} />
      </body>
    </html>
  )
}
