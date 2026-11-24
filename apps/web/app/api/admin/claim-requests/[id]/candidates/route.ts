import { NextRequest, NextResponse } from 'next/server'
import { guardSuperadmin } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import { findCandidateSchools } from '@/lib/claims/candidates'

// GET /api/admin/claim-requests/[id]/candidates?q= — schools to review for
// this request (scored hints, never linked automatically).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny
  const { id } = await params
  const r = await prisma.claimRequest.findUnique({ where: { id }, select: { schoolName: true, city: true, contactEmail: true, sourceSchoolId: true } })
  if (!r) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const q = (new URL(req.url).searchParams.get('q') ?? '').slice(0, 100)
  return NextResponse.json({ candidates: await findCandidateSchools(r, q || undefined) })
}
