import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { guardSuperadmin, guardSuperadminUser } from '@/lib/auth/server'
import { MergeConflictError, runAccountMerge, type Side } from '@/lib/accountMerge'
import { buildMergePreview, prismaMergeDeps, supabaseAuthAdmin } from '@/lib/accountMergeServer'

// Claims + up to 4 Auth calls (10 s each, aborted) + one short transaction.
export const maxDuration = 60

const isSide = (v: unknown): v is Side => v === 'keep' || v === 'merge'

// GET /api/admin/users/merge?keepId=&mergeId=[&loginFrom=&emailFrom=][&suggest=1]
// Side-by-side preview: what each account has, what the merge will do and
// anything that blocks it. suggest=1 lets the server pick which one to keep.
export async function GET(req: NextRequest) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const sp = req.nextUrl.searchParams
  const keepId = sp.get('keepId')
  const mergeId = sp.get('mergeId')
  if (!keepId || !mergeId) return NextResponse.json({ error: 'keepId and mergeId are required' }, { status: 400 })
  const loginFrom = sp.get('loginFrom')
  const emailFrom = sp.get('emailFrom')

  const preview = await buildMergePreview(supabaseAuthAdmin(), {
    keepId,
    mergeId,
    loginFrom: isSide(loginFrom) ? loginFrom : undefined,
    emailFrom: isSide(emailFrom) ? emailFrom : undefined,
    suggest: sp.get('suggest') === '1',
  })
  if (!preview) return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  return NextResponse.json(preview)
}

// POST /api/admin/users/merge — irreversible, so gated behind the admin's own
// password like permanent user delete.
export async function POST(req: NextRequest) {
  const admin = await guardSuperadminUser(req)
  if (admin instanceof NextResponse) return admin

  const body = await req.json().catch(() => null)
  const { keepId, mergeId, loginFrom, emailFrom, password } = body ?? {}
  if (typeof keepId !== 'string' || typeof mergeId !== 'string' || !isSide(loginFrom) || !isSide(emailFrom)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (typeof password !== 'string' || !password) {
    return NextResponse.json({ error: 'Password is required to merge accounts' }, { status: 400 })
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!)
  const { error: pwError } = await supabase.auth.signInWithPassword({ email: admin.email, password })
  // 403, not 401: adminFetch() treats any 401 as an expired session and
  // redirects to /login, which would throw the admin out on a typo.
  if (pwError) return NextResponse.json({ error: 'Incorrect password' }, { status: 403 })

  try {
    const result = await runAccountMerge(prismaMergeDeps(supabaseAuthAdmin()), { keepId, mergeId, loginFrom, emailFrom }, admin.id)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof MergeConflictError) return NextResponse.json({ error: err.message }, { status: 409 })
    console.error('[admin/users/merge] failed', err)
    return NextResponse.json({ error: 'Merge failed — nothing in the database changed. You can run it again.' }, { status: 500 })
  }
}
