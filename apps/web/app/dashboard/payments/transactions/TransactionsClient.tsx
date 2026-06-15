'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Menu, Search, Download, Plus, Check, Clock,
  AlertCircle, XCircle, RefreshCw, ChevronLeft, ChevronRight, X,
  CreditCard, Banknote, Building2, Landmark,
} from 'lucide-react'
import { useDashboard } from '../../../../components/DashboardShell'
import { useT } from '../../../../lib/i18n/LanguageContext'

type TxStatus = 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED'
type FilterTab = 'ALL' | TxStatus
type MethodFilter = 'ALL' | 'STRIPE' | 'CASH' | 'BANK_TRANSFER' | 'DIRECT_DEBIT' | 'OTHER'

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
  STRIPE:        CreditCard,
  DIRECT_DEBIT:  Landmark,
  CASH:          Banknote,
  BANK_TRANSFER: Building2,
  OTHER:         CreditCard,
}

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

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtPrice(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amount)
}

// ── Details Drawer ─────────────────────────────────────────────────────────────
function TxDetailDrawer({ tx, onClose }: { tx: TxRow; onClose: () => void }) {
  const sc  = STATUS_MAP[tx.status] ?? STATUS_MAP.PAID
  const StatusIcon = sc.icon
  const methodKey = tx.method ? tx.method.toUpperCase() : null
  const mc  = methodKey ? (METHOD_COLORS[methodKey] ?? METHOD_COLORS.OTHER) : null
  const MIcon = methodKey ? (METHOD_ICONS[methodKey] ?? METHOD_ICONS.OTHER) : null

  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: 'Membership',
      value: tx.description
        ? <span style={{ fontWeight: 600, color: '#111827' }}>{tx.description}</span>
        : <span style={{ color: '#9CA3AF' }}>—</span>,
    },
    {
      label: 'Price',
      value: <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{fmtPrice(tx.amount, tx.currency)}</span>,
    },
    {
      label: 'Method',
      value: mc && methodKey && MIcon ? (
        <span className="inline-flex items-center gap-1.5"
          style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: mc.bg, color: mc.color }}>
          <MIcon size={11} />
          {METHOD_LABELS[methodKey] ?? methodKey}
        </span>
      ) : <span style={{ color: '#9CA3AF' }}>—</span>,
    },
    {
      label: 'Submitted',
      value: <span style={{ color: '#374151' }}>{fmtDate(tx.date)}</span>,
    },
    {
      label: 'Status',
      value: (
        <span className="inline-flex items-center gap-1.5"
          style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
            background: sc.bg, color: sc.color, border: '1px solid ' + sc.border }}>
          <StatusIcon size={9} strokeWidth={2.5} />
          {sc.label}
        </span>
      ),
    },
    {
      label: 'Member',
      value: (
        <div className="flex items-center gap-2">
          <Avatar name={tx.userName} avatarUrl={tx.userAvatar} size={24} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', lineHeight: 1.2 }}>{tx.userName}</p>
            {tx.userEmail && <p style={{ fontSize: 11, color: '#9CA3AF' }}>{tx.userEmail}</p>}
          </div>
        </div>
      ),
    },
    {
      label: 'Category',
      value: <span style={{ fontSize: 12, fontWeight: 500, color: '#6B7280', textTransform: 'capitalize' }}>{tx.category?.toLowerCase().replace('_', ' ')}</span>,
    },
    ...(tx.notes ? [{
      label: 'Notes',
      value: <span style={{ fontSize: 12, color: '#6B7280', fontFamily: 'monospace' }}>{tx.notes}</span>,
    }] : []),
  ]

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.25)' }} onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
        style={{ width: 360, background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.10)', overflowY: 'auto' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
              Payment Details
            </p>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>
              {fmtPrice(tx.amount, tx.currency)}
            </p>
          </div>
          <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex' }}>
            <X size={16} style={{ color: '#6B7280' }} />
          </button>
        </div>

        {/* Member banner */}
        <div className="flex items-center gap-3 px-6 py-4" style={{ background: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
          <Avatar name={tx.userName} avatarUrl={tx.userAvatar} size={44} />
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{tx.userName}</p>
            <p style={{ fontSize: 12, color: '#9CA3AF' }}>{tx.userEmail ?? '—'}</p>
          </div>
        </div>

        {/* Detail rows */}
        <div className="flex flex-col px-6 py-4 gap-0">
          {rows.filter((_, i) => i !== 5).map(row => ( // skip Member row (already in banner)
            <div key={row.label} className="flex items-start justify-between py-3"
              style={{ borderBottom: '1px solid #F9FAFB' }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#9CA3AF', minWidth: 90 }}>{row.label}</span>
              <div style={{ textAlign: 'right' }}>{row.value}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-auto px-6 py-5 flex flex-col gap-2" style={{ borderTop: '1px solid #F3F4F6' }}>
          {tx.status !== 'REFUNDED' && (
            <button className="w-full py-2.5 rounded-xl cursor-pointer"
              style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: 13, fontWeight: 600 }}>
              Mark as Refunded
            </button>
          )}
          {tx.status === 'PENDING' && (
            <button className="w-full py-2.5 rounded-xl cursor-pointer"
              style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#16A34A', fontSize: 13, fontWeight: 600 }}>
              Mark as Paid
            </button>
          )}
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
  const [search,        setSearch]        = useState('')
  const [page,          setPage]          = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      type: 'INCOME',
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
    setCountByStatus({
      PAID:     cs.PAID     ?? 0,
      PENDING:  cs.PENDING  ?? 0,
      FAILED:   cs.FAILED   ?? 0,
      REFUNDED: cs.REFUNDED ?? 0,
    })
    setLoading(false)
  }, [page, activeFilter, activeMethod, search])

  useEffect(() => { load() }, [load])

  // Method counts from current page (approximate)
  const methodCounts: Record<string, number> = {}
  for (const tx of transactions) {
    const k = tx.method ? tx.method.toUpperCase() : 'OTHER'
    methodCounts[k] = (methodCounts[k] ?? 0) + 1
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

  const METHOD_FILTERS: { id: MethodFilter; label: string }[] = [
    { id: 'ALL',           label: 'All Methods'  },
    { id: 'CASH',          label: 'Cash'         },
    { id: 'STRIPE',        label: 'Stripe'       },
    { id: 'BANK_TRANSFER', label: 'Transfer'     },
    { id: 'DIRECT_DEBIT',  label: 'Direct Debit' },
    { id: 'OTHER',         label: 'Other'        },
  ]

  const handleExport = () => {
    const headers = ['Member', 'Email', 'Description', 'Method', 'Amount', 'Currency', 'Date', 'Status']
    const rows = transactions.map(tx => [
      tx.userName, tx.userEmail ?? '', tx.description ?? '', tx.method ?? '',
      String(tx.amount), tx.currency,
      new Date(tx.date).toLocaleDateString('es-ES'), tx.status,
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
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

      <div className="px-4 md:px-8 py-6 flex flex-col gap-6">

        {/* Title + total */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>
              {t.paymentsPage.transactionsTitle}
            </h1>
            <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>All payment records for your academy</p>
          </div>
          <div className="rounded-2xl px-5 py-3" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
            <p style={{ fontSize: 11, color: '#16A34A', fontWeight: 600, marginBottom: 2 }}>Total Collected</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#16A34A', letterSpacing: '-0.03em' }}>
              {loading ? '—' : fmtPrice(totalAmount)}
            </p>
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map(f => {
            const isOn = activeFilter === f.id
            return (
              <button key={f.id} onClick={() => { setActiveFilter(f.id); setPage(1) }} className="cursor-pointer"
                style={{ fontSize: 12, fontWeight: isOn ? 600 : 400, padding: '5px 14px', borderRadius: 8,
                  background: isOn ? '#111827' : '#fff', color: isOn ? '#fff' : '#6B7280',
                  border: isOn ? '1.5px solid #111827' : '1.5px solid #E5E7EB' }}>
                {f.label}{' '}<span style={{ opacity: 0.65 }}>{f.count}</span>
              </button>
            )
          })}
        </div>

        {/* Method chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Method:</span>
          {METHOD_FILTERS.map(f => {
            const isOn = activeMethod === f.id
            const mc = METHOD_COLORS[f.id] ?? { bg: '#F3F4F6', color: '#374151' }
            const cnt = methodCounts[f.id] ?? 0
            if (f.id !== 'ALL' && cnt === 0) return null
            return (
              <button key={f.id} onClick={() => { setActiveMethod(f.id); setPage(1) }} className="cursor-pointer"
                style={{ fontSize: 12, fontWeight: isOn ? 600 : 400, padding: '4px 12px', borderRadius: 999,
                  background: isOn ? mc.bg : '#F9FAFB', color: isOn ? mc.color : '#6B7280',
                  border: isOn ? `1.5px solid ${mc.color}33` : '1.5px solid #E5E7EB' }}>
                {f.label}{f.id !== 'ALL' && cnt > 0 && <span style={{ opacity: 0.65, marginLeft: 4 }}>{cnt}</span>}
              </button>
            )
          })}
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
                  { label: 'Submitted',   cls: 'hidden md:table-cell' },
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
                return (
                  <tr key={tx.id}
                    onClick={() => setSelectedTx(isSelected ? null : tx)}
                    className="hover:bg-[#FAFAFA] transition-colors cursor-pointer"
                    style={{ borderBottom: idx < transactions.length - 1 ? '1px solid #F9FAFB' : 'none',
                      background: isSelected ? '#F0F7FF' : undefined }}>

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
                      ) : (
                        <span style={{ fontSize: 13, color: '#D1D5DB' }}>—</span>
                      )}
                    </td>

                    <td className="px-5 py-3">
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>
                        {fmtPrice(tx.amount, tx.currency)}
                      </span>
                    </td>

                    <td className="hidden md:table-cell px-5 py-3">
                      <span style={{ fontSize: 13, color: '#6B7280' }}>{fmtDate(tx.date)}</span>
                    </td>

                    <td className="hidden sm:table-cell px-5 py-3">
                      <span className="inline-flex items-center gap-1.5"
                        style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
                          background: sc.bg, color: sc.color, border: '1px solid ' + sc.border, whiteSpace: 'nowrap' }}>
                        <StatusIcon size={10} />
                        {sc.label}
                      </span>
                    </td>

                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedTx(isSelected ? null : tx)}
                        style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8,
                          background: isSelected ? '#0870E2' : '#F3F4F6',
                          color: isSelected ? '#fff' : '#374151', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        {isSelected ? 'Close' : 'Details'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
              <p style={{ fontSize: 13, color: '#6B7280' }}>
                Showing <span style={{ fontWeight: 600, color: '#111827' }}>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}</span> of{' '}
                <span style={{ fontWeight: 600, color: '#111827' }}>{total}</span>
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ fontSize: 13, border: '1px solid #E5E7EB', background: '#fff', color: page === 1 ? '#D1D5DB' : '#374151',
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
                  style={{ fontSize: 13, border: '1px solid #E5E7EB', background: '#fff', color: page === totalPages ? '#D1D5DB' : '#374151',
                    cursor: page === totalPages ? 'not-allowed' : 'pointer', borderRadius: 8, padding: '6px 10px' }}>
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
