import StaffClient from './StaffClient'
import RequirePermission from '../../../../components/RequirePermission'
export default function StaffPage() {
  return <RequirePermission permission="school.staff.view"><StaffClient /></RequirePermission>
}
