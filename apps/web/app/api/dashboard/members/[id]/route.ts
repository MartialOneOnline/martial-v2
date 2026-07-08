import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { hasPermission } from '@/lib/auth/permissions'

function getAdminSupabase() {
  const key = process.env.SUPABASE_SECRET_KEY
  if (!key) throw new Error('Supabase service key not configured')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// PATCH /api/dashboard/members/[id] — update status, belt, or beltDegree
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })

  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!hasPermission(member.role, 'school.members.update')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { id } = await params
  const body = await req.json()
  const { status, belt, beltRankId, beltDegree, notes, beltDate } = body

  // Verify the member belongs to this school
  const existing = await prisma.schoolMember.findFirst({
    where: { id, schoolId },
  })
  if (!existing) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  // beltRankId is an enrichment FK — validate it belongs to this school's
  // grading system before trusting it (belt freeform text stays the source
  // of truth for display regardless).
  if (beltRankId) {
    const rank = await prisma.beltRank.findFirst({
      where: { id: beltRankId, system: { schoolId } },
    })
    if (!rank) return NextResponse.json({ error: 'Invalid beltRankId for this school' }, { status: 400 })
  }

  const updated = await prisma.schoolMember.update({
    where: { id },
    data: {
      ...(status !== undefined && { status }),
      ...(belt !== undefined && { belt }),
      ...(beltRankId !== undefined && { beltRankId }),
      ...(beltDegree !== undefined && { beltDegree }),
      ...(notes !== undefined && { notes }),
      ...(beltDate !== undefined && { beltDate: beltDate ? new Date(beltDate) : null }),
    },
    select: { id: true, status: true, belt: true, beltRankId: true, beltDegree: true },
  })

  return NextResponse.json({ member: updated })
}

// DELETE /api/dashboard/members/[id] — permanently delete member + user record
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })

  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!hasPermission(member.role, 'school.members.delete')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { id } = await params

  const existing = await prisma.schoolMember.findFirst({
    where: { id, schoolId },
    select: { id: true, userId: true, user: { select: { email: true } } },
  })
  if (!existing) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  // Delete the school membership
  await prisma.schoolMember.delete({ where: { id } })

  // The lead that brought this person in (if any) is no longer an active
  // prospect once their membership is gone — free up their email so the
  // public join form doesn't reject them as "already registered" forever.
  if (existing.user.email) {
    await prisma.lead.updateMany({
      where: { schoolId, email: existing.user.email, status: { not: 'LOST' } },
      data: { status: 'LOST' },
    })
  }

  // Delete the user only if they have no other school memberships
  const otherMemberships = await prisma.schoolMember.count({ where: { userId: existing.userId } })
  if (otherMemberships === 0) {
    const dbUser = await prisma.user.findUnique({
      where: { id: existing.userId },
      select: { supabaseAuthId: true },
    })
    await prisma.user.delete({ where: { id: existing.userId } })
    // Also delete from Supabase Auth so the email can be re-invited cleanly
    if (dbUser?.supabaseAuthId) {
      try {
        await getAdminSupabase().auth.admin.deleteUser(dbUser.supabaseAuthId)
      } catch (err) {
        console.error('[delete-member] Failed to delete Supabase auth user:', err)
      }
    }
  }

  return NextResponse.json({ ok: true })
}
