'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Bell, Percent, Award, Sun, Gift, Pencil, ChevronLeft, Send, CheckCircle } from 'lucide-react'
import { useT, useLanguage } from '../../../lib/i18n/LanguageContext'
import { CAMPAIGN_PRESETS } from '../../../lib/email/campaignPresets'
import type { CampaignType } from '../../../lib/prisma-client/enums'
import { matchesSearch } from '../../../lib/search'

export type ComposerStudent = { id: string; name: string; email: string; belt: string; status: string; avatarUrl?: string | null }

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? ''
  const second = parts[1]?.[0] ?? ''
  return (first + second).toUpperCase() || '?'
}

function Avatar({ name, avatarUrl, size = 28 }: { name: string; avatarUrl?: string | null; size?: number }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} width={size} height={size}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #60A5FA 0%, #2563EB 100%)',
      color: '#fff', fontSize: size * 0.4, fontWeight: 700,
    }}>
      {initials(name)}
    </div>
  )
}

type Step = 'audience' | 'content' | 'review' | 'sending' | 'summary'

const TYPE_ICONS: Record<CampaignType, React.ComponentType<{ size?: number }>> = {
  REMINDER: Bell,
  DISCOUNT_OFFER: Percent,
  BELT_PROGRESS: Award,
  SEASONAL: Sun,
  ANNIVERSARY: Gift,
  CUSTOM: Pencil,
}

const STATUS_DISPLAY: Record<string, string> = { ACTIVE: 'Active', INACTIVE: 'Inactive', PENDING: 'Pending', ARCHIVED: 'Archived', LEAD: 'Lead' }
const PICKER_FILTERS = ['All', 'Active', 'Pending', 'Lead', 'Inactive', 'Archived'] as const
type PickerFilter = typeof PICKER_FILTERS[number]

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #E5E7EB', borderRadius: 10,
  padding: '9px 12px', fontSize: 13, color: '#111827', background: '#fff', outline: 'none', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }

// Three ways to open this modal:
//  - preselectedStudents set (from the Usuarios bulk bar): audience is fixed, read-only.
//  - neither set (from the Campañas page "Nueva campaña"): audience picker, fetches
//    every member and lets staff filter/search/select.
//  - campaignId set (editing a DRAFT from the Campañas list/detail): same picker,
//    prefilled from the campaign's current recipients + content.
export default function CampaignComposerModal({ preselectedStudents, campaignId, schoolName, onClose, onSaved }: {
  preselectedStudents?: ComposerStudent[]
  campaignId?: string
  schoolName: string
  onClose: () => void
  onSaved: () => void
}) {
  const t = useT()
  const { locale } = useLanguage()
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)

  const isEditing = !!campaignId
  const isPicker = !preselectedStudents

  const [step, setStep] = useState<Step>('audience')
  const [type, setType] = useState<CampaignType | null>(null)
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState({ sent: 0, failed: 0, total: 0 })
  const [summary, setSummary] = useState<{ sent: number; failed: number; skipped: number; campaignId: string } | null>(null)

  const [allMembers, setAllMembers] = useState<ComposerStudent[]>([])
  const [loadingMembers, setLoadingMembers] = useState(isPicker)
  const [loadingCampaign, setLoadingCampaign] = useState(isEditing)
  const [pickerSelectedIds, setPickerSelectedIds] = useState<Set<string>>(new Set())
  const [pickerFilter, setPickerFilter] = useState<PickerFilter>('All')
  const [pickerSearch, setPickerSearch] = useState('')

  useEffect(() => {
    if (!isPicker) return
    fetch('/api/dashboard/members').then(r => r.json()).then((list: Array<{ id: string; name: string; email: string; belt: string; status: string; avatarUrl: string | null }>) => {
      setAllMembers(list.map(m => ({ id: m.id, name: m.name, email: m.email, belt: m.belt, status: m.status, avatarUrl: m.avatarUrl })))
    }).finally(() => setLoadingMembers(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!campaignId) return
    fetch(`/api/dashboard/campaigns/${campaignId}`).then(r => r.json()).then(d => {
      const c = d.campaign
      if (c) { setType(c.type); setName(c.name); setSubject(c.subject); setMessage(c.bodyHtml) }
      const ids: string[] = d.recipientMemberIds ?? []
      setPickerSelectedIds(new Set(ids))
    }).finally(() => setLoadingCampaign(false))
  }, [campaignId])

  const students = preselectedStudents ?? allMembers.filter(m => pickerSelectedIds.has(m.id))
  const withEmail = students.filter(s => !!s.email)
  const skippedCount = students.length - withEmail.length

  const visibleMembers = useMemo(() => {
    return allMembers.filter(m => {
      const matchFilter = pickerFilter === 'All' || (STATUS_DISPLAY[m.status] ?? m.status) === pickerFilter
      const matchSearch = matchesSearch(m.name, pickerSearch) || matchesSearch(m.email, pickerSearch)
      return matchFilter && matchSearch
    })
  }, [allMembers, pickerFilter, pickerSearch])

  const FILTER_LABELS: Record<PickerFilter, string> = {
    All: t.common.all, Active: t.common.active, Pending: t.common.pending,
    Lead: t.common.lead, Inactive: t.common.inactive, Archived: t.common.archived,
  }

  const TYPE_LABELS: Record<CampaignType, string> = {
    REMINDER: t.campaigns.typeReminder,
    DISCOUNT_OFFER: t.campaigns.typeDiscountOffer,
    BELT_PROGRESS: t.campaigns.typeBeltProgress,
    SEASONAL: t.campaigns.typeSeasonal,
    ANNIVERSARY: t.campaigns.typeAnniversary,
    CUSTOM: t.campaigns.typeCustom,
  }

  function togglePicker(id: string) {
    setPickerSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  function selectAllVisible() {
    setPickerSelectedIds(prev => new Set([...prev, ...visibleMembers.map(m => m.id)]))
  }

  function selectType(newType: CampaignType) {
    setType(newType)
    if (!isEditing) {
      const presetLang = (['en', 'es', 'pt', 'fr'] as const).includes(locale) ? locale : 'en'
      const preset = CAMPAIGN_PRESETS[newType][presetLang]
      setSubject(preset.subject)
      setMessage(preset.body)
      setName(`${TYPE_LABELS[newType]} — ${new Date().toLocaleDateString()}`)
    }
  }

  function insertToken(token: string) {
    setMessage(m => `${m}${m.endsWith(' ') || m === '' ? '' : ' '}{{${token}}}`)
  }

  function handleClose() {
    if (step === 'sending') return
    onClose()
  }

  async function submit(action: 'draft' | 'send') {
    if (!type || !name.trim() || !subject.trim() || !message.trim() || students.length === 0) return
    setError('')
    if (action === 'send') setStep('sending')
    try {
      const payload = {
        name: name.trim(), type, subject: subject.trim(), message: message.trim(),
        language: locale, memberIds: students.map(s => s.id),
      }

      let finalCampaignId: string
      let totalRecipients: number
      let skipped: number

      if (isEditing && campaignId) {
        const res = await fetch(`/api/dashboard/campaigns/${campaignId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Failed to save')
        finalCampaignId = campaignId
        totalRecipients = data.totalRecipients
        skipped = data.skipped ?? 0
        if (action === 'send') {
          const qRes = await fetch(`/api/dashboard/campaigns/${campaignId}/queue`, { method: 'POST' })
          const qData = await qRes.json().catch(() => ({}))
          if (!qRes.ok) throw new Error(qData.error || 'Failed to queue')
        }
      } else {
        const res = await fetch('/api/dashboard/campaigns', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, saveAsDraft: action === 'draft' }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Failed to create campaign')
        finalCampaignId = data.campaignId
        totalRecipients = data.totalRecipients
        skipped = data.skipped ?? 0
      }

      if (action === 'draft') {
        onSaved()
        onClose()
        return
      }

      const totalToSend = totalRecipients - skipped
      let totalSent = 0
      let totalFailed = 0
      setProgress({ sent: 0, failed: 0, total: totalToSend })

      // Poll /process until every PENDING recipient has been handled — this is
      // the interactive send path, independent of the daily safety-net cron.
      for (;;) {
        const res = await fetch(`/api/dashboard/campaigns/${finalCampaignId}/process`, { method: 'POST' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Failed to send')
        totalSent += data.sent
        totalFailed += data.failed
        setProgress({ sent: totalSent, failed: totalFailed, total: totalToSend })
        if (data.remaining === 0) break
        await new Promise(r => setTimeout(r, 250))
      }

      setSummary({ sent: totalSent, failed: totalFailed, skipped, campaignId: finalCampaignId })
      setStep('summary')
      onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error && e.message ? e.message : 'Error')
      setStep('review')
    }
  }

  const audienceReady = isPicker ? !loadingMembers && !loadingCampaign : true
  const nextFromAudienceEnabled = isPicker ? (audienceReady && withEmail.length > 0) : withEmail.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div ref={ref} className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" style={{ background: '#fff', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
              {isEditing ? t.campaigns.editCampaignTitle : t.campaigns.newCampaignTitle}
            </p>
            <p style={{ fontSize: 12, color: '#9CA3AF' }}>
              {students.length} {students.length === 1 ? t.campaigns.studentWord : t.campaigns.studentsWord}
              {skippedCount > 0 ? ` · ${skippedCount} ${t.campaigns.noEmailWarning}` : ''}
            </p>
          </div>
          {step !== 'sending' && (
            <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={16} /></button>
          )}
        </div>

        <div className="px-5 py-4" style={{ overflowY: 'auto', flex: 1 }}>
          {step === 'audience' && (
            <div>
              {!isPicker ? (
                <>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 10 }}>{t.campaigns.audienceHeading}</p>
                  <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, maxHeight: 220, overflowY: 'auto' }}>
                    {students.slice(0, 30).map(s => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #F3F4F6', fontSize: 13 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <Avatar name={s.name} avatarUrl={s.avatarUrl} />
                          <span style={{ color: '#111827' }}>{s.name}</span>
                        </div>
                        <span style={{ color: s.email ? '#9CA3AF' : '#DC2626', flexShrink: 0 }}>{s.email || t.campaigns.noEmailWarning}</span>
                      </div>
                    ))}
                    {students.length > 30 && (
                      <div style={{ padding: '8px 12px', fontSize: 12, color: '#9CA3AF' }}>+{students.length - 30}</div>
                    )}
                  </div>
                </>
              ) : !audienceReady ? (
                <p style={{ fontSize: 13, color: '#9CA3AF' }}>{t.common.loading}…</p>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 10 }}>
                    {PICKER_FILTERS.map(f => (
                      <button key={f} onClick={() => setPickerFilter(f)}
                        style={{
                          fontSize: 12, fontWeight: 500, border: 'none', borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
                          color: pickerFilter === f ? '#111827' : '#6B7280',
                          background: pickerFilter === f ? '#F3F4F6' : 'transparent',
                        }}>
                        {FILTER_LABELS[f]}
                      </button>
                    ))}
                  </div>
                  <input value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} placeholder={t.common.search}
                    style={{ ...inputStyle, marginBottom: 8 }} />
                  <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: '#6B7280' }}>{pickerSelectedIds.size} {t.campaigns.selectedLabel}</span>
                    <button onClick={selectAllVisible} style={{ fontSize: 12, color: '#0071E3', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                      {t.campaigns.selectAllPrefix} {visibleMembers.length}
                    </button>
                  </div>
                  <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, maxHeight: 220, overflowY: 'auto' }}>
                    {visibleMembers.map(m => (
                      <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '1px solid #F3F4F6', fontSize: 13, cursor: 'pointer' }}>
                        <input type="checkbox" checked={pickerSelectedIds.has(m.id)} onChange={() => togglePicker(m.id)} style={{ cursor: 'pointer', flexShrink: 0 }} />
                        <Avatar name={m.name} avatarUrl={m.avatarUrl} />
                        <span style={{ flex: 1, color: '#111827', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                        <span style={{ color: m.email ? '#9CA3AF' : '#DC2626', fontSize: 12, flexShrink: 0 }}>{m.email || t.campaigns.noEmailWarning}</span>
                      </label>
                    ))}
                    {visibleMembers.length === 0 && (
                      <p style={{ padding: 12, fontSize: 12, color: '#9CA3AF' }}>{t.common.noResults}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {step === 'content' && (
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 10 }}>{t.campaigns.chooseContentType}</p>
              <div className="grid grid-cols-3 gap-2" style={{ marginBottom: 18 }}>
                {(Object.keys(TYPE_LABELS) as CampaignType[]).map(ct => {
                  const Icon = TYPE_ICONS[ct]
                  const selected = type === ct
                  return (
                    <button key={ct} onClick={() => selectType(ct)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        padding: '14px 8px', borderRadius: 12, cursor: 'pointer',
                        border: selected ? '2px solid #0071E3' : '1px solid #E5E7EB',
                        background: selected ? '#EFF6FF' : '#fff',
                      }}>
                      <Icon size={18} />
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: '#111827', textAlign: 'center' }}>{TYPE_LABELS[ct]}</span>
                    </button>
                  )
                })}
              </div>

              {type && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label style={labelStyle}>{t.campaigns.campaignNameLabel}</label>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder={t.campaigns.campaignNamePh} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t.campaigns.subjectLabel}</label>
                    <input value={subject} onChange={e => setSubject(e.target.value)} placeholder={t.campaigns.subjectPh} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t.campaigns.messageLabel}</label>
                    <textarea rows={6} value={message} onChange={e => setMessage(e.target.value)} placeholder={t.campaigns.messagePh}
                      style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit' }} />
                    <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 6 }}>
                      <span style={{ fontSize: 11, color: '#9CA3AF' }}>{t.campaigns.tokenHint}</span>
                      {['nombre', 'escuela', 'cinturon'].map(tok => (
                        <button key={tok} onClick={() => insertToken(tok)}
                          style={{ fontSize: 11, fontWeight: 600, color: '#0071E3', background: '#EFF6FF', border: 'none', borderRadius: 999, padding: '2px 8px', cursor: 'pointer' }}>
                          {`{{${tok}}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'review' && type && (
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 4 }}>{t.campaigns.reviewHeading}</p>
              <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>{t.campaigns.previewFor} {students[0]?.name}</p>
              <div style={{ border: '1px solid #E5E7EB', borderRadius: 12, padding: 16, background: '#FAFAFA' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
                  {subject
                    .replace(/\{\{\s*nombre\s*\}\}/gi, students[0]?.name ?? '')
                    .replace(/\{\{\s*escuela\s*\}\}/gi, schoolName)
                    .replace(/\{\{\s*cinturon\s*\}\}/gi, students[0]?.belt ?? '')}
                </p>
                <p style={{ fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {message
                    .replace(/\{\{\s*nombre\s*\}\}/gi, students[0]?.name ?? '')
                    .replace(/\{\{\s*escuela\s*\}\}/gi, schoolName)
                    .replace(/\{\{\s*cinturon\s*\}\}/gi, students[0]?.belt ?? '')}
                </p>
              </div>
              {error && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 10 }}>{error}</p>}
            </div>
          )}

          {step === 'sending' && (
            <div style={{ padding: '24px 0', textAlign: 'center' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 12 }}>{t.campaigns.sendingLabel}</p>
              <div style={{ width: '100%', height: 8, background: '#F3F4F6', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', background: '#0071E3', borderRadius: 999,
                  width: `${progress.total ? Math.min(100, ((progress.sent + progress.failed) / progress.total) * 100) : 0}%`,
                  transition: 'width 0.2s ease',
                }} />
              </div>
              <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>{progress.sent + progress.failed} / {progress.total}</p>
            </div>
          )}

          {step === 'summary' && summary && (
            <div style={{ padding: '12px 0', textAlign: 'center' }}>
              <CheckCircle size={32} style={{ color: '#16A34A', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 14 }}>{t.campaigns.summaryHeading}</p>
              <div className="flex justify-center gap-6">
                <div><p style={{ fontSize: 20, fontWeight: 700, color: '#16A34A' }}>{summary.sent}</p><p style={{ fontSize: 11, color: '#9CA3AF' }}>{t.campaigns.summarySentWord}</p></div>
                <div><p style={{ fontSize: 20, fontWeight: 700, color: '#DC2626' }}>{summary.failed}</p><p style={{ fontSize: 11, color: '#9CA3AF' }}>{t.campaigns.summaryFailedWord}</p></div>
                <div><p style={{ fontSize: 20, fontWeight: 700, color: '#9CA3AF' }}>{summary.skipped}</p><p style={{ fontSize: 11, color: '#9CA3AF' }}>{t.campaigns.summarySkippedWord}</p></div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 px-5 py-4" style={{ borderTop: '1px solid #F3F4F6', flexShrink: 0 }}>
          {step === 'audience' && (
            <button onClick={() => setStep('content')} disabled={!nextFromAudienceEnabled}
              className="flex items-center justify-center gap-2" style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, border: 'none', background: nextFromAudienceEnabled ? '#0071E3' : '#93C5FD', color: '#fff', cursor: nextFromAudienceEnabled ? 'pointer' : 'not-allowed' }}>
              {t.campaigns.nextBtn}
            </button>
          )}
          {step === 'content' && (
            <>
              <button onClick={() => setStep('audience')} className="flex items-center gap-1" style={{ padding: '9px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', cursor: 'pointer' }}>
                <ChevronLeft size={14} />{t.campaigns.backBtn}
              </button>
              <button onClick={() => setStep('review')} disabled={!type || !name.trim() || !subject.trim() || !message.trim()}
                style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, border: 'none', background: (type && name.trim() && subject.trim() && message.trim()) ? '#0071E3' : '#93C5FD', color: '#fff', cursor: 'pointer' }}>
                {t.campaigns.nextBtn}
              </button>
            </>
          )}
          {step === 'review' && (
            <>
              <button onClick={() => setStep('content')} className="flex items-center gap-1" style={{ padding: '9px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', cursor: 'pointer' }}>
                <ChevronLeft size={14} />{t.campaigns.backBtn}
              </button>
              <button onClick={() => submit('draft')} style={{ padding: '9px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', cursor: 'pointer' }}>
                {isEditing ? t.campaigns.saveChangesBtn : t.campaigns.saveDraftBtn}
              </button>
              <button onClick={() => submit('send')} className="flex items-center justify-center gap-2" style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, border: 'none', background: '#0071E3', color: '#fff', cursor: 'pointer' }}>
                <Send size={13} />{t.campaigns.sendCampaignBtn}
              </button>
            </>
          )}
          {step === 'summary' && summary && (
            <>
              <button onClick={() => router.push(`/dashboard/campaigns/${summary.campaignId}`)} style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', cursor: 'pointer' }}>
                {t.campaigns.viewCampaignBtn}
              </button>
              <button onClick={onClose} style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, border: 'none', background: '#0071E3', color: '#fff', cursor: 'pointer' }}>
                {t.common.done}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
