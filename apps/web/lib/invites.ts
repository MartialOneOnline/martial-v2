import { randomBytes } from 'crypto'
import { prisma } from '@/lib/db'
import { APP_URL } from '@/lib/email/resend'

// Our own invite link, decoupled from Supabase's shared Email OTP expiry
// (which also gates magic-link login and password reset — bumping that
// globally would weaken those too). The email only ever carries this token;
// a real Supabase sign-in link is minted from admin.generateLink() at
// redeem time (see /api/auth/invite/[token]/route.ts), so Supabase's own
// short OTP window only has to survive the few seconds between redeem and
// redirect, not the days an invitee takes to check their inbox.
export const INVITE_TOKEN_TTL_DAYS = 7

// 32 random bytes, base64url — unguessable and URL-safe with no padding to escape.
function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

/**
 * Creates an invite token and returns the URL to email. `redirectTo` is
 * where the user lands (with a Supabase session) after the token redeems —
 * same value that used to go straight into generateLink's `redirectTo`.
 */
export async function createInviteUrl(params: {
  email: string
  schoolId: string
  redirectTo: string
}): Promise<string> {
  const token = generateToken()
  await prisma.inviteToken.create({
    data: {
      token,
      email: params.email,
      schoolId: params.schoolId,
      redirectTo: params.redirectTo,
      expiresAt: new Date(Date.now() + INVITE_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  })
  return `${APP_URL}/api/auth/invite/${token}`
}
