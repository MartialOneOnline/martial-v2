'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, Megaphone, Users as UsersIcon } from 'lucide-react'
import { useDashboard } from '../../../components/DashboardShell'
import NotificationBell from '../../../components/NotificationBell'
import DashboardLanguageSelector from '../../../components/DashboardLanguageSelector'
import { useT } from '../../../lib/i18n/LanguageContext'
import type { CampaignType, CampaignStatus } from '../../../lib/prisma-client/enums'

type CampaignListItem = {
  id: string
  name: string
  type: CampaignType
  status: CampaignStatus
  totalRecipients: number
  sentCount: number
  failedCount: number
  convertedCount: number
  createdAt: string
  createdBy: { name: string | null } | null
}

const STATUS_STYLE: Record<CampaignStatus, { bg: string; color: string }> = {
  DRAFT: { bg: '#F3F4F6', color: '#6B7280' },
  QUEUED: { bg: '#EFF6FF', color: '#2563EB' },
  SENDING: { bg: '#EFF6FF', color: '#2563EB' },
  COMPLETED: { bg: '#F0FDF4', color: '#16A34A' },
  FAILED: { bg: '#FEF2F2', color: '#DC2626' },
  CANCELLED: { bg: '#F3F4F6', color: '#6B7280' },
}

export default function CampaignsClient() {
  const { menuOpen, setMenuOpen } = useDashboard()
  const t = useT()
  const router = useRouter()

  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/campaigns')
      .then(r => r.json())
      .then(d => setCampaigns(d.campaigns ?? []))
      .finally(() => setLoading(false))
  }, [])

  const TYPE_LABELS: Record<CampaignType, string> = {
    REMINDER: t.campaigns.typeReminder,
    DISCOUNT_OFFER: t.campaigns.typeDiscountOffer,
    BELT_PROGRESS: t.campaigns.typeBeltProgress,
    SEASONAL: t.campaigns.typeSeasonal,
    ANNIVERSARY: t.campaigns.typeAnniversary,
    CUSTOM: t.campaigns.typeCustom,
  }
  const STATUS_LABELS: Record<CampaignStatus, string> = {
    DRAFT: t.campaigns.statusDraft,
    QUEUED: t.campaigns.statusQueued,
    SENDING: t.campaigns.statusSending,
    COMPLETED: t.common.completed,
    FAILED: t.common.failed,
    CANCELLED: t.common.cancelled,
  }

  return (
    <main style={{ flex: 1, minWidth: 0, width: '100%', overflow: 'auto' }}>
      <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20"
        style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
        <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(!menuOpen)}>
          <Menu size={16} style={{ color: '#374151' }} />
        </button>
        <div className="flex-1" />
        <DashboardLanguageSelector />
        <NotificationBell />
      </div>

      <div className="px-4 md:px-8 py-6 flex flex-col gap-6">
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>{t.campaigns.pageTitle}</h1>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>{t.campaigns.pageSubtitle}</p>
        </div>

        <div className="rounded-2xl overflow-x-auto" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
          {!loading && campaigns.length === 0 ? (
            <div className="py-16 text-center">
              <Megaphone size={32} style={{ color: '#E5E7EB', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{t.campaigns.emptyTitle}</p>
              <p style={{ fontSize: 13, color: '#9CA3AF', margin: '4px 0 16px' }}>{t.campaigns.emptyBody}</p>
              <button onClick={() => router.push('/dashboard/users')}
                className="inline-flex items-center gap-2" style={{ fontSize: 13, fontWeight: 600, color: '#fff', background: '#0071E3', border: 'none', borderRadius: 999, padding: '8px 18px', cursor: 'pointer' }}>
                <UsersIcon size={14} />{t.sidebar.users}
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  {[t.campaigns.colName, t.campaigns.colType, t.common.status, t.campaigns.colSent, t.campaigns.colConverted, t.campaigns.colAuthor, t.common.date].map((h, i) => (
                    <th key={i} className="px-6 py-3 text-left" style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c, idx) => {
                  const style = STATUS_STYLE[c.status]
                  return (
                    <tr key={c.id} className="hover:bg-[#FAFAFA] transition-colors cursor-pointer"
                      style={{ borderBottom: idx < campaigns.length - 1 ? '1px solid #F9FAFB' : 'none' }}
                      onClick={() => router.push(`/dashboard/campaigns/${c.id}`)}>
                      <td className="px-6 py-4" style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{c.name}</td>
                      <td className="px-6 py-4" style={{ fontSize: 13, color: '#6B7280' }}>{TYPE_LABELS[c.type]}</td>
                      <td className="px-6 py-4">
                        <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: style.bg, color: style.color }}>
                          {STATUS_LABELS[c.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4" style={{ fontSize: 13, color: '#111827' }}>{c.sentCount}/{c.totalRecipients}</td>
                      <td className="px-6 py-4" style={{ fontSize: 13, color: '#16A34A', fontWeight: 600 }}>{c.convertedCount}</td>
                      <td className="px-6 py-4" style={{ fontSize: 13, color: '#6B7280' }}>{c.createdBy?.name ?? '—'}</td>
                      <td className="px-6 py-4" style={{ fontSize: 13, color: '#9CA3AF' }}>
                        {new Date(c.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  )
}
