import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'

const preferenceSelect = {
  notifyClassReminders: true,
  notifyBookingConfirmed: true,
  notifyMembershipUpdates: true,
  notifyPromotions: true,
} as const

async function getDbUserId() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const dbUser = await prisma.user.findUnique({ where: { supabaseAuthId: user.id }, select: { id: true, deletedAt: true } })
  // A self-deleted account may still hold a live Supabase session — see
  // DELETE /api/my/account — never treat it as authenticated again.
  return dbUser?.deletedAt ? null : dbUser
}

export async function GET() {
  const user = await getDbUserId()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const preferences = await prisma.userPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
    select: preferenceSelect,
  })
  return NextResponse.json({ preferences })
}

export async function PATCH(req: Request) {
  const user = await getDbUserId()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const data: Partial<Record<keyof typeof preferenceSelect, boolean>> = {}
  for (const key of Object.keys(preferenceSelect) as Array<keyof typeof preferenceSelect>) {
    if (body[key] === undefined) continue
    if (typeof body[key] !== 'boolean') {
      return NextResponse.json({ error: `${key} must be a boolean` }, { status: 400 })
    }
    data[key] = body[key]
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No supported preferences supplied' }, { status: 400 })
  }

  const preferences = await prisma.userPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
    select: preferenceSelect,
  })
  return NextResponse.json({ preferences })
}
