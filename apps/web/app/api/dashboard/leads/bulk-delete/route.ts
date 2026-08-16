import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { hasPermission } from '@/lib/auth/permissions'

async function authorise() {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 }
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!hasPermission(member.role, 'school.leads.manage')) return { error: 'Forbidden', status: 403 }
    } catch {
      return { error: 'Forbidden', status: 403 }
    }
  }
  return { schoolId }
}

// POST /api/dashboard/leads/bulk-delete — delete many leads at once
export async function POST(req: NextRequest) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { ids } = await req.json()
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every(id => typeof id === 'string')) {
    return NextResponse.json({ error: 'ids must be a non-empty array of strings' }, { status: 400 })
  }

  const { count } = await prisma.lead.deleteMany({ where: { id: { in: ids }, schoolId: auth.schoolId } })
  return NextResponse.json({ ok: true, count })
}
