import GradingsClient from './GradingsClient'
import GradingModuleGate from '../../../../components/grading/GradingModuleGate'
import RequirePermission from '../../../../components/RequirePermission'

export default function GradingsPage() { return <RequirePermission permission="school.gradings.manage"><GradingModuleGate><GradingsClient /></GradingModuleGate></RequirePermission> }
