'use client'

import { useEffect, useState } from 'react'
import { Send, X, Search } from 'lucide-react'
import { matchesSearch } from '../lib/search'

type MemberOption = { id: string; name: string; email: string; avatarUrl: string | null }
type Template = { id: string; title: string; version: string; isActive: boolean }

type Props = {
  onClose: () => void
  onSuccess: (result: { sentCount: number }) => void
} & (
  | { mode: 'single'; member: MemberOption }
  | { mode: 'bulk'; members: MemberOption[] }
)

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

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #E5E7EB', borderRadius: 10,
  padding: '9px 12px', fontSize: 13, color: '#111827', background: '#fff', outline: 'none',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5,
}

// Shared "send a waiver for signature" drawer — used from the school Waivers
// page (bulk: pick one member, or every active member at once), the Users
// list row menu, and the student profile page (both single, member fixed).
export default function SendWaiverModal(props: Props) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [templateId, setTemplateId] = useState('')
  const [notes, setNotes] = useState('')
  const [requiresSignatureToBook, setRequiresSignatureToBook] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [memberQuery, setMemberQuery] = useState('')
  const [selectedMember, setSelectedMember] = useState<MemberOption | null>(props.mode === 'single' ? props.member : null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [sendToAll, setSendToAll] = useState(false)

  useEffect(() => {
    fetch('/api/dashboard/waivers/templates').then(r => r.json()).then(d => {
      setTemplates((d.templates ?? []).filter((t: Template) => t.isActive))
    })
  }, [])

  const bulkMembers = props.mode === 'bulk' ? props.members : []
  const filteredMembers = bulkMembers.filter(m =>
    matchesSearch(m.name, memberQuery) || matchesSearch(m.email, memberQuery)
  )

  async function handleSubmit() {
    const userIds = sendToAll ? bulkMembers.map(m => m.id) : selectedMember ? [selectedMember.id] : []
    if (userIds.length === 0 || !templateId) return
    setSaving(true); setError('')
    const res = await fetch('/api/dashboard/waivers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds, templateId, notes, requiresSignatureToBook }),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error'); return }
    const d = await res.json()
    props.onSuccess({ sentCount: d.sentCount ?? userIds.length })
  }

  const canSubmit = templateId && !saving && (sendToAll ? bulkMembers.length > 0 : !!selectedMember)

  return (
    <>
      <div className="fixed inset-0 z-[90]" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={props.onClose} />
      <div className="fixed top-0 right-0 h-full z-[91] flex flex-col overflow-hidden"
        style={{ width: 'min(560px,96vw)', background: '#F9FAFB', boxShadow: '-4px 0 32px rgba(0,0,0,0.12)' }}>
        <div className="flex items-center justify-between px-6 py-5 shrink-0" style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>Send Waiver</h2>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Send a waiver for signature</p>
          </div>
          <button onClick={props.onClose} className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <X size={15} style={{ color: '#6B7280' }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">
          {props.mode === 'single' ? (
            <div>
              <label style={labelStyle}>Member</label>
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ border: '1px solid #E5E7EB', background: '#fff' }}>
                <Avatar name={props.member.name} avatarUrl={props.member.avatarUrl} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{props.member.name}</p>
                  <p style={{ fontSize: 11, color: '#6B7280' }}>{props.member.email}</p>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label style={labelStyle}>Recipients</label>
              <label className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer mb-2"
                style={{ border: sendToAll ? '1px solid #0071E3' : '1px solid #E5E7EB', background: sendToAll ? '#EFF6FF' : '#fff' }}>
                <input type="checkbox" checked={sendToAll} onChange={e => { setSendToAll(e.target.checked); setSelectedMember(null) }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>
                  Send to all active members ({bulkMembers.length})
                </span>
              </label>

              {!sendToAll && (
                selectedMember ? (
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ border: '1px solid #0071E3', background: '#EFF6FF' }}>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={selectedMember.name} avatarUrl={selectedMember.avatarUrl} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{selectedMember.name}</p>
                        <p style={{ fontSize: 11, color: '#6B7280' }}>{selectedMember.email}</p>
                      </div>
                    </div>
                    <button onClick={() => { setSelectedMember(null); setMemberQuery('') }}
                      className="w-6 h-6 flex items-center justify-center rounded-lg cursor-pointer" style={{ background: 'transparent', border: 'none' }}>
                      <X size={13} style={{ color: '#6B7280' }} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ border: '1px solid #E5E7EB', background: '#fff' }}>
                      <Search size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                      <input type="text" placeholder="Search member…" value={memberQuery}
                        onChange={e => { setMemberQuery(e.target.value); setShowDropdown(true) }}
                        onFocus={() => setShowDropdown(true)}
                        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', width: '100%' }} />
                    </div>
                    {showDropdown && filteredMembers.length > 0 && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                        <div className="absolute left-0 right-0 rounded-xl z-20 overflow-hidden mt-1"
                          style={{ background: '#fff', border: '1px solid #E5E7EB', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', maxHeight: 220, overflowY: 'auto' }}>
                          {filteredMembers.map(m => (
                            <button key={m.id} onClick={() => { setSelectedMember(m); setMemberQuery(''); setShowDropdown(false) }}
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
                  </div>
                )
              )}
            </div>
          )}

          <div>
            <label style={labelStyle}>Waiver Template</label>
            <select value={templateId} onChange={e => setTemplateId(e.target.value)} style={inputStyle}>
              <option value="">Select template…</option>
              {templates.map(tpl => <option key={tpl.id} value={tpl.id}>{tpl.title} (v{tpl.version})</option>)}
            </select>
            {templates.length === 0 && (
              <p style={{ fontSize: 11, color: '#D97706', marginTop: 4 }}>No active templates yet — create one in Waivers → Templates first.</p>
            )}
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer px-3 py-3 rounded-xl"
            style={{ border: '1px solid #E5E7EB', background: '#fff' }}>
            <input type="checkbox" checked={requiresSignatureToBook} onChange={e => setRequiresSignatureToBook(e.target.checked)} className="mt-0.5" />
            <span>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#111827' }}>Require signature before booking</span>
              <span style={{ display: 'block', fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                {requiresSignatureToBook
                  ? 'While this waiver is unsigned, the recipient cannot book or attend classes.'
                  : 'Informational only — sending it will not restrict the recipient from booking.'}
              </span>
            </span>
          </label>

          <div>
            <label style={labelStyle}>Notes <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span></label>
            <textarea rows={3} placeholder="Notes about this waiver…" value={notes} onChange={e => setNotes(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
          </div>

          {error && <p style={{ fontSize: 12, color: '#DC2626' }}>{error}</p>}
        </div>

        <div className="px-6 py-4 flex items-center gap-3 justify-end shrink-0" style={{ background: '#fff', borderTop: '1px solid #E5E7EB' }}>
          <button onClick={props.onClose} className="px-5 py-2.5 rounded-xl cursor-pointer"
            style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={!canSubmit} className="px-6 py-2.5 rounded-xl cursor-pointer flex items-center gap-2"
            style={{ fontSize: 13, fontWeight: 600, border: 'none', background: canSubmit ? '#0071E3' : '#93C5FD', color: '#fff',
              cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
            <Send size={14} />{saving ? 'Sending…' : sendToAll ? `Send to ${bulkMembers.length}` : 'Send Waiver'}
          </button>
        </div>
      </div>
    </>
  )
}
