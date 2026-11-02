import CampaignDetailClient from './CampaignDetailClient'
import RequirePermission from '../../../../components/RequirePermission'

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <RequirePermission permission="school.campaigns.view"><CampaignDetailClient campaignId={id} /></RequirePermission>
}
