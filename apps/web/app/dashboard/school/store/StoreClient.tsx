'use client'

import { Menu } from 'lucide-react'
import { useDashboard } from '../../../../components/DashboardShell'
import NotificationBell from '../../../../components/NotificationBell'
import { useT } from '../../../../lib/i18n/LanguageContext'
import MarketplaceProductsClient from '../../../../components/marketplace/MarketplaceProductsClient'

export default function StoreClient() {
  const t = useT()
  const { setMenuOpen } = useDashboard()
  return (
    <MarketplaceProductsClient
      apiBase="/api/dashboard/marketplace"
      collectionsBasePath="/dashboard/school/store/collections"
      title={t.school.storeTitle}
      subtitle={t.school.storeSubtitle}
      mobileMenuButton={
        <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(true)}>
          <Menu size={16} style={{ color: '#374151' }} />
        </button>
      }
      topBarExtra={<NotificationBell />}
    />
  )
}
