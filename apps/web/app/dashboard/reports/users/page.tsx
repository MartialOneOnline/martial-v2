import UsersReportClient from './UsersReportClient'
import { getCurrentSchoolId } from '@/lib/auth/server'
import { getGradingEnabledForSchool } from '@/lib/grading/moduleServer'

const asList = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v])

// ?belt=<key>&belt=<key>&degree=2 — a shareable "blue + purple belts" view
export default async function UsersReportPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  // Resolved here so the belt chart, column and export never depend on load
  // timing. Access itself is enforced by the report API.
  const schoolId = await getCurrentSchoolId()
  const gradingEnabled = schoolId ? await getGradingEnabledForSchool(schoolId) : undefined
  return (
    <UsersReportClient
      gradingEnabled={gradingEnabled}
      // A belt link is meaningless with the module off — drop it before the first request
      initialFilters={gradingEnabled === false ? { belts: [], degrees: [] } : {
        belts: asList(sp.belt).filter(Boolean),
        degrees: asList(sp.degree).map(Number).filter(n => Number.isInteger(n) && n >= 0),
      }}
    />
  )
}
