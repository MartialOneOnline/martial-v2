import StoreClient from './StoreClient'
import RequirePermission from '../../../../components/RequirePermission'
export default function StorePage() {
  return <RequirePermission permission="school.marketplace.view"><StoreClient /></RequirePermission>
}
