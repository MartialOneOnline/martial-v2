'use client'

import { useState } from 'react'
import { Share2, Check } from 'lucide-react'

export default function ShareButton({ title, className = '' }: { title: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  async function share() {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
      } catch {
        // user cancelled the native share sheet — no error state needed
      }
      return
    }
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button onClick={share} className={className}>
      {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
      {copied ? 'Link copied' : 'Share'}
    </button>
  )
}
