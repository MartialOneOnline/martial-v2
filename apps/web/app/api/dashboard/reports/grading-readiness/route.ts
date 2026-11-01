import { NextResponse } from 'next/server'
import { getAuthUser, getCurrentSchoolId, requireDashboardAccess } from '@/lib/auth/server'
import { getReadinessForSchool } from '@/lib/grading/readinessData'
import { OVERDUE_DAYS, compareGradingQueue, isOverdue } from '@/lib/grading/overdue'

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
  // Owed for 2+ weeks, and new students (first months) owed anything
  const overdue = rows.filter(isOverdue).length
  const newDue = rows.filter(r => r.isNew && r.readiness.status === 'READY').length

  rows.sort(compareGradingQueue)

  return NextResponse.json({ counts, overdue, newDue, overdueDays: OVERDUE_DAYS, students: rows })
}
