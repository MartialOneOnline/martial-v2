// "Hide My Email" addresses from Sign in with Apple — mail only reaches the
// person if the sender is registered with Apple's relay service.
export function isApplePrivateRelayEmail(email: string | null | undefined): boolean {
  return /@privaterelay\.appleid\.com$/i.test(email?.trim() ?? '')
}

// Whether the relay → real email step (/complete-profile, lib/emailChange.ts)
// must be done: only for a relay address, and not while that change is
// blocked by an account-merge write that never got an answer
// (lib/authPins.ts relayChangeLocked) — the student couldn't complete it.
export function needsRealEmailStep(email: string | null | undefined, relayLocked: boolean): boolean {
  return isApplePrivateRelayEmail(email) && !relayLocked
}
