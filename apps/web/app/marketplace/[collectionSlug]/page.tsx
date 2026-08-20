import MarketplaceCollectionClient from './MarketplaceCollectionClient'

export default async function MarketplaceCollectionPage({ params }: { params: Promise<{ collectionSlug: string }> }) {
  const { collectionSlug } = await params
  return <MarketplaceCollectionClient slug={collectionSlug} />
}
