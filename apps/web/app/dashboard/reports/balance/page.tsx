import BalanceReportClient from './BalanceReportClient'
import RequirePermission from '../../../../components/RequirePermission'

export default function BalanceReportPage() {
  return <RequirePermission permission="school.analytics.view"><BalanceReportClient /></RequirePermission>
}
