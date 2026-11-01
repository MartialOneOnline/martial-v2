import LeadsClient from './LeadsClient'
import RequirePermission from '../../../../components/RequirePermission'

// ?lead=<id> opens that lead's detail (linked from the Leads report)
export default async function LeadsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const lead = typeof sp.lead === 'string' ? sp.lead : null
  return <RequirePermission permission="school.leads.view"><LeadsClient initialLeadId={lead} /></RequirePermission>
}
