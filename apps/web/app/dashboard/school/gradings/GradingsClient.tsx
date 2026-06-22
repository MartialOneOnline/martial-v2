'use client'

import { useDashboard } from '../../../../components/DashboardShell'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Menu, Search, X, Check, Plus, ArrowRight, Award,
  ChevronLeft, ChevronRight, MoreHorizontal, Bell,
} from 'lucide-react'
import { useT } from '../../../../lib/i18n/LanguageContext'

// ── Types ─────────────────────────────────────────────────────────────────────
interface GradingRecord {
  id: string
  userName: string
  userAvatar: string | null
  fromBelt: string | null
  toBelt: string
  toDegree: number
  gradedAt: string
  instructor: string | null
  notes: string | null
}

interface BeltDist { belt: string; count: number }

interface Member {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  belt: string | null
  beltDegree: number | null
}

// ── Constants ─────────────────────────────────────────────────────────────────
const BELTS = ['White', 'Blue', 'Purple', 'Brown', 'Black'] as const
type BeltKey = typeof BELTS[number]

const BELT_MAP: Record<BeltKey, { bg: string; color: string; dot: string; label: string }> = {
  White:  { bg: '#F9FAFB', color: '#374151', dot: '#9CA3AF', label: 'White'  },
  Blue:   { bg: '#EFF6FF', color: '#1D4ED8', dot: '#2563EB', label: 'Blue'   },
  Purple: { bg: '#F5F3FF', color: '#6D28D9', dot: '#7C3AED', label: 'Purple' },
  Brown:  { bg: '#FEF3C7', color: '#92400E', dot: '#92400E', label: 'Brown'  },
  Black:  { bg: '#F3F4F6', color: '#111827', dot: '#111827', label: 'Black'  },
}

const SPANISH_TO_BELT: Record<string, BeltKey> = {
  blanco: 'White', blanca: 'White',
  azul:   'Blue',
  morado: 'Purple', morada: 'Purple',
  marron: 'Brown', marrón: 'Brown',
  negro:  'Black', negra: 'Black',
}

function beltCfg(belt: string | null) {
  if (!belt) return { bg: '#F3F4F6', color: '#6B7280', dot: '#D1D5DB', label: '—' }
  const lower = belt.toLowerCase()
  // match English
  const engKey = BELTS.find(b => lower.includes(b.toLowerCase()))
  if (engKey) return { ...BELT_MAP[engKey], label: belt }
  // match Spanish
  const spKey = Object.entries(SPANISH_TO_BELT).find(([es]) => lower.startsWith(es))
  if (spKey) return { ...BELT_MAP[spKey[1]], label: belt }
  return { bg: '#F3F4F6', color: '#6B7280', dot: '#D1D5DB', label: belt }
}

function StripeDots({ degree, color }: { degree: number; color: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="w-2 h-2 rounded-full"
          style={{ background: i < degree ? color : '#E5E7EB' }} />
      ))}
    </div>
  )
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getPaginationPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}

const ITEMS_PER_PAGE = 20

// ── Add Grading Drawer ────────────────────────────────────────────────────────
function AddGradingDrawer({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess: (g: GradingRecord) => void
}) {
  const [memberQuery,     setMemberQuery]     = useState('')
  const [members,         setMembers]         = useState<Member[]>([])
  const [showDropdown,    setShowDropdown]    = useState(false)
  const [selectedMember,  setSelectedMember]  = useState<Member | null>(null)
  const [fromBelt,        setFromBelt]        = useState('')
  const [toBelt,          setToBelt]          = useState('')
  const [toDegree,        setToDegree]        = useState(0)
  const [gradedAt,        setGradedAt]        = useState('')
  const [notes,           setNotes]           = useState('')
  const [saving,          setSaving]          = useState(false)
  const searchRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (!open) return
    // pre-fill today
    setGradedAt(new Date().toISOString().slice(0, 10))
  }, [open])

  useEffect(() => {
    clearTimeout(searchRef.current)
    if (memberQuery.length < 2) { setMembers([]); return }
    searchRef.current = setTimeout(async () => {
      const res = await fetch(`/api/dashboard/members?search=${encodeURIComponent(memberQuery)}&pageSize=10`)
      if (!res.ok) return
      const data = await res.json()
      setMembers(data.members ?? [])
    }, 250)
  }, [memberQuery])

  function selectMember(m: Member) {
    setSelectedMember(m)
    setFromBelt(m.belt ?? '')
    setToDegree(0)
    setMemberQuery('')
    setShowDropdown(false)
    setMembers([])
  }

  function reset() {
    setMemberQuery(''); setMembers([]); setShowDropdown(false); setSelectedMember(null)
    setFromBelt(''); setToBelt(''); setToDegree(0)
    setGradedAt(new Date().toISOString().slice(0, 10)); setNotes(''); setSaving(false)
  }

  function handleClose() { reset(); onClose() }

  async function handleSubmit() {
    if (!selectedMember || !toBelt || !gradedAt) return
    setSaving(true)
    const res = await fetch('/api/dashboard/gradings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: selectedMember.id, fromBelt: fromBelt || null, toBelt, toDegree, gradedAt, notes }),
    })
    setSaving(false)
    if (!res.ok) return
    const grading = await res.json()
    reset()
    onSuccess(grading)
  }

  const canSubmit = !!selectedMember && !!toBelt && !!gradedAt

  const INP: React.CSSProperties = {
    width: '100%', border: '1px solid #E5E7EB', borderRadius: 10,
    padding: '9px 12px', fontSize: 13, color: '#111827', background: '#fff', outline: 'none',
  }
  const LBL: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }

  return (
    <>
      <div className="fixed inset-0 z-40 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.35)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
        onClick={handleClose} />
      <div className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-hidden"
        style={{ width: 'min(520px,96vw)', background: '#F9FAFB',
          boxShadow: '-4px 0 32px rgba(0,0,0,0.12)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 shrink-0"
          style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>Record Promotion</h2>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Record a belt promotion or stripe for a member</p>
          </div>
          <button onClick={handleClose} className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <X size={15} style={{ color: '#6B7280' }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">

          {/* Member search */}
          <div>
            <label style={LBL}>Member</label>
            {selectedMember ? (
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                style={{ border: '1px solid #0870E2', background: '#EFF6FF' }}>
                <div className="flex items-center gap-2.5">
                  {selectedMember.avatarUrl
                    ? <img src={selectedMember.avatarUrl} alt={selectedMember.name} className="w-8 h-8 rounded-full shrink-0 object-cover" />
                    : <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: 'linear-gradient(135deg,#0870E2,#7DE7EC)' }}>
                        {selectedMember.name.slice(0, 1).toUpperCase()}
                      </div>
                  }
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>{selectedMember.name}</p>
                    <p style={{ fontSize: 11, color: '#6B7280', margin: 0 }}>{selectedMember.email}</p>
                  </div>
                </div>
                <button onClick={() => { setSelectedMember(null); setFromBelt('') }}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  <X size={13} style={{ color: '#6B7280' }} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{ border: '1px solid #E5E7EB', background: '#fff' }}>
                  <Search size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                  <input type="text" placeholder="Search member by name or email…"
                    value={memberQuery}
                    onChange={e => { setMemberQuery(e.target.value); setShowDropdown(true) }}
                    onFocus={() => setShowDropdown(true)}
                    style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', width: '100%' }} />
                </div>
                {showDropdown && members.length > 0 && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                    <div className="absolute left-0 right-0 rounded-xl z-20 overflow-hidden mt-1"
                      style={{ background: '#fff', border: '1px solid #E5E7EB',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.1)', maxHeight: 220, overflowY: 'auto' }}>
                      {members.map(m => {
                        const bc = beltCfg(m.belt)
                        return (
                          <button key={m.id} onClick={() => selectMember(m)}
                            className="w-full text-left flex items-center gap-3 px-4 py-2.5 cursor-pointer"
                            style={{ background: 'transparent', border: 'none' }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                            {m.avatarUrl
                              ? <img src={m.avatarUrl} alt={m.name} className="w-8 h-8 rounded-full shrink-0 object-cover" />
                              : <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
                                  style={{ background: 'linear-gradient(135deg,#0870E2,#7DE7EC)' }}>
                                  {m.name.slice(0, 1).toUpperCase()}
                                </div>
                            }
                            <div className="flex-1 min-w-0">
                              <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>{m.name}</p>
                              <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{m.email}</p>
                            </div>
                            {m.belt && (
                              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 999,
                                background: bc.bg, color: bc.color }}>
                                {m.belt}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Belt transition */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={LBL}>From Belt</label>
              <select value={fromBelt} onChange={e => setFromBelt(e.target.value)} style={INP}>
                <option value="">— none —</option>
                {BELTS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label style={LBL}>To Belt <span style={{ color: '#EF4444' }}>*</span></label>
              <select value={toBelt} onChange={e => setToBelt(e.target.value)} style={INP}>
                <option value="">Select…</option>
                {BELTS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          {/* Stripes */}
          <div>
            <label style={LBL}>Stripes / Degree</label>
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4].map(n => (
                <button key={n} onClick={() => setToDegree(n)}
                  className="flex-1 py-2.5 rounded-xl cursor-pointer"
                  style={{ fontSize: 13, fontWeight: toDegree === n ? 700 : 400,
                    border: `1.5px solid ${toDegree === n ? '#0870E2' : '#E5E7EB'}`,
                    background: toDegree === n ? '#EFF6FF' : '#fff',
                    color: toDegree === n ? '#0870E2' : '#6B7280' }}>
                  {n === 0 ? '0 (plain)' : n}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label style={LBL}>Date <span style={{ color: '#EF4444' }}>*</span></label>
            <input type="date" value={gradedAt} onChange={e => setGradedAt(e.target.value)} style={INP} />
          </div>

          {/* Notes */}
          <div>
            <label style={LBL}>Notes <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span></label>
            <textarea rows={3} placeholder="Any remarks about this promotion…" value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ ...INP, resize: 'vertical', lineHeight: 1.6 }} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center gap-3 justify-end shrink-0"
          style={{ background: '#fff', borderTop: '1px solid #E5E7EB' }}>
          <button onClick={handleClose}
            style={{ padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 500,
              border: '1px solid #E5E7EB', background: '#fff', color: '#374151', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={!canSubmit || saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 10,
              fontSize: 13, fontWeight: 600, border: 'none',
              background: canSubmit ? '#0870E2' : '#93C5FD', color: '#fff',
              cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
            <Plus size={14} />
            {saving ? 'Saving…' : 'Record Promotion'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Edit Grading Drawer ───────────────────────────────────────────────────────
function EditGradingDrawer({ grading, onClose, onSuccess }: {
  grading: GradingRecord | null
  onClose: () => void
  onSuccess: (g: GradingRecord) => void
}) {
  const open = !!grading
  const [fromBelt, setFromBelt] = useState('')
  const [toBelt,   setToBelt]   = useState('')
  const [toDegree, setToDegree] = useState(0)
  const [gradedAt, setGradedAt] = useState('')
  const [notes,    setNotes]    = useState('')
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    if (!grading) return
    setFromBelt(grading.fromBelt ?? '')
    setToBelt(grading.toBelt)
    setToDegree(grading.toDegree)
    setGradedAt(grading.gradedAt.slice(0, 10))
    setNotes(grading.notes ?? '')
  }, [grading])

  async function handleSave() {
    if (!grading || !toBelt || !gradedAt) return
    setSaving(true)
    const res = await fetch(`/api/dashboard/gradings/${grading.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromBelt: fromBelt || null, toBelt, toDegree, gradedAt, notes: notes || null }),
    })
    setSaving(false)
    if (!res.ok) return
    const updated = await res.json()
    onSuccess(updated)
  }

  const INP: React.CSSProperties = {
    width: '100%', border: '1px solid #E5E7EB', borderRadius: 10,
    padding: '9px 12px', fontSize: 13, color: '#111827', background: '#fff', outline: 'none',
  }
  const LBL: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }

  return (
    <>
      <div className="fixed inset-0 z-40 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.35)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
        onClick={onClose} />
      <div className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-hidden"
        style={{ width: 'min(520px,96vw)', background: '#F9FAFB',
          boxShadow: '-4px 0 32px rgba(0,0,0,0.12)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)' }}>

        <div className="flex items-center justify-between px-6 py-5 shrink-0"
          style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>Edit Promotion</h2>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{grading?.userName}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <X size={15} style={{ color: '#6B7280' }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={LBL}>From Belt</label>
              <select value={fromBelt} onChange={e => setFromBelt(e.target.value)} style={INP}>
                <option value="">— none —</option>
                {BELTS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label style={LBL}>To Belt <span style={{ color: '#EF4444' }}>*</span></label>
              <select value={toBelt} onChange={e => setToBelt(e.target.value)} style={INP}>
                <option value="">Select…</option>
                {BELTS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={LBL}>Stripes / Degree</label>
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4].map(n => (
                <button key={n} onClick={() => setToDegree(n)}
                  className="flex-1 py-2.5 rounded-xl cursor-pointer"
                  style={{ fontSize: 13, fontWeight: toDegree === n ? 700 : 400,
                    border: `1.5px solid ${toDegree === n ? '#0870E2' : '#E5E7EB'}`,
                    background: toDegree === n ? '#EFF6FF' : '#fff',
                    color: toDegree === n ? '#0870E2' : '#6B7280' }}>
                  {n === 0 ? '0' : n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={LBL}>Date <span style={{ color: '#EF4444' }}>*</span></label>
            <input type="date" value={gradedAt} onChange={e => setGradedAt(e.target.value)} style={INP} />
          </div>

          <div>
            <label style={LBL}>Notes <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span></label>
            <textarea rows={3} placeholder="Any remarks…" value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ ...INP, resize: 'vertical', lineHeight: 1.6 }} />
          </div>
        </div>

        <div className="px-6 py-4 flex items-center gap-3 justify-end shrink-0"
          style={{ background: '#fff', borderTop: '1px solid #E5E7EB' }}>
          <button onClick={onClose}
            style={{ padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 500,
              border: '1px solid #E5E7EB', background: '#fff', color: '#374151', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={!toBelt || !gradedAt || saving}
            style={{ padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              border: 'none', background: '#0870E2', color: '#fff',
              cursor: toBelt && gradedAt ? 'pointer' : 'not-allowed',
              opacity: toBelt && gradedAt ? 1 : 0.5 }}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Row menu ──────────────────────────────────────────────────────────────────
function RowMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
        style={{ color: '#9CA3AF', background: 'transparent', border: 'none' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <div className="absolute right-0 rounded-xl z-20 py-1 overflow-hidden"
          style={{ background: '#fff', border: '1px solid #E5E7EB',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 140, top: '100%' }}>
          <button onClick={() => { setOpen(false); onEdit() }}
            className="w-full text-left px-4 py-2.5 cursor-pointer"
            style={{ fontSize: 13, color: '#374151', background: 'transparent', border: 'none' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
            Edit record
          </button>
          <button onClick={() => { setOpen(false); onDelete() }}
            className="w-full text-left px-4 py-2.5 cursor-pointer"
            style={{ fontSize: 13, color: '#DC2626', background: 'transparent', border: 'none' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FEF2F2'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
            Delete record
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function GradingsClient() {
  const { setMenuOpen } = useDashboard()
  const t = useT()

  const [gradings,  setGradings]  = useState<GradingRecord[]>([])
  const [total,     setTotal]     = useState(0)
  const [beltDist,  setBeltDist]  = useState<BeltDist[]>([])
  const [loading,   setLoading]   = useState(true)

  const [search,    setSearch]    = useState('')
  const [beltFilter,setBeltFilter]= useState<BeltKey | 'All'>('All')
  const [page,      setPage]      = useState(1)

  const [drawerOpen,   setDrawerOpen]   = useState(false)
  const [editGrading,  setEditGrading]  = useState<GradingRecord | null>(null)
  const [toast,        setToast]        = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(ITEMS_PER_PAGE),
      ...(search ? { search } : {}),
      ...(beltFilter !== 'All' ? { belt: beltFilter } : {}),
    })
    const res = await fetch(`/api/dashboard/gradings?${params}`)
    if (!res.ok) { setLoading(false); return }
    const data = await res.json()
    setGradings(data.gradings)
    setTotal(data.total)
    setBeltDist(data.beltDistribution ?? [])
    setLoading(false)
  }, [page, search, beltFilter])

  useEffect(() => { load() }, [load])

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))
  const pages = getPaginationPages(page, totalPages)

  // Top belt by member count
  const topBelt = beltDist.reduce<BeltDist | null>((acc, b) => (!acc || b.count > acc.count ? b : acc), null)
  const totalMembers = beltDist.reduce((s, b) => s + b.count, 0)

  const STATS = [
    { label: 'Total Promotions', value: String(total),              color: '#0870E2', bg: '#EFF6FF' },
    { label: 'Active Members',   value: String(totalMembers),       color: '#16A34A', bg: '#F0FDF4' },
    { label: 'Top Belt',         value: topBelt?.belt ?? '—',       color: '#7C3AED', bg: '#F5F3FF' },
    { label: 'Black Belts',      value: String(beltDist.find(b => b.belt?.toLowerCase().includes('black'))?.count ?? 0), color: '#374151', bg: '#F3F4F6' },
  ]

  function handleSuccess(g: GradingRecord) {
    setDrawerOpen(false)
    setGradings(prev => [g, ...prev])
    setTotal(t => t + 1)
    setToast('Promotion recorded successfully')
    setTimeout(() => setToast(''), 3500)
    load()
  }

  function handleEditSuccess(updated: GradingRecord) {
    setEditGrading(null)
    setGradings(prev => prev.map(g => g.id === updated.id ? updated : g))
    setToast('Promotion updated successfully')
    setTimeout(() => setToast(''), 3500)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this grading record?')) return
    await fetch(`/api/dashboard/gradings/${id}`, { method: 'DELETE' })
    setGradings(prev => prev.filter(g => g.id !== id))
    setTotal(t => t - 1)
  }

  return (
    <main style={{ flex: 1, minWidth: 0, width: '100%', overflow: 'auto' }}>
      {/* Topbar */}
      <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20"
        style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
        <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(true)}>
          <Menu size={16} style={{ color: '#374151' }} />
        </button>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 max-w-xs"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
          <Search size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
          <input type="text" placeholder="Search member…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', width: '100%' }} />
        </div>
        <div className="flex-1" />
        <button className="relative w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
          <Bell size={15} style={{ color: '#374151' }} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: '#DC2626' }} />
        </button>
        <button onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer"
          style={{ background: '#0870E2', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600 }}>
          <Plus size={15} /> Record Promotion
        </button>
      </div>

      <div className="px-4 md:px-8 py-6 flex flex-col gap-6">
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>Gradings</h1>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>Belt promotions and grading history</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {STATS.map(s => (
            <div key={s.label} className="rounded-2xl" style={{ background: '#fff', border: '1px solid #E5E7EB', padding: '18px 20px' }}>
              <div className="w-2 h-2 rounded-full mb-3" style={{ background: s.color }} />
              <p style={{ fontSize: 26, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 4 }}>
                {loading ? '—' : s.value}
              </p>
              <p style={{ fontSize: 12, fontWeight: 500, color: '#6B7280' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Belt distribution bar */}
        {beltDist.length > 0 && totalMembers > 0 && (
          <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 12 }}>Belt distribution</p>
            <div className="flex gap-1 h-3 rounded-full overflow-hidden mb-3">
              {BELTS.map(b => {
                const cfg = BELT_MAP[b]
                const entry = beltDist.find(d => d.belt?.toLowerCase().includes(b.toLowerCase()))
                const pct = entry ? (entry.count / totalMembers) * 100 : 0
                return pct > 0 ? (
                  <div key={b} style={{ width: `${pct}%`, background: cfg.dot, minWidth: 4, borderRadius: 4, transition: 'width 0.5s' }} />
                ) : null
              })}
            </div>
            <div className="flex flex-wrap gap-3">
              {BELTS.map(b => {
                const cfg = BELT_MAP[b]
                const entry = beltDist.find(d => d.belt?.toLowerCase().includes(b.toLowerCase()))
                if (!entry) return null
                return (
                  <div key={b} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
                    <span style={{ fontSize: 12, color: '#6B7280' }}>{b}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>{entry.count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Belt filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {(['All', ...BELTS] as (BeltKey | 'All')[]).map(b => {
            const isActive = beltFilter === b
            const cfg = b !== 'All' ? BELT_MAP[b as BeltKey] : null
            return (
              <button key={b} onClick={() => { setBeltFilter(b); setPage(1) }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                  borderRadius: 999, cursor: 'pointer', fontSize: 12, fontWeight: isActive ? 600 : 400,
                  border: `1.5px solid ${isActive ? (cfg?.dot ?? '#0870E2') : '#E5E7EB'}`,
                  background: isActive ? (cfg?.bg ?? '#EFF6FF') : '#F9FAFB',
                  color: isActive ? (cfg?.color ?? '#0870E2') : '#6B7280' }}>
                {cfg && <div className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />}
                {b}
              </button>
            )
          })}
        </div>

        {/* Table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                {['Member', 'Promotion', 'Stripes', 'Date', 'Instructor', 'Notes', ''].map(h => (
                  <th key={h} className={`px-5 py-3 text-left ${h === 'Instructor' ? 'hidden lg:table-cell' : h === 'Notes' ? 'hidden xl:table-cell' : ''}`}
                    style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center" style={{ fontSize: 13, color: '#9CA3AF' }}>Loading…</td></tr>
              ) : gradings.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 0' }}>
                    <Award size={28} style={{ color: '#E5E7EB', margin: '0 auto 10px' }} />
                    <p style={{ fontSize: 14, color: '#9CA3AF' }}>No grading records found</p>
                  </td>
                </tr>
              ) : gradings.map((g, idx) => {
                const from = beltCfg(g.fromBelt)
                const to   = beltCfg(g.toBelt)
                return (
                  <tr key={g.id} className="hover:bg-[#FAFAFA] transition-colors"
                    style={{ borderBottom: idx < gradings.length - 1 ? '1px solid #F9FAFB' : 'none' }}>

                    {/* Member */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {g.userAvatar
                          ? <img src={g.userAvatar} alt={g.userName} className="w-8 h-8 rounded-full shrink-0 object-cover" />
                          : <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
                              style={{ background: 'linear-gradient(135deg,#0870E2,#7DE7EC)' }}>
                              {g.userName.slice(0, 1).toUpperCase()}
                            </div>
                        }
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{g.userName}</span>
                      </div>
                    </td>

                    {/* Promotion */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {g.fromBelt ? (
                          <>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                              background: from.bg, color: from.color }}>
                              {g.fromBelt}
                            </span>
                            <ArrowRight size={11} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                          </>
                        ) : null}
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                          background: to.bg, color: to.color }}>
                          {g.toBelt}
                        </span>
                      </div>
                    </td>

                    {/* Stripes */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <StripeDots degree={g.toDegree} color={to.dot} />
                        {g.toDegree > 0 && (
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{g.toDegree}</span>
                        )}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-3">
                      <span style={{ fontSize: 13, color: '#6B7280' }}>{fmtDate(g.gradedAt)}</span>
                    </td>

                    {/* Instructor */}
                    <td className="hidden lg:table-cell px-5 py-3">
                      <span style={{ fontSize: 13, color: '#374151' }}>{g.instructor ?? '—'}</span>
                    </td>

                    {/* Notes */}
                    <td className="hidden xl:table-cell px-5 py-3" style={{ maxWidth: 200 }}>
                      <span style={{ fontSize: 12, color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                        {g.notes ?? ''}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3">
                      <RowMenu onEdit={() => setEditGrading(g)} onDelete={() => handleDelete(g.id)} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
              <p style={{ fontSize: 13, color: '#6B7280' }}>
                Showing <span style={{ fontWeight: 600, color: '#111827' }}>{(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, total)}</span> of <span style={{ fontWeight: 600, color: '#111827' }}>{total}</span>
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ border: '1px solid #E5E7EB', background: '#fff', color: page === 1 ? '#D1D5DB' : '#374151',
                    cursor: page === 1 ? 'not-allowed' : 'pointer', borderRadius: 8, padding: '6px 10px' }}>
                  <ChevronLeft size={14} />
                </button>
                {pages.map((p, i) =>
                  p === '...' ? <span key={'e' + i} style={{ fontSize: 13, color: '#9CA3AF', padding: '0 4px' }}>…</span> : (
                    <button key={p} onClick={() => setPage(p as number)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer"
                      style={{ fontSize: 13, fontWeight: p === page ? 600 : 400, border: 'none',
                        background: p === page ? '#F3F4F6' : 'transparent', color: p === page ? '#111827' : '#6B7280' }}>
                      {p}
                    </button>
                  )
                )}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ border: '1px solid #E5E7EB', background: '#fff', color: page === totalPages ? '#D1D5DB' : '#374151',
                    cursor: page === totalPages ? 'not-allowed' : 'pointer', borderRadius: 8, padding: '6px 10px' }}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AddGradingDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onSuccess={handleSuccess} />
      <EditGradingDrawer grading={editGrading} onClose={() => setEditGrading(null)} onSuccess={handleEditSuccess} />

      {toast && (
        <div className="fixed bottom-6 right-6 z-[70] flex items-center gap-3 px-5 py-3.5 rounded-2xl"
          style={{ background: '#fff', border: '1px solid #BBF7D0', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: '#F0FDF4' }}>
            <Check size={14} style={{ color: '#16A34A' }} strokeWidth={3} />
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{toast}</p>
          <button onClick={() => setToast('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <X size={13} style={{ color: '#9CA3AF' }} />
          </button>
        </div>
      )}
    </main>
  )
}
