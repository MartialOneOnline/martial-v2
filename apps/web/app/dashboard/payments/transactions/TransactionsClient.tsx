'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Menu, Search, Download, Plus, Check, Clock, Filter,
  AlertCircle, XCircle, RefreshCw, ChevronLeft, ChevronRight, X,
  CreditCard, Banknote, Building2, Landmark, TrendingUp, TrendingDown,
  LayoutList, Eye, MoreHorizontal, Trash2, Flag,
} from 'lucide-react'
import { useDashboard } from '../../../../components/DashboardShell'
import { useT } from '../../../../lib/i18n/LanguageContext'
import { fmtPrice } from '../../../../lib/format'
import RowMenu from '../../../../components/RowMenu'

type TxStatus  = 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED' | 'FLAGGED'
type FilterTab = 'ALL' | TxStatus
type MethodFilter = 'ALL' | 'STRIPE' | 'CASH' | 'BANK_TRANSFER' | 'DIRECT_DEBIT' | 'OTHER'
type TypeFilter   = 'ALL' | 'INCOME' | 'EXPENSE'

interface TxRow {
  id: string
  userName: string
  userEmail: string | null
  userAvatar: string | null
  description: string | null
  method: string | null
  category: string
  amount: number
  currency: string
  date: string
  status: TxStatus
  type: string
  notes: string | null
  periodStart: string | null
  periodEnd: string | null
  bookingId: string | null
  stripePaymentIntentId: string | null
  revolutOrderId: string | null
  // Manual-review resolution (FLAGGED only) — status stays FLAGGED even once
  // resolved, this is metadata layered on top, not a status transition.
  resolvedAt: string | null
  resolvedByName: string | null
  resolutionNote: string | null
}

interface StatusCounts { PAID: number; PENDING: number; FAILED: number; REFUNDED: number; FLAGGED: number }

const STATUS_MAP: Record<TxStatus, { bg: string; color: string; border: string; icon: React.ElementType; label: string }> = {
  PAID:     { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0', icon: Check,        label: 'Paid'     },
  PENDING:  { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A', icon: Clock,        label: 'Pending'  },
  FAILED:   { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', icon: AlertCircle,  label: 'Failed'   },
  REFUNDED: { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE', icon: XCircle,      label: 'Refunded' },
  // Payment captured by Stripe/Revolut but not turned into active access
  // (e.g. ARCHIVED member) — needs a manual refund or reactivation decision.
  FLAGGED:  { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA', icon: Flag,         label: 'Needs review' },
}

const METHOD_LABELS: Record<string, string> = {
  STRIPE: 'Stripe', CASH: 'Cash', BANK_TRANSFER: 'Transfer',
  DIRECT_DEBIT: 'Direct Debit', PAYPAL: 'PayPal', FREE: 'Free', OTHER: 'Other',
}

const METHOD_COLORS: Record<string, { bg: string; color: string }> = {
  STRIPE:        { bg: '#EFF6FF', color: '#2563EB' },
  DIRECT_DEBIT:  { bg: '#EEF2FF', color: '#4F46E5' },
  PAYPAL:        { bg: '#FFF7ED', color: '#C2410C' },
  CASH:          { bg: '#F3F4F6', color: '#374151' },
  BANK_TRANSFER: { bg: '#ECFDF5', color: '#065F46' },
  FREE:          { bg: '#F9FAFB', color: '#9CA3AF' },
  OTHER:         { bg: '#F9FAFB', color: '#6B7280' },
}

const METHOD_ICONS: Record<string, React.ElementType> = {
  STRIPE: CreditCard, DIRECT_DEBIT: Landmark,
  CASH: Banknote, BANK_TRANSFER: Building2, OTHER: CreditCard,
}

const TYPE_OPTIONS: { id: TypeFilter; label: string; icon: React.ElementType; activeColor: string; activeBg: string; activeBorder: string }[] = [
  { id: 'ALL',     label: 'All',      icon: LayoutList,   activeColor: '#374151', activeBg: '#fff',    activeBorder: '#E5E7EB' },
  { id: 'INCOME',  label: 'Income',   icon: TrendingUp,   activeColor: '#16A34A', activeBg: '#F0FDF4', activeBorder: '#BBF7D0' },
  { id: 'EXPENSE', label: 'Expenses', icon: TrendingDown, activeColor: '#DC2626', activeBg: '#FEF2F2', activeBorder: '#FECACA' },
]

const ALL_METHODS: { id: MethodFilter; label: string }[] = [
  { id: 'ALL',           label: 'All Methods'  },
  { id: 'CASH',          label: 'Cash'         },
  { id: 'STRIPE',        label: 'Stripe'       },
  { id: 'BANK_TRANSFER', label: 'Transfer'     },
  { id: 'DIRECT_DEBIT',  label: 'Direct Debit' },
  { id: 'OTHER',         label: 'Other'        },
]

const PAGE_SIZE = 20

function getPaginationPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}

function Avatar({ name, avatarUrl, size = 36 }: { name: string; avatarUrl: string | null; size?: number }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (avatarUrl) return <img src={avatarUrl} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #E5E7EB', flexShrink: 0 }} />
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      background: 'linear-gradient(135deg,#0870E2,#7DE7EC)', color: '#fff', fontSize: size * 0.33, fontWeight: 700 }}>
      {initials}
    </div>
  )
}

function fmtDate(iso: string, withTime = false) {
  const d = new Date(iso)
  const date = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
  if (!withTime) return date
  const time = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${date} ${time}`
}

// ── Filters ───────────────────────────────────────────────────────────────────
interface FiltersState {
  method: MethodFilter
  dateFrom: string
  dateTo: string
  membership: string
  belt: string
}

const EMPTY_FILTERS: FiltersState = { method: 'ALL', dateFrom: '', dateTo: '', membership: '', belt: '' }

const BELT_OPTIONS = ['Blanco', 'Azul', 'Morado', 'Marrón', 'Negro']
const BELT_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  Blanco: { bg: '#F9FAFB', color: '#374151', border: '#D1D5DB' },
  Azul:   { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  Morado: { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
  Marrón: { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  Negro:  { bg: '#1F2937', color: '#F9FAFB', border: '#374151' },
}

function FiltersPanel({ filters, onChange }: {
  filters: FiltersState
  onChange: (f: FiltersState) => void
}) {
  const [open, setOpen] = useState(false)
  const [local, setLocal] = useState<FiltersState>(filters)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setLocal(filters) }, [filters])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const activeCount = [
    filters.method !== 'ALL',
    !!filters.dateFrom || !!filters.dateTo,
    !!filters.membership,
    !!filters.belt,
  ].filter(Boolean).length

  function apply() { onChange(local); setOpen(false) }
  function clear()  { setLocal(EMPTY_FILTERS); onChange(EMPTY_FILTERS); setOpen(false) }

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
          borderRadius: 8, border: activeCount ? '1.5px solid #0870E2' : '1px solid #E5E7EB',
          background: activeCount ? '#EFF6FF' : '#fff', cursor: 'pointer' }}>
        <Filter size={13} style={{ color: activeCount ? '#0870E2' : '#6B7280' }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: activeCount ? '#0870E2' : '#6B7280' }}>Filters</span>
        {activeCount > 0 && (
          <span style={{ background: '#0870E2', color: '#fff', borderRadius: 999, fontSize: 10,
            fontWeight: 700, padding: '1px 6px', lineHeight: 1.4 }}>{activeCount}</span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 30,
          background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16,
          boxShadow: '0 12px 32px rgba(0,0,0,0.12)', width: 320, padding: '16px 16px 14px' }}>

          {/* Date range */}
          <div style={{ marginBottom: 16 }}>
            <span style={sectionLabel}>Date range</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>From</label>
                <input type="date" value={local.dateFrom}
                  onChange={e => setLocal(p => ({ ...p, dateFrom: e.target.value }))}
                  style={inp} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>To</label>
                <input type="date" value={local.dateTo}
                  onChange={e => setLocal(p => ({ ...p, dateTo: e.target.value }))}
                  style={inp} />
              </div>
            </div>
          </div>

          {/* Activity / plan */}
          <div style={{ marginBottom: 16 }}>
            <span style={sectionLabel}>Activity / Plan</span>
            <input type="text" placeholder="e.g. Jiu Jitsu Mensual"
              value={local.membership}
              onChange={e => setLocal(p => ({ ...p, membership: e.target.value }))}
              style={inp} />
          </div>

          {/* Belt */}
          <div style={{ marginBottom: 16 }}>
            <span style={sectionLabel}>Belt</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button onClick={() => setLocal(p => ({ ...p, belt: '' }))}
                style={{ fontSize: 11, fontWeight: 500, padding: '4px 11px', borderRadius: 999, cursor: 'pointer',
                  border: !local.belt ? '1.5px solid #0870E2' : '1px solid #E5E7EB',
                  background: !local.belt ? '#EFF6FF' : '#F9FAFB',
                  color: !local.belt ? '#0870E2' : '#6B7280' }}>
                All
              </button>
              {BELT_OPTIONS.map(b => {
                const bs = BELT_STYLES[b]!
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

          {/* Method */}
          <div style={{ marginBottom: 16 }}>
            <span style={sectionLabel}>Method</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ALL_METHODS.map(m => (
                <button key={m.id} onClick={() => setLocal(p => ({ ...p, method: m.id }))}
                  style={{ fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
                    border: local.method === m.id ? '1.5px solid #0870E2' : '1px solid #E5E7EB',
                    background: local.method === m.id ? '#EFF6FF' : '#F9FAFB',
                    color: local.method === m.id ? '#0870E2' : '#6B7280' }}>
                  {m.label}
                </button>
              ))}
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
                background: '#0870E2', fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Row Actions Menu ──────────────────────────────────────────────────────────
function RowActions({ tx, onStatusChange, onDelete, onView, onResolve }: {
  tx: TxRow
  onStatusChange: (id: string, status: TxStatus) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onView: () => void
  onResolve: () => void
}) {
  const [busy, setBusy] = useState(false)

  async function act(fn: () => Promise<void>) {
    setBusy(true)
    await fn()
    setBusy(false)
  }

  return (
    <RowMenu trigger={({ onClick }) => (
      <button onClick={onClick} disabled={busy}
        style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 7, border: 'none', background: 'transparent', cursor: busy ? 'wait' : 'pointer', color: '#9CA3AF' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#F3F4F6')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        <MoreHorizontal size={14} />
      </button>
    )}>
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12,
        boxShadow: '0 4px 16px rgba(0,0,0,0.10)', minWidth: 170, padding: '4px 0', overflow: 'hidden' }}>

        <button onClick={e => { e.stopPropagation(); onView() }}
          style={{ width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 13,
            fontWeight: 500, color: '#374151', background: 'transparent', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8 }}
          onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <Eye size={13} /> View Details
        </button>

        <div style={{ height: 1, background: '#F3F4F6', margin: '4px 0' }} />

        {tx.status === 'FLAGGED' && !tx.resolvedAt && (
          <button onClick={e => { e.stopPropagation(); onResolve() }}
            style={{ width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 13,
              fontWeight: 500, color: '#16A34A', background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8 }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F0FDF4')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Check size={13} /> Mark resolved
          </button>
        )}

        {tx.status === 'PENDING' && (
          <button onClick={e => { e.stopPropagation(); act(() => onStatusChange(tx.id, 'PAID')) }}
            style={{ width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 13,
              fontWeight: 500, color: '#16A34A', background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8 }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F0FDF4')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Check size={13} /> Mark as Paid
          </button>
        )}

        {/* TODO(phase-5-refunds): restore "Mark as Refunded" once compensating
            transaction logic and membership void are implemented. */}

        {tx.status !== 'FAILED' && (
          <button onClick={e => { e.stopPropagation(); act(() => onStatusChange(tx.id, 'FAILED')) }}
            style={{ width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 13,
              fontWeight: 500, color: '#D97706', background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8 }}
            onMouseEnter={e => (e.currentTarget.style.background = '#FFFBEB')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <AlertCircle size={13} /> Mark as Failed
          </button>
        )}

        <div style={{ height: 1, background: '#F3F4F6', margin: '4px 0' }} />

        <button onClick={e => { e.stopPropagation(); act(() => onDelete(tx.id)) }}
          style={{ width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 13,
            fontWeight: 500, color: '#DC2626', background: 'transparent', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8 }}
          onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <Trash2 size={13} /> Delete
        </button>
      </div>
    </RowMenu>
  )
}

// ── Details Drawer ─────────────────────────────────────────────────────────────
function TxDetailDrawer({ tx, onClose }: { tx: TxRow; onClose: () => void }) {
  const sc  = STATUS_MAP[tx.status] ?? STATUS_MAP.PAID
  const StatusIcon = sc.icon
  const methodKey = tx.method ? tx.method.toUpperCase() : null
  const mc  = methodKey ? (METHOD_COLORS[methodKey] ?? METHOD_COLORS.OTHER) : null
  const MIcon = methodKey ? (METHOD_ICONS[methodKey] ?? METHOD_ICONS.OTHER) : null

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: 'Membership',
      value: tx.description
        ? <span style={{ fontWeight: 600, color: '#111827' }}>{tx.description}</span>
        : <span style={{ color: '#9CA3AF' }}>—</span> },
    { label: 'Price',
      value: <span style={{ fontWeight: 700, fontSize: 15, color: tx.type === 'EXPENSE' ? '#DC2626' : '#111827' }}>
        {tx.type === 'EXPENSE' ? '−' : ''}{fmtPrice(tx.amount, tx.currency)}
      </span> },
    { label: 'Method',
      value: mc && methodKey && MIcon ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: mc.bg, color: mc.color }}>
          <MIcon size={11} />{METHOD_LABELS[methodKey] ?? methodKey}
        </span>
      ) : <span style={{ color: '#9CA3AF' }}>—</span> },
    { label: 'Submitted', value: <span style={{ color: '#374151' }}>{fmtDate(tx.date, true)}</span> },
    ...(tx.periodStart ? [{ label: 'Activated', value: <span style={{ color: '#374151' }}>{fmtDate(tx.periodStart, true)}</span> }] : []),
    ...(tx.periodEnd   ? [{ label: 'Renew',     value: <span style={{ color: '#374151' }}>{fmtDate(tx.periodEnd, true)}</span> }] : []),
    { label: 'Status',
      value: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
            background: sc.bg, color: sc.color, border: '1px solid ' + sc.border }}>
            <StatusIcon size={9} strokeWidth={2.5} />{sc.label}
          </span>
          {tx.status === 'FLAGGED' && tx.resolvedAt && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
              background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>
              <Check size={9} strokeWidth={2.5} />Resolved
            </span>
          )}
        </span>
      ) },
    { label: 'Type',
      value: tx.type === 'EXPENSE'
        ? <span style={{ fontSize: 12, fontWeight: 600, color: '#DC2626', display: 'inline-flex', alignItems: 'center', gap: 4 }}><TrendingDown size={11} /> Expense</span>
        : <span style={{ fontSize: 12, fontWeight: 600, color: '#16A34A', display: 'inline-flex', alignItems: 'center', gap: 4 }}><TrendingUp size={11} /> Income</span> },
    { label: 'Category',
      value: <span style={{ fontSize: 12, fontWeight: 500, color: '#6B7280', textTransform: 'capitalize' }}>
        {tx.category?.toLowerCase().replace(/_/g, ' ')}
      </span> },
    ...(tx.stripePaymentIntentId || tx.revolutOrderId ? [{ label: 'Provider Ref',
      value: <span style={{ fontSize: 11, color: '#6B7280', fontFamily: 'monospace' }}>{tx.stripePaymentIntentId ?? tx.revolutOrderId}</span> }] : []),
    ...(tx.bookingId ? [{ label: 'Booking Ref',
      value: <span style={{ fontSize: 11, color: '#6B7280', fontFamily: 'monospace' }}>{tx.bookingId}</span> }] : []),
    ...(tx.resolvedAt ? [{ label: 'Resolved',
      value: <span style={{ fontSize: 12, color: '#374151' }}>{fmtDate(tx.resolvedAt, true)}{tx.resolvedByName ? ` — ${tx.resolvedByName}` : ''}</span> }] : []),
    ...(tx.resolutionNote ? [{ label: 'Resolution note',
      value: <span style={{ fontSize: 11, color: '#6B7280' }}>{tx.resolutionNote}</span> }] : []),
    ...(tx.notes ? [{ label: 'Notes',
      value: <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace' }}>{tx.notes}</span> }] : []),
  ]

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.2)' }} onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
        style={{ width: 360, background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.10)', overflowY: 'auto' }}>

        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
              Payment Details
            </p>
            <p style={{ fontSize: 18, fontWeight: 700, color: tx.type === 'EXPENSE' ? '#DC2626' : '#111827', letterSpacing: '-0.02em' }}>
              {tx.type === 'EXPENSE' ? '−' : ''}{fmtPrice(tx.amount, tx.currency)}
            </p>
          </div>
          <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex' }}>
            <X size={16} style={{ color: '#6B7280' }} />
          </button>
        </div>

        <div className="flex items-center gap-3 px-6 py-4" style={{ background: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
          <Avatar name={tx.userName} avatarUrl={tx.userAvatar} size={44} />
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{tx.userName}</p>
            <p style={{ fontSize: 12, color: '#9CA3AF' }}>{tx.userEmail ?? '—'}</p>
          </div>
        </div>

        <div className="flex flex-col px-6 py-2">
          {rows.map(row => (
            <div key={row.label} className="flex items-center justify-between py-3"
              style={{ borderBottom: '1px solid #F9FAFB' }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#9CA3AF', minWidth: 90 }}>{row.label}</span>
              <div style={{ textAlign: 'right' }}>{row.value}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ── Member search combobox ────────────────────────────────────────────────────
interface MemberOption { id: string; name: string; email: string; avatarUrl?: string | null }

function MemberSelect({ members, value, onChange, placeholder = 'Search member…' }: {
  members: MemberOption[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
}) {
  const [query, setQuery]   = useState('')
  const [open,  setOpen]    = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = members.find(m => m.id === value)

  const filtered = query.length < 1 ? members.slice(0, 50) :
    members.filter(m =>
      m.name.toLowerCase().includes(query.toLowerCase()) ||
      m.email.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 50)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function pick(m: MemberOption) {
    onChange(m.id)
    setQuery('')
    setOpen(false)
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
    setQuery('')
    setOpen(false)
  }

  const triggerStyle: React.CSSProperties = {
    width: '100%', border: '1px solid #E5E7EB', borderRadius: 10, padding: '8px 12px',
    fontSize: 13, color: '#111827', background: '#fff', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 8, minHeight: 40,
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      {!open ? (
        <button type="button" onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }}
          style={triggerStyle}>
          {selected ? (
            <>
              <Avatar name={selected.name} avatarUrl={selected.avatarUrl ?? null} size={22} />
              <span style={{ flex: 1, textAlign: 'left' }}>{selected.name}</span>
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>{selected.email}</span>
              <button type="button" onClick={clear} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#9CA3AF' }}>
                <X size={13} />
              </button>
            </>
          ) : (
            <>
              <Search size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
              <span style={{ color: '#9CA3AF' }}>{placeholder}</span>
            </>
          )}
        </button>
      ) : (
        <div style={{ border: '1.5px solid #0870E2', borderRadius: 10, background: '#fff', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid #F3F4F6' }}>
            <Search size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
            <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder={placeholder}
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: '#111827', background: 'transparent' }} />
            {query && <button type="button" onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#9CA3AF' }}><X size={13} /></button>}
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <p style={{ padding: '12px 14px', fontSize: 13, color: '#9CA3AF' }}>No members found</p>
            ) : filtered.map(m => (
              <button key={m.id} type="button" onClick={() => pick(m)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  border: 'none', background: m.id === value ? '#F0F7FF' : 'transparent', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => { if (m.id !== value) (e.currentTarget as HTMLElement).style.background = '#F9FAFB' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = m.id === value ? '#F0F7FF' : 'transparent' }}>
                <Avatar name={m.name} avatarUrl={m.avatarUrl ?? null} size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email}</p>
                </div>
                {m.id === value && <Check size={13} style={{ color: '#0870E2', flexShrink: 0 }} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Add Payment Modal ─────────────────────────────────────────────────────────
const MODAL_INP: React.CSSProperties = {
  width: '100%', border: '1px solid #E5E7EB', borderRadius: 10, padding: '9px 12px',
  fontSize: 13, color: '#111827', background: '#fff', outline: 'none',
}
const MODAL_LBL: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5,
}

function AddPaymentModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [members, setMembers] = useState<MemberOption[]>([])
  const [plans,   setPlans]   = useState<{ id: string; name: string; price: number }[]>([])
  const [form, setForm] = useState({
    userId: '', description: '', amount: '', currency: 'EUR',
    date: new Date().toISOString().slice(0, 10), status: 'PAID',
    type: 'INCOME', category: 'MEMBERSHIP', paymentMethod: 'CASH', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  useEffect(() => {
    fetch('/api/dashboard/members').then(r => r.json()).then(d =>
      setMembers((d.members ?? []).map((m: { userId: string; name: string; email: string; avatarUrl?: string | null }) => ({ id: m.userId, name: m.name, email: m.email, avatarUrl: m.avatarUrl ?? null })))
    )
    fetch('/api/dashboard/membership-plans').then(r => r.json()).then(d =>
      setPlans((d.plans ?? []).map((p: { id: string; name: string; price: number }) => ({ id: p.id, name: p.name, price: p.price })))
    )
  }, [])

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  function pickPlan(planName: string) {
    const plan = plans.find(p => p.name === planName)
    setForm(p => ({ ...p, description: planName, amount: plan ? String(plan.price) : p.amount }))
  }

  async function handleSave() {
    if (!form.userId)     { setError('Select a member'); return }
    if (!form.amount)     { setError('Enter an amount'); return }
    if (!form.date)       { setError('Enter a date'); return }
    setSaving(true); setError('')
    const res = await fetch('/api/dashboard/transactions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error'); return }
    onSaved()
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl flex flex-col" style={{ background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', maxHeight: '90vh', overflow: 'hidden' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #F3F4F6', flexShrink: 0 }}>
            <div>
              <p style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0 }}>Add Payment</p>
              <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Record a manual payment</p>
            </div>
            <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex' }}>
              <X size={15} style={{ color: '#6B7280' }} />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto px-6 py-5 flex flex-col gap-4">

            {/* Member */}
            <div>
              <label style={MODAL_LBL}>Member</label>
              <MemberSelect members={members} value={form.userId} onChange={id => set('userId', id)} />
            </div>

            {/* Membership plan */}
            <div>
              <label style={MODAL_LBL}>Membership / Description</label>
              <select value={form.description} onChange={e => pickPlan(e.target.value)} style={{ ...MODAL_INP, marginBottom: 6 }}>
                <option value="">Select plan…</option>
                {plans.map(p => <option key={p.id} value={p.name}>{p.name} — €{p.price}</option>)}
                <option value="__custom">Custom description</option>
              </select>
              {(form.description === '__custom' || !plans.find(p => p.name === form.description)) && (
                <input type="text" placeholder="Custom description" value={form.description === '__custom' ? '' : form.description}
                  onChange={e => set('description', e.target.value)} style={MODAL_INP} />
              )}
            </div>

            {/* Amount + Currency */}
            <div className="flex gap-3">
              <div style={{ flex: 2 }}>
                <label style={MODAL_LBL}>Amount</label>
                <input type="number" min="0" step="0.01" placeholder="0.00" value={form.amount}
                  onChange={e => set('amount', e.target.value)} style={MODAL_INP} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={MODAL_LBL}>Currency</label>
                <select value={form.currency} onChange={e => set('currency', e.target.value)} style={MODAL_INP}>
                  <option>EUR</option><option>GBP</option><option>USD</option>
                </select>
              </div>
            </div>

            {/* Date + Method */}
            <div className="flex gap-3">
              <div style={{ flex: 1 }}>
                <label style={MODAL_LBL}>Date</label>
                <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={MODAL_INP} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={MODAL_LBL}>Method</label>
                <select value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)} style={MODAL_INP}>
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="STRIPE">Stripe</option>
                  <option value="DIRECT_DEBIT">Direct Debit</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            {/* Type + Status */}
            <div className="flex gap-3">
              <div style={{ flex: 1 }}>
                <label style={MODAL_LBL}>Type</label>
                <select value={form.type} onChange={e => set('type', e.target.value)} style={MODAL_INP}>
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={MODAL_LBL}>Status</label>
                <select value={form.status} onChange={e => set('status', e.target.value)} style={MODAL_INP}>
                  <option value="PAID">Paid</option>
                  <option value="PENDING">Pending</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={MODAL_LBL}>Notes (optional)</label>
              <input type="text" placeholder="Internal notes…" value={form.notes}
                onChange={e => set('notes', e.target.value)} style={MODAL_INP} />
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
              background: '#0870E2', fontSize: 13, fontWeight: 600, color: '#fff', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : 'Add Payment'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Resolve Modal ──────────────────────────────────────────────────────────────
function ResolveModal({ tx, onClose, onResolved }: {
  tx: TxRow
  onClose: () => void
  onResolved: (id: string, resolvedAt: string, resolvedByName: string | null, resolutionNote: string | null) => void
}) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleConfirm() {
    setSaving(true); setError('')
    const res = await fetch(`/api/dashboard/transactions/${tx.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resolve', note: note.trim() || undefined }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Could not resolve transaction.'); return }
    onResolved(tx.id, data.resolvedAt, data.resolvedByName ?? null, data.resolutionNote ?? null)
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl flex flex-col" style={{ background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', overflow: 'hidden' }}>

          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Mark as resolved</p>
            <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex' }}>
              <X size={15} style={{ color: '#6B7280' }} />
            </button>
          </div>

          <div className="px-6 py-5 flex flex-col gap-4">
            <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.5, margin: 0 }}>
              Confirms <strong style={{ color: '#111827' }}>{tx.userName}</strong>&apos;s flagged payment
              ({fmtPrice(tx.amount, tx.currency)}) has been handled manually — refunded or the member reactivated.
              The transaction stays on record for audit; this doesn&apos;t refund or reactivate anything automatically.
            </p>
            <div>
              <label style={MODAL_LBL}>Resolution note (optional)</label>
              <textarea rows={3} placeholder="e.g. Refunded via Stripe dashboard on 10 Jul"
                value={note} onChange={e => setNote(e.target.value)}
                style={{ ...MODAL_INP, resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
            {error && <p style={{ fontSize: 12, color: '#DC2626', fontWeight: 500, margin: 0 }}>{error}</p>}
          </div>

          <div className="flex gap-3 px-6 py-4" style={{ borderTop: '1px solid #F3F4F6' }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #E5E7EB',
              background: '#fff', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handleConfirm} disabled={saving} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none',
              background: '#16A34A', fontSize: 13, fontWeight: 600, color: '#fff', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : 'Confirm resolved'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function TransactionsClient() {
  const { setMenuOpen } = useDashboard()
  const t = useT()

  const [transactions,  setTransactions]  = useState<TxRow[]>([])
  const [total,         setTotal]         = useState(0)
  const [totalAmount,   setTotalAmount]   = useState(0)
  const [countByStatus, setCountByStatus] = useState<StatusCounts>({ PAID: 0, PENDING: 0, FAILED: 0, REFUNDED: 0, FLAGGED: 0 })
  const [loading,        setLoading]       = useState(true)
  const [selectedTx,     setSelectedTx]   = useState<TxRow | null>(null)
  const [showAddPayment, setShowAddPayment] = useState(false)
  const [resolvingTx,    setResolvingTx]  = useState<TxRow | null>(null)
  const [showResolved,   setShowResolved] = useState(false)

  const [activeFilter,  setActiveFilter]  = useState<FilterTab>('ALL')
  const [activeType,    setActiveType]    = useState<TypeFilter>('INCOME')
  const [search,        setSearch]        = useState('')
  const [page,          setPage]          = useState(1)
  const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      ...(activeType        !== 'ALL' ? { type:   activeType        } : {}),
      ...(activeFilter      !== 'ALL' ? { status: activeFilter      } : {}),
      ...(activeFilter === 'FLAGGED' && showResolved ? { resolved: 'all' } : {}),
      ...(filters.method    !== 'ALL' ? { method: filters.method    } : {}),
      ...(filters.dateFrom            ? { dateFrom: filters.dateFrom } : {}),
      ...(filters.dateTo              ? { dateTo:   filters.dateTo   } : {}),
      ...(filters.membership          ? { membership: filters.membership } : {}),
      ...(filters.belt                ? { belt: filters.belt         } : {}),
      ...(search ? { search } : {}),
    })
    const res = await fetch(`/api/dashboard/transactions?${params}`)
    if (!res.ok) { setLoading(false); return }
    const data = await res.json()
    setTransactions(data.transactions ?? [])
    setTotal(data.total ?? 0)
    setTotalAmount(data.totalRevenue ?? 0)
    const cs = data.countByStatus ?? {}
    setCountByStatus({ PAID: cs.PAID ?? 0, PENDING: cs.PENDING ?? 0, FAILED: cs.FAILED ?? 0, REFUNDED: cs.REFUNDED ?? 0, FLAGGED: cs.FLAGGED ?? 0 })
    setLoading(false)
  }, [page, activeFilter, filters, activeType, search, showResolved])

  useEffect(() => { load() }, [load])

  async function handleStatusChange(id: string, status: TxStatus) {
    const res = await fetch(`/api/dashboard/transactions/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, status } : tx))
      if (selectedTx?.id === id) setSelectedTx(prev => prev ? { ...prev, status } : null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this transaction? This cannot be undone.')) return
    const res = await fetch(`/api/dashboard/transactions/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setTransactions(prev => prev.filter(tx => tx.id !== id))
      if (selectedTx?.id === id) setSelectedTx(null)
      setTotal(prev => prev - 1)
    } else {
      const data = await res.json().catch(() => ({}))
      alert(data.error ?? 'Could not delete transaction.')
    }
  }

  function handleResolved(id: string, resolvedAt: string, resolvedByName: string | null, resolutionNote: string | null) {
    setResolvingTx(null)
    if (!showResolved) {
      // Default "Needs review" view only shows unresolved rows — once
      // resolved, the row drops out of the current list rather than
      // lingering with a stale badge.
      setTransactions(prev => prev.filter(tx => tx.id !== id))
      setTotal(prev => Math.max(0, prev - 1))
      setCountByStatus(prev => ({ ...prev, FLAGGED: Math.max(0, prev.FLAGGED - 1) }))
    } else {
      setTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, resolvedAt, resolvedByName, resolutionNote } : tx))
      setCountByStatus(prev => ({ ...prev, FLAGGED: Math.max(0, prev.FLAGGED - 1) }))
    }
    if (selectedTx?.id === id) setSelectedTx(prev => prev ? { ...prev, resolvedAt, resolvedByName, resolutionNote } : null)
  }

  const totalCount = Object.values(countByStatus).reduce((a, b) => a + b, 0)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const pages = getPaginationPages(page, totalPages)

  const STATUS_FILTERS: { id: FilterTab; label: string; count: number }[] = [
    { id: 'ALL',      label: t.common.all,     count: totalCount             },
    { id: 'PAID',     label: 'Paid',           count: countByStatus.PAID     },
    { id: 'PENDING',  label: 'Pending',        count: countByStatus.PENDING  },
    { id: 'FAILED',   label: 'Failed',         count: countByStatus.FAILED   },
    { id: 'REFUNDED', label: 'Refunded',       count: countByStatus.REFUNDED },
    { id: 'FLAGGED',  label: 'Needs review',   count: countByStatus.FLAGGED  },
  ]

  const handleExport = () => {
    const headers = ['Member', 'Email', 'Description', 'Method', 'Amount', 'Currency', 'Date', 'Status', 'Type']
    const rows = transactions.map(tx => [
      tx.userName, tx.userEmail ?? '', tx.description ?? '', tx.method ?? '',
      String(tx.amount), tx.currency, new Date(tx.date).toLocaleDateString('es-ES'), tx.status, tx.type,
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  }

  return (
    <>
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
          <input type="text" placeholder="Search member or description…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', width: '100%' }} />
        </div>
        <div className="flex-1" />
        <button onClick={handleExport} className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer"
          style={{ background: '#fff', border: '1px solid #E5E7EB', color: '#374151', fontSize: 13, fontWeight: 500 }}>
          <Download size={14} /> Export
        </button>
        <button onClick={() => setShowAddPayment(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer"
          style={{ background: '#0870E2', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600 }}>
          <Plus size={14} /> Add Payment
        </button>
      </div>

      <div className="px-4 md:px-8 py-6 flex flex-col gap-5">

        {/* Title + total */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>
              {t.paymentsPage.transactionsTitle}
            </h1>
            <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>All payment records for your academy</p>
          </div>
          <div className="rounded-2xl px-5 py-3"
            style={{ background: activeType === 'EXPENSE' ? '#FEF2F2' : '#F0FDF4',
              border: activeType === 'EXPENSE' ? '1px solid #FECACA' : '1px solid #BBF7D0' }}>
            <p style={{ fontSize: 11, fontWeight: 600, marginBottom: 2,
              color: activeType === 'EXPENSE' ? '#DC2626' : '#16A34A' }}>
              {activeType === 'EXPENSE' ? 'Total Expenses' : 'Total Collected'}
            </p>
            <p style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em',
              color: activeType === 'EXPENSE' ? '#DC2626' : '#16A34A' }}>
              {loading ? '—' : fmtPrice(totalAmount)}
            </p>
          </div>
        </div>

        {/* ── Single filter row ── */}
        <div className="flex items-center gap-2 flex-wrap">

          {/* Type toggle */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
            {TYPE_OPTIONS.map(opt => {
              const isOn = activeType === opt.id
              const Icon = opt.icon
              return (
                <button key={opt.id} onClick={() => { setActiveType(opt.id); setPage(1) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md cursor-pointer"
                  style={{ fontSize: 12, fontWeight: isOn ? 600 : 400,
                    background: isOn ? opt.activeBg : 'transparent',
                    color: isOn ? opt.activeColor : '#9CA3AF',
                    border: isOn ? `1px solid ${opt.activeBorder}` : '1px solid transparent',
                    transition: 'all 0.15s' }}>
                  <Icon size={11} />
                  {opt.label}
                </button>
              )
            })}
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 20, background: '#E5E7EB', flexShrink: 0 }} />

          {/* Status pills */}
          {STATUS_FILTERS.map(f => {
            const isOn = activeFilter === f.id
            const sc = f.id !== 'ALL' ? STATUS_MAP[f.id as TxStatus] : null
            return (
              <button key={f.id} onClick={() => { setActiveFilter(f.id); setPage(1) }}
                className="cursor-pointer"
                style={{ fontSize: 12, fontWeight: isOn ? 600 : 400, padding: '5px 12px', borderRadius: 8,
                  background: isOn ? (sc?.bg ?? '#111827') : '#fff',
                  color: isOn ? (sc?.color ?? '#fff') : '#6B7280',
                  border: isOn ? `1.5px solid ${sc?.border ?? '#111827'}` : '1.5px solid #E5E7EB' }}>
                {f.label}{' '}<span style={{ opacity: 0.65, fontSize: 11 }}>{f.count}</span>
              </button>
            )
          })}

          {activeFilter === 'FLAGGED' && (
            <button onClick={() => { setShowResolved(v => !v); setPage(1) }}
              className="cursor-pointer"
              style={{ fontSize: 12, fontWeight: showResolved ? 600 : 400, padding: '5px 12px', borderRadius: 8,
                background: showResolved ? '#F0FDF4' : '#fff',
                color: showResolved ? '#16A34A' : '#6B7280',
                border: showResolved ? '1.5px solid #BBF7D0' : '1.5px solid #E5E7EB' }}>
              {showResolved ? 'Showing resolved' : 'Show resolved'}
            </button>
          )}

          {/* Divider */}
          <div style={{ width: 1, height: 20, background: '#E5E7EB', flexShrink: 0 }} />

          {/* Method filter icon */}
          <FiltersPanel filters={filters} onChange={f => { setFilters(f); setPage(1) }} />
        </div>

        {/* Table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                {[
                  { label: 'Member',      cls: '' },
                  { label: 'Description', cls: 'hidden md:table-cell' },
                  { label: 'Method',      cls: 'hidden sm:table-cell' },
                  { label: 'Amount',      cls: '' },
                  { label: 'Date',        cls: 'hidden md:table-cell' },
                  { label: 'Status',      cls: 'hidden sm:table-cell' },
                  { label: '',            cls: '' },
                ].map((h, i) => (
                  <th key={i} className={`px-5 py-3 text-left ${h.cls}`}
                    style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center" style={{ fontSize: 13, color: '#9CA3AF' }}>Loading…</td></tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <RefreshCw size={28} style={{ color: '#E5E7EB', margin: '0 auto 10px' }} />
                    <p style={{ fontSize: 13, color: '#9CA3AF' }}>No transactions found</p>
                  </td>
                </tr>
              ) : transactions.map((tx, idx) => {
                const sc = STATUS_MAP[tx.status] ?? STATUS_MAP.PAID
                const StatusIcon = sc.icon
                const methodKey = tx.method ? tx.method.toUpperCase() : null
                const mc = methodKey ? (METHOD_COLORS[methodKey] ?? { bg: '#F9FAFB', color: '#6B7280' }) : null
                const isSelected = selectedTx?.id === tx.id
                const isExpense = tx.type === 'EXPENSE'
                return (
                  <tr key={tx.id}
                    style={{ borderBottom: idx < transactions.length - 1 ? '1px solid #F9FAFB' : 'none',
                      background: isSelected ? '#F0F7FF' : undefined, transition: 'background 0.1s' }}
                    className="hover:bg-[#FAFAFA]">

                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={tx.userName} avatarUrl={tx.userAvatar} />
                        <div className="min-w-0">
                          <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{tx.userName}</p>
                          <p style={{ fontSize: 11, color: '#9CA3AF' }}>{tx.userEmail ?? '—'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="hidden md:table-cell px-5 py-3">
                      <span style={{ fontSize: 13, color: '#374151' }}>{tx.description ?? '—'}</span>
                    </td>

                    <td className="hidden sm:table-cell px-5 py-3">
                      {mc && methodKey ? (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
                          background: mc.bg, color: mc.color }}>
                          {METHOD_LABELS[methodKey] ?? methodKey}
                        </span>
                      ) : <span style={{ fontSize: 13, color: '#D1D5DB' }}>—</span>}
                    </td>

                    <td className="px-5 py-3">
                      <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em',
                        color: isExpense ? '#DC2626' : '#111827' }}>
                        {isExpense ? '−' : ''}{fmtPrice(tx.amount, tx.currency)}
                      </span>
                    </td>

                    <td className="hidden md:table-cell px-5 py-3">
                      <span style={{ fontSize: 13, color: '#6B7280' }}>{fmtDate(tx.date)}</span>
                    </td>

                    <td className="hidden sm:table-cell px-5 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1.5"
                          style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
                            background: sc.bg, color: sc.color, border: '1px solid ' + sc.border, whiteSpace: 'nowrap' }}>
                          <StatusIcon size={10} />{sc.label}
                        </span>
                        {tx.status === 'FLAGGED' && tx.resolvedAt && (
                          <span className="inline-flex items-center gap-1"
                            style={{ fontSize: 10, fontWeight: 600, padding: '3px 7px', borderRadius: 999,
                              background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0', whiteSpace: 'nowrap' }}>
                            <Check size={9} />Resolved
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <RowActions
                        tx={tx}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                        onView={() => setSelectedTx(isSelected ? null : tx)}
                        onResolve={() => setResolvingTx(tx)}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
              <p style={{ fontSize: 13, color: '#6B7280' }}>
                Showing <span style={{ fontWeight: 600, color: '#111827' }}>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}</span>{' '}
                of <span style={{ fontWeight: 600, color: '#111827' }}>{total}</span>
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ fontSize: 13, border: '1px solid #E5E7EB', background: '#fff',
                    color: page === 1 ? '#D1D5DB' : '#374151', cursor: page === 1 ? 'not-allowed' : 'pointer', borderRadius: 8, padding: '6px 10px' }}>
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
                  style={{ fontSize: 13, border: '1px solid #E5E7EB', background: '#fff',
                    color: page === totalPages ? '#D1D5DB' : '#374151', cursor: page === totalPages ? 'not-allowed' : 'pointer', borderRadius: 8, padding: '6px 10px' }}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>

    {selectedTx && <TxDetailDrawer tx={selectedTx} onClose={() => setSelectedTx(null)} />}
    {showAddPayment && (
      <AddPaymentModal
        onClose={() => setShowAddPayment(false)}
        onSaved={() => { setShowAddPayment(false); load() }}
      />
    )}
    {resolvingTx && (
      <ResolveModal
        tx={resolvingTx}
        onClose={() => setResolvingTx(null)}
        onResolved={handleResolved}
      />
    )}
    </>
  )
}
