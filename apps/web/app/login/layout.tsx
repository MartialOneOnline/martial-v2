import type { Viewport } from 'next'

// viewportFit: 'cover' opts this route into the notch/status-bar area —
// prerequisite for the photo backdrop in page.tsx to render edge-to-edge
// once the native WebView wrapper is configured for a translucent status
// bar. Scoped to /login only so other routes (which don't account for
// safe-area insets) aren't affected.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
