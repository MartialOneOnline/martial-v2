'use client'

import { use } from 'react'
import CollectionBuilderClient from '@/components/marketplace/CollectionBuilderClient'

export default function AdminCollectionBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <CollectionBuilderClient
      apiBase="/api/admin/marketplace"
      collectionId={id}
      backHref="/admin/marketplace/collections"
      marketplaceBaseUrl="/marketplace"
      verifyBaseUrl="/collectibles/verify"
    />
  )
}
