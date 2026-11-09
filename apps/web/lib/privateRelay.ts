// "Hide My Email" addresses from Sign in with Apple — mail only reaches the
// person if the sender is registered with Apple's relay service.
export function isApplePrivateRelayEmail(email: string | null | undefined): boolean {
  return /@privaterelay\.appleid\.com$/i.test(email?.trim() ?? '')
}
