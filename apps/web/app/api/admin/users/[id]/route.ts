import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/db'
import { Prisma } from '@/lib/prisma-client/client'
import { guardSuperadmin, guardSuperadminUser } from '@/lib/auth/server'

// GET /api/admin/users/[id] — full record for the admin Edit modal
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const { id } = await params
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, phone: true, role: true },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ user })
}

// PATCH /api/admin/users/[id] — edit user details
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const { id } = await params
  const body = await req.json()
  const { name, email, phone, role } = body

  if (email !== undefined && !email.trim()) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name?.trim() || null }),
        ...(email !== undefined && { email: email.trim() }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(role !== undefined && { role }),
      },
    })
    return NextResponse.json({ user })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: 'Another account already uses that email' }, { status: 409 })
    }
    throw err
  }
}

// DELETE /api/admin/users/[id] — permanent delete, gated behind re-entering the
// admin's own password. Most User relations have no cascade, so Postgres will
// reject the delete outright if the user has real activity (bookings, etc.)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guardSuperadminUser(req)
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (target.role === 'SUPERADMIN') {
    return NextResponse.json({ error: 'Cannot delete a Super Admin account' }, { status: 403 })
  }

  const { password } = await req.json().catch(() => ({ password: undefined }))
  if (!password) {
    return NextResponse.json({ error: 'Password is required to permanently delete a user' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
  const { error } = await supabase.auth.signInWithPassword({ email: auth.email, password })
  if (error) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  try {
    await prisma.user.delete({ where: { id } })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
      return NextResponse.json({
        error: 'This user has bookings, memberships, or other activity and can’t be deleted. Ask their school to remove them first (Dashboard → Users), then try again.',
      }, { status: 409 })
    }
    throw err
  }

  return NextResponse.json({ ok: true })
}
