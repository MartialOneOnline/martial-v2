'use client'

import { useEffect, useRef } from 'react'
import { loadGoogleIdentityScript } from './googleIdentity'

// Renders Google's own "Sign in with Google" button into the returned ref.
// Ref-only deps by design (see the similarly-shaped onAuthStateChange effect
// in app/login/page.tsx) — this only needs to run once per mount, and
// re-running it would re-inject the button and lose the account-picker
// popup's association with the click gesture.
export function useGoogleSignInButton(onCredential: (idToken: string) => void) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    loadGoogleIdentityScript().then(() => {
      if (cancelled || !containerRef.current || !window.google) return
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
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return containerRef
}
