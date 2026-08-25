'use client'

import { use } from 'react'
import CollectionBuilderClient from '@/components/marketplace/CollectionBuilderClient'
import RequirePermission from '@/components/RequirePermission'

export default function DashboardCollectionBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <RequirePermission permission="school.marketplace.view">
      <CollectionBuilderClient
        apiBase="/api/dashboard/marketplace"
        collectionId={id}
        backHref="/dashboard/school/store/collections"
        marketplaceBaseUrl="/marketplace"
        verifyBaseUrl="/collectibles/verify"
      />
    </RequirePermission>
  )
}
