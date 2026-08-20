'use client'

import CollectionsListClient from '@/components/marketplace/CollectionsListClient'

export default function AdminCollectionsPage() {
  return (
    <CollectionsListClient
      apiBase="/api/admin/marketplace"
      itemHref={id => `/admin/marketplace/collections/${id}`}
      backHref="/admin/marketplace"
    />
  )
}
