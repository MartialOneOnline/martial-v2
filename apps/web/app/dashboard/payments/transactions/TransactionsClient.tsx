'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Bell, CreditCard,
  Menu, X, Search, ChevronLeft, ChevronRight, Check, X as XIcon,
  Clock, Download, TrendingUp, TrendingDown,
  AlertCircle, RefreshCw, MoreHorizontal, Eye, Plus,
} from 'lucide-react'
import { useDashboard } from '../../../../components/DashboardShell'
import { useT } from '../../../../lib/i18n/LanguageContext'

// ── Types ──────────────────────────────────────────────────────────────────────
type TxStatus = 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED'
type TxFilter = 'ALL' | TxStatus

interface TxRow {
  id: string
  userName: string
  userEmail: string | null
  userAvatar: string | null
  description: string
  method: string
  amount: number
  currency: string
  date: string
  status: TxStatus
  type: string
  notes: string | null
}

interface TxStats {
  PAID: number; PENDING: number; FAILED: number; REFUNDED: number
}

interface Member { id: string; name: string; email: string; avatarUrl: string | null }

const STATUS_MAP: Record<TxStatus, { bg: string; color: string; border: string; icon: React.ElementType; label: string }> = {
  PAID:     { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0', icon: Check,      label: 'Paid'     },
  PENDING:  { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A', icon: Clock,      label: 'Pending'  },
  FAILED:   { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', icon: XIcon,      label: 'Failed'   },
  REFUNDED: { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE', icon: RefreshCw,  label: 'Refunded' },
}

const CATEGORY_LABELS: Record<string, string> = {
  MEMBERSHIP: 'Membership', CLASS_BOOKING: 'Class', PRODUCT_SALE: 'Product',
  SALARY: 'Salary', RENT: 'Rent', EQUIPMENT: 'Equipment', MARKETING: 'Marketing', OTHER: 'Other',
}

const METHOD_COLORS: Record<string, { bg: string; color: string }> = {
  MEMBERSHIP:    { bg: '#EFF6FF', color: '#2563EB' },
  CLASS_BOOKING: { bg: '#F0FDF4', color: '#15803D' },
  PRODUCT_SALE:  { bg: '#FDF4FF', color: '#7C3AED' },
  OTHER:         { bg: '#F3F4F6', color: '#6B7280' },
}

const ITEMS_PER_PAGE = 15

function fmtAmount(amount: number, currency: string) {
  const sym = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency + ' '
  return sym + amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

// ── Add Transaction Drawer ─────────────────────────────────────────────────────
function AddTransactionDrawer({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess: () => void
}) {
  const t = useT()
  const [members, setMembers]           = useState<Member[]>([])
  const [memberQuery, setMemberQuery]   = useState('')
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [description, setDescription]  = useState('')
  const [category, setCategory]        = useState('MEMBERSHIP')
  const [type, setType]                = useState('INCOME')
  const [amount, setAmount]            = useState('')
  const [date, setDate]                = useState('')
  const [status, setStatus]            = useState<TxStatus>('PAID')
  const [notes, setNotes]              = useState('')
  const [saving, setSaving]            = useState(false)

  useEffect(() => {
    if (!open) return
    fetch('/api/dashboard/members?role=student&pageSize=200')
      .then(r => r.json())
      .then((d: unknown) => {
        const arr = (Array.isArray(d) ? d : (d as { members?: unknown[] }).members ?? []) as Array<{ id: string; userId?: string; name?: string; email: string; avatarUrl?: string | null }>
        setMembers(arr.map(m => ({ id: m.userId ?? m.id, name: m.name ?? m.email, email: m.email, avatarUrl: m.avatarUrl ?? null })))
      })
      .catch(() => {})
  }, [open])

  const filteredMembers = members.filter(m =>
    memberQuery === '' ||
    m.name.toLowerCase().includes(memberQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(memberQuery.toLowerCase())
  )

  function reset() {
    setMemberQuery(''); setSelectedMember(null); setShowDropdown(false)
    setDescription(''); setCategory('MEMBERSHIP'); setType('INCOME')
    setAmount(''); setDate(''); setStatus('PAID'); setNotes('')
  }
  function handleClose() { reset(); onClose() }

  const canSubmit = amount && date

  async function handleSubmit() {
    if (!canSubmit) return
    setSaving(true)
    try {
      const res = await fetch('/api/dashboard/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedMember?.id ?? null,
          description: description || null,
          amount, currency: 'EUR',
          date, status, type, category, notes,
        }),
      })
      if (res.ok) { reset(); onSuccess() }
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1px solid #E5E7EB', borderRadius: 10,
    padding: '9px 12px', fontSize: 13, color: '#111827', background: '#fff', outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5,
  }

  return (
    <>
      <div className="fixed inset-0 z-40 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.35)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
        onClick={handleClose} />

      <div className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-hidden"
        style={{ width: 'min(560px,96vw)', background: '#F9FAFB',
          boxShadow: '-4px 0 32px rgba(0,0,0,0.12)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 shrink-0"
          style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
              {t.paymentsPage.addTransaction}
            </h2>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
              {t.paymentsPage.recordPayment}
            </p>
          </div>
          <button onClick={handleClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <X size={15} style={{ color: '#6B7280' }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">

          {/* Member picker */}
          <div className="relative">
            <label style={labelStyle}>{t.paymentsPage.member} <span style={{ fontWeight: 400, color: '#9CA3AF' }}>({t.common.optional})</span></label>
            {selectedMember ? (
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                style={{ border: '1px solid #0071E3', background: '#EFF6FF' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: '#0071E3' }}>
                    {selectedMember.name.charAt(0).toUpperCase()}
                  </div>
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
                  <input type="text" placeholder={t.paymentsPage.searchMember}
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
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ background: '#0071E3' }}>
                            {m.name.charAt(0).toUpperCase()}
                          </div>
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
            )}
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>{t.paymentsPage.membershipPlan}</label>
            <input type="text" placeholder="Ej: Mensual BJJ, Drop-in..."
              value={description} onChange={e => setDescription(e.target.value)} style={inputStyle} />
          </div>

          {/* Category + Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Categoría</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
                {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Tipo</label>
              <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
                <option value="INCOME">Ingreso</option>
                <option value="EXPENSE">Gasto</option>
              </select>
            </div>
          </div>

          {/* Amount + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>{t.common.amount} (€)</label>
              <input type="text" inputMode="numeric" placeholder="65.00"
                value={amount} onChange={e => setAmount(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t.common.status}</label>
              <select value={status} onChange={e => setStatus(e.target.value as TxStatus)} style={inputStyle}>
                {(Object.entries(STATUS_MAP) as [TxStatus, { label: string }][]).map(([v, s]) => (
                  <option key={v} value={v}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date */}
          <div>
            <label style={labelStyle}>{t.common.date}</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>{t.paymentsPage.notes} <span style={{ fontWeight: 400, color: '#9CA3AF' }}>({t.common.optional})</span></label>
            <textarea rows={3} placeholder={t.paymentsPage.notesPlaceholder}
              value={notes} onChange={e => setNotes(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center gap-3 justify-end shrink-0"
          style={{ background: '#fff', borderTop: '1px solid #E5E7EB' }}>
          <button onClick={handleClose}
            className="px-5 py-2.5 rounded-xl cursor-pointer"
            style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>
            {t.common.cancel}
          </button>
          <button onClick={handleSubmit} disabled={!canSubmit || saving}
            className="px-6 py-2.5 rounded-xl cursor-pointer flex items-center gap-2"
            style={{ fontSize: 13, fontWeight: 600, border: 'none',
              background: canSubmit ? '#0071E3' : '#93C5FD', color: '#fff',
              cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
            <Plus size={14} />
            {saving ? 'Guardando…' : t.paymentsPage.addTransaction}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Success toast ──────────────────────────────────────────────────────────────
function SuccessToast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[70] flex items-center gap-3 px-5 py-3.5 rounded-2xl"
      style={{ background: '#fff', border: '1px solid #BBF7D0', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
        style={{ background: '#F0FDF4' }}>
        <Check size={14} style={{ color: '#16A34A' }} strokeWidth={3} />
      </div>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{message}</p>
      <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', marginLeft: 4 }}>
        <X size={13} style={{ color: '#9CA3AF' }} />
      </button>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function TransactionsClient() {
  const { menuOpen, setMenuOpen } = useDashboard()
  const t = useT()
  const [activeFilter, setActiveFilter] = useState<TxFilter>('ALL')
  const [search, setSearch]             = useState('')
  const [currentPage, setCurrentPage]   = useState(1)
  const [openMenuId, setOpenMenuId]     = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen]     = useState(false)
  const [toast, setToast]               = useState(false)

  const [transactions, setTransactions] = useState<TxRow[]>([])
  const [total, setTotal]               = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [countByStatus, setCountByStatus] = useState<TxStats>({ PAID: 0, PENDING: 0, FAILED: 0, REFUNDED: 0 })
  const [loading, setLoading]           = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      status: activeFilter,
      search,
      page: String(currentPage),
      pageSize: String(ITEMS_PER_PAGE),
    })
    const res = await fetch(`/api/dashboard/transactions?${params}`)
    if (res.ok) {
      const data = await res.json()
      setTransactions(data.transactions)
      setTotal(data.total)
      setTotalRevenue(data.totalRevenue)
      setCountByStatus(data.countByStatus)
    }
    setLoading(false)
  }, [activeFilter, search, currentPage])

  useEffect(() => { load() }, [load])

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))
  const pages = getPaginationPages(currentPage, totalPages)

  const totalCount = Object.values(countByStatus).reduce((a, b) => a + b, 0)

  const STATS = [
    { label: t.paymentsPage.totalRevenue, value: fmtAmount(totalRevenue, 'EUR'), icon: TrendingUp, color: '#16A34A', bg: '#F0FDF4' },
    { label: t.common.paid,               value: String(countByStatus.PAID),     icon: Check,      color: '#0071E3', bg: '#EFF6FF' },
    { label: t.common.pending,            value: String(countByStatus.PENDING),  icon: Clock,      color: '#D97706', bg: '#FFFBEB' },
    { label: t.common.failed,             value: String(countByStatus.FAILED),   icon: AlertCircle,color: '#DC2626', bg: '#FEF2F2' },
  ]

  const FILTERS: { id: TxFilter; label: string; count: number }[] = [
    { id: 'ALL',      label: t.common.all,      count: totalCount },
    { id: 'PAID',     label: t.common.paid,     count: countByStatus.PAID },
    { id: 'PENDING',  label: t.common.pending,  count: countByStatus.PENDING },
    { id: 'FAILED',   label: t.common.failed,   count: countByStatus.FAILED },
    { id: 'REFUNDED', label: t.common.refunded, count: countByStatus.REFUNDED },
  ]

  function handleFilter(f: TxFilter) { setActiveFilter(f); setCurrentPage(1) }
  function handleSearch(v: string)   { setSearch(v); setCurrentPage(1) }

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
          <input type="text" placeholder={t.paymentsPage.searchTx} value={search}
            onChange={e => handleSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', width: '100%' }} />
        </div>

        <div className="flex-1" />

        <button className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer shrink-0"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', fontSize: 13, fontWeight: 500, color: '#374151' }}>
          <Download size={14} />{t.common.export}
        </button>
        <button onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer shrink-0"
          style={{ background: '#0071E3', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600 }}>
          <Plus size={15} />{t.paymentsPage.addTransaction}
        </button>
      </div>

      <div className="px-4 md:px-8 py-6 flex flex-col gap-6">

        {/* Header */}
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>
            {t.paymentsPage.transactionsTitle}
          </h1>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>
            {t.paymentsPage.transactionsSubtitle}
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
              const sc = f.id !== 'ALL' ? STATUS_MAP[f.id as TxStatus] : null
              return (
                <button key={f.id}
                  onClick={() => handleFilter(f.id)}
                  className="flex items-center gap-2 px-4 py-3 cursor-pointer relative"
                  style={{ fontSize: 14, fontWeight: isActive ? 600 : 400, border: 'none',
                    background: 'transparent', color: isActive ? '#111827' : '#6B7280' }}>
                  {f.label}
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 999,
                    background: isActive && sc ? sc.bg : '#F3F4F6',
                    color: isActive && sc ? sc.color : isActive ? '#374151' : '#9CA3AF' }}>
                    {f.count}
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
                  { label: t.common.member,           cls: '' },
                  { label: t.paymentsPage.colPlan,    cls: 'hidden md:table-cell' },
                  { label: 'Categoría',               cls: 'hidden sm:table-cell' },
                  { label: t.common.amount,           cls: '' },
                  { label: t.common.date,             cls: 'hidden lg:table-cell' },
                  { label: t.common.status,           cls: '' },
                  { label: t.common.actions,          cls: '' },
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
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 0' }}>
                    <CreditCard size={28} style={{ color: '#E5E7EB', margin: '0 auto 10px' }} />
                    <p style={{ fontSize: 14, color: '#9CA3AF' }}>{t.paymentsPage.noTransactions}</p>
                  </td>
                </tr>
              ) : transactions.map((tx, idx) => {
                const sc = STATUS_MAP[tx.status]
                const mc = METHOD_COLORS[tx.method] ?? METHOD_COLORS.OTHER!
                const StatusIcon = sc.icon
                const initials = (tx.userName || '?').charAt(0).toUpperCase()
                return (
                  <tr key={tx.id}
                    className="hover:bg-[#FAFAFA] transition-colors cursor-pointer"
                    style={{ borderBottom: idx < transactions.length - 1 ? '1px solid #F9FAFB' : 'none' }}>

                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ background: '#0071E3' }}>
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{tx.userName}</p>
                          <p style={{ fontSize: 11, color: '#9CA3AF' }}>{tx.userEmail ?? '—'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="hidden md:table-cell px-5 py-3">
                      <span style={{ fontSize: 13, color: '#374151' }}>{tx.description}</span>
                    </td>

                    <td className="hidden sm:table-cell px-5 py-3">
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px',
                        borderRadius: 999, background: mc.bg, color: mc.color }}>
                        {CATEGORY_LABELS[tx.method] ?? tx.method}
                      </span>
                    </td>

                    <td className="px-5 py-3">
                      <span style={{ fontSize: 15, fontWeight: 700, color: tx.type === 'EXPENSE' ? '#DC2626' : '#111827', letterSpacing: '-0.02em' }}>
                        {tx.type === 'EXPENSE' ? '−' : ''}{fmtAmount(tx.amount, tx.currency)}
                      </span>
                    </td>

                    <td className="hidden lg:table-cell px-5 py-3">
                      <span style={{ fontSize: 13, color: '#6B7280' }}>{fmtDate(tx.date)}</span>
                    </td>

                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5"
                        style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
                          background: sc.bg, color: sc.color, border: '1px solid ' + sc.border,
                          whiteSpace: 'nowrap' }}>
                        <StatusIcon size={9} strokeWidth={3} />
                        {sc.label}
                      </span>
                    </td>

                    <td className="px-5 py-3 relative">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === tx.id ? null : tx.id) }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                          style={{ color: '#9CA3AF', background: 'transparent', border: 'none' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                          <MoreHorizontal size={15} />
                        </button>
                      </div>
                      {openMenuId === tx.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                          <div className="absolute right-4 rounded-xl z-20 py-1 overflow-hidden"
                            style={{ background: '#fff', border: '1px solid #E5E7EB',
                              boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 160, top: '100%' }}>
                            {[
                              ...(tx.status === 'PAID' ? [{ label: 'Marcar reembolsado', danger: true }] : []),
                              ...(tx.status === 'PENDING' ? [{ label: 'Marcar pagado', danger: false }] : []),
                            ].map(({ label, danger }) => (
                              <button key={label} onClick={() => setOpenMenuId(null)}
                                className="w-full text-left px-4 py-2.5 cursor-pointer flex items-center gap-2"
                                style={{ fontSize: 13, color: danger ? '#DC2626' : '#374151',
                                  background: 'transparent', border: 'none' }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = danger ? '#FEF2F2' : '#F9FAFB'}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                                {label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {total > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
              <p style={{ fontSize: 13, color: '#6B7280' }}>
                {t.common.showing}{' '}
                <span style={{ fontWeight: 600, color: '#111827' }}>
                  {total === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, total)}
                </span>
                {' of '}
                <span style={{ fontWeight: 600, color: '#111827' }}>{total}</span>
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff',
                    color: currentPage === 1 ? '#D1D5DB' : '#374151', cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    borderRadius: 8, padding: '6px 12px' }}>
                  {t.common.prev}
                </button>
                <div className="flex items-center gap-1 mx-1">
                  {pages.map((p, i) =>
                    p === '...'
                      ? <span key={'e'+i} style={{ fontSize: 13, color: '#9CA3AF', padding: '0 4px' }}>…</span>
                      : (
                        <button key={p} onClick={() => setCurrentPage(p as number)}
                          className="w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer"
                          style={{ fontSize: 13, fontWeight: p === currentPage ? 600 : 400, border: 'none',
                            background: p === currentPage ? '#F3F4F6' : 'transparent',
                            color: p === currentPage ? '#111827' : '#6B7280' }}>
                          {p}
                        </button>
                      )
                  )}
                </div>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff',
                    color: currentPage === totalPages ? '#D1D5DB' : '#374151', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    borderRadius: 8, padding: '6px 12px' }}>
                  {t.common.next}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>

    <AddTransactionDrawer
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      onSuccess={() => { setDrawerOpen(false); setToast(true); load(); setTimeout(() => setToast(false), 3500) }}
    />
    {toast && <SuccessToast message={t.paymentsPage.txRecorded} onClose={() => setToast(false)} />}
    </>
  )
}
