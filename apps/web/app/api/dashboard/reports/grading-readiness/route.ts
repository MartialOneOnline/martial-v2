import { NextResponse } from 'next/server'
import { getAuthUser, getCurrentSchoolId, requireDashboardAccess } from '@/lib/auth/server'
import { getReadinessForSchool } from '@/lib/grading/readinessData'

// GET /api/dashboard/reports/grading-readiness
// Active/frozen students of the current school with their grading readiness.
// Staff-only: requireDashboardAccess() rejects STUDENT members.
export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })
  try { await requireDashboardAccess(schoolId) }
  catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const rows = await getReadinessForSchool(schoolId)
  const counts = { READY: 0, ALMOST_READY: 0, NOT_READY: 0, NO_RULES: 0, TOP_RANK: 0 }
  for (const r of rows) counts[r.readiness.status]++

  // Most overdue first (most steps due), then closest to the next step.
  const order = { READY: 0, ALMOST_READY: 1, NOT_READY: 2, NO_RULES: 3, TOP_RANK: 4 }
  rows.sort((a, b) =>
    order[a.readiness.status] - order[b.readiness.status]
    || (b.readiness.due?.count ?? 0) - (a.readiness.due?.count ?? 0)
    || (b.readiness.percent ?? -1) - (a.readiness.percent ?? -1)
    || a.name.localeCompare(b.name))

  return NextResponse.json({ counts, students: rows })
}
