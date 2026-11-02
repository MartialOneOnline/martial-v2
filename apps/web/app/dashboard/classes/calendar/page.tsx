import CalendarClient from './CalendarClient'
import RequirePermission from '../../../../components/RequirePermission'

export default function CalendarPage() {
  return <RequirePermission permission="school.classes.view"><CalendarClient /></RequirePermission>
}
