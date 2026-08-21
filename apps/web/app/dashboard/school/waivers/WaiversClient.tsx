'use client'

import { useDashboard } from '../../../../components/DashboardShell'
import NotificationBell from '../../../../components/NotificationBell'
import { useState, useEffect } from 'react'
import {Check, TrendingDown, MoreHorizontal, Eye, Plus, FileText, Download, Send, Menu, X, Search, Edit2, Ban, PenLine} from 'lucide-react'
import { useT } from '../../../../lib/i18n/LanguageContext'
import RowMenu from '../../../../components/RowMenu'
import { matchesSearch } from '../../../../lib/search'

type WaiverStatus = 'Signed' | 'Pending' | 'Expired'

interface Waiver {
  id: string
  avatarUrl: string | null
  name: string
  email: string
  type: string
  signedDate: string
  expiryDate: string
  status: WaiverStatus
  sentVia: string
  hasPdf: boolean
  revoked: boolean
  content: string
  signature: string | null
  ipAddress: string | null
  signedVersion: string | null
  notes: string | null
}

interface MemberOption {
  id: string
  avatarUrl: string | null
  name: string
  email: string
}

interface Template {
  id: string
  title: string
  content: string
  version: string
  isActive: boolean
  signedCount: number
}

function Avatar({ name, avatarUrl, size = 42 }: { name: string; avatarUrl: string | null; size?: number }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (avatarUrl) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatarUrl} alt={name} className="rounded-full shrink-0" style={{ width: size, height: size, objectFit: 'cover' }} />
  )
  return (
    <div className="rounded-full shrink-0 flex items-center justify-center" style={{ width: size, height: size,
      background: 'linear-gradient(135deg,#0870E2,#7DE7EC)', color: '#fff', fontSize: size * 0.33, fontWeight: 700 }}>
      {initials}
    </div>
  )
}

const STATUS_MAP: Record<WaiverStatus, { bg: string; color: string; border: string }> = {
  Signed:  { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
  Pending: { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
  Expired: { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
}

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #E5E7EB', borderRadius: 10,
  padding: '9px 12px', fontSize: 13, color: '#111827', background: '#fff', outline: 'none',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5,
}

function Drawer({ open, title, subtitle, onClose, children, footer }: {
  open: boolean; title: string; subtitle: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.35)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
        onClick={onClose} />
      <div className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-hidden"
        style={{ width: 'min(560px,96vw)', background: '#F9FAFB',
          boxShadow: '-4px 0 32px rgba(0,0,0,0.12)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)' }}>
        <div className="flex items-center justify-between px-6 py-5 shrink-0"
          style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>{title}</h2>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{subtitle}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <X size={15} style={{ color: '#6B7280' }} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">{children}</div>
        <div className="px-6 py-4 flex items-center gap-3 justify-end shrink-0"
          style={{ background: '#fff', borderTop: '1px solid #E5E7EB' }}>{footer}</div>
      </div>
    </>
  )
}

function AddWaiverDrawer({ open, onClose, onSuccess, members, templates }: {
  open: boolean; onClose: () => void; onSuccess: () => void; members: MemberOption[]; templates: Template[]
}) {
  const [memberQuery, setMemberQuery]       = useState('')
  const [selectedMember, setSelectedMember] = useState<MemberOption | null>(null)
  const [showDropdown, setShowDropdown]     = useState(false)
  const [templateId, setTemplateId]         = useState('')
  const [notes, setNotes]                   = useState('')
  const [saving, setSaving]                 = useState(false)
  const [error, setError]                   = useState('')

  const filteredMembers = members.filter(m =>
    matchesSearch(m.name, memberQuery) || matchesSearch(m.email, memberQuery)
  )
  const activeTemplates = templates.filter(t => t.isActive)

  function reset() {
    setMemberQuery(''); setSelectedMember(null); setShowDropdown(false)
    setTemplateId(''); setNotes(''); setError('')
  }
  function handleClose() { reset(); onClose() }

  async function handleSubmit() {
    if (!selectedMember || !templateId) return
    setSaving(true); setError('')
    const res = await fetch('/api/dashboard/waivers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: selectedMember.id, templateId, notes }),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error'); return }
    reset(); onSuccess()
  }

  const canSubmit = selectedMember && templateId && !saving

  return (
    <Drawer open={open} onClose={handleClose} title="Send Waiver" subtitle="Send a waiver to a member for signature"
      footer={<>
        <button onClick={handleClose} className="px-5 py-2.5 rounded-xl cursor-pointer"
          style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={!canSubmit} className="px-6 py-2.5 rounded-xl cursor-pointer flex items-center gap-2"
          style={{ fontSize: 13, fontWeight: 600, border: 'none',
            background: canSubmit ? '#0071E3' : '#93C5FD', color: '#fff',
            cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
          <Send size={14} />{saving ? 'Sending…' : 'Send Waiver'}
        </button>
      </>}>
      <div className="relative">
        <label style={labelStyle}>Member</label>
        {selectedMember ? (
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl"
            style={{ border: '1px solid #0071E3', background: '#EFF6FF' }}>
            <div className="flex items-center gap-2.5">
              <Avatar name={selectedMember.name} avatarUrl={selectedMember.avatarUrl} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{selectedMember.name}</p>
                <p style={{ fontSize: 11, color: '#6B7280' }}>{selectedMember.email}</p>
              </div>
            </div>
            <button onClick={() => { setSelectedMember(null); setMemberQuery('') }}
              className="w-6 h-6 flex items-center justify-center rounded-lg cursor-pointer"
              style={{ background: 'transparent', border: 'none' }}>
              <X size={13} style={{ color: '#6B7280' }} />
            </button>
          </div>
        ) : (
          <div className="relative">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ border: '1px solid #E5E7EB', background: '#fff' }}>
              <Search size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
              <input type="text" placeholder="Search member…"
                value={memberQuery}
                onChange={e => { setMemberQuery(e.target.value); setShowDropdown(true) }}
                onFocus={() => setShowDropdown(true)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', width: '100%' }} />
            </div>
            {showDropdown && filteredMembers.length > 0 && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                <div className="absolute left-0 right-0 rounded-xl z-20 overflow-hidden mt-1"
                  style={{ background: '#fff', border: '1px solid #E5E7EB',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.1)', maxHeight: 220, overflowY: 'auto' }}>
                  {filteredMembers.map(m => (
                    <button key={m.id}
                      onClick={() => { setSelectedMember(m); setMemberQuery(''); setShowDropdown(false) }}
                      className="w-full text-left flex items-center gap-3 px-4 py-2.5 cursor-pointer"
                      style={{ background: 'transparent', border: 'none' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                      <Avatar name={m.name} avatarUrl={m.avatarUrl} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{m.name}</p>
                        <p style={{ fontSize: 11, color: '#9CA3AF' }}>{m.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
            {showDropdown && memberQuery && filteredMembers.length === 0 && (
              <div className="absolute left-0 right-0 rounded-xl z-20 mt-1 px-4 py-3"
                style={{ background: '#fff', border: '1px solid #E5E7EB', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
                <p style={{ fontSize: 12, color: '#9CA3AF' }}>No members found</p>
              </div>
            )}
          </div>
        )}
      </div>
      <div>
        <label style={labelStyle}>Waiver Template</label>
        <select value={templateId} onChange={e => setTemplateId(e.target.value)} style={inputStyle}>
          <option value="">Select template…</option>
          {activeTemplates.map(tpl => <option key={tpl.id} value={tpl.id}>{tpl.title} (v{tpl.version})</option>)}
        </select>
        {activeTemplates.length === 0 && (
          <p style={{ fontSize: 11, color: '#D97706', marginTop: 4 }}>No active templates yet — create one in the Templates tab first.</p>
        )}
      </div>
      <div>
        <label style={labelStyle}>Notes <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span></label>
        <textarea rows={3} placeholder="Notes about this waiver…" value={notes} onChange={e => setNotes(e.target.value)}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
      </div>
      {error && <p style={{ fontSize: 12, color: '#DC2626' }}>{error}</p>}
    </Drawer>
  )
}

function ViewWaiverModal({ waiver, onClose }: { waiver: Waiver; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div onClick={e => e.stopPropagation()} className="w-full rounded-2xl overflow-hidden flex flex-col"
        style={{ maxWidth: 560, maxHeight: '85vh', background: '#fff' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #E5E7EB' }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{waiver.type}</p>
            <p style={{ fontSize: 12, color: '#9CA3AF' }}>{waiver.name} · {waiver.email}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <X size={14} style={{ color: '#6B7280' }} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5" style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
          {waiver.content}
        </div>
        <div className="px-6 py-4 grid grid-cols-2 gap-3" style={{ borderTop: '1px solid #E5E7EB', background: '#F9FAFB' }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>Status</p>
            <p style={{ fontSize: 13, color: '#111827' }}>{waiver.status}{waiver.revoked ? ' (revoked)' : ''}</p>
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>Signed via</p>
            <p style={{ fontSize: 13, color: '#111827' }}>{waiver.sentVia}</p>
          </div>
          {waiver.signedVersion && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>Version signed</p>
              <p style={{ fontSize: 13, color: '#111827' }}>{waiver.signedVersion}</p>
            </div>
          )}
          {waiver.ipAddress && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>IP address</p>
              <p style={{ fontSize: 13, color: '#111827' }}>{waiver.ipAddress}</p>
            </div>
          )}
          {waiver.signature?.startsWith('data:image') && (
            <div className="col-span-2">
              <p style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 4 }}>Signature</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={waiver.signature} alt="Signature" style={{ maxWidth: 200, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8 }} />
            </div>
          )}
          {waiver.signature && !waiver.signature.startsWith('data:image') && (
            <div className="col-span-2">
              <p style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>Signed name</p>
              <p style={{ fontSize: 13, color: '#111827', fontStyle: 'italic' }}>{waiver.signature}</p>
            </div>
          )}
          {waiver.notes && (
            <div className="col-span-2">
              <p style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>Notes</p>
              <p style={{ fontSize: 13, color: '#111827', whiteSpace: 'pre-wrap' }}>{waiver.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MarkSignedModal({ waiver, onClose, onDone }: { waiver: Waiver; onClose: () => void; onDone: () => void }) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!note.trim()) { setError('A note is required'); return }
    setSaving(true); setError('')
    const res = await fetch(`/api/dashboard/waivers/${waiver.id}/mark-signed`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note }),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error'); return }
    onDone()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div onClick={e => e.stopPropagation()} className="w-full rounded-2xl overflow-hidden" style={{ maxWidth: 420, background: '#fff' }}>
        <div className="px-6 py-4" style={{ borderBottom: '1px solid #E5E7EB' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Mark as signed (in person)</p>
          <p style={{ fontSize: 12, color: '#9CA3AF' }}>{waiver.name} · {waiver.type}</p>
        </div>
        <div className="px-6 py-5">
          <label style={labelStyle}>Note <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(required — e.g. &ldquo;signed paper copy, filed at front desk&rdquo;)</span></label>
          <textarea rows={3} value={note} onChange={e => setNote(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
          {error && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 6 }}>{error}</p>}
        </div>
        <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1px solid #E5E7EB' }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl" style={{ fontSize: 13, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>Cancel</button>
          <button onClick={submit} disabled={saving} className="px-5 py-2.5 rounded-xl" style={{ fontSize: 13, fontWeight: 600, border: 'none', background: '#16A34A', color: '#fff' }}>
            {saving ? 'Saving…' : 'Confirm signed'}
          </button>
        </div>
      </div>
    </div>
  )
}

function TemplateModal({ template, onClose, onSaved }: { template: Template | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle]     = useState(template?.title ?? '')
  const [content, setContent] = useState(template?.content ?? '')
  const [requireResign, setRequireResign] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  const contentChanged = template ? content.trim() !== template.content : true

  async function submit() {
    if (!title.trim() || !content.trim()) return
    setSaving(true); setError('')
    const res = template
      ? await fetch(`/api/dashboard/waivers/templates/${template.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, requireResign: contentChanged && requireResign }),
        })
      : await fetch('/api/dashboard/waivers/templates', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content }),
        })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error'); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div onClick={e => e.stopPropagation()} className="w-full rounded-2xl overflow-hidden" style={{ maxWidth: 520, background: '#fff' }}>
        <div className="px-6 py-4" style={{ borderBottom: '1px solid #E5E7EB' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{template ? 'Edit template' : 'New waiver template'}</p>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label style={labelStyle}>Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} disabled={!!template}
              placeholder="e.g. Liability Waiver & Informed Consent" style={{ ...inputStyle, opacity: template ? 0.6 : 1 }} />
          </div>
          <div>
            <label style={labelStyle}>Legal text</label>
            <textarea rows={8} value={content} onChange={e => setContent(e.target.value)}
              placeholder="Paste or write the legal text for this waiver…" style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
          </div>
          {template && template.signedCount > 0 && contentChanged && (
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" checked={requireResign} onChange={e => setRequireResign(e.target.checked)} className="mt-0.5" />
              <span style={{ fontSize: 12, color: '#374151' }}>
                {template.signedCount} {template.signedCount === 1 ? 'person has' : 'people have'} already signed this waiver.
                Require them to re-sign the updated text (this immediately blocks their bookings again until they do).
              </span>
            </label>
          )}
          {error && <p style={{ fontSize: 12, color: '#DC2626' }}>{error}</p>}
        </div>
        <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1px solid #E5E7EB' }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl" style={{ fontSize: 13, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>Cancel</button>
          <button onClick={submit} disabled={saving || !title.trim() || !content.trim()} className="px-5 py-2.5 rounded-xl"
            style={{ fontSize: 13, fontWeight: 600, border: 'none', background: '#0071E3', color: '#fff' }}>
            {saving ? 'Saving…' : 'Save template'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SuccessToast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[70] flex items-center gap-3 px-5 py-3.5 rounded-2xl"
      style={{ background: '#fff', border: '1px solid #BBF7D0', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: '#F0FDF4' }}>
        <Check size={14} style={{ color: '#16A34A' }} strokeWidth={3} />
      </div>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{message}</p>
      <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', marginLeft: 4 }}>
        <X size={13} style={{ color: '#9CA3AF' }} />
      </button>
    </div>
  )
}

const ITEMS_PER_PAGE = 10
function getPaginationPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}

type Filter = 'All' | WaiverStatus
type Tab = 'signatures' | 'templates'

export default function WaiversClient() {
  const { setMenuOpen } = useDashboard()
  const t = useT()
  const [tab, setTab] = useState<Tab>('signatures')
  const [activeFilter, setActiveFilter] = useState<Filter>('All')
  const [search, setSearch]             = useState('')
  const [currentPage, setCurrentPage]   = useState(1)
  const [drawerOpen, setDrawerOpen]     = useState(false)
  const [toast, setToast]               = useState<string | null>(null)
  const [WAIVERS, setWaivers]           = useState<Waiver[]>([])
  const [members, setMembers]           = useState<MemberOption[]>([])
  const [templates, setTemplates]       = useState<Template[]>([])
  const [loading, setLoading]           = useState(true)
  const [viewing, setViewing]           = useState<Waiver | null>(null)
  const [marking, setMarking]           = useState<Waiver | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [addingTemplate, setAddingTemplate]   = useState(false)

  function load() {
    fetch('/api/dashboard/waivers').then(r => r.json()).then(d => {
      setWaivers(d.waivers ?? [])
      setMembers(d.members ?? [])
      setTemplates(d.templates ?? [])
      setLoading(false)
    })
  }
  function loadTemplatesFull() {
    fetch('/api/dashboard/waivers/templates').then(r => r.json()).then(d => setTemplates(d.templates ?? []))
  }
  useEffect(() => { load() }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3500) }

  async function handleRevoke(id: string) {
    await fetch(`/api/dashboard/waivers/${id}`, { method: 'DELETE' })
    load()
  }
  async function handleResend(id: string) {
    const res = await fetch(`/api/dashboard/waivers/${id}/resend`, { method: 'POST' })
    if (res.ok) showToast('Waiver resent')
  }
  async function handleDownload(id: string) {
    const res = await fetch(`/api/dashboard/waivers/${id}/pdf`)
    const d = await res.json()
    if (res.ok && d.url) window.open(d.url, '_blank')
    else showToast(d.error ?? 'No PDF available yet')
  }
  async function handleToggleActive(tpl: Template) {
    await fetch(`/api/dashboard/waivers/templates/${tpl.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !tpl.isActive }),
    })
    loadTemplatesFull()
  }

  const filtered = WAIVERS.filter(w => {
    const matchFilter = activeFilter === 'All' || w.status === activeFilter
    const matchSearch = matchesSearch(w.name, search) || matchesSearch(w.email, search) || matchesSearch(w.type, search)
    return matchFilter && matchSearch
  })

  const totalWaivers  = WAIVERS.length
  const signed        = WAIVERS.filter(w => w.status === 'Signed').length
  const pending       = WAIVERS.filter(w => w.status === 'Pending').length
  const expired       = WAIVERS.filter(w => w.status === 'Expired').length

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage   = Math.min(currentPage, totalPages)
  const paginated  = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)
  const pages      = getPaginationPages(safePage, totalPages)

  const STATS = [
    { label: t.school.totalWaivers, value: String(totalWaivers), icon: FileText,    color: '#0071E3', bg: '#EFF6FF' },
    { label: t.school.signed,       value: String(signed),       icon: Check,       color: '#16A34A', bg: '#F0FDF4' },
    { label: t.common.pending,      value: String(pending),      icon: TrendingDown, color: '#D97706', bg: '#FFFBEB' },
    { label: 'Expired',             value: String(expired),      icon: TrendingDown, color: '#DC2626', bg: '#FEF2F2' },
  ]

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'All',     label: t.common.all     },
    { id: 'Signed',  label: t.school.signed  },
    { id: 'Pending', label: t.common.pending },
    { id: 'Expired', label: 'Expired'        },
  ]

  return (
    <main style={{ flex: 1, minWidth: 0, width: "100%", overflow: "auto" }}>
          <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20"
            style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
            <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(true)}>
              <Menu size={16} style={{ color: '#374151' }} />
            </button>
            {tab === 'signatures' && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 max-w-xs"
                style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                <Search size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                <input type="text" placeholder={t.school.searchWaivers} value={search}
                  onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', width: '100%' }} />
              </div>
            )}
            <div className="flex-1" />
            <NotificationBell />
            {tab === 'signatures' ? (
              <button onClick={() => setDrawerOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer"
                style={{ background: '#0071E3', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600 }}>
                <Plus size={15} />Send Waiver
              </button>
            ) : (
              <button onClick={() => setAddingTemplate(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer"
                style={{ background: '#0071E3', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600 }}>
                <Plus size={15} />New Template
              </button>
            )}
          </div>

          <div className="px-4 md:px-8 py-6 flex flex-col gap-6">
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>{t.school.waiversTitle}</h1>
              <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>Track member waivers and signatures</p>
            </div>

            <div className="flex items-center gap-1" style={{ borderBottom: '1px solid #E5E7EB' }}>
              {([['signatures', 'Signatures'], ['templates', 'Templates']] as [Tab, string][]).map(([id, label]) => (
                <button key={id} onClick={() => { setTab(id); if (id === 'templates') loadTemplatesFull() }}
                  className="px-4 py-3 cursor-pointer relative"
                  style={{ fontSize: 14, fontWeight: tab === id ? 600 : 400, border: 'none', background: 'transparent', color: tab === id ? '#111827' : '#6B7280' }}>
                  {label}
                  {tab === id && <div className="absolute bottom-0 left-0 right-0" style={{ height: 2, background: '#0071E3', borderRadius: '2px 2px 0 0' }} />}
                </button>
              ))}
            </div>

            {tab === 'signatures' ? (
            <>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {STATS.map(s => (
                <div key={s.label} className="rounded-2xl"
                  style={{ background: '#fff', border: '1px solid #E5E7EB', padding: '18px 20px' }}>
                  <div className="mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: s.bg }}>
                      <s.icon size={16} style={{ color: s.color }} />
                    </div>
                  </div>
                  <p style={{ fontSize: 26, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 4 }}>{s.value}</p>
                  <p style={{ fontSize: 12, fontWeight: 500, color: '#6B7280' }}>{s.label}</p>
                </div>
              ))}
            </div>

            <div style={{ borderBottom: '1px solid #E5E7EB' }}>
              <div className="flex items-center gap-1">
                {FILTERS.map(f => {
                  const count = f.id === 'All' ? WAIVERS.length : WAIVERS.filter(w => w.status === f.id).length
                  const isActive = activeFilter === f.id
                  const sc = f.id !== 'All' ? STATUS_MAP[f.id as WaiverStatus] : null
                  return (
                    <button key={f.id} onClick={() => { setActiveFilter(f.id); setCurrentPage(1) }}
                      className="flex items-center gap-2 px-4 py-3 cursor-pointer relative"
                      style={{ fontSize: 14, fontWeight: isActive ? 600 : 400, border: 'none',
                        background: 'transparent', color: isActive ? '#111827' : '#6B7280' }}>
                      {f.label}
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 999,
                        background: isActive && sc ? sc.bg : '#F3F4F6',
                        color: isActive && sc ? sc.color : isActive ? '#374151' : '#9CA3AF' }}>
                        {count}
                      </span>
                      {isActive && (
                        <div className="absolute bottom-0 left-0 right-0"
                          style={{ height: 2, background: '#0071E3', borderRadius: '2px 2px 0 0' }} />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl overflow-x-auto" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                    {[
                      { label: 'Member',      cls: '',                     pad: 'px-3 sm:px-5' },
                      { label: 'Type',        cls: 'hidden sm:table-cell', pad: 'px-5' },
                      { label: 'Signed',      cls: 'hidden md:table-cell', pad: 'px-5' },
                      { label: 'Expires',     cls: 'hidden md:table-cell', pad: 'px-5' },
                      { label: 'Status',      cls: '',                     pad: 'px-2 sm:px-5' },
                      { label: 'Actions',     cls: '',                     pad: 'px-2 sm:px-5' },
                    ].map(h => (
                      <th key={h.label} className={`${h.pad} py-3 text-left ${h.cls}`}
                        style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((waiver, idx) => {
                    const sc  = STATUS_MAP[waiver.status]
                    return (
                      <tr key={waiver.id} className="hover:bg-[#FAFAFA] transition-colors"
                        style={{ borderBottom: idx < paginated.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                        <td className="px-3 sm:px-5 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar name={waiver.name} avatarUrl={waiver.avatarUrl} />
                            <div className="min-w-0">
                              <p className="truncate" style={{ fontSize: 14, fontWeight: 600, color: '#111827', maxWidth: 150 }}>{waiver.name}</p>
                              <p className="truncate" style={{ fontSize: 11, color: '#9CA3AF', maxWidth: 150 }}>{waiver.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell px-5 py-3">
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
                            background: '#EFF6FF', color: '#2563EB', whiteSpace: 'nowrap' }}>
                            {waiver.type}
                          </span>
                        </td>
                        <td className="hidden md:table-cell px-5 py-3">
                          <span style={{ fontSize: 13, color: '#6B7280' }}>{waiver.signedDate || '—'}</span>
                        </td>
                        <td className="hidden md:table-cell px-5 py-3">
                          <span style={{ fontSize: 13, color: '#6B7280' }}>{waiver.expiryDate || '—'}</span>
                        </td>
                        <td className="px-2 sm:px-5 py-3">
                          <span className="inline-flex items-center gap-1.5"
                            style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
                              background: sc.bg, color: sc.color, border: '1px solid ' + sc.border, whiteSpace: 'nowrap' }}>
                            {waiver.status}
                          </span>
                        </td>
                        <td className="px-2 sm:px-5 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setViewing(waiver)} className="hidden sm:flex w-7 h-7 items-center justify-center rounded-lg cursor-pointer"
                              style={{ color: '#9CA3AF', background: 'transparent', border: 'none' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                              <Eye size={14} />
                            </button>
                            <button onClick={() => handleDownload(waiver.id)} className="hidden sm:flex w-7 h-7 items-center justify-center rounded-lg cursor-pointer"
                              style={{ color: waiver.hasPdf ? '#9CA3AF' : '#D1D5DB', background: 'transparent', border: 'none' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                              <Download size={14} />
                            </button>
                            <RowMenu trigger={({ onClick }) => (
                              <button onClick={onClick}
                                className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                                style={{ color: '#9CA3AF', background: 'transparent', border: 'none' }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                                <MoreHorizontal size={15} />
                              </button>
                            )}>
                              <div className="rounded-xl py-1 overflow-hidden"
                                style={{ background: '#fff', border: '1px solid #E5E7EB',
                                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 180 }}>
                                <button onClick={() => setViewing(waiver)} className="w-full text-left px-4 py-2.5 cursor-pointer flex items-center gap-2"
                                  style={{ fontSize: 13, color: '#374151', background: 'transparent', border: 'none' }}
                                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                                  <Eye size={13} />View waiver
                                </button>
                                <button onClick={() => handleDownload(waiver.id)} className="w-full text-left px-4 py-2.5 cursor-pointer flex items-center gap-2"
                                  style={{ fontSize: 13, color: '#374151', background: 'transparent', border: 'none' }}
                                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                                  <Download size={13} />Download PDF
                                </button>
                                {waiver.status === 'Pending' && (
                                  <>
                                    <button onClick={() => handleResend(waiver.id)} className="w-full text-left px-4 py-2.5 cursor-pointer flex items-center gap-2"
                                      style={{ fontSize: 13, color: '#374151', background: 'transparent', border: 'none' }}
                                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                                      <Send size={13} />Resend
                                    </button>
                                    <button onClick={() => setMarking(waiver)} className="w-full text-left px-4 py-2.5 cursor-pointer flex items-center gap-2"
                                      style={{ fontSize: 13, color: '#374151', background: 'transparent', border: 'none' }}
                                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                                      <PenLine size={13} />Mark as signed
                                    </button>
                                  </>
                                )}
                                <button onClick={() => handleRevoke(waiver.id)} className="w-full text-left px-4 py-2.5 cursor-pointer flex items-center gap-2"
                                  style={{ fontSize: 13, color: '#DC2626', background: 'transparent', border: 'none' }}
                                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FEF2F2'}
                                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                                  <Ban size={13} />Revoke
                                </button>
                              </div>
                            </RowMenu>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '48px 0' }}>
                        <FileText size={28} style={{ color: '#E5E7EB', margin: '0 auto 10px' }} />
                        <p style={{ fontSize: 14, color: '#9CA3AF' }}>{loading ? '...' : t.school.noWaivers}</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
                <p style={{ fontSize: 13, color: '#6B7280' }}>
                  {t.common.showing}{' '}
                  <span style={{ fontWeight: 600, color: '#111827' }}>
                    {filtered.length === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)}
                  </span>
                  {' of '}
                  <span style={{ fontWeight: 600, color: '#111827' }}>{filtered.length}</span>
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                    style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff',
                      color: safePage === 1 ? '#D1D5DB' : '#374151', cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                      borderRadius: 8, padding: '6px 12px' }}>{t.common.prev}</button>
                  <div className="flex items-center gap-1 mx-1">
                    {pages.map((p, i) =>
                      p === '...'
                        ? <span key={'e'+i} style={{ fontSize: 13, color: '#9CA3AF', padding: '0 4px' }}>…</span>
                        : (
                          <button key={p} onClick={() => setCurrentPage(p as number)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer"
                            style={{ fontSize: 13, fontWeight: p === safePage ? 600 : 400, border: 'none',
                              background: p === safePage ? '#F3F4F6' : 'transparent',
                              color: p === safePage ? '#111827' : '#6B7280' }}>
                            {p}
                          </button>
                        )
                    )}
                  </div>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                    style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff',
                      color: safePage === totalPages ? '#D1D5DB' : '#374151', cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                      borderRadius: 8, padding: '6px 12px' }}>{t.common.next}</button>
                </div>
              </div>
            </div>
            </>
            ) : (
            <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
              {templates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0' }}>
                  <FileText size={28} style={{ color: '#E5E7EB', margin: '0 auto 10px' }} />
                  <p style={{ fontSize: 14, color: '#9CA3AF' }}>No waiver templates yet</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: '#F3F4F6' }}>
                  {templates.map(tpl => (
                    <div key={tpl.id} className="flex items-center gap-3 px-5 py-4">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#EFF6FF' }}>
                        <FileText size={16} style={{ color: '#2563EB' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{tpl.title}</p>
                        <p style={{ fontSize: 12, color: '#9CA3AF' }}>v{tpl.version} · {tpl.signedCount} signed</p>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
                        background: tpl.isActive ? '#F0FDF4' : '#F3F4F6', color: tpl.isActive ? '#16A34A' : '#6B7280' }}>
                        {tpl.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <button onClick={() => handleToggleActive(tpl)} className="px-3 py-1.5 rounded-lg cursor-pointer"
                        style={{ fontSize: 12, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>
                        {tpl.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => setEditingTemplate(tpl)} className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer"
                        style={{ color: '#9CA3AF', background: 'transparent', border: 'none' }}>
                        <Edit2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}
          </div>
      <AddWaiverDrawer
      open={drawerOpen}
      members={members}
      templates={templates}
      onClose={() => setDrawerOpen(false)}
      onSuccess={() => { setDrawerOpen(false); load(); showToast('Waiver sent successfully') }}
    />
      {viewing && <ViewWaiverModal waiver={viewing} onClose={() => setViewing(null)} />}
      {marking && (
        <MarkSignedModal waiver={marking} onClose={() => setMarking(null)}
          onDone={() => { setMarking(null); load(); showToast('Marked as signed') }} />
      )}
      {(addingTemplate || editingTemplate) && (
        <TemplateModal
          template={editingTemplate}
          onClose={() => { setAddingTemplate(false); setEditingTemplate(null) }}
          onSaved={() => { setAddingTemplate(false); setEditingTemplate(null); loadTemplatesFull(); showToast('Template saved') }}
        />
      )}
      {toast && <SuccessToast message={toast} onClose={() => setToast(null)} />}
    </main>
  )
}
