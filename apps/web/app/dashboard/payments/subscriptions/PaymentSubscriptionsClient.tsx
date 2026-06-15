'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Menu, X, Search, Check, Clock,
  TrendingUp, TrendingDown, RefreshCw, MoreHorizontal,
  PauseCircle, XCircle, Plus,
} from 'lucide-react'
import { useDashboard } from '../../../../components/DashboardShell'
import { useT } from '../../../../lib/i18n/LanguageContext'

// ── Types ──────────────────────────────────────────────────────────────────────
type MemStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED'
type Filter = 'ALL' | MemStatus

interface SubRow {
  memberId: string
  userId: string
  memberName: string
  memberEmail: string
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

const STATUS_MAP: Record<MemStatus, { bg: string; color: string; border: string; icon: React.ElementType; label: string }> = {
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

// ── Main ───────────────────────────────────────────────────────────────────────
export default function PaymentSubscriptionsClient() {
  const { menuOpen, setMenuOpen } = useDashboard()
  const t = useT()
  const [activeFilter, setActiveFilter] = useState<Filter>('ALL')
  const [search, setSearch]             = useState('')
  const [currentPage, setCurrentPage]   = useState(1)
  const [openMenuId, setOpenMenuId]     = useState<string | null>(null)
  const [toast, setToast]               = useState(false)

  const [subs, setSubs]       = useState<SubRow[]>([])
  const [loading, setLoading] = useState(true)
  const [serverCounts, setServerCounts] = useState({ ALL: 0, ACTIVE: 0, PAUSED: 0, CANCELLED: 0, EXPIRED: 0 })
  const [mrr, setMrr] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Always fetch ALL to keep counts accurate; filter client-side
      const params = new URLSearchParams({ pageSize: '500' })
      if (search) params.set('search', search)
      const res = await fetch(`/api/dashboard/memberships?${params}`)
      if (!res.ok) return
      const data = await res.json()
      const memberships = data.memberships ?? []
      const cs = data.countByStatus ?? {}
      const total = (cs.ACTIVE ?? 0) + (cs.PAUSED ?? 0) + (cs.CANCELLED ?? 0) + (cs.EXPIRED ?? 0)
      setServerCounts({ ALL: total, ACTIVE: cs.ACTIVE ?? 0, PAUSED: cs.PAUSED ?? 0, CANCELLED: cs.CANCELLED ?? 0, EXPIRED: cs.EXPIRED ?? 0 })

      const rows: SubRow[] = memberships.map((m: {
        id: string; userId?: string; userName: string; userEmail?: string; userAvatar?: string;
        belt?: string | null; planName: string; planType?: string; paymentMethod?: string;
        price: number; currency?: string; startDate: string; endDate?: string; status: MemStatus;
        classesUsed?: number; totalLimit?: number;
      }) => ({
        memberId:    m.id,
        userId:      m.userId ?? m.id,
        memberName:  m.userName,
        memberEmail: m.userEmail ?? '',
        belt:        m.belt ?? 'Blanco',
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
    return true
  })

  const counts = serverCounts

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage   = Math.min(currentPage, totalPages)
  const paginated  = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)
  const pages      = getPaginationPages(safePage, totalPages)

  const STATS = [
    { label: t.paymentsPage.activeNow, value: String(counts.ACTIVE), icon: Check,       color: '#16A34A', bg: '#F0FDF4' },
    { label: t.paymentsPage.mrrLabel,  value: '€' + mrr.toLocaleString('es-ES', { minimumFractionDigits: 2 }), icon: TrendingUp,  color: '#0071E3', bg: '#EFF6FF' },
    { label: 'Pausadas',               value: String(counts.PAUSED),  icon: PauseCircle, color: '#D97706', bg: '#FFFBEB' },
    { label: t.paymentsPage.churn,     value: String(counts.CANCELLED + counts.EXPIRED), icon: TrendingDown, color: '#DC2626', bg: '#FEF2F2' },
  ]

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'ALL',       label: t.common.all      },
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

        <div className="flex-1" />

        <a href="/dashboard/users"
          className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer shrink-0"
          style={{ background: '#0071E3', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
          <Plus size={15} /><span className="hidden sm:inline">Asignar membresía</span>
        </a>
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
                const initials = sub.memberName.charAt(0).toUpperCase()
                return (
                  <tr key={sub.memberId}
                    className="hover:bg-[#FAFAFA] transition-colors cursor-pointer"
                    style={{ borderBottom: idx < paginated.length - 1 ? '1px solid #F9FAFB' : 'none' }}>

                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ background: '#0071E3' }}>
                          {initials}
                        </div>
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
                        €{sub.amount.toFixed(2)}
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

                    <td className="px-5 py-3 relative">
                      <button
                        onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === sub.memberId ? null : sub.memberId) }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                        style={{ color: '#9CA3AF', background: 'transparent', border: 'none' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                        <MoreHorizontal size={15} />
                      </button>
                      {openMenuId === sub.memberId && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                          <div className="absolute right-4 rounded-xl z-20 py-1 overflow-hidden"
                            style={{ background: '#fff', border: '1px solid #E5E7EB',
                              boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 170, top: '100%' }}>
                            <a href={`/dashboard/users/${sub.memberId}`}
                              className="w-full text-left px-4 py-2.5 flex items-center gap-2"
                              style={{ fontSize: 13, color: '#374151', background: 'transparent',
                                border: 'none', textDecoration: 'none', display: 'block' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                              Ver perfil
                            </a>
                          </div>
                        </>
                      )}
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
    </>
  )
}
