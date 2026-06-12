import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { requireSchoolAccess } from '@/lib/auth/contexts'

// POST /api/auth/context — switch active school context
// Sets HttpOnly cookie + updates UserPreference
export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { schoolId } = await req.json()
  if (!schoolId) return NextResponse.json({ error: 'schoolId required' }, { status: 400 })

  // Always validate against SchoolMember — cookie is context hint, not authorization
  try {
    await requireSchoolAccess(user.id, schoolId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Persist preference in DB (cross-device)
  await prisma.userPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id, lastSchoolId: schoolId, lastContextType: 'SCHOOL' },
    update: { lastSchoolId: schoolId, lastContextType: 'SCHOOL' },
  })

  const res = NextResponse.json({ ok: true, schoolId })

  // Set HttpOnly cookie for server-side reads (7 days)
  res.cookies.set('currentSchoolId', schoolId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return res
}

// DELETE /api/auth/context — clear school context (go to personal area)
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set('currentSchoolId', '', { maxAge: 0, path: '/' })
  return res
}
