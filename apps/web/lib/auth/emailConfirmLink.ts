// Email-confirmation links (register + resend-confirmation) point at our own
// /auth/confirm/verify route with generateLink's hashed_token, never at
// Supabase's action_link. The action_link redirects back with the session in
// the URL #hash (implicit flow), which the app's browser client (@supabase/ssr,
// PKCE) refuses to redeem — the account got confirmed but the user was left
// logged out on /login. /auth/confirm/verify redeems the token server-side
// with verifyOtp instead (same pattern as /auth/impersonate and
// /auth/callback). Pure so it can be unit-tested without Supabase.

// Only the email-verification token types generateLink can hand back for a
// confirmation link. Anything else in ?type= is rejected by the verify route.
export const EMAIL_CONFIRM_OTP_TYPES = ['signup', 'magiclink', 'email'] as const
export type EmailConfirmOtpType = (typeof EMAIL_CONFIRM_OTP_TYPES)[number]

export function isEmailConfirmOtpType(value: string | null | undefined): value is EmailConfirmOtpType {
  return !!value && (EMAIL_CONFIRM_OTP_TYPES as readonly string[]).includes(value)
}

export function buildEmailConfirmUrl(params: {
  appUrl: string
  hashedToken: string
  // generateLink's properties.verification_type — 'signup' for a user who
  // has never confirmed, 'magiclink' otherwise. verifyOtp needs the match.
  verificationType: string | undefined
  // Already run through safeConfirmRedirect() by the caller.
  redirect: string | undefined
}): string {
  const query = new URLSearchParams({ token_hash: params.hashedToken })
  query.set('type', isEmailConfirmOtpType(params.verificationType) ? params.verificationType : 'magiclink')
  if (params.redirect) query.set('redirect', params.redirect)
  return `${params.appUrl}/auth/confirm/verify?${query.toString()}`
}
