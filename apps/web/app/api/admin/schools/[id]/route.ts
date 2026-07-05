import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/db'
import { guardSuperadmin, guardSuperadminUser } from '@/lib/auth/server'

// GET /api/admin/schools/[id] — full record for the admin Edit modal
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const { id } = await params
  const school = await prisma.school.findUnique({
    where: { id },
    select: {
      id: true, name: true, slug: true, status: true, type: true,
      email: true, phone: true, website: true, instagram: true,
      address: true, postcode: true, city: true, country: true,
      description: true, tagline: true,
    },
  })
  if (!school) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ school })
}

// PATCH /api/admin/schools/[id] — edit school details
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const { id } = await params
  const body = await req.json()
  const {
    name, email, phone, website, instagram,
    address, postcode, city, country,
    description, tagline, status, type,
  } = body

  if (name !== undefined && !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const school = await prisma.school.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(email !== undefined && { email: email?.trim() || null }),
      ...(phone !== undefined && { phone: phone?.trim() || null }),
      ...(website !== undefined && { website: website?.trim() || null }),
      ...(instagram !== undefined && { instagram: instagram?.trim() || null }),
      ...(address !== undefined && { address: address?.trim() || null }),
      ...(postcode !== undefined && { postcode: postcode?.trim() || null }),
      ...(city !== undefined && { city: city?.trim() || null }),
      ...(country !== undefined && { country: country?.trim() || null }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(tagline !== undefined && { tagline: tagline?.trim() || null }),
      ...(status !== undefined && { status }),
      ...(type !== undefined && { type }),
    },
    select: {
      id: true, name: true, slug: true, status: true, type: true,
      email: true, phone: true, website: true, instagram: true,
      address: true, postcode: true, city: true, country: true,
      description: true, tagline: true,
    },
  })

  return NextResponse.json({ school })
}

// DELETE /api/admin/schools/[id] — permanent hard delete, cascades to all related data.
// Requires the caller to re-enter their own password as a step-up confirmation,
// since this is the one irreversible action in the admin schools table.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guardSuperadminUser(req)
  if (auth instanceof NextResponse) return auth

  const { password } = await req.json().catch(() => ({ password: undefined }))
  if (!password) {
    return NextResponse.json({ error: 'Password is required to permanently delete a school' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
  const { error } = await supabase.auth.signInWithPassword({ email: auth.email, password })
  if (error) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  const { id } = await params
  await prisma.school.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
