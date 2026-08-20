'use client'

import CollectionsListClient from '@/components/marketplace/CollectionsListClient'

export default function DashboardCollectionsPage() {
  return (
    <CollectionsListClient
      apiBase="/api/dashboard/marketplace"
      itemHref={id => `/dashboard/school/store/collections/${id}`}
      backHref="/dashboard/school/store"
    />
  )
}
