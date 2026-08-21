import PaymentSubscriptionsClient from './PaymentSubscriptionsClient'
import RequirePermission from '../../../../components/RequirePermission'
export default function PaymentSubscriptionsPage() {
  return <RequirePermission permission="school.memberships.view"><PaymentSubscriptionsClient /></RequirePermission>
}
