import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { createAdminClient } from '@/lib/supabase/admin'

const ANONYMIZED_EMAIL_DOMAIN = 'deleted.martialapp.invalid'

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Uploads always write to `avatars/{supabaseAuthId}.{ext}` (apps/web/app/my/profile/page.tsx),
// but the extension is an unvalidated client-supplied value (input accepts
// `image/*`) — a user who uploaded a .jpg and later replaced it with a .png
// would otherwise leave the .jpg permanently orphaned if we only look at the
// current avatarUrl. This matches the exact `{supabaseAuthId}.{anything but
// a dot}` filename shape, on the name only (not the `avatars/` prefix
// storage.list()'s `search` already scopes the listing to).
function isOwnAvatarFile(fileName: string, supabaseAuthId: string): boolean {
  return new RegExp(`^${escapeRegExp(supabaseAuthId)}\\.[^.]+$`).test(fileName)
}

type AvatarCleanupResult = { ok: true } | { ok: false, reason: 'list_failed' | 'remove_failed' }

// storage.list()'s `search` option is a loose substring match, not an exact
// key lookup — filtering by isOwnAvatarFile() below is what actually
// guarantees this never touches another user's file (a UUID collision as a
// pure substring is practically impossible, but "practically impossible"
// isn't the bar for a delete operation).
async function removeAvatarFiles(admin: ReturnType<typeof createAdminClient>, supabaseAuthId: string): Promise<AvatarCleanupResult> {
  const { data: files, error: listError } = await admin.storage.from('avatars').list('avatars', { search: supabaseAuthId })
  if (listError) {
    console.error('[delete-account] Failed to list avatar files:', listError)
    return { ok: false, reason: 'list_failed' }
  }

  const ownFiles = (files ?? []).filter(f => isOwnAvatarFile(f.name, supabaseAuthId))
  if (ownFiles.length === 0) return { ok: true }

  const { error: removeError } = await admin.storage.from('avatars').remove(ownFiles.map(f => `avatars/${f.name}`))
  if (removeError) {
    console.error('[delete-account] Failed to remove avatar file(s) from storage:', removeError)
    return { ok: false, reason: 'remove_failed' }
  }
  return { ok: true }
}

export async function DELETE() {
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
    select: { id: true, supabaseAuthId: true, deletedAt: true },
  })
  if (!dbUser?.supabaseAuthId || dbUser.deletedAt) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const admin = createAdminClient()
  const anonymizedEmail = `deleted+${dbUser.id}@${ANONYMIZED_EMAIL_DOMAIN}`

  // Fail closed, before touching PII or revoking login: if we can't confirm
  // the public photo is gone, don't declare the account deleted. Nothing
  // below this point has run yet, so the whole request is safely retryable
  // (the profile page still shows the same avatar it did before the call).
  const avatarCleanup = await removeAvatarFiles(admin, dbUser.supabaseAuthId)
  if (!avatarCleanup.ok) {
    return NextResponse.json(
      { error: 'Could not confirm your profile photo was removed. Please try again.', code: avatarCleanup.reason },
      { status: 502 },
    )
  }

  await prisma.$transaction(async tx => {
    await tx.user.update({
      where: { id: dbUser.id },
      data: {
        name: null,
        phone: null,
        avatarUrl: null,
        dateOfBirth: null,
        email: anonymizedEmail,
        deletedAt: new Date(),
      },
    })
    // PII retention policy (decided explicitly, not a default): waiver
    // signatures/IPs, SchoolMember medical/emergency notes, and LoginHistory
    // snapshots are kept as-is — each has a legitimate reason to survive
    // (liability proof, safety-incident records, security audit trail — the
    // last one is designed into the schema itself, see LoginHistory's own
    // comment). Lead is the one exception: it's marketing/CRM data with no
    // such reason to persist once someone has asked to be forgotten.
    await tx.lead.updateMany({
      where: { convertedUserId: dbUser.id },
      data: { name: 'Deleted user', email: null, phone: null },
    })
  })

  const { error } = await admin.auth.admin.deleteUser(dbUser.supabaseAuthId)
  if (!error) {
    await prisma.user.update({ where: { id: dbUser.id }, data: { supabaseAuthId: null } })
    return NextResponse.json({ ok: true })
  }

  console.error('[delete-account] Failed to delete Supabase auth user, falling back to ban:', error)

  // deleteUser can fail (e.g. transient API error) and would otherwise leave
  // a fully anonymized row still reachable through a live Supabase session —
  // resolveDbUser()'s deletedAt check closes that for every route already
  // migrated to getAuthUser(), but banning here closes it at the source too,
  // for any caller that isn't. ban_duration takes a Go duration string;
  // GoTrue has no literal "forever", so this uses a ~100 year ban instead.
  // Combined with `email` in the same call — AdminUserAttributes accepts
  // both together (confirmed in @supabase/auth-js's type definitions), so
  // this can't land in a state where the ban applied but the original email
  // is still stuck on the banned Supabase user (or vice versa).
  const { error: banError } = await admin.auth.admin.updateUserById(dbUser.supabaseAuthId, {
    ban_duration: '876000h',
    email: anonymizedEmail,
  })
  if (banError) {
    console.error('[delete-account] Ban fallback also failed:', banError)
    return NextResponse.json({ error: 'Account anonymized, but login removal failed. Contact support.' }, { status: 502 })
  }

  return NextResponse.json({ ok: true, banned: true })
}
