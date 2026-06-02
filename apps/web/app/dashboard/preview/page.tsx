import DashboardClient from '../DashboardClient'

// Preview route — no auth required, simulated data only
export default function DashboardPreview() {
  return (
    <DashboardClient
      userName="Pablo Cabo"
      userEmail="pablo@rogergraciemalaga.com"
      userRole="academy"
    />
  )
}
