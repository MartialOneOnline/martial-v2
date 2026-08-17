'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, Megaphone, Plus, MoreHorizontal, Eye, Pencil, Send, Trash2 } from 'lucide-react'
import { useDashboard } from '../../../components/DashboardShell'
import NotificationBell from '../../../components/NotificationBell'
import DashboardLanguageSelector from '../../../components/DashboardLanguageSelector'
import RowMenu from '../../../components/RowMenu'
import { useT } from '../../../lib/i18n/LanguageContext'
import type { CampaignType, CampaignStatus } from '../../../lib/prisma-client/enums'
import CampaignComposerModal from '../users/CampaignComposerModal'

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

function CampaignRowMenu({ campaign, onView, onEdit, onSend, onDelete }: {
  campaign: CampaignListItem
  onView: () => void
  onEdit: () => void
  onSend: () => void
  onDelete: () => void
}) {
  const t = useT()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isDraft = campaign.status === 'DRAFT'
  const canDelete = campaign.status !== 'SENDING'

  return (
    <RowMenu trigger={({ onClick }) => (
      <button onClick={onClick}
        className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer"
        style={{ border: '1px solid #E5E7EB', background: '#fff' }}>
        <MoreHorizontal size={14} style={{ color: '#6B7280' }} />
      </button>
    )}>
      {({ close }) => (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', minWidth: 180, overflow: 'hidden' }}>
          <button onClick={() => { close(); onView() }}
            className="w-full flex items-center gap-2 cursor-pointer" style={{ padding: '9px 14px', fontSize: 13, border: 'none', textAlign: 'left', background: 'transparent', color: '#374151' }}>
            <Eye size={13} />{t.common.view}
          </button>
          {isDraft && (
            <button onClick={() => { close(); onEdit() }}
              className="w-full flex items-center gap-2 cursor-pointer" style={{ padding: '9px 14px', fontSize: 13, border: 'none', textAlign: 'left', background: 'transparent', color: '#374151' }}>
              <Pencil size={13} />{t.common.edit}
            </button>
          )}
          {isDraft && (
            <button onClick={() => { close(); onSend() }}
              className="w-full flex items-center gap-2 cursor-pointer" style={{ padding: '9px 14px', fontSize: 13, border: 'none', textAlign: 'left', background: 'transparent', color: '#374151' }}>
              <Send size={13} />{t.campaigns.sendAction}
            </button>
          )}
          {!confirmDelete ? (
            <button onClick={e => { e.stopPropagation(); setConfirmDelete(true) }} disabled={!canDelete}
              className="w-full flex items-center gap-2" style={{ padding: '9px 14px', fontSize: 13, border: 'none', textAlign: 'left', background: 'transparent', color: canDelete ? '#DC2626' : '#D1D5DB', cursor: canDelete ? 'pointer' : 'not-allowed', borderTop: '1px solid #F3F4F6' }}>
              <Trash2 size={13} />{t.common.delete}
            </button>
          ) : (
            <div onClick={e => e.stopPropagation()} style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid #F3F4F6' }}>
              <p style={{ margin: 0, fontSize: 12, color: '#DC2626', fontWeight: 600 }}>¿Eliminar permanentemente?</p>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => { close(); onDelete() }}
                  style={{ flex: 1, padding: '5px 0', fontSize: 12, fontWeight: 600, background: '#DC2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                  Sí, eliminar
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  style={{ flex: 1, padding: '5px 0', fontSize: 12, background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </RowMenu>
  )
}

export default function CampaignsClient() {
  const { menuOpen, setMenuOpen } = useDashboard()
  const t = useT()
  const router = useRouter()

  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [schoolName, setSchoolName] = useState('')
  const [showComposer, setShowComposer] = useState(false)
  const [editCampaignId, setEditCampaignId] = useState<string | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)

  const fetchCampaigns = useCallback(() => {
    setLoading(true)
    fetch('/api/dashboard/campaigns')
      .then(r => r.json())
      .then(d => setCampaigns(d.campaigns ?? []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchCampaigns() }, [fetchCampaigns])
  useEffect(() => {
    fetch('/api/dashboard/school').then(r => r.json()).then(d => {
      if (d.school?.name) setSchoolName(d.school.name)
    }).catch(() => {})
  }, [])

  async function handleSendDraft(id: string) {
    setSendingId(id)
    try {
      const qRes = await fetch(`/api/dashboard/campaigns/${id}/queue`, { method: 'POST' })
      if (!qRes.ok) return
      for (;;) {
        const res = await fetch(`/api/dashboard/campaigns/${id}/process`, { method: 'POST' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || data.remaining === 0) break
        await new Promise(r => setTimeout(r, 250))
      }
    } finally {
      setSendingId(null)
      fetchCampaigns()
    }
  }

  async function handleDelete(id: string) {
    setCampaigns(prev => prev.filter(c => c.id !== id))
    await fetch(`/api/dashboard/campaigns/${id}`, { method: 'DELETE' })
  }

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
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>{t.campaigns.pageTitle}</h1>
            <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>{t.campaigns.pageSubtitle}</p>
          </div>
          <button onClick={() => setShowComposer(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer shrink-0"
            style={{ background: '#0071E3', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600 }}>
            <Plus size={15} />{t.campaigns.newCampaignBtn}
          </button>
        </div>

        <div className="rounded-2xl overflow-x-auto" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
          {!loading && campaigns.length === 0 ? (
            <div className="py-16 text-center">
              <Megaphone size={32} style={{ color: '#E5E7EB', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{t.campaigns.emptyTitle}</p>
              <p style={{ fontSize: 13, color: '#9CA3AF', margin: '4px 0 16px' }}>{t.campaigns.emptyBody}</p>
              <button onClick={() => setShowComposer(true)}
                className="inline-flex items-center gap-2" style={{ fontSize: 13, fontWeight: 600, color: '#fff', background: '#0071E3', border: 'none', borderRadius: 999, padding: '8px 18px', cursor: 'pointer' }}>
                <Plus size={14} />{t.campaigns.newCampaignBtn}
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  {[t.campaigns.colName, t.campaigns.colType, t.common.status, t.campaigns.colSent, t.campaigns.colConverted, t.campaigns.colAuthor, t.common.date, ''].map((h, i) => (
                    <th key={i} className="px-6 py-3 text-left" style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c, idx) => {
                  const style = STATUS_STYLE[c.status]
                  const isSendingNow = sendingId === c.id
                  return (
                    <tr key={c.id} className="hover:bg-[#FAFAFA] transition-colors cursor-pointer"
                      style={{ borderBottom: idx < campaigns.length - 1 ? '1px solid #F9FAFB' : 'none' }}
                      onClick={() => router.push(`/dashboard/campaigns/${c.id}`)}>
                      <td className="px-6 py-4" style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{c.name}</td>
                      <td className="px-6 py-4" style={{ fontSize: 13, color: '#6B7280' }}>{TYPE_LABELS[c.type]}</td>
                      <td className="px-6 py-4">
                        <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: style.bg, color: style.color }}>
                          {isSendingNow ? t.campaigns.statusSending : STATUS_LABELS[c.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4" style={{ fontSize: 13, color: '#111827' }}>{c.sentCount}/{c.totalRecipients}</td>
                      <td className="px-6 py-4" style={{ fontSize: 13, color: '#16A34A', fontWeight: 600 }}>{c.convertedCount}</td>
                      <td className="px-6 py-4" style={{ fontSize: 13, color: '#6B7280' }}>{c.createdBy?.name ?? '—'}</td>
                      <td className="px-6 py-4" style={{ fontSize: 13, color: '#9CA3AF' }}>
                        {new Date(c.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                        <CampaignRowMenu
                          campaign={c}
                          onView={() => router.push(`/dashboard/campaigns/${c.id}`)}
                          onEdit={() => setEditCampaignId(c.id)}
                          onSend={() => handleSendDraft(c.id)}
                          onDelete={() => handleDelete(c.id)}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showComposer && (
        <CampaignComposerModal
          schoolName={schoolName || 'Your school'}
          onClose={() => setShowComposer(false)}
          onSaved={fetchCampaigns}
        />
      )}
      {editCampaignId && (
        <CampaignComposerModal
          campaignId={editCampaignId}
          schoolName={schoolName || 'Your school'}
          onClose={() => setEditCampaignId(null)}
          onSaved={fetchCampaigns}
        />
      )}
    </main>
  )
}
