import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from './db'
import type { EmailChangeError } from './emailChange'

// HTTP status per error code. The body is always { error: <code> } so the
// client shows the message in the user's language (t.relayEmail.errors).
const STATUS: Record<EmailChangeError | 'unauthorized' | 'rate_limited' | 'bad_request', number> = {
  unauthorized: 401,
  bad_request: 400,
  invalid_email: 400,
  not_relay: 403,
  email_taken: 409,
  too_soon: 429,
  rate_limited: 429,
  send_failed: 502,
  no_pending: 404,
  code_expired: 410,
  invalid_code: 400,
  too_many_attempts: 429,
  busy: 409,
  update_failed: 500,
  email_locked: 423,
  account_changed: 409,
}

export function emailChangeError(code: keyof typeof STATUS) {
  return NextResponse.json({ error: code }, { status: STATUS[code] })
}

// The signed-in user (Prisma id + Supabase auth id), or null.
export async function getEmailChangeUser(): Promise<{ id: string; authId: string; email: string } | null> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return null
  const dbUser = await prisma.user.findUnique({
    where: { supabaseAuthId: authUser.id },
    select: { id: true, email: true, deletedAt: true },
  })
  if (!dbUser || dbUser.deletedAt) return null
  return { id: dbUser.id, authId: authUser.id, email: dbUser.email }
}
