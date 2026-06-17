'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const redirect = searchParams.get('redirect')
    router.replace(redirect ? `/?login=true&redirect=${encodeURIComponent(redirect)}` : '/?login=true')
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
      <div className="text-slate-400 text-sm font-semibold">Redirecting...</div>
    </div>
  )
}

// Login is handled as a modal popup on the homepage.
// Direct URL access to /login redirects to homepage which opens the modal.
export default function LoginPage() {
  return (
    <Suspense>
      <LoginRedirect />
    </Suspense>
  )

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
      <div className="text-slate-400 text-sm font-semibold">Redirecting...</div>
    </div>
  )
}
