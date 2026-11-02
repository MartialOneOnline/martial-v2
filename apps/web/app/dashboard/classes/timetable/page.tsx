import TimetableClient from './TimetableClient'
import RequirePermission from '../../../../components/RequirePermission'

export default function TimetablePage() {
  return <RequirePermission permission="school.classes.view"><TimetableClient /></RequirePermission>
}
