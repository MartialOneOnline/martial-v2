import PaymentsReportClient from './PaymentsReportClient'
import RequirePermission from '../../../../components/RequirePermission'

export default function PaymentsReportPage() {
  return <RequirePermission permission="school.analytics.view"><PaymentsReportClient /></RequirePermission>
}
