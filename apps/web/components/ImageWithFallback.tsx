'use client'

// Wraps next/image with an onError fallback, for use from Server Components
// that can't hold error state or pass event-handler props themselves. Photo
// URLs stored on School/Event/User rows aren't host-validated on write (some
// come from V1 imports), so next/image 400s — and silently shows the
// browser's broken-image icon — for any host outside next.config.js's
// remotePatterns allowlist.

import { useState } from 'react'
import Image, { type ImageProps } from 'next/image'

interface Props extends ImageProps {
  fallback?: React.ReactNode
}

export default function ImageWithFallback({ fallback, ...props }: Props) {
  const [failed, setFailed] = useState(false)
  if (failed) return <>{fallback ?? null}</>
  return <Image {...props} onError={() => setFailed(true)} />
}
