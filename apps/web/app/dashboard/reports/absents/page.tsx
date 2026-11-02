import AbsentsReportClient from './AbsentsReportClient'
import RequirePermission from '../../../../components/RequirePermission'

export default function AbsentsReportPage() {
  return <RequirePermission permission="school.analytics.view"><AbsentsReportClient /></RequirePermission>
}
