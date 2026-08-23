'use client'

import { useEffect, useRef, useState } from 'react'
import { loadGoogleIdentityScript } from './googleIdentity'
import { isEmbeddedWebView } from './isEmbeddedWebView'

// Google's renderButton() injects an iframe into the container synchronously
// on success, so if the container is still empty after this long, something
// silently swallowed it — e.g. Brave, which disables the FedCM API by
// default (this hook opts into `use_fedcm_for_prompt`), or a privacy
// extension blocking accounts.google.com. Confirmed 2026-08-24: a real user
// on Brave got a Google button that rendered but did nothing on click.
const RENDER_TIMEOUT_MS = 4000

// Renders Google's own "Sign in with Google" button into the returned ref.
// Ref-only deps by design (see the similarly-shaped onAuthStateChange effect
// in app/login/page.tsx) — this only needs to run once per mount, and
// re-running it would re-inject the button and lose the account-picker
// popup's association with the click gesture.
//
// `fallbackToRedirect` is true when GSI can't be trusted to work at all:
// inside WebViews that can't open new windows (confirmed: the V1 mobile
// app's wrapper — google.accounts.id's button click opens its popup via
// `window.open`, which silently no-ops there), when the GSI script fails to
// load, or when it loads but never actually renders a button within
// RENDER_TIMEOUT_MS. Any of these skip GSI and tell the caller to fall back
// to the old `signInWithOAuth('google')` redirect instead (same as
// Apple/Microsoft).
export function useGoogleSignInButton(onCredential: (idToken: string) => void) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [gsiUnavailable, setGsiUnavailable] = useState(false)
  const fallbackToRedirect = isEmbeddedWebView() || gsiUnavailable

  useEffect(() => {
    if (isEmbeddedWebView()) return
    let cancelled = false
    let renderCheckId: ReturnType<typeof setTimeout> | undefined

    loadGoogleIdentityScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google) throw new Error('GSI unavailable after load')
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
          callback: response => onCredential(response.credential),
          use_fedcm_for_prompt: true,
        })
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text: 'continue_with',
          logo_alignment: 'left',
          width: containerRef.current.offsetWidth || 320,
        })
        renderCheckId = setTimeout(() => {
          if (!cancelled && containerRef.current?.childElementCount === 0) setGsiUnavailable(true)
        }, RENDER_TIMEOUT_MS)
      })
      .catch(() => {
        if (!cancelled) setGsiUnavailable(true)
      })

    return () => {
      cancelled = true
      if (renderCheckId) clearTimeout(renderCheckId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { containerRef, fallbackToRedirect }
}
