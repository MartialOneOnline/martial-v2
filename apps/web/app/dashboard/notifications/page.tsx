import NotificationsClient from './NotificationsClient'
import RequirePermission from '../../../components/RequirePermission'

export default function NotificationsPage() {
  return <RequirePermission permission="school.notifications.view"><NotificationsClient /></RequirePermission>
}
