import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { createAdminClient } from '@/lib/supabase/admin'
import { isApplePrivateRelayEmail } from '@/lib/privateRelay'
import { isRateLimited } from '@/lib/rateLimit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// POST /api/my/email — lets someone who signed in with Apple "Hide My Email"
// swap that relay address for a real one. Deliberately NOT a general email
// change: it only works while the current email is an Apple relay address
// (email is the login identifier, see the account-type decision — everything
// else stays admin/support-only). Apple identities link by Apple's own id, so
// "Continue with Apple" keeps working after the swap.
export async function POST(req: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({
    where: { supabaseAuthId: authUser.id },
    select: { id: true, email: true, deletedAt: true },
  })
  if (!dbUser || dbUser.deletedAt) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (!isApplePrivateRelayEmail(dbUser.email)) {
    return NextResponse.json({ error: 'Email can only be changed from an Apple private relay address' }, { status: 403 })
  }
  if (isRateLimited(`my-email:${dbUser.id}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
  }

  let body: { email?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  const newEmail = body.email?.trim().toLowerCase() ?? ''
  if (!EMAIL_RE.test(newEmail) || isApplePrivateRelayEmail(newEmail)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }

  const taken = await prisma.user.findFirst({
    where: { email: { equals: newEmail, mode: 'insensitive' }, id: { not: dbUser.id } },
    select: { id: true },
  })
  if (taken) {
    return NextResponse.json({ error: 'That email is already used by another account.' }, { status: 409 })
  }

  const admin = createAdminClient()
  const { error: authError } = await admin.auth.admin.updateUserById(authUser.id, { email: newEmail, email_confirm: true })
  if (authError) {
    const exists = /already|registered|exists/i.test(authError.message)
    if (!exists) console.error('[my/email] auth update failed:', authError)
    return NextResponse.json(
      { error: exists ? 'That email is already used by another account.' : 'Could not update your email. Please try again.' },
      { status: exists ? 409 : 500 },
    )
  }

  try {
    await prisma.user.update({ where: { id: dbUser.id }, data: { email: newEmail } })
  } catch (err) {
    console.error('[my/email] prisma update failed, reverting auth email:', err)
    await admin.auth.admin.updateUserById(authUser.id, { email: dbUser.email, email_confirm: true }).catch(() => {})
    return NextResponse.json({ error: 'Could not update your email. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, email: newEmail })
}
