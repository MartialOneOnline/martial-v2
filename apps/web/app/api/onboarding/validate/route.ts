import { NextResponse } from 'next/server'

// Retired (2026-11-22). This legacy onboarding endpoint trusted the old
// guessable `token` column and a client-supplied email. School owners now
// accept invitations only through /claim/[token] (lib/claims/accept.ts),
// which requires a verified login for the invited address.
function gone() {
  return NextResponse.json({ error: 'This onboarding link is no longer valid. Ask Martial support for a new invitation.' }, { status: 410 })
}

export const GET = gone
export const POST = gone
