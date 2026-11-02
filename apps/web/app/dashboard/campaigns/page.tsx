import CampaignsClient from './CampaignsClient'
import RequirePermission from '../../../components/RequirePermission'

export default function CampaignsPage() {
  return <RequirePermission permission="school.campaigns.view"><CampaignsClient /></RequirePermission>
}
