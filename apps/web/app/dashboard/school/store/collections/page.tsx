'use client'

import CollectionsListClient from '@/components/marketplace/CollectionsListClient'
import RequirePermission from '@/components/RequirePermission'

export default function DashboardCollectionsPage() {
  return (
    <RequirePermission permission="school.marketplace.view">
      <CollectionsListClient
        apiBase="/api/dashboard/marketplace"
        itemHref={id => `/dashboard/school/store/collections/${id}`}
        backHref="/dashboard/school/store"
      />
    </RequirePermission>
  )
}
