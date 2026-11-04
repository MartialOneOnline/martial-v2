'use client'

import { useEffect, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/i18n/LanguageContext'
import { AppErrorScreen } from '@/components/AppErrorScreen'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT()
  const router = useRouter()

  useEffect(() => {
    console.error(error)
  }, [error])

  // reset() alone only re-renders on the client; refresh() re-fetches the
  // server component payload too, which is what fails on a flaky connection.
  const retry = () => startTransition(() => { router.refresh(); reset() })

  return <AppErrorScreen t={t.appErrors} onRetry={retry} />
}
