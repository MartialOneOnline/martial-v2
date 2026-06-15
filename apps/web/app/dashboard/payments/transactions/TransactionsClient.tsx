'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Menu, Search, Download, Plus, Check, Clock, Filter,
  AlertCircle, XCircle, RefreshCw, ChevronLeft, ChevronRight, X,
  CreditCard, Banknote, Building2, Landmark, TrendingUp, TrendingDown,
  LayoutList, Eye, MoreHorizontal, Trash2,
} from 'lucide-react'
import { useDashboard } from '../../../../components/DashboardShell'
import { useT } from '../../../../lib/i18n/LanguageContext'

type TxStatus  = 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED'
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
}

interface StatusCounts { PAID: number; PENDING: number; FAILED: number; REFUNDED: number }

const STATUS_MAP: Record<TxStatus, { bg: string; color: string; border: string; icon: React.ElementType; label: string }> = {
  PAID:     { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0', icon: Check,        label: 'Paid'     },
  PENDING:  { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A', icon: Clock,        label: 'Pending'  },
  FAILED:   { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', icon: AlertCircle,  label: 'Failed'   },
  REFUNDED: { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE', icon: XCircle,      label: 'Refunded' },
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

function fmtPrice(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amount)
}

// ── Method Filter Dropdown ────────────────────────────────────────────────────
function MethodDropdown({ active, onChange }: { active: MethodFilter; onChange: (m: MethodFilter) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const hasFilter = active !== 'ALL'

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34,
          borderRadius: 8, border: hasFilter ? '1.5px solid #0870E2' : '1px solid #E5E7EB',
          background: hasFilter ? '#EFF6FF' : '#fff', cursor: 'pointer', position: 'relative' }}>
        <Filter size={14} style={{ color: hasFilter ? '#0870E2' : '#6B7280' }} />
        {hasFilter && (
          <span style={{ position: 'absolute', top: -4, right: -4, width: 8, height: 8,
            borderRadius: '50%', background: '#0870E2', border: '1.5px solid #fff' }} />
        )}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 30,
          background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12,
          boxShadow: '0 4px 16px rgba(0,0,0,0.10)', minWidth: 160, padding: '6px 0', overflow: 'hidden' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase',
            letterSpacing: '0.06em', padding: '6px 14px 4px' }}>Payment method</p>
          {ALL_METHODS.map(m => (
            <button key={m.id} onClick={() => { onChange(m.id); setOpen(false) }}
              style={{ width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 13,
                fontWeight: active === m.id ? 600 : 400, color: active === m.id ? '#0870E2' : '#374151',
                background: active === m.id ? '#F0F7FF' : 'transparent', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8 }}>
              {active === m.id && <Check size={11} style={{ color: '#0870E2', flexShrink: 0 }} />}
              {active !== m.id && <span style={{ width: 11 }} />}
              {m.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Row Actions Menu ──────────────────────────────────────────────────────────
function RowActions({ tx, onStatusChange, onDelete, onView }: {
  tx: TxRow
  onStatusChange: (id: string, status: TxStatus) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onView: () => void
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function act(fn: () => Promise<void>) {
    setBusy(true); setOpen(false)
    await fn()
    setBusy(false)
  }

  return (
    <div ref={ref} style={{ display: 'flex', alignItems: 'center' }}>
      {/* More */}
      <div style={{ position: 'relative' }}>
        <button onClick={e => { e.stopPropagation(); setOpen(o => !o) }} disabled={busy}
          style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 7, border: 'none', background: 'transparent', cursor: busy ? 'wait' : 'pointer', color: '#9CA3AF' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#F3F4F6')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <MoreHorizontal size={14} />
        </button>

        {open && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setOpen(false)} />
            <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 20,
              background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12,
              boxShadow: '0 4px 16px rgba(0,0,0,0.10)', minWidth: 170, padding: '4px 0', overflow: 'hidden' }}>

              <button onClick={e => { e.stopPropagation(); setOpen(false); onView() }}
                style={{ width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 13,
                  fontWeight: 500, color: '#374151', background: 'transparent', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8 }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <Eye size={13} /> View Details
              </button>

              <div style={{ height: 1, background: '#F3F4F6', margin: '4px 0' }} />

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

              {tx.status !== 'REFUNDED' && (
                <button onClick={e => { e.stopPropagation(); act(() => onStatusChange(tx.id, 'REFUNDED')) }}
                  style={{ width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 13,
                    fontWeight: 500, color: '#6D28D9', background: 'transparent', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8 }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F5F3FF')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <XCircle size={13} /> Mark as Refunded
                </button>
              )}

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
          </>
        )}
      </div>
    </div>
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
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
          background: sc.bg, color: sc.color, border: '1px solid ' + sc.border }}>
          <StatusIcon size={9} strokeWidth={2.5} />{sc.label}
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

// ── Main ──────────────────────────────────────────────────────────────────────
export default function TransactionsClient() {
  const { setMenuOpen } = useDashboard()
  const t = useT()

  const [transactions,  setTransactions]  = useState<TxRow[]>([])
  const [total,         setTotal]         = useState(0)
  const [totalAmount,   setTotalAmount]   = useState(0)
  const [countByStatus, setCountByStatus] = useState<StatusCounts>({ PAID: 0, PENDING: 0, FAILED: 0, REFUNDED: 0 })
  const [loading,       setLoading]       = useState(true)
  const [selectedTx,    setSelectedTx]    = useState<TxRow | null>(null)

  const [activeFilter,  setActiveFilter]  = useState<FilterTab>('ALL')
  const [activeMethod,  setActiveMethod]  = useState<MethodFilter>('ALL')
  const [activeType,    setActiveType]    = useState<TypeFilter>('INCOME')
  const [search,        setSearch]        = useState('')
  const [page,          setPage]          = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      ...(activeType   !== 'ALL' ? { type:   activeType   } : {}),
      ...(activeFilter !== 'ALL' ? { status: activeFilter } : {}),
      ...(activeMethod !== 'ALL' ? { method: activeMethod } : {}),
      ...(search ? { search } : {}),
    })
    const res = await fetch(`/api/dashboard/transactions?${params}`)
    if (!res.ok) { setLoading(false); return }
    const data = await res.json()
    setTransactions(data.transactions ?? [])
    setTotal(data.total ?? 0)
    setTotalAmount(data.totalRevenue ?? 0)
    const cs = data.countByStatus ?? {}
    setCountByStatus({ PAID: cs.PAID ?? 0, PENDING: cs.PENDING ?? 0, FAILED: cs.FAILED ?? 0, REFUNDED: cs.REFUNDED ?? 0 })
    setLoading(false)
  }, [page, activeFilter, activeMethod, activeType, search])

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
    }
  }

  const totalCount = Object.values(countByStatus).reduce((a, b) => a + b, 0)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const pages = getPaginationPages(page, totalPages)

  const STATUS_FILTERS: { id: FilterTab; label: string; count: number }[] = [
    { id: 'ALL',      label: t.common.all,  count: totalCount             },
    { id: 'PAID',     label: 'Paid',        count: countByStatus.PAID     },
    { id: 'PENDING',  label: 'Pending',     count: countByStatus.PENDING  },
    { id: 'FAILED',   label: 'Failed',      count: countByStatus.FAILED   },
    { id: 'REFUNDED', label: 'Refunded',    count: countByStatus.REFUNDED },
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
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer"
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

          {/* Divider */}
          <div style={{ width: 1, height: 20, background: '#E5E7EB', flexShrink: 0 }} />

          {/* Method filter icon */}
          <MethodDropdown active={activeMethod} onChange={m => { setActiveMethod(m); setPage(1) }} />
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
                      <span className="inline-flex items-center gap-1.5"
                        style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
                          background: sc.bg, color: sc.color, border: '1px solid ' + sc.border, whiteSpace: 'nowrap' }}>
                        <StatusIcon size={10} />{sc.label}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <RowActions
                        tx={tx}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                        onView={() => setSelectedTx(isSelected ? null : tx)}
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
    </>
  )
}
