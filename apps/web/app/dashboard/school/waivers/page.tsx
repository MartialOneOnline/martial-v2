import WaiversClient from './WaiversClient'
import RequirePermission from '../../../../components/RequirePermission'
export default function WaiversPage() {
  return <RequirePermission permission="school.waivers.manage"><WaiversClient /></RequirePermission>
}
