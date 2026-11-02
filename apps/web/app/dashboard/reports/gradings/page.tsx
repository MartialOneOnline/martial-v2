import GradingsReportClient from './GradingsReportClient'
import GradingModuleGate from '../../../../components/grading/GradingModuleGate'
import RequirePermission from '../../../../components/RequirePermission'

export default function GradingsReportPage() {
  return <RequirePermission permission="school.analytics.view"><GradingModuleGate><GradingsReportClient /></GradingModuleGate></RequirePermission>
}
