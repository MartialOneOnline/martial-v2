// A burst of client fetches firing at the same moment (e.g. several useEffects
// on page mount) can each hit proxy.ts's session refresh independently once the
// access token has actually expired — which happens naturally whenever a user
// backgrounds the app past the token's lifetime and comes back. Supabase refresh
// tokens are single-use, so two concurrent refreshes race and the loser gets
// invalid_grant, which the SDK treats as "wipe the session" (see
// feedback_auth_session_drops memory for the desktop version of this bug).
//
// `primed()` lets the first call in a burst refresh alone; anything issued while
// it's still in flight waits for it before firing its own request, so at most
// one refresh ever happens per burst. Calls that arrive after the primer has
// already settled proceed immediately and in parallel with each other, since by
// then the session is already fresh and there's nothing left to race.
let inFlight: Promise<unknown> | null = null

export async function primed<T>(run: () => Promise<T>): Promise<T> {
  if (inFlight) await inFlight.catch(() => {})
  const p = run()
  inFlight = p
  try {
    return await p
  } finally {
    if (inFlight === p) inFlight = null
  }
}
