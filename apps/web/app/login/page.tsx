'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Login is handled as a modal popup on the homepage.
// Direct URL access to /login redirects to homepage which opens the modal.
export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/?login=true')
  }, [router])

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
      <div className="text-slate-400 text-sm font-semibold">Redirecting...</div>
    </div>
  )
}
