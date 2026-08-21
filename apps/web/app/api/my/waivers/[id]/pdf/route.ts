import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY!

// GET /api/my/waivers/[id]/pdf — short-lived signed URL to the student's own
// signed waiver PDF. Mirrors the admin endpoint (api/dashboard/waivers/[id]/pdf)
// but scoped to the requesting user's own UserWaiver row.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const dbUser = await getAuthUser()
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const userWaiver = await prisma.userWaiver.findUnique({ where: { id }, select: { userId: true, pdfPath: true } })
  if (!userWaiver || userWaiver.userId !== dbUser.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (!userWaiver.pdfPath) {
    return NextResponse.json({ error: 'No signed copy available yet' }, { status: 404 })
  }

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/waivers/${userWaiver.pdfPath}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expiresIn: 300 }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return NextResponse.json({ error: err.message ?? 'Could not generate download link' }, { status: 500 })
  }
  const { signedURL } = await res.json()
  return NextResponse.json({ url: `${SUPABASE_URL}/storage/v1${signedURL}` })
}
