import EventsClient from './EventsClient'
import RequirePermission from '../../../../components/RequirePermission'

export default function EventsPage() {
  return <RequirePermission permission="school.events.view"><EventsClient /></RequirePermission>
}
