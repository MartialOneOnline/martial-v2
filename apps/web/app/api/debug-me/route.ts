import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/db'

export async function GET() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No Supabase session' })

  // Check by supabaseAuthId
  const byAuthId = await prisma.user.findUnique({
    where: { supabaseAuthId: user.id },
    select: { id: true, email: true, role: true },
  })

  // Check by email
  const byEmail = await prisma.user.findUnique({
    where: { email: user.email! },
    select: { id: true, email: true, role: true, supabaseAuthId: true },
  })

  return NextResponse.json({
    supabaseId: user.id,
    supabaseEmail: user.email,
    byAuthId,
    byEmail,
  })
}
