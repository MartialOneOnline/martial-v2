'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, ChevronLeft, Pencil, Send, Trash2, Clock, Info } from 'lucide-react'
import { useDashboard } from '../../../../components/DashboardShell'
import NotificationBell from '../../../../components/NotificationBell'
import DashboardLanguageSelector from '../../../../components/DashboardLanguageSelector'
import { useT } from '../../../../lib/i18n/LanguageContext'
import { pollCampaignProcess } from '../../../../lib/campaignPolling'
import { campaignStatusLabel, campaignWaitMessage, formatWhen, recipientStatusLabel, RECIPIENT_STATUS_COLOR } from '../../../../lib/campaignDeliveryLabels'
import type { CampaignType, CampaignStatus, CampaignRecipientStatus, SchoolMemberStatus } from '../../../../lib/prisma-client/enums'
import CampaignComposerModal from '../../users/CampaignComposerModal'

type CampaignDetail = {
  id: string
  name: string
  type: CampaignType
  status: CampaignStatus
  subject: string
  totalRecipients: number
  sentCount: number
  failedCount: number
  convertedCount: number
  createdAt: string
}

type Recipient = {
  id: string
  status: CampaignRecipientStatus
  sentAt: string | null
  failedReason: string | null
  attempts: number
  nextAttemptAt: string | null
  lastAttemptAt: string | null
  convertedAt: string | null
  statusAtSend: SchoolMemberStatus
  schoolMember: { id: string; belt: string | null; user: { name: string | null; email: string } }
}

type Delivery = {
  pending: number
  sending: number
  sent: number
  failed: number
  uncertain: number
  skipped: number
  retryScheduled: number
  nextAttemptAt: string | null
  waiting: { reason: string; until: string } | null
}

export default function CampaignDetailClient({ campaignId }: { campaignId: string }) {
  const { menuOpen, setMenuOpen } = useDashboard()
  const t = useT()
  const router = useRouter()

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [delivery, setDelivery] = useState<Delivery | null>(null)
  const [loading, setLoading] = useState(true)
  const [schoolName, setSchoolName] = useState('')
  const [showEdit, setShowEdit] = useState(false)
  const [sending, setSending] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const fetchDetail = useCallback(() => {
    fetch(`/api/dashboard/campaigns/${campaignId}`)
      .then(r => r.json())
      .then(d => { setCampaign(d.campaign ?? null); setRecipients(d.recipients ?? []); setDelivery(d.delivery ?? null) })
      .finally(() => setLoading(false))
  }, [campaignId])

  useEffect(() => { fetchDetail() }, [fetchDetail])
  useEffect(() => {
    fetch('/api/dashboard/school').then(r => r.json()).then(d => {
      if (d.school?.name) setSchoolName(d.school.name)
    }).catch(() => {})
  }, [])

  async function handleSend() {
    setSending(true)
    try {
      const qRes = await fetch(`/api/dashboard/campaigns/${campaignId}/queue`, { method: 'POST' })
      if (!qRes.ok) return
      await pollCampaignProcess(campaignId, () => fetchDetail()).catch(() => {})
    } finally {
      setSending(false)
      fetchDetail()
    }
  }

  // Resume a campaign whose remaining recipients are due (e.g. after a
  // retry backoff); the cron would also pick it up later.
  async function handleResume() {
    setSending(true)
    try {
      await pollCampaignProcess(campaignId, () => fetchDetail()).catch(() => {})
    } finally {
      setSending(false)
      fetchDetail()
    }
  }

  async function handleDelete() {
    await fetch(`/api/dashboard/campaigns/${campaignId}`, { method: 'DELETE' })
    router.push('/dashboard/campaigns')
  }


  const isDraft = campaign?.status === 'DRAFT'
  const inFlight = campaign?.status === 'SENDING' || campaign?.status === 'QUEUED'
  const canResume = inFlight && !!delivery && delivery.pending > 0 && !delivery.waiting
  const canDelete = campaign?.status !== 'SENDING'

  return (
    <main style={{ flex: 1, minWidth: 0, width: '100%', overflow: 'auto' }}>
      <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20"
        style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
        <button className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl cursor-pointer shrink-0"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(!menuOpen)}>
          <Menu size={16} style={{ color: '#374151' }} />
        </button>
        <button onClick={() => router.push('/dashboard/campaigns')}
          className="flex items-center gap-1" style={{ fontSize: 13, fontWeight: 500, color: '#374151', background: 'none', border: 'none', cursor: 'pointer' }}>
          <ChevronLeft size={14} />{t.campaigns.backToList}
        </button>
        <div className="flex-1" />
        <DashboardLanguageSelector />
        <NotificationBell />
      </div>

      {!loading && !campaign && (
        <div className="px-4 md:px-8 py-16 text-center">
          <p style={{ fontSize: 14, color: '#9CA3AF' }}>{t.common.noResults}</p>
        </div>
      )}

      {campaign && (
        <div className="px-4 md:px-8 py-6 flex flex-col gap-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>{campaign.name}</h1>
              <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>{campaign.subject}</p>
            </div>
            <div className="flex items-center gap-2">
              {canResume && (
                <button onClick={handleResume} disabled={sending}
                  className="flex items-center gap-2" style={{ fontSize: 13, fontWeight: 600, color: '#fff', background: '#0071E3', border: 'none', borderRadius: 10, padding: '8px 14px', cursor: sending ? 'default' : 'pointer', opacity: sending ? 0.7 : 1 }}>
                  <Send size={13} />{sending ? t.campaigns.sendingLabel : t.campaigns.resumeSendingBtn}
                </button>
              )}
              {isDraft && (
                <button onClick={() => setShowEdit(true)}
                  className="flex items-center gap-2" style={{ fontSize: 13, fontWeight: 600, color: '#374151', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '8px 14px', cursor: 'pointer' }}>
                  <Pencil size={13} />{t.common.edit}
                </button>
              )}
              {isDraft && (
                <button onClick={handleSend} disabled={sending}
                  className="flex items-center gap-2" style={{ fontSize: 13, fontWeight: 600, color: '#fff', background: '#0071E3', border: 'none', borderRadius: 10, padding: '8px 14px', cursor: sending ? 'default' : 'pointer', opacity: sending ? 0.7 : 1 }}>
                  <Send size={13} />{sending ? t.campaigns.sendingLabel : t.campaigns.sendAction}
                </button>
              )}
              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)} disabled={!canDelete}
                  className="flex items-center gap-2" style={{ fontSize: 13, fontWeight: 600, color: canDelete ? '#DC2626' : '#D1D5DB', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '8px 14px', cursor: canDelete ? 'pointer' : 'not-allowed' }}>
                  <Trash2 size={13} />{t.common.delete}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 12, color: '#DC2626', fontWeight: 600 }}>¿Eliminar?</span>
                  <button onClick={handleDelete} style={{ fontSize: 12, fontWeight: 600, background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>Sí</button>
                  <button onClick={() => setConfirmDelete(false)} style={{ fontSize: 12, background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>Cancelar</button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: t.campaigns.colSent, value: `${campaign.sentCount}/${campaign.totalRecipients}` },
              { label: t.common.failed, value: String(delivery?.failed ?? campaign.failedCount) },
              ...(delivery && delivery.uncertain > 0 ? [{ label: t.campaigns.statUncertain, value: String(delivery.uncertain) }] : []),
              ...(delivery && delivery.pending + delivery.sending > 0 ? [{ label: t.campaigns.statRetrying, value: String(delivery.pending + delivery.sending) }] : []),
              { label: t.campaigns.colConverted, value: String(campaign.convertedCount) },
              { label: t.common.status, value: campaignStatusLabel(t, campaign.status, campaign.failedCount) },
            ].map(s => (
              <div key={s.label} className="rounded-2xl" style={{ background: '#fff', border: '1px solid #E5E7EB', padding: '16px 18px' }}>
                <p style={{ fontSize: 22, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', marginBottom: 4 }}>{s.value}</p>
                <p style={{ fontSize: 12, fontWeight: 500, color: '#6B7280' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {inFlight && delivery?.waiting && (
            <div className="flex items-start gap-2 rounded-xl" style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '10px 14px' }}>
              <Clock size={14} style={{ color: '#B45309', marginTop: 2, flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: '#92400E' }}>{campaignWaitMessage(t, delivery.waiting)}</p>
            </div>
          )}
          {inFlight && !delivery?.waiting && delivery?.nextAttemptAt && delivery.retryScheduled > 0 && (
            <div className="flex items-start gap-2 rounded-xl" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '10px 14px' }}>
              <Clock size={14} style={{ color: '#2563EB', marginTop: 2, flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: '#1E40AF' }}>{t.campaigns.nextRetryAt.replace('{time}', formatWhen(delivery.nextAttemptAt))}</p>
            </div>
          )}
          {delivery && delivery.uncertain > 0 && (
            <div className="flex items-start gap-2 rounded-xl" style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '10px 14px' }}>
              <Info size={14} style={{ color: '#B45309', marginTop: 2, flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: '#92400E' }}>{t.campaigns.uncertainHint}</p>
            </div>
          )}
          <p className="flex items-center gap-1.5" style={{ fontSize: 12, color: '#9CA3AF', marginTop: -12 }}>
            <Info size={12} />{t.campaigns.deliveryNote}
          </p>

          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 10 }}>{t.campaigns.recipientsTitle}</p>
            <div className="rounded-2xl overflow-x-auto" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                    {[t.common.name, t.common.email, t.common.status, t.campaigns.recipientReason, t.campaigns.recipientSentAt, t.campaigns.recipientConverted].map((h, i) => (
                      <th key={i} className="px-6 py-3 text-left" style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recipients.map((r, idx) => (
                    <tr key={r.id} style={{ borderBottom: idx < recipients.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                      <td className="px-6 py-3" style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{r.schoolMember.user.name ?? '—'}</td>
                      <td className="px-6 py-3" style={{ fontSize: 13, color: '#6B7280' }}>{r.schoolMember.user.email}</td>
                      <td className="px-6 py-3" style={{ fontSize: 12, fontWeight: 600, color: RECIPIENT_STATUS_COLOR[r.status], whiteSpace: 'nowrap' }}>
                        {recipientStatusLabel(t, r.status, r.attempts)}
                        {r.status === 'PENDING' && r.attempts > 0 && r.nextAttemptAt && (
                          <span style={{ display: 'block', fontWeight: 400, color: '#9CA3AF' }}>{t.campaigns.nextRetryAt.replace('{time}', formatWhen(r.nextAttemptAt))}</span>
                        )}
                      </td>
                      <td className="px-6 py-3" style={{ fontSize: 12, color: '#6B7280', maxWidth: 320 }}>
                        {r.status !== 'SENT' && r.failedReason ? (
                          <span title={r.failedReason}>
                            {r.failedReason}
                            {r.attempts > 1 ? <span style={{ color: '#9CA3AF' }}> · {r.attempts} {t.campaigns.attemptsLabel}</span> : null}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-3" style={{ fontSize: 13, color: '#9CA3AF' }}>{r.sentAt ? new Date(r.sentAt).toLocaleString() : '—'}</td>
                      <td className="px-6 py-3" style={{ fontSize: 13, color: r.convertedAt ? '#16A34A' : '#D1D5DB', fontWeight: r.convertedAt ? 600 : 400 }}>
                        {r.convertedAt ? new Date(r.convertedAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <CampaignComposerModal
          campaignId={campaignId}
          schoolName={schoolName || 'Your school'}
          onClose={() => setShowEdit(false)}
          onSaved={fetchDetail}
        />
      )}
    </main>
  )
}
