'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Menu, X, Search, Check, Clock, Filter,
  TrendingUp, TrendingDown, RefreshCw, MoreHorizontal,
  PauseCircle, XCircle, Plus, AlertCircle,
} from 'lucide-react'
import { useDashboard } from '../../../../components/DashboardShell'
import RowMenu from '../../../../components/RowMenu'
import { useT } from '../../../../lib/i18n/LanguageContext'
import { fmtPrice } from '../../../../lib/format'

// ── Types ──────────────────────────────────────────────────────────────────────
type MemStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED' | 'PENDING'
type Filter = 'ALL' | MemStatus

interface SubRow {
  memberId: string
  userId: string
  memberName: string
  memberEmail: string
  memberAvatar: string | null
  belt: string
  planName: string
  planType: string
  amount: number
  currency: string
  startDate: string
  endDate: string | null
  status: MemStatus
  consumed: number
  totalLimit: number | null
}

function Avatar({ name, avatarUrl, size = 32 }: { name: string; avatarUrl: string | null; size?: number }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (avatarUrl) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatarUrl} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #E5E7EB', flexShrink: 0 }} />
  )
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      background: 'linear-gradient(135deg,#0870E2,#7DE7EC)', color: '#fff', fontSize: size * 0.33, fontWeight: 700 }}>
      {initials}
    </div>
  )
}

const STATUS_MAP: Record<MemStatus, { bg: string; color: string; border: string; icon: React.ElementType; label: string }> = {
  PENDING:   { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A', icon: AlertCircle, label: 'Pendiente'  },
  ACTIVE:    { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0', icon: Check,       label: 'Activa'     },
  PAUSED:    { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A', icon: PauseCircle, label: 'Pausada'    },
  CANCELLED: { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', icon: XCircle,     label: 'Cancelada'  },
  EXPIRED:   { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB', icon: Clock,       label: 'Expirada'   },
}

const PLAN_TYPE_MAP: Record<string, { bg: string; color: string }> = {
  SUBSCRIPTION:  { bg: '#EFF6FF', color: '#1D4ED8' },
  SINGLE_PASS:   { bg: '#F0FDF4', color: '#15803D' },
  TRIAL:         { bg: '#F5F3FF', color: '#6D28D9' },
}

const BELT_COLORS: Record<string, { bg: string; color: string }> = {
  Blanco: { bg: '#F9FAFB', color: '#374151' },
  Azul:   { bg: '#EFF6FF', color: '#1D4ED8' },
  Morado: { bg: '#F5F3FF', color: '#6D28D9' },
  Marrón: { bg: '#FFF7ED', color: '#C2410C' },
  Negro:  { bg: '#111827', color: '#F9FAFB' },
  White:  { bg: '#F9FAFB', color: '#374151' },
  Blue:   { bg: '#EFF6FF', color: '#1D4ED8' },
  Purple: { bg: '#F5F3FF', color: '#6D28D9' },
  Brown:  { bg: '#FFF7ED', color: '#C2410C' },
  Black:  { bg: '#111827', color: '#F9FAFB' },
}

const ITEMS_PER_PAGE = 15

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getPaginationPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}

// ── Subscriptions filters ─────────────────────────────────────────────────────
interface SubFilters {
  belt: string
  plan: string
  dateFrom: string
  dateTo: string
}
const EMPTY_SUB_FILTERS: SubFilters = { belt: '', plan: '', dateFrom: '', dateTo: '' }

const SUB_BELT_OPTIONS = ['Blanco', 'Azul', 'Morado', 'Marrón', 'Negro']
const SUB_BELT_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  Blanco: { bg: '#F9FAFB', color: '#374151', border: '#D1D5DB' },
  Azul:   { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  Morado: { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
  Marrón: { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  Negro:  { bg: '#1F2937', color: '#F9FAFB', border: '#374151' },
}

function SubFiltersPanel({ filters, onChange }: {
  filters: SubFilters
  onChange: (f: SubFilters) => void
}) {
  const [open, setOpen]   = useState(false)
  const [local, setLocal] = useState<SubFilters>(filters)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setLocal(filters) }, [filters])
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const activeCount = [!!filters.belt, !!filters.plan, !!filters.dateFrom || !!filters.dateTo].filter(Boolean).length

  function apply() { onChange(local); setOpen(false) }
  function clear() { setLocal(EMPTY_SUB_FILTERS); onChange(EMPTY_SUB_FILTERS); setOpen(false) }

  const inp: React.CSSProperties = {
    width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '7px 10px',
    fontSize: 12, color: '#111827', background: '#fff', outline: 'none', boxShadow: 'none',
    WebkitAppearance: 'none', colorScheme: 'light',
  }
  const sectionLabel: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase',
    letterSpacing: '0.06em', marginBottom: 8, display: 'block',
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 5, height: 34, padding: '0 12px',
          borderRadius: 8, border: activeCount ? '1.5px solid #0071E3' : '1px solid #E5E7EB',
          background: activeCount ? '#EFF6FF' : '#fff', cursor: 'pointer' }}>
        <Filter size={13} style={{ color: activeCount ? '#0071E3' : '#6B7280' }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: activeCount ? '#0071E3' : '#6B7280' }}>Filters</span>
        {activeCount > 0 && (
          <span style={{ background: '#0071E3', color: '#fff', borderRadius: 999, fontSize: 10,
            fontWeight: 700, padding: '1px 6px', lineHeight: 1.4 }}>{activeCount}</span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 30,
          background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16,
          boxShadow: '0 12px 32px rgba(0,0,0,0.12)', width: 300, padding: '16px 16px 14px' }}>

          {/* Date range */}
          <div style={{ marginBottom: 16 }}>
            <span style={sectionLabel}>Date range</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>From</label>
                <input type="date" value={local.dateFrom}
                  onChange={e => setLocal(p => ({ ...p, dateFrom: e.target.value }))} style={inp} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>To</label>
                <input type="date" value={local.dateTo}
                  onChange={e => setLocal(p => ({ ...p, dateTo: e.target.value }))} style={inp} />
              </div>
            </div>
          </div>

          {/* Plan name */}
          <div style={{ marginBottom: 16 }}>
            <span style={sectionLabel}>Plan / Membership</span>
            <input type="text" placeholder="e.g. Jiu Jitsu Mensual"
              value={local.plan}
              onChange={e => setLocal(p => ({ ...p, plan: e.target.value }))}
              style={inp} />
          </div>

          {/* Belt */}
          <div style={{ marginBottom: 16 }}>
            <span style={sectionLabel}>Belt</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button onClick={() => setLocal(p => ({ ...p, belt: '' }))}
                style={{ fontSize: 11, fontWeight: 500, padding: '4px 11px', borderRadius: 999, cursor: 'pointer',
                  border: !local.belt ? '1.5px solid #0071E3' : '1px solid #E5E7EB',
                  background: !local.belt ? '#EFF6FF' : '#F9FAFB',
                  color: !local.belt ? '#0071E3' : '#6B7280' }}>
                All
              </button>
              {SUB_BELT_OPTIONS.map(b => {
                const bs = SUB_BELT_STYLES[b]!
                const isOn = local.belt === b
                return (
                  <button key={b} onClick={() => setLocal(p => ({ ...p, belt: isOn ? '' : b }))}
                    style={{ fontSize: 11, fontWeight: 600, padding: '4px 11px', borderRadius: 999, cursor: 'pointer',
                      border: isOn ? `1.5px solid ${bs.border}` : '1px solid #E5E7EB',
                      background: isOn ? bs.bg : '#F9FAFB',
                      color: isOn ? bs.color : '#6B7280' }}>
                    {b}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid #F3F4F6' }}>
            <button onClick={clear}
              style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid #E5E7EB',
                background: '#fff', fontSize: 12, fontWeight: 500, color: '#6B7280', cursor: 'pointer' }}>
              Clear all
            </button>
            <button onClick={apply}
              style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none',
                background: '#0071E3', fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Success toast ──────────────────────────────────────────────────────────────
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

// ── Member combobox ───────────────────────────────────────────────────────────
interface MemberOption { id: string; name: string; email: string; avatarUrl?: string | null }

function MemberSelect({ members, value, onChange, placeholder = 'Search member…' }: {
  members: MemberOption[]; value: string; onChange: (id: string) => void; placeholder?: string
}) {
  const [query, setQuery] = useState('')
  const [open,  setOpen]  = useState(false)
  const selected = members.find(m => m.id === value)
  const filtered = query
    ? members.filter(m => (m.name + m.email).toLowerCase().includes(query.toLowerCase())).slice(0, 50)
    : members.slice(0, 50)

  return (
    <div style={{ position: 'relative' }}>
      {open ? (
        <div style={{ border: '1px solid #D1FAE5', borderRadius: 10, overflow: 'hidden', background: '#fff',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', gap: 8, borderBottom: '1px solid #F3F4F6' }}>
            <Search size={14} style={{ color: '#9CA3AF', flexShrink: 0 }} />
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
              placeholder={placeholder}
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: '#111827', background: 'transparent' }} />
            <button onClick={() => { setOpen(false); setQuery('') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
              <X size={13} style={{ color: '#9CA3AF' }} />
            </button>
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 && (
              <p style={{ fontSize: 13, color: '#9CA3AF', padding: '10px 14px' }}>No results</p>
            )}
            {filtered.map(m => (
              <button key={m.id} onClick={() => { onChange(m.id); setOpen(false); setQuery('') }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  background: m.id === value ? '#EFF6FF' : 'transparent', border: 'none', cursor: 'pointer',
                  textAlign: 'left' }}>
                <Avatar name={m.name} avatarUrl={m.avatarUrl ?? null} size={28} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>{m.name}</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{m.email}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
            border: '1px solid #E5E7EB', borderRadius: 10, background: '#fff', cursor: 'pointer', textAlign: 'left' }}>
          {selected ? (
            <>
              <Avatar name={selected.name} avatarUrl={selected.avatarUrl ?? null} size={24} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>{selected.name}</p>
                <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{selected.email}</p>
              </div>
              <button onClick={e => { e.stopPropagation(); onChange('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, marginLeft: 'auto' }}>
                <X size={13} style={{ color: '#9CA3AF' }} />
              </button>
            </>
          ) : (
            <>
              <Search size={14} style={{ color: '#9CA3AF' }} />
              <span style={{ fontSize: 13, color: '#9CA3AF' }}>{placeholder}</span>
            </>
          )}
        </button>
      )}
    </div>
  )
}

// ── Assign Membership Modal ───────────────────────────────────────────────────
const MEM_INP: React.CSSProperties = {
  width: '100%', border: '1px solid #E5E7EB', borderRadius: 10, padding: '9px 12px',
  fontSize: 13, color: '#111827', background: '#fff', outline: 'none',
}
const MEM_LBL: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5,
}

function AssignMembershipModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [members, setMembers] = useState<MemberOption[]>([])
  const [plans,   setPlans]   = useState<{ id: string; name: string; price: number; planType: string }[]>([])
  const [form, setForm] = useState({
    userId: '', planId: '', paymentMethod: 'CASH',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '', status: 'ACTIVE', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  useEffect(() => {
    fetch('/api/dashboard/members').then(r => r.json()).then(d =>
      setMembers((d.members ?? []).map((m: { userId: string; name: string; email: string; avatarUrl?: string | null }) => ({ id: m.userId, name: m.name, email: m.email, avatarUrl: m.avatarUrl ?? null })))
    )
    fetch('/api/dashboard/membership-plans').then(r => r.json()).then(d =>
      setPlans((d.plans ?? []).map((p: { id: string; name: string; price: number; planType: string }) => ({ id: p.id, name: p.name, price: p.price, planType: p.planType })))
    )
  }, [])

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  function pickPlan(planId: string) {
    const plan = plans.find(p => p.id === planId)
    if (!plan) { set('planId', planId); return }
    // Auto-fill endDate based on plan type
    const start = new Date(form.startDate || new Date())
    let end = ''
    if (plan.planType === 'SUBSCRIPTION') {
      const d = new Date(start); d.setMonth(d.getMonth() + 1); end = d.toISOString().slice(0, 10)
    } else if (plan.planType === 'SINGLE_PASS') {
      const d = new Date(start); d.setDate(d.getDate() + 30); end = d.toISOString().slice(0, 10)
    } else if (plan.planType === 'TRIAL') {
      const d = new Date(start); d.setDate(d.getDate() + 7); end = d.toISOString().slice(0, 10)
    }
    setForm(p => ({ ...p, planId, endDate: end }))
  }

  async function handleSave() {
    if (!form.userId) { setError('Select a member'); return }
    if (!form.planId) { setError('Select a plan'); return }
    setSaving(true); setError('')
    const plan = plans.find(p => p.id === form.planId)
    const res = await fetch('/api/dashboard/memberships', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId:        form.userId,
        planId:        form.planId,
        planName:      plan?.name ?? '',
        price:         plan?.price ?? 0,
        currency:      'EUR',
        paymentMethod: form.paymentMethod,
        startDate:     form.startDate,
        endDate:       form.endDate || null,
        status:        form.status,
        notes:         form.notes || null,
      }),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error'); return }
    onSaved()
  }

  const selectedPlan = plans.find(p => p.id === form.planId)

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl flex flex-col" style={{ background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', maxHeight: '90vh', overflow: 'hidden' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #F3F4F6', flexShrink: 0 }}>
            <div>
              <p style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0 }}>Assign Membership</p>
              <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Link a plan to a member</p>
            </div>
            <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex' }}>
              <X size={15} style={{ color: '#6B7280' }} />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto px-6 py-5 flex flex-col gap-4">

            {/* Member */}
            <div>
              <label style={MEM_LBL}>Member</label>
              <MemberSelect members={members} value={form.userId} onChange={id => set('userId', id)} />
            </div>

            {/* Plan */}
            <div>
              <label style={MEM_LBL}>Plan</label>
              <select value={form.planId} onChange={e => pickPlan(e.target.value)} style={MEM_INP}>
                <option value="">Select plan…</option>
                {plans.map(p => <option key={p.id} value={p.id}>{p.name} — €{p.price} ({p.planType})</option>)}
              </select>
              {selectedPlan && (
                <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                  {selectedPlan.planType} · €{selectedPlan.price}
                </p>
              )}
            </div>

            {/* Dates */}
            <div className="flex gap-3">
              <div style={{ flex: 1 }}>
                <label style={MEM_LBL}>Start date</label>
                <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} style={MEM_INP} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={MEM_LBL}>End date</label>
                <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} style={MEM_INP} />
              </div>
            </div>

            {/* Method + Status */}
            <div className="flex gap-3">
              <div style={{ flex: 1 }}>
                <label style={MEM_LBL}>Payment method</label>
                <select value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)} style={MEM_INP}>
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="STRIPE">Stripe</option>
                  <option value="DIRECT_DEBIT">Direct Debit</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={MEM_LBL}>Status</label>
                <select value={form.status} onChange={e => set('status', e.target.value)} style={MEM_INP}>
                  <option value="ACTIVE">Active</option>
                  <option value="PAUSED">Paused</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={MEM_LBL}>Notes (optional)</label>
              <input type="text" placeholder="Internal notes…" value={form.notes}
                onChange={e => set('notes', e.target.value)} style={MEM_INP} />
            </div>

            {error && <p style={{ fontSize: 12, color: '#DC2626', fontWeight: 500 }}>{error}</p>}
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4" style={{ borderTop: '1px solid #F3F4F6', flexShrink: 0 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #E5E7EB',
              background: '#fff', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none',
              background: '#0071E3', fontSize: 13, fontWeight: 600, color: '#fff', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : 'Assign Membership'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
const VALID_FILTERS: Filter[] = ['ALL', 'PENDING', 'ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED']

export default function PaymentSubscriptionsClient() {
  const { menuOpen, setMenuOpen } = useDashboard()
  const t = useT()
  const initFilter = (typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('status') ?? 'ALL'
    : 'ALL') as Filter
  const [activeFilter, setActiveFilter] = useState<Filter>(
    VALID_FILTERS.includes(initFilter) ? initFilter : 'ALL'
  )
  const [search, setSearch]             = useState('')
  const [currentPage, setCurrentPage]   = useState(1)
  const [toast, setToast]                    = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [subFilters, setSubFilters]     = useState<SubFilters>(EMPTY_SUB_FILTERS)

  const [subs, setSubs]       = useState<SubRow[]>([])
  const [loading, setLoading] = useState(true)
  const [serverCounts, setServerCounts] = useState({ ALL: 0, PENDING: 0, ACTIVE: 0, PAUSED: 0, CANCELLED: 0, EXPIRED: 0 })
  const [mrr, setMrr] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ pageSize: '500' })
      if (search) params.set('search', search)
      const res = await fetch(`/api/dashboard/memberships?${params}`)
      if (!res.ok) return
      const data = await res.json()
      const memberships = data.memberships ?? []
      const cs = data.countByStatus ?? {}
      const total = (cs.PENDING ?? 0) + (cs.ACTIVE ?? 0) + (cs.PAUSED ?? 0) + (cs.CANCELLED ?? 0) + (cs.EXPIRED ?? 0)
      setServerCounts({ ALL: total, PENDING: cs.PENDING ?? 0, ACTIVE: cs.ACTIVE ?? 0, PAUSED: cs.PAUSED ?? 0, CANCELLED: cs.CANCELLED ?? 0, EXPIRED: cs.EXPIRED ?? 0 })

      const rows: SubRow[] = memberships.map((m: {
        id: string; userId?: string; userName: string; userEmail?: string; userAvatar?: string;
        belt?: string | null; planName: string; planType?: string; paymentMethod?: string;
        price: number; currency?: string; startDate: string; endDate?: string; status: MemStatus;
        classesUsed?: number; totalLimit?: number;
      }) => ({
        memberId:    m.id,
        userId:      m.userId ?? m.id,
        memberName:   m.userName,
        memberEmail:  m.userEmail ?? '',
        memberAvatar: m.userAvatar ?? null,
        belt:         m.belt ?? 'Blanco',
        planName:    m.planName,
        planType:    m.planType ?? 'SUBSCRIPTION',
        amount:      m.price ?? 0,
        currency:    m.currency ?? 'EUR',
        startDate:   m.startDate,
        endDate:     m.endDate ?? null,
        status:      m.status,
        consumed:    m.classesUsed ?? 0,
        totalLimit:  m.totalLimit ?? null,
      }))
      setSubs(rows)

      const activeSubs = rows.filter(r => r.status === 'ACTIVE')
      setMrr(activeSubs.reduce((sum, s) => sum + s.amount, 0))
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { load() }, [load])

  const filtered = subs.filter(s => {
    if (activeFilter !== 'ALL' && s.status !== activeFilter) return false
    if (subFilters.belt && s.belt !== subFilters.belt) return false
    if (subFilters.plan && !s.planName.toLowerCase().includes(subFilters.plan.toLowerCase())) return false
    if (subFilters.dateFrom && new Date(s.startDate) < new Date(subFilters.dateFrom)) return false
    if (subFilters.dateTo   && new Date(s.startDate) > new Date(subFilters.dateTo + 'T23:59:59')) return false
    return true
  })

  const counts = serverCounts

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage   = Math.min(currentPage, totalPages)
  const paginated  = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)
  const pages      = getPaginationPages(safePage, totalPages)

  const STATS = [
    { label: t.paymentsPage.activeNow, value: String(counts.ACTIVE), icon: Check,       color: '#16A34A', bg: '#F0FDF4' },
    { label: t.paymentsPage.mrrLabel,  value: fmtPrice(mrr, 'EUR'), icon: TrendingUp,  color: '#0071E3', bg: '#EFF6FF' },
    { label: 'Pausadas',               value: String(counts.PAUSED),  icon: PauseCircle, color: '#D97706', bg: '#FFFBEB' },
    { label: t.paymentsPage.churn,     value: String(counts.CANCELLED + counts.EXPIRED), icon: TrendingDown, color: '#DC2626', bg: '#FEF2F2' },
  ]

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'ALL',       label: t.common.all      },
    { id: 'PENDING',   label: 'Pendientes'      },
    { id: 'ACTIVE',    label: t.common.active   },
    { id: 'PAUSED',    label: 'Pausadas'        },
    { id: 'CANCELLED', label: t.common.cancelled},
    { id: 'EXPIRED',   label: 'Expiradas'       },
  ]

  function handleFilter(f: Filter) { setActiveFilter(f); setCurrentPage(1) }
  function handleSearch(v: string) { setSearch(v); setCurrentPage(1) }

  return (
    <>
    <main style={{ flex: 1, minWidth: 0, width: '100%', overflow: 'auto' }}>

      {/* Topbar */}
      <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20"
        style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
        <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(!menuOpen)}>
          <Menu size={16} style={{ color: '#374151' }} />
        </button>

        <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 max-w-xs"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
          <Search size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
          <input type="text" placeholder={t.paymentsPage.searchSubs} value={search}
            onChange={e => handleSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', width: '100%' }} />
        </div>

        <SubFiltersPanel filters={subFilters} onChange={f => { setSubFilters(f); setCurrentPage(1) }} />

        <div className="flex-1" />

        <button onClick={() => setShowAssignModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer shrink-0"
          style={{ background: '#0071E3', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600 }}>
          <Plus size={15} /><span className="hidden sm:inline">Asignar membresía</span>
        </button>
      </div>

      <div className="px-4 md:px-8 py-6 flex flex-col gap-6">

        {/* Header */}
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>
            {t.paymentsPage.subscriptionsTitle}
          </h1>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>
            {t.paymentsPage.subscriptionsSubtitle}
          </p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {STATS.map(s => (
            <div key={s.label} className="rounded-2xl"
              style={{ background: '#fff', border: '1px solid #E5E7EB', padding: '18px 20px' }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: s.bg }}>
                  <s.icon size={16} style={{ color: s.color }} />
                </div>
              </div>
              <p style={{ fontSize: 26, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 4 }}>
                {loading ? '—' : s.value}
              </p>
              <p style={{ fontSize: 12, fontWeight: 500, color: '#6B7280' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ borderBottom: '1px solid #E5E7EB' }}>
          <div className="flex items-center gap-1">
            {FILTERS.map(f => {
              const isActive = activeFilter === f.id
              const sc = f.id !== 'ALL' ? STATUS_MAP[f.id as MemStatus] : null
              const count = counts[f.id]
              return (
                <button key={f.id}
                  onClick={() => handleFilter(f.id)}
                  className="flex items-center gap-2 px-4 py-3 cursor-pointer relative"
                  style={{ fontSize: 14, fontWeight: isActive ? 600 : 400, border: 'none',
                    background: 'transparent', color: isActive ? '#111827' : '#6B7280' }}>
                  {f.label}
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 999,
                    background: isActive && sc ? sc.bg : '#F3F4F6',
                    color: isActive && sc ? sc.color : '#9CA3AF' }}>
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

        {/* Table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                {[
                  { label: t.common.member,               cls: '' },
                  { label: t.paymentsPage.colPlan,        cls: 'hidden md:table-cell' },
                  { label: t.common.amount,               cls: 'hidden sm:table-cell' },
                  { label: t.common.startDate,            cls: 'hidden lg:table-cell' },
                  { label: 'Vencimiento',                 cls: 'hidden lg:table-cell' },
                  { label: t.common.status,               cls: '' },
                  { label: t.common.actions,              cls: '' },
                ].map(h => (
                  <th key={h.label} className={`px-5 py-3 text-left ${h.cls}`}
                    style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF',
                      textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 0' }}>
                    <p style={{ fontSize: 14, color: '#9CA3AF' }}>Cargando…</p>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 0' }}>
                    <RefreshCw size={28} style={{ color: '#E5E7EB', margin: '0 auto 10px' }} />
                    <p style={{ fontSize: 14, color: '#9CA3AF' }}>{t.paymentsPage.noSubscriptions}</p>
                  </td>
                </tr>
              ) : paginated.map((sub, idx) => {
                const sc  = STATUS_MAP[sub.status]
                const bc  = BELT_COLORS[sub.belt] ?? BELT_COLORS['Blanco']!
                const pt  = PLAN_TYPE_MAP[sub.planType] ?? PLAN_TYPE_MAP.SUBSCRIPTION!
                const StatusIcon = sc.icon
                return (
                  <tr key={sub.memberId}
                    className="hover:bg-[#FAFAFA] transition-colors cursor-pointer"
                    style={{ borderBottom: idx < paginated.length - 1 ? '1px solid #F9FAFB' : 'none' }}>

                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={sub.memberName} avatarUrl={sub.memberAvatar} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{sub.memberName}</p>
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 99,
                              background: bc.bg, color: bc.color, flexShrink: 0 }}>
                              {sub.belt}
                            </span>
                          </div>
                          <p style={{ fontSize: 11, color: '#9CA3AF' }}>{sub.memberEmail}</p>
                        </div>
                      </div>
                    </td>

                    <td className="hidden md:table-cell px-5 py-3">
                      <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99,
                        background: pt.bg, color: pt.color }}>
                        {sub.planName}
                      </span>
                    </td>

                    <td className="hidden sm:table-cell px-5 py-3">
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>
                        {fmtPrice(sub.amount, sub.currency)}
                      </span>
                    </td>

                    <td className="hidden lg:table-cell px-5 py-3">
                      <span style={{ fontSize: 13, color: '#6B7280' }}>{fmtDate(sub.startDate)}</span>
                    </td>

                    <td className="hidden lg:table-cell px-5 py-3">
                      {sub.endDate ? (
                        <span style={{ fontSize: 13, color: '#374151' }}>{fmtDate(sub.endDate)}</span>
                      ) : sub.totalLimit ? (
                        <span style={{ fontSize: 12, color: '#374151' }}>
                          {sub.consumed}/{sub.totalLimit} clases
                        </span>
                      ) : (
                        <span style={{ fontSize: 13, color: '#D1D5DB' }}>—</span>
                      )}
                    </td>

                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5"
                        style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
                          background: sc.bg, color: sc.color, border: '1px solid ' + sc.border,
                          whiteSpace: 'nowrap' }}>
                        <StatusIcon size={9} strokeWidth={2.5} />
                        {sc.label}
                      </span>
                    </td>

                    <td className="px-5 py-3">
                      <RowMenu trigger={({ onClick }) => (
                        <button
                          onClick={onClick}
                          className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                          style={{ color: '#9CA3AF', background: 'transparent', border: 'none' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                          <MoreHorizontal size={15} />
                        </button>
                      )}>
                        <div className="rounded-xl py-1 overflow-hidden"
                          style={{ background: '#fff', border: '1px solid #E5E7EB',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 170 }}>
                          <a href={`/dashboard/users/${sub.memberId}`}
                            className="w-full text-left px-4 py-2.5 flex items-center gap-2"
                            style={{ fontSize: 13, color: '#374151', background: 'transparent',
                              border: 'none', textDecoration: 'none', display: 'block' }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                            Ver perfil
                          </a>
                        </div>
                      </RowMenu>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filtered.length > ITEMS_PER_PAGE && (
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
                            color: p === safePage ? '#111827' : '#6B7280' }}>{p}</button>
                      )
                  )}
                </div>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                  style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff',
                    color: safePage === totalPages ? '#D1D5DB' : '#374151', cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                    borderRadius: 8, padding: '6px 12px' }}>{t.common.next}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>

    {toast && <SuccessToast message={t.paymentsPage.txRecorded} onClose={() => setToast(false)} />}
    {showAssignModal && (
      <AssignMembershipModal
        onClose={() => setShowAssignModal(false)}
        onSaved={() => { setShowAssignModal(false); setToast(true); load() }}
      />
    )}
    </>
  )
}
