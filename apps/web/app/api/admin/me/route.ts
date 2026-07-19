import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/server'

// No callers of this route were found anywhere in the app (grepped
// app/components/lib) — app/admin/layout.tsx does its own SUPERADMIN gate
// via getAuthUser() directly. This route also had a pre-existing bug: it
// queried `prisma.user.findUnique({ where: { id: user.id } })` using the
// Supabase auth UUID against Prisma's own cuid primary key, which can never
// match a real row — every call always 403'd. Migrating to getAuthUser()
// (same helper app/admin/layout.tsx already trusts) fixes that lookup and
// adds the deletedAt gate in one change, since the old query gave no
// meaningful base to gate on top of.
export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ role: user.role })
}
