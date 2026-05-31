'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Registration is handled as a modal popup on the homepage.
// Direct URL access to /register redirects to homepage which auto-opens the modal.
export default function RegisterPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/?register=true')
  }, [router])

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
      <div className="text-slate-400 text-sm font-semibold">Redirecting...</div>
    </div>
  )
}
