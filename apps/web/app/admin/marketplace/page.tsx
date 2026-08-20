'use client'

import { Menu } from 'lucide-react'
import { useAdminShell } from '../AdminLayoutClient'
import MarketplaceProductsClient from '@/components/marketplace/MarketplaceProductsClient'

export default function AdminMarketplaceProductsPage() {
  const { menuOpen, setMenuOpen } = useAdminShell()
  return (
    <MarketplaceProductsClient
      apiBase="/api/admin/marketplace"
      collectionsBasePath="/admin/marketplace/collections"
      title="Marketplace"
      subtitle="Products and collections sold directly by Martial"
      mobileMenuButton={
        <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(!menuOpen)}>
          <Menu size={16} style={{ color: '#374151' }} />
        </button>
      }
    />
  )
}
