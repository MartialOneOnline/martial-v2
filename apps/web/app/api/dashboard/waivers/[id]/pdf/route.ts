import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authoriseWaivers } from '../../_authorise'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY!

// GET /api/dashboard/waivers/[id]/pdf — short-lived signed URL to the
// stored waiver PDF. The "waivers" Storage bucket is private (unlike
// "avatars"), so this always goes through the service-role sign endpoint
// rather than a public URL — see app/api/my/waivers/[id]/sign/route.ts for
// where pdfPath is written.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authoriseWaivers()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const userWaiver = await prisma.userWaiver.findUnique({
    where: { id },
    select: { pdfPath: true, waiver: { select: { schoolId: true } } },
  })
  if (!userWaiver || userWaiver.waiver.schoolId !== auth.schoolId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (!userWaiver.pdfPath) {
    return NextResponse.json({ error: 'No PDF available for this waiver yet' }, { status: 404 })
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
