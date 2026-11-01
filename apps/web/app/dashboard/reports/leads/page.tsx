import LeadsReportClient from './LeadsReportClient'
import RequirePermission from '../../../../components/RequirePermission'

// Lists prospects' contact details — same permission as the Leads CRM page
export default function LeadsReportPage() {
  return <RequirePermission permission="school.leads.view"><LeadsReportClient /></RequirePermission>
}
