'use client'

import { createContext, useContext } from 'react'

// Whether the request for /login carried a Supabase session cookie, decided
// on the server (layout.tsx) so the page's first render — server and client
// alike — can show a spinner instead of flashing the login form at someone
// who is already signed in.
const SessionHintContext = createContext(false)

export function SessionHintProvider({ value, children }: { value: boolean; children: React.ReactNode }) {
  return <SessionHintContext.Provider value={value}>{children}</SessionHintContext.Provider>
}

export function useSessionHint() {
  return useContext(SessionHintContext)
}
