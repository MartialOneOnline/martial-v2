import MembershipsClient from './MembershipsClient'
import RequirePermission from '../../../components/RequirePermission'

export default function MembershipsPage() {
  return <RequirePermission permission="school.memberships.view"><MembershipsClient /></RequirePermission>
}
