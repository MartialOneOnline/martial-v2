'use client'

import { useEffect } from 'react'

// Lets the hero render first, then eases down to #events instead of the
// jarring instant jump Next.js/browsers do when a page loads with a hash —
// see the "page loads halfway down" report tied to /school/[slug]#events.
export default function EventsScrollHandler() {
  useEffect(() => {
    if (window.location.hash !== '#events') return

    const timer = setTimeout(() => {
      document.querySelector('[data-events-anchor]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 400)

    return () => clearTimeout(timer)
  }, [])

  return null
}
