import TransactionsClient from './TransactionsClient'
import RequirePermission from '../../../../components/RequirePermission'
export default function TransactionsPage() {
  return <RequirePermission permission="school.payments.view"><TransactionsClient /></RequirePermission>
}
