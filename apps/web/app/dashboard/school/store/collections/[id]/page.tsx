'use client'

import { use } from 'react'
import CollectionBuilderClient from '@/components/marketplace/CollectionBuilderClient'

export default function DashboardCollectionBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <CollectionBuilderClient
      apiBase="/api/dashboard/marketplace"
      collectionId={id}
      backHref="/dashboard/school/store/collections"
      marketplaceBaseUrl="/marketplace"
      verifyBaseUrl="/collectibles/verify"
    />
  )
}
