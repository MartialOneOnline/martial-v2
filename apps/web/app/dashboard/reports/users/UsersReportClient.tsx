'use client'

import { useDashboard } from '../../../../components/DashboardShell'
import NotificationBell from '../../../../components/NotificationBell'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Menu, Search, ChevronLeft, ChevronRight, Filter, MoreVertical, Download, Phone, MessageCircle, Mail, Send, X } from 'lucide-react'
import { useT, useLanguage } from '../../../../lib/i18n/LanguageContext'
import SharedRowMenu from '../../../../components/RowMenu'
import { downloadCsv } from '../../../../lib/csvExport'
import { fmtPrice } from '../../../../lib/format'
import CampaignComposerModal, { type ComposerStudent } from '../../users/CampaignComposerModal'
import { segmentMonthOptions, createRequestGuard } from '../../../../lib/reportSelection'
import { averageRetention } from '../../../../lib/memberActivity'
import {
  ComposedChart, Line, Bar, PieChart, Pie, Cell, Legend,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const ITEMS_PER_PAGE = 15

const BELT_BG: Record<string, string> = {
  Blanco: '#F3F4F6', White: '#F3F4F6', Azul: '#1D4ED8', Blue: '#1D4ED8',
  Morado: '#6D28D9', Purple: '#6D28D9', Marrón: '#92400E', Brown: '#92400E',
  Negro: '#111827',  Black: '#111827',
}
const BELT_TEXT: Record<string, string> = {
  Blanco: '#374151', White: '#374151', Azul: '#fff', Blue: '#fff',
  Morado: '#fff', Purple: '#fff', Marrón: '#fff', Brown: '#fff', Negro: '#fff', Black: '#fff',
}
const BELT_CHART_FILL: Record<string, string> = {
  Blanco: '#E5E7EB', White: '#E5E7EB', Azul: '#1D4ED8', Blue: '#1D4ED8',
  Morado: '#6D28D9', Purple: '#6D28D9', Marrón: '#92400E', Brown: '#92400E',
  Negro: '#111827',  Black: '#111827',
}
const BELT_OPTIONS = ['Blanco', 'Azul', 'Morado', 'Marrón', 'Negro']

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string; label: string }> = {
  ACTIVE:   { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0', label: 'Active'   },
  INACTIVE: { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB', label: 'Inactive' },
  FROZEN:   { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', label: 'Frozen'   },
  LEAD:     { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA', label: 'Invited'  },
}

function Avatar({ name, avatarUrl, size = 32 }: { name: string; avatarUrl: string | null; size?: number }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (avatarUrl) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatarUrl} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  )
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      background: 'linear-gradient(135deg,#0870E2,#7DE7EC)', color: '#fff', fontSize: size * 0.33, fontWeight: 700 }}>
      {initials}
    </div>
  )
}

function getPaginationPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Shared UI helpers ─────────────────────────────────────────────────────────
const SEC: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, display: 'block' }

interface FiltersState { belt: string }
const EMPTY_FILTERS: FiltersState = { belt: '' }

function FiltersPanel({ filters, onChange }: { filters: FiltersState; onChange: (f: FiltersState) => void }) {
  const [local, setLocal] = useState<FiltersState>(filters)
  useEffect(() => { setLocal(filters) }, [filters])
  const activeCount = [!!filters.belt].filter(Boolean).length
  return (
    <SharedRowMenu align="right" closeOnItemClick={false} trigger={({ onClick }) => (
      <button onClick={onClick}
        style={{ display: 'flex', alignItems: 'center', gap: 5, height: 34, padding: '0 12px', borderRadius: 8, cursor: 'pointer',
          border: activeCount ? '1.5px solid #0870E2' : '1px solid #E5E7EB',
          background: activeCount ? '#EFF6FF' : '#fff' }}>
        <Filter size={13} style={{ color: activeCount ? '#0870E2' : '#6B7280' }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: activeCount ? '#0870E2' : '#6B7280' }}>Filters</span>
        {activeCount > 0 && <span style={{ background: '#0870E2', color: '#fff', borderRadius: 999, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>{activeCount}</span>}
      </button>
    )}>
      {({ close }) => {
        function apply() { onChange(local); close() }
        function clear() { setLocal(EMPTY_FILTERS); onChange(EMPTY_FILTERS); close() }
        return (
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', width: 280, padding: 16 }}>
            <div style={{ marginBottom: 16 }}>
              <span style={SEC}>Belt</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {BELT_OPTIONS.map(b => (
                  <button key={b} onClick={() => setLocal(p => ({ ...p, belt: p.belt === b ? '' : b }))}
                    style={{ fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
                      border: local.belt === b ? '1.5px solid #0870E2' : '1px solid #E5E7EB',
                      background: local.belt === b ? '#EFF6FF' : '#F9FAFB',
                      color: local.belt === b ? '#0870E2' : '#6B7280' }}>{b}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid #F3F4F6' }}>
              <button onClick={clear} style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 12, fontWeight: 500, color: '#6B7280', cursor: 'pointer' }}>Clear</button>
              <button onClick={apply} style={{ flex: 1, padding: 8, borderRadius: 8, border: 'none', background: '#111827', fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>Apply</button>
            </div>
          </div>
        )
      }}
    </SharedRowMenu>
  )
}

function RowMenu({ items }: { items: { label: string; onClick: () => void; variant?: 'danger' }[] }) {
  return (
    <SharedRowMenu trigger={({ onClick }) => (
      <button onClick={onClick} className="cursor-pointer"
        style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #E5E7EB', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MoreVertical size={13} style={{ color: '#6B7280' }} />
      </button>
    )}>
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,0.1)', minWidth: 160, overflow: 'hidden' }}>
        {items.map(item => (
          <button key={item.label} onClick={item.onClick}
            className="w-full text-left cursor-pointer hover:bg-[#F9FAFB]"
            style={{ padding: '9px 14px', fontSize: 12, fontWeight: 500, color: item.variant === 'danger' ? '#DC2626' : '#374151', border: 'none', background: 'transparent', display: 'block' }}>
            {item.label}
          </button>
        ))}
      </div>
    </SharedRowMenu>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface MemberRow {
  id: string; name: string; email: string; avatarUrl: string | null
  phone: string | null; whatsapp: string | null
  belt: string; plan: string; status: string; joinedAt: string; isNew: boolean
  firstMonth: string | null; lastMonth: string | null; monthsActive: number; classes: number
  lastAttendedAt: string | null
  lastPayment: { date: string; amount: number; currency: string } | null
}
type Segment = 'NEW' | 'LOST' | 'RETURNING' | 'AT_RISK'
type ListTab = 'ALL' | 'ACTIVE' | 'INACTIVE' | Segment
const SEGMENTS: Segment[] = ['NEW', 'LOST', 'RETURNING', 'AT_RISK']
const isSegment = (t: ListTab): t is Segment => (SEGMENTS as string[]).includes(t)
interface MonthStats {
  month: string; active: number; new: number; returning: number; lost: number
  growthPct: number | null; churnPct: number | null
  newPct: number | null; returningPct: number | null
  activeYearAgo: number; yoyPct: number | null
  provisional?: boolean
}
const COHORT_OFFSETS = [2, 3, 6] as const
interface CohortStats {
  month: string; started: number
  retained: Record<2 | 3 | 6, number | null>
  retainedCount: Record<2 | 3 | 6, number | null>
}
interface ReportData {
  stats: {
    totalActive: number; newInPeriod: number; returningInPeriod: number; lostInPeriod: number
    growthPct: number | null; retentionPct: number | null
    baseMonth: string; endMonth: string; baseActive: number; endActive: number
  }
  monthly:      MonthStats[]
  cohorts:      CohortStats[]
  currentMonth: string
  schoolName:   string
  segmentMonth: string
  segmentCounts: Record<Segment, number>
  segmentRemoved: number
  beltDist:   { name: string; value: number }[]
  members:    MemberRow[]
  total:      number
}

export default function UsersReportClient() {
  const { setMenuOpen } = useDashboard()
  const t = useT()
  const { locale } = useLanguage()
  const r = t.reports
  const fmtMonth = (m: string, long = false) => {
    const [y, mo] = m.split('-').map(Number) as [number, number]
    return new Date(y, mo - 1, 1).toLocaleDateString(locale, long ? { month: 'long', year: 'numeric' } : { month: 'short', year: '2-digit' })
  }
  const fmtPct = (n: number | null, signed = true) => n === null ? '—' : `${signed && n > 0 ? '+' : ''}${n.toLocaleString(locale)}%`

  const [period,     setPeriod]     = useState<'7d' | '30d' | '90d' | '12m' | 'custom'>('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo,   setCustomTo]   = useState('')
  const [filterTab, setFilterTab] = useState<ListTab>('ALL')
  // Month the New / Lost / Came back tabs refer to ('' = current month)
  const [segMonth,  setSegMonth]  = useState('')
  // Selected students, kept across pages, for "Send campaign" / export
  const [selected,  setSelected]  = useState<Map<string, MemberRow>>(new Map())
  // Audience frozen when the composer opens: the campaign, its summary and
  // its counts belong to exactly these students, whatever the live selection
  // does afterwards (e.g. a slow "Select all" resolving).
  const [composerAudience, setComposerAudience] = useState<ComposerStudent[] | null>(null)
  const campaignSent = useRef(false)
  // Drop responses that belong to an older tab / month / filter — the list on
  // screen and the selected audience must always be the current group.
  const [loadGuard] = useState(createRequestGuard)
  const [selGuard]  = useState(createRequestGuard)
  const listRef = useRef<HTMLDivElement>(null)
  const [search,    setSearch]    = useState('')
  const [page,      setPage]      = useState(1)
  const [filters,   setFilters]   = useState<FiltersState>(EMPTY_FILTERS)
  const [data,      setData]      = useState<ReportData | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [toast,     setToast]     = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2200) }

  const buildParams = useCallback((p: number, pageSize?: number) => {
    const params = new URLSearchParams({ period, search, page: String(p) })
    if (isSegment(filterTab)) {
      params.set('segment', filterTab)
      if (segMonth) params.set('month', segMonth)  // explicit whenever known, see selectTab
    } else params.set('status', filterTab)
    if (pageSize) params.set('pageSize', String(pageSize))
    if (filters.belt)     params.set('belt', filters.belt)
    if (period === 'custom' && customFrom) params.set('dateFrom', customFrom)
    if (period === 'custom' && customTo)   params.set('dateTo', customTo)
    return params
  }, [period, filterTab, segMonth, search, filters, customFrom, customTo])

  const load = useCallback(async () => {
    const token = loadGuard.begin()
    setLoading(true)
    const res = await fetch(`/api/dashboard/reports/users?${buildParams(page)}`)
    const json: ReportData | null = res.ok ? await res.json() : null
    if (!loadGuard.isCurrent(token)) return
    if (json) {
      setData(json)
      // Keep the picker on the month the server actually used (the default
      // current month, or a clamped one) so picker, request and list agree.
      if (isSegment(filterTab) && json.segmentMonth !== segMonth) setSegMonth(json.segmentMonth)
    }
    setLoading(false)
  }, [buildParams, page, filterTab, segMonth, loadGuard])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [period, filterTab, segMonth, search, filters, customFrom, customTo])
  // A new group means a new audience — don't carry a selection across it,
  // and any pending "Select all" for the old context must not land later.
  useEffect(() => { selGuard.invalidate() }, [buildParams, selGuard])
  useEffect(() => { selGuard.invalidate(); setSelected(new Map()) }, [filterTab, segMonth, selGuard])

  function selectTab(key: ListTab) {
    setFilterTab(key)
    if (isSegment(key) && !segMonth && data) setSegMonth(data.currentMonth)
  }
  function clearSelection() { selGuard.invalidate(); setSelected(new Map()) }

  function openComposer() {
    selGuard.invalidate() // a pending "Select all" must not change the audience now
    setComposerAudience([...selected.values()].map(m => ({ id: m.id, name: m.name, email: m.email, belt: m.belt, status: m.status, avatarUrl: m.avatarUrl })))
  }

  // Throws on HTTP or network errors — an empty list would otherwise export
  // an empty file or wipe the selection without saying anything.
  async function fetchAllMembers(): Promise<MemberRow[]> {
    const res = await fetch(`/api/dashboard/reports/users?${buildParams(1, 1000)}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return ((await res.json()) as ReportData).members
  }

  function exportMembers(list: MemberRow[]) {
    const headers = [r.usersColMember, 'Email', 'Phone', r.usersColBelt, r.usersColPlan, r.usersColStatus,
      r.usersColWithUs, r.usersColClasses, r.usersColLastClass, r.usersColLastPayment]
    const rows = list.map(m => [
      m.name, m.email, m.phone ?? '', m.belt, m.plan, STATUS_STYLES[m.status]?.label ?? m.status,
      m.firstMonth ? `${m.firstMonth} (${m.monthsActive})` : fmtDate(m.joinedAt), m.classes,
      m.lastAttendedAt ? fmtDate(m.lastAttendedAt) : '',
      m.lastPayment ? `${fmtDate(m.lastPayment.date)} ${fmtPrice(m.lastPayment.amount, m.lastPayment.currency)}` : '',
    ])
    const name = isSegment(filterTab) ? `members-${filterTab.toLowerCase()}-${data?.segmentMonth ?? ''}` : 'members-report'
    downloadCsv(name, headers, rows)
  }

  // One flag per export so overlapping exports don't re-enable each other's
  // button early; each re-enables when its own request ends (incl. errors, to retry).
  const [exportingMembers, setExportingMembers] = useState(false)
  const [exportingHistory, setExportingHistory] = useState(false)

  async function handleExport() {
    setExportingMembers(true)
    try { exportMembers(await fetchAllMembers()) }
    catch { showToast(r.usersExportError) }
    finally { setExportingMembers(false) }
  }

  async function selectAllInGroup() {
    const token = selGuard.begin()
    let all: MemberRow[]
    try { all = await fetchAllMembers() }
    catch { if (selGuard.isCurrent(token)) showToast(r.usersLoadError); return }
    if (!selGuard.isCurrent(token)) return
    setSelected(new Map(all.map(m => [m.id, m])))
  }
  function toggleOne(m: MemberRow) {
    setSelected(prev => { const n = new Map(prev); if (n.has(m.id)) n.delete(m.id); else n.set(m.id, m); return n })
  }
  function togglePage(list: MemberRow[], on: boolean) {
    setSelected(prev => { const n = new Map(prev); for (const m of list) { if (on) n.set(m.id, m); else n.delete(m.id) } return n })
  }

  // From the monthly table: show who is behind a number
  function openSegment(segment: Segment, month: string) {
    setFilterTab(segment)
    setSegMonth(month)
    setTimeout(() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  function copy(text: string) { navigator.clipboard.writeText(text); showToast(r.usersCopied) }

  // Monthly CSV: counts + every percentage + new-student retention, one row
  // per month. Locale-aware so Spanish/Portuguese/French Excel opens it in
  // columns with real numbers (";" separator, decimal comma).
  function exportMonthly(monthly: MonthStats[], cohorts: CohortStats[], name: string) {
    const byMonth = new Map(cohorts.map(c => [c.month, c]))
    const headers = [
      r.usersMonth, r.usersCsvStatus, r.usersColActive,
      r.usersColNew, r.usersCsvPctNew, r.usersColReturning, r.usersCsvPctReturning, r.usersColLost, r.usersColChurn,
      r.usersCsvGrowth, r.usersCsvYearAgo, r.usersCsvYoy,
      ...COHORT_OFFSETS.map(k => r.usersCsvRetained.replace('{n}', String(k))),
    ]
    const rows = monthly.map(m => {
      const c = byMonth.get(m.month)
      return [
        // Explicit so the month in progress stays recognisable outside the app
        m.month, m.provisional ? r.usersCsvProvisional : r.usersCsvClosed, m.active,
        m.new, m.newPct, m.returning, m.returningPct, m.lost, m.churnPct,
        // 0 is a real count (nobody a year earlier) — only % with a 0 denominator are empty
        m.growthPct, m.activeYearAgo, m.yoyPct,
        ...COHORT_OFFSETS.map(k => c?.retained[k] ?? null),
      ]
    })
    downloadCsv(name, headers, rows, { locale })
  }
  function handleExportMonthly() { if (data) exportMonthly(data.monthly, data.cohorts, 'members-monthly') }
  async function handleExportHistory() {
    setExportingHistory(true)
    try {
      const res = await fetch('/api/dashboard/reports/users?view=history')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const h: { monthly: MonthStats[]; cohorts: CohortStats[] } = await res.json()
      exportMonthly(h.monthly, h.cohorts, 'members-monthly-history')
    } catch {
      showToast(r.usersExportError)
    } finally {
      setExportingHistory(false)
    }
  }

  async function setMemberStatus(memberId: string, status: string) {
    await fetch(`/api/dashboard/members/${memberId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    showToast(`Status updated to ${status.toLowerCase()}`)
    load()
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / ITEMS_PER_PAGE)) : 1
  const pages = getPaginationPages(page, totalPages)
  const stats = data?.stats
  const totalBelt = (data?.beltDist ?? []).reduce((s, b) => s + b.value, 0)

  // New/lost/growth compare the period's baseline month with its last month
  // (see summarisePeriod in lib/memberActivity.ts), so the sub-label names it.
  // The cards always compare closed months (the API ends the period at the
  // last full month), so name both ends: "sep 26 → oct 26".
  const vsBase = stats ? `${fmtMonth(stats.baseMonth)} → ${fmtMonth(stats.endMonth)}` : ''
  const STAT_CARDS = [
    { label: r.usersActive, value: stats?.totalActive ?? '—', sub: r.usersActiveSub, color: '#0870E2', note: '' },
    { label: r.usersNew, value: stats?.newInPeriod ?? '—', sub: vsBase, color: '#16A34A',
      note: stats?.returningInPeriod ? r.usersReturning.replace('{n}', String(stats.returningInPeriod)) : '' },
    { label: r.usersLost, value: stats?.lostInPeriod ?? '—', sub: vsBase, color: '#DC2626', note: '' },
    { label: r.usersGrowth, value: stats ? fmtPct(stats.growthPct) : '—',
      sub: stats ? `${stats.baseActive} → ${stats.endActive}` : '', color: '#6D28D9',
      note: stats?.retentionPct != null ? r.usersRetention.replace('{n}', stats.retentionPct.toLocaleString(locale)) : '' },
  ]
  const chartData = (data?.monthly ?? []).map(m => ({ ...m, label: fmtMonth(m.month) + (m.provisional ? '*' : ''), lostNeg: -m.lost }))
  const provisionalMonth = (data?.monthly ?? []).find(m => m.provisional)?.month
  const monthlyDesc = [...(data?.monthly ?? [])].reverse()

  return (
    <main style={{ flex: 1, minWidth: 0, width: '100%', overflow: 'auto' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 100,
          background: '#111827', color: '#fff', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 500 }}>
          {toast}
        </div>
      )}

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
          <input type="text" placeholder="Search members…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', width: '100%' }} />
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: '#F3F4F6' }}>
          {(['7d', '30d', '90d', '12m', 'custom'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className="cursor-pointer"
              style={{ fontSize: 12, fontWeight: period === p ? 600 : 400, padding: '5px 12px', borderRadius: 8, border: 'none',
                background: period === p ? '#fff' : 'transparent', color: period === p ? '#111827' : '#6B7280',
                boxShadow: period === p ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
              {p === 'custom' ? 'Custom' : p.toUpperCase()}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="flex items-center gap-1.5">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              style={{ height: 30, padding: '0 8px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 12, color: '#111827', outline: 'none' }} />
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>–</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              style={{ height: 30, padding: '0 8px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 12, color: '#111827', outline: 'none' }} />
          </div>
        )}
        <button onClick={handleExport} disabled={exportingMembers}
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer"
          style={{ background: '#fff', border: '1px solid #E5E7EB', color: '#374151', fontSize: 13, fontWeight: 500 }}>
          <Download size={14} /> Export
        </button>
        <NotificationBell />
      </div>

      <div className="px-4 md:px-8 py-6 flex flex-col gap-6">
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>{t.reports.usersTitle}</h1>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>Member growth, retention and activity overview</p>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {STAT_CARDS.map(stat => (
            <div key={stat.label} className="rounded-2xl" style={{ background: '#fff', border: '1px solid #E5E7EB', padding: '18px 20px' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: stat.color }} />
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>{stat.sub}</span>
              </div>
              <p style={{ fontSize: 28, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 4 }}>
                {loading ? '…' : stat.value}
              </p>
              <p style={{ fontSize: 12, fontWeight: 500, color: '#6B7280' }}>{stat.label}</p>
              {stat.note && !loading && <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{stat.note}</p>}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
            <div className="flex items-baseline justify-between" style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{r.usersMonthlyChart}</p>
              {period !== 'custom' && <span style={{ fontSize: 11, color: '#9CA3AF' }}>{r.usersLast12}</span>}
            </div>
            {loading ? <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ fontSize: 13, color: '#9CA3AF' }}>Loading…</p></div> : (
              <ResponsiveContainer width="100%" height={260}>
                {/* Active on the left axis; new (up) and lost (down) bars share the right axis so they stay readable next to a ~100+ line */}
                <ComposedChart data={chartData} stackOffset="sign">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="active" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="flow" orientation="right" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => String(Math.abs(v))} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12 }}
                    formatter={(v, name) => [Math.abs(Number(v)), name]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
                  <Bar yAxisId="flow" dataKey="new" name={r.usersColNew} fill="#22C55E" stackId="flow" radius={[3, 3, 0, 0]} maxBarSize={18}>
                    {chartData.map(d => <Cell key={d.month} fillOpacity={d.provisional ? 0.35 : 1} />)}
                  </Bar>
                  <Bar yAxisId="flow" dataKey="lostNeg" name={r.usersColLost} fill="#E11D48" stackId="flow" radius={[3, 3, 0, 0]} maxBarSize={18}>
                    {chartData.map(d => <Cell key={d.month} fillOpacity={d.provisional ? 0.35 : 1} />)}
                  </Bar>
                  <Line yAxisId="active" type="monotone" dataKey="active" name={r.usersColActive} stroke="#0870E2" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
            {!loading && provisionalMonth && (
              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>{r.usersProvisionalNote.replace('{m}', fmtMonth(provisionalMonth, true))}</p>
            )}
          </div>
          <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Members by Belt</p>
            {loading ? <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ fontSize: 13, color: '#9CA3AF' }}>Loading…</p></div> : (
              <>
                <div className="relative">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={data?.beltDist ?? []} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={2} isAnimationActive={false}>
                        {(data?.beltDist ?? []).map((entry, i) => (
                          <Cell key={i} fill={BELT_CHART_FILL[entry.name] ?? '#9CA3AF'}
                            stroke={['Blanco','White'].includes(entry.name) ? '#D1D5DB' : (BELT_CHART_FILL[entry.name] ?? '#9CA3AF')} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <p style={{ fontSize: 22, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{totalBelt}</p>
                      <p style={{ fontSize: 11, color: '#9CA3AF' }}>active</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap justify-center" style={{ marginTop: 8 }}>
                  {(data?.beltDist ?? []).map(b => (
                    <div key={b.name} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: BELT_CHART_FILL[b.name] ?? '#9CA3AF', border: ['Blanco','White'].includes(b.name) ? '1px solid #D1D5DB' : 'none' }} />
                      <span style={{ fontSize: 11, color: '#6B7280' }}>{b.name} ({b.value})</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Monthly breakdown */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
          <div className="flex items-center justify-between gap-3 px-5 py-4 flex-wrap" style={{ borderBottom: '1px solid #F3F4F6' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{r.usersMonthlyTable}</p>
              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, maxWidth: 640 }}>{r.usersDefinition}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleExportMonthly} disabled={!data}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer"
                style={{ background: '#fff', border: '1px solid #E5E7EB', color: '#374151', fontSize: 12, fontWeight: 500 }}>
                <Download size={13} /> {r.usersExportMonthly}
              </button>
              <button onClick={handleExportHistory} disabled={exportingHistory}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer"
                style={{ background: '#fff', border: '1px solid #E5E7EB', color: '#374151', fontSize: 12, fontWeight: 500 }}>
                <Download size={13} /> {r.usersExportHistory}
              </button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="w-full" style={{ minWidth: 560 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  {[r.usersMonth, r.usersColActive, r.usersColNew, r.usersColReturning, r.usersColLost, r.usersColGrowth, r.usersColYoy].map((h, i) => (
                    <th key={h} className={`px-5 py-3 ${i === 0 ? 'text-left' : 'text-right'}`}
                      style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-5 py-8 text-center" style={{ fontSize: 13, color: '#9CA3AF' }}>Loading…</td></tr>
                ) : monthlyDesc.map((m, idx) => {
                  const cell = { fontSize: 13, color: '#374151', fontVariantNumeric: 'tabular-nums' } as const
                  return (
                    <tr key={m.month} style={{ background: m.provisional ? '#FAFAFA' : undefined, borderBottom: idx < monthlyDesc.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                      <td className="px-5 py-2.5" style={{ fontSize: 13, fontWeight: 500, color: '#111827', textTransform: 'capitalize' }}>
                        {fmtMonth(m.month, true)}
                        {m.provisional && <span style={{ fontSize: 11, fontWeight: 400, color: '#9CA3AF', marginLeft: 6, textTransform: 'none' }}>({r.usersProvisional})</span>}
                      </td>
                      <td className="px-5 py-2.5 text-right" style={{ ...cell, fontWeight: 600, color: '#111827' }}>{m.active}</td>
                      {([['NEW', m.new, m.newPct, '+', '#16A34A'], ['RETURNING', m.returning, m.returningPct, '+', '#0870E2'], ['LOST', m.lost, m.churnPct, '−', '#E11D48']] as const).map(([seg, n, pct, sign, color]) => (
                        <td key={seg} className="px-5 py-2.5 text-right" style={{ ...cell, whiteSpace: 'nowrap' }}>
                          {n ? (
                            <button onClick={() => openSegment(seg, m.month)} className="cursor-pointer hover:underline"
                              style={{ ...cell, color, fontWeight: 600, background: 'none', border: 'none', padding: 0 }}>
                              {sign}{n}
                            </button>
                          ) : <span style={{ color: '#D1D5DB' }}>0</span>}
                          {pct != null && <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 6 }}>{fmtPct(pct, false)}</span>}
                        </td>
                      ))}
                      <td className="px-5 py-2.5 text-right" style={{ ...cell, color: m.growthPct == null ? '#D1D5DB' : m.growthPct > 0 ? '#16A34A' : m.growthPct < 0 ? '#E11D48' : '#6B7280' }}>{fmtPct(m.growthPct)}</td>
                      <td className="px-5 py-2.5 text-right" title={m.activeYearAgo ? `${fmtMonth(addMonth(m.month, -12), true)}: ${m.activeYearAgo}` : undefined}
                        style={{ ...cell, color: m.yoyPct == null ? '#D1D5DB' : m.yoyPct > 0 ? '#16A34A' : m.yoyPct < 0 ? '#E11D48' : '#6B7280' }}>{fmtPct(m.yoyPct)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* New-student retention (cohorts) */}
        {(() => {
          const cohorts = [...(data?.cohorts ?? [])].reverse()
          const avg3 = averageRetention(data?.cohorts ?? [], 3)
          const tone = (p: number) => p >= 50 ? '#16A34A' : p >= 25 ? '#D97706' : '#E11D48'
          return (
            <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{r.usersCohortTitle}</p>
                <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, maxWidth: 640 }}>{r.usersCohortDesc}</p>
                {!loading && avg3 != null && (
                  <p style={{ fontSize: 12, fontWeight: 600, color: tone(avg3), marginTop: 6 }}>
                    {r.usersCohortAvg.replace('{p}', avg3.toLocaleString(locale))}
                  </p>
                )}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="w-full" style={{ minWidth: 520 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                      {[r.usersMonth, r.usersCohortStarted, ...COHORT_OFFSETS.map(k => r.usersCohortAfter.replace('{n}', String(k)))].map((h, i) => (
                        <th key={h} className={`px-5 py-3 ${i === 0 ? 'text-left' : 'text-right'}`}
                          style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={5} className="px-5 py-8 text-center" style={{ fontSize: 13, color: '#9CA3AF' }}>Loading…</td></tr>
                    ) : cohorts.map((c, idx) => (
                      <tr key={c.month} style={{ borderBottom: idx < cohorts.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                        <td className="px-5 py-2.5" style={{ fontSize: 13, fontWeight: 500, color: '#111827', textTransform: 'capitalize' }}>{fmtMonth(c.month, true)}</td>
                        <td className="px-5 py-2.5 text-right" style={{ fontSize: 13, color: '#374151', fontVariantNumeric: 'tabular-nums' }}>
                          {c.started ? (
                            <button onClick={() => openSegment('NEW', c.month)} className="cursor-pointer hover:underline"
                              style={{ fontSize: 13, fontWeight: 600, color: '#16A34A', background: 'none', border: 'none', padding: 0 }}>{c.started}</button>
                          ) : <span style={{ color: '#D1D5DB' }}>0</span>}
                        </td>
                        {COHORT_OFFSETS.map(k => {
                          const p = c.retained[k]
                          return (
                            <td key={k} className="px-5 py-2.5 text-right" style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                              {p == null ? (
                                <span style={{ fontSize: 11, color: '#D1D5DB' }}>{c.started ? r.usersCohortNotYet : '—'}</span>
                              ) : (
                                <>
                                  <span style={{ fontWeight: 600, color: tone(p) }}>{fmtPct(p, false)}</span>
                                  <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 6 }}>{c.retainedCount[k]}/{c.started}</span>
                                </>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })()}

        {/* Member list — status tabs + who-filters (new / lost / came back / at risk) */}
        <div ref={listRef} style={{ scrollMarginTop: 72 }}>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {([
              { key: 'ALL', label: r.usersTabAll }, { key: 'ACTIVE', label: r.usersTabActive },
              { key: 'INACTIVE', label: r.usersTabInactive },
            ] as const).map(tab => {
              const isOn = filterTab === tab.key
              return (
                <button key={tab.key} onClick={() => selectTab(tab.key)} className="cursor-pointer"
                  style={{ fontSize: 12, fontWeight: isOn ? 600 : 400, padding: '5px 14px', borderRadius: 8,
                    background: isOn ? '#111827' : '#fff', color: isOn ? '#fff' : '#6B7280',
                    border: isOn ? '1.5px solid #111827' : '1.5px solid #E5E7EB' }}>
                  {tab.label}
                  {!loading && data && tab.key === 'ALL' && filterTab === 'ALL' && <span style={{ opacity: 0.6, marginLeft: 4 }}>{data.total}</span>}
                </button>
              )
            })}
            <span style={{ width: 1, height: 20, background: '#E5E7EB', margin: '0 4px' }} />
            {([
              { key: 'NEW', label: r.usersSegNew, color: '#16A34A' },
              { key: 'LOST', label: r.usersSegLost, color: '#E11D48' },
              { key: 'RETURNING', label: r.usersSegReturning, color: '#0870E2' },
              { key: 'AT_RISK', label: r.usersSegAtRisk, color: '#D97706' },
            ] as const).map(tab => {
              const isOn = filterTab === tab.key
              const n = data?.segmentCounts?.[tab.key]
              return (
                <button key={tab.key} onClick={() => selectTab(tab.key)} className="cursor-pointer flex items-center gap-1.5"
                  style={{ fontSize: 12, fontWeight: isOn ? 600 : 500, padding: '5px 12px', borderRadius: 8,
                    background: isOn ? tab.color : '#fff', color: isOn ? '#fff' : tab.color,
                    border: `1.5px solid ${isOn ? tab.color : '#E5E7EB'}` }}>
                  {tab.label}
                  {n != null && <span style={{ fontSize: 11, opacity: isOn ? 0.85 : 0.7 }}>{n}</span>}
                </button>
              )
            })}
            {isSegment(filterTab) && filterTab !== 'AT_RISK' && (
              <select value={segMonth} onChange={e => setSegMonth(e.target.value)} disabled={!segMonth}
                aria-label={r.usersMonth}
                style={{ height: 30, padding: '0 8px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 12, color: '#111827', textTransform: 'capitalize' }}>
                {data && segmentMonthOptions(data.currentMonth, data.monthly.map(m => m.month), segMonth).map(m => (
                  <option key={m} value={m}>{fmtMonth(m, true)}</option>
                ))}
              </select>
            )}
            <div style={{ marginLeft: 'auto' }}>
              <FiltersPanel filters={filters} onChange={f => { setFilters(f); setPage(1) }} />
            </div>
          </div>

          {isSegment(filterTab) && data && !loading && (
            <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>
              {filterTab === 'NEW' && r.usersHintNew.replace('{m}', fmtMonth(data.segmentMonth, true))}
              {filterTab === 'RETURNING' && r.usersHintReturning.replace('{m}', fmtMonth(data.segmentMonth, true))}
              {(filterTab === 'NEW' || filterTab === 'RETURNING') && data.segmentMonth === data.currentMonth && ' ' + r.usersSoFar}
              {filterTab === 'LOST' && (data.segmentMonth === data.currentMonth
                // Lost "this month" = still recoverable this month — say so
                ? r.usersHintLostCurrent.replace('{last}', fmtMonth(addMonth(data.segmentMonth, -2), true))
                : r.usersHintLost
                  .replace('{last}', fmtMonth(addMonth(data.segmentMonth, -2), true))
                  .replace('{m}', fmtMonth(data.segmentMonth, true)))}
              {filterTab === 'AT_RISK' && r.usersHintAtRisk}
              {data.segmentRemoved > 0 && <span style={{ color: '#9CA3AF' }}> {r.usersRemovedNote.replace('{n}', String(data.segmentRemoved))}</span>}
            </p>
          )}

          {/* Bulk actions */}
          {selected.size > 0 && (
            <div className="flex items-center gap-2 flex-wrap mb-3 px-4 py-2.5 rounded-xl" style={{ background: '#111827', color: '#fff' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{r.usersSelected.replace('{n}', String(selected.size))}</span>
              {data && data.total > selected.size && (
                <button onClick={selectAllInGroup} className="cursor-pointer"
                  style={{ fontSize: 12, color: '#93C5FD', background: 'none', border: 'none', textDecoration: 'underline' }}>
                  {r.usersSelectAll.replace('{n}', String(data.total))}
                </button>
              )}
              <div className="flex-1" />
              <button onClick={openComposer} className="flex items-center gap-1.5 cursor-pointer"
                style={{ fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8, background: '#0870E2', color: '#fff', border: 'none' }}>
                <Send size={13} /> {r.usersSendCampaign}
              </button>
              <button onClick={() => exportMembers([...selected.values()])} className="flex items-center gap-1.5 cursor-pointer"
                style={{ fontSize: 12, fontWeight: 500, padding: '6px 12px', borderRadius: 8, background: 'transparent', color: '#fff', border: '1px solid #4B5563' }}>
                <Download size={13} /> {r.usersExportSelected}
              </button>
              <button onClick={clearSelection} className="flex items-center gap-1 cursor-pointer"
                style={{ fontSize: 12, padding: '6px 8px', borderRadius: 8, background: 'transparent', color: '#9CA3AF', border: 'none' }}>
                <X size={13} /> {r.usersClearSelection}
              </button>
            </div>
          )}

          <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
            <div style={{ overflowX: 'auto' }}>
            <table className="w-full" style={{ minWidth: 980 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <th className="pl-5 py-3" style={{ width: 28 }}>
                    {(() => {
                      const list = data?.members ?? []
                      const allOn = list.length > 0 && list.every(m => selected.has(m.id))
                      return <input type="checkbox" checked={allOn} disabled={!list.length} aria-label={r.usersSelectAll.replace('{n}', String(list.length))}
                        onChange={e => togglePage(list, e.target.checked)} style={{ cursor: 'pointer' }} />
                    })()}
                  </th>
                  {[r.usersColMember, r.usersColBelt, r.usersColPlan, r.usersColWithUs, r.usersColLastClass, r.usersColClasses, r.usersColLastPayment, r.usersColStatus, ''].map((h, i) => (
                    <th key={h || i} className="px-4 py-3 text-left"
                      style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="px-5 py-8 text-center" style={{ fontSize: 13, color: '#9CA3AF' }}>Loading…</td></tr>
                ) : (data?.members ?? []).length === 0 ? (
                  <tr><td colSpan={10} className="px-5 py-8 text-center" style={{ fontSize: 13, color: '#9CA3AF' }}>{isSegment(filterTab) ? r.usersNoStudents : 'No members found'}</td></tr>
                ) : (
                  (data?.members ?? []).map((m, idx) => {
                    const ss = STATUS_STYLES[m.status] ?? STATUS_STYLES['INACTIVE']!
                    const beltBg   = BELT_BG[m.belt]   ?? '#E5E7EB'
                    const beltText = BELT_TEXT[m.belt]  ?? '#374151'
                    const isWhite  = ['Blanco','White'].includes(m.belt)
                    const isSel = selected.has(m.id)
                    const iconBtn = { width: 24, height: 24, borderRadius: 6, border: '1px solid #E5E7EB', background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } as const
                    return (
                      <tr key={m.id} className="hover:bg-[#FAFAFA] transition-colors"
                        style={{ background: isSel ? '#F5F9FF' : undefined, borderBottom: idx < (data?.members.length ?? 0) - 1 ? '1px solid #F9FAFB' : 'none' }}>
                        <td className="pl-5 py-3">
                          <input type="checkbox" checked={isSel} onChange={() => toggleOne(m)} aria-label={m.name} style={{ cursor: 'pointer' }} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={m.name} avatarUrl={m.avatarUrl} size={32} />
                            <div style={{ minWidth: 0 }}>
                              <div className="flex items-center gap-2">
                                <a href={`/dashboard/users/${m.id}`} className="hover:underline" style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{m.name}</a>
                                {m.isNew && <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 999, background: '#EFF6FF', color: '#0870E2', border: '1px solid #BFDBFE' }}>NEW</span>}
                              </div>
                              <p style={{ fontSize: 11, color: '#9CA3AF' }}>{m.email}</p>
                              <div className="flex items-center gap-1.5" style={{ marginTop: 3 }}>
                                {m.phone ? (
                                  <>
                                    <span style={{ fontSize: 11, color: '#6B7280', marginRight: 2 }}>{m.phone}</span>
                                    <a href={`tel:${m.phone.replace(/[^\d+]/g, '')}`} title={r.usersCall} aria-label={r.usersCall} style={iconBtn}><Phone size={11} style={{ color: '#374151' }} /></a>
                                    {m.whatsapp && (
                                      <a href={`https://wa.me/${m.whatsapp}`} target="_blank" rel="noopener noreferrer" title={r.usersWhatsapp} aria-label={r.usersWhatsapp} style={iconBtn}>
                                        <MessageCircle size={11} style={{ color: '#16A34A' }} />
                                      </a>
                                    )}
                                  </>
                                ) : <span style={{ fontSize: 11, color: '#D1D5DB' }}>{r.usersNoPhone}</span>}
                                <a href={`mailto:${m.email}`} title="Email" aria-label="Email" style={iconBtn}><Mail size={11} style={{ color: '#374151' }} /></a>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap',
                            background: beltBg, color: beltText, border: isWhite ? '1px solid #D1D5DB' : 'none' }}>
                            {m.belt}
                          </span>
                        </td>
                        <td className="px-4 py-3"><span style={{ fontSize: 12, color: '#6B7280' }}>{m.plan}</span></td>
                        <td className="px-4 py-3" style={{ whiteSpace: 'nowrap' }}>
                          {m.firstMonth ? (
                            <>
                              <p style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{r.usersMonthsN.replace('{n}', String(m.monthsActive))}</p>
                              <p style={{ fontSize: 11, color: '#9CA3AF' }}>{r.usersSince.replace('{m}', fmtMonth(m.firstMonth))}</p>
                            </>
                          ) : <span style={{ fontSize: 12, color: '#9CA3AF' }}>{fmtDate(m.joinedAt)}</span>}
                        </td>
                        <td className="px-4 py-3" style={{ whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: 12, color: m.lastAttendedAt ? '#6B7280' : '#D1D5DB' }}>
                            {m.lastAttendedAt ? fmtDate(m.lastAttendedAt) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3"><span style={{ fontSize: 12, color: '#6B7280', fontVariantNumeric: 'tabular-nums' }}>{m.classes}</span></td>
                        <td className="px-4 py-3" style={{ whiteSpace: 'nowrap' }}>
                          {m.lastPayment ? (
                            <>
                              <p style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{fmtPrice(m.lastPayment.amount, m.lastPayment.currency)}</p>
                              <p style={{ fontSize: 11, color: '#9CA3AF' }}>{fmtDate(m.lastPayment.date)}</p>
                            </>
                          ) : <span style={{ fontSize: 12, color: '#D1D5DB' }}>—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: ss.bg, color: ss.color, border: '1px solid ' + ss.border }}>
                            {ss.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <RowMenu items={[
                            { label: r.usersViewProfile, onClick: () => { window.location.href = `/dashboard/users/${m.id}` } },
                            ...(m.whatsapp ? [{ label: r.usersWhatsapp, onClick: () => { window.open(`https://wa.me/${m.whatsapp}`, '_blank', 'noopener') } }] : []),
                            ...(m.phone ? [{ label: r.usersCopyPhone, onClick: () => copy(m.phone!) }] : []),
                            { label: r.usersCopyEmail, onClick: () => copy(m.email) },
                            ...(m.status !== 'ACTIVE'   ? [{ label: 'Activate',   onClick: () => setMemberStatus(m.id, 'ACTIVE')   }] : []),
                            ...(m.status === 'ACTIVE'   ? [{ label: 'Deactivate', onClick: () => setMemberStatus(m.id, 'INACTIVE'), variant: 'danger' as const }] : []),
                            ...(m.status !== 'FROZEN'   ? [{ label: 'Freeze',     onClick: () => setMemberStatus(m.id, 'FROZEN')   }] : []),
                            ...(m.status !== 'LEAD'     ? [{ label: 'Mark as lead', onClick: () => setMemberStatus(m.id, 'LEAD')   }] : []),
                          ]} />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
                <p style={{ fontSize: 13, color: '#6B7280' }}>
                  Showing <span style={{ fontWeight: 600, color: '#111827' }}>{(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, data?.total ?? 0)}</span> of <span style={{ fontWeight: 600, color: '#111827' }}>{data?.total ?? 0}</span>
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    style={{ border: '1px solid #E5E7EB', background: '#fff', color: page === 1 ? '#D1D5DB' : '#374151', cursor: page === 1 ? 'not-allowed' : 'pointer', borderRadius: 8, padding: '6px 10px' }}>
                    <ChevronLeft size={14} />
                  </button>
                  {pages.map((p, i) =>
                    p === '...' ? <span key={'e' + i} style={{ fontSize: 13, color: '#9CA3AF', padding: '0 4px' }}>…</span> : (
                      <button key={p} onClick={() => setPage(p as number)} className="w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer"
                        style={{ fontSize: 13, fontWeight: p === page ? 600 : 400, border: 'none', background: p === page ? '#F3F4F6' : 'transparent', color: p === page ? '#111827' : '#6B7280' }}>{p}</button>
                    )
                  )}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    style={{ border: '1px solid #E5E7EB', background: '#fff', color: page === totalPages ? '#D1D5DB' : '#374151', cursor: page === totalPages ? 'not-allowed' : 'pointer', borderRadius: 8, padding: '6px 10px' }}>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {composerAudience && (
        <CampaignComposerModal
          preselectedStudents={composerAudience}
          schoolName={data?.schoolName || 'Your school'}
          onClose={() => {
            setComposerAudience(null)
            if (campaignSent.current) { campaignSent.current = false; clearSelection() }
          }}
          onSaved={kind => {
            // Draft: the modal closes itself and nothing was sent — keep the
            // selection and say so. Sent: the modal shows its own summary.
            if (kind === 'draft') showToast(r.usersDraftSaved)
            else campaignSent.current = true
          }}
        />
      )}
    </main>
  )
}

function addMonth(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number) as [number, number]
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
