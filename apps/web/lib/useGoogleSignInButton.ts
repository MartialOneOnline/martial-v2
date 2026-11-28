'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
  const nodeRef = useRef<HTMLDivElement | null>(null)
  // Set once google.accounts.id.initialize() has run for this mount.
  const gsiReadyRef = useRef(false)
  const [gsiUnavailable, setGsiUnavailable] = useState(false)
  // Decided after mount, not during render. isEmbeddedWebView() is always
  // false on the server (no navigator) but true in the app's WebView, so
  // reading it during render made the hydration render disagree with the
  // server HTML. React keeps the server's attributes on a mismatch, so the
  // invisible GSI overlay kept `pointer-events: auto` (empty, because GSI is
  // skipped in WebViews) on top of the visible button and swallowed every
  // tap. Going to "Continue with Email" and back remounted it on the client
  // with the right style, which is why that "fixed" it.
  const [embedded, setEmbedded] = useState(false)
  const fallbackToRedirect = embedded || gsiUnavailable

  // Callback ref, not a plain ref: the login page unmounts the container
  // when it switches to the email step, and the node it mounts on "Back" is
  // a fresh, empty div. GSI has to render into each new node, otherwise the
  // overlay comes back empty and the Google button is dead.
  const checkTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const renderAndCheck = (el: HTMLDivElement) => {
    renderInto(el)
    checkTimers.current.push(setTimeout(() => {
      if (nodeRef.current === el && el.childElementCount === 0) setGsiUnavailable(true)
    }, RENDER_TIMEOUT_MS))
  }
  const containerRef = useCallback((el: HTMLDivElement | null) => {
    nodeRef.current = el
    if (el && gsiReadyRef.current) renderAndCheck(el)
  }, [])

  useEffect(() => {
    if (isEmbeddedWebView()) { setEmbedded(true); return }
    let cancelled = false

    loadGoogleIdentityScript()
      .then(() => {
        if (cancelled || !window.google) throw new Error('GSI unavailable after load')
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
          callback: response => onCredential(response.credential),
          use_fedcm_for_prompt: true,
        })
        gsiReadyRef.current = true
        // No node yet (e.g. /login still showing its resume spinner): the
        // callback ref renders into it once it mounts.
        if (nodeRef.current) renderAndCheck(nodeRef.current)
      })
      .catch(() => {
        if (!cancelled) setGsiUnavailable(true)
      })

    return () => {
      cancelled = true
      gsiReadyRef.current = false
      checkTimers.current.forEach(clearTimeout)
      checkTimers.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { containerRef, fallbackToRedirect }
}

function renderInto(el: HTMLDivElement) {
  window.google?.accounts.id.renderButton(el, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    shape: 'rectangular',
    text: 'continue_with',
    logo_alignment: 'left',
    width: el.offsetWidth || 320,
  })
}
