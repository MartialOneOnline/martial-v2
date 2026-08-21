import LeadsClient from './LeadsClient'
import RequirePermission from '../../../../components/RequirePermission'
export default function LeadsPage() {
  return <RequirePermission permission="school.leads.view"><LeadsClient /></RequirePermission>
}
