import BookingsReportClient from './BookingsReportClient'
import RequirePermission from '../../../../components/RequirePermission'

export default function BookingsReportPage() {
  return <RequirePermission permission="school.analytics.view"><BookingsReportClient /></RequirePermission>
}
