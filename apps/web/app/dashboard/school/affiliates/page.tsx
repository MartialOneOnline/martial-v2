import AffiliatesClient from './AffiliatesClient'
import RequirePermission from '../../../../components/RequirePermission'
export default function AffiliatesPage() {
  return <RequirePermission permission="school.affiliates.view"><AffiliatesClient /></RequirePermission>
}
