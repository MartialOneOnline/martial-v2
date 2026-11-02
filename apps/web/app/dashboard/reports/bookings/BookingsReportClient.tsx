'use client'

// Bookings report — how full each class of the timetable is (see lib/bookings/occupancy.ts).
// Times: scheduledAt keeps the class's local time in UTC fields, so every
// date/time here is formatted with timeZone 'UTC'.
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Menu, Download, Search, ArrowUp, ArrowDown, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useDashboard } from '../../../../components/DashboardShell'
import NotificationBell from '../../../../components/NotificationBell'
import { useLanguage } from '../../../../lib/i18n/LanguageContext'
import { downloadCsv } from '../../../../lib/csvExport'

type Period = '30d' | '90d' | '12m'
type ReviewTab = 'LOW' | 'FULL' | 'UNMARKED' | 'OFF'
type ListStatus = 'ALL' | 'COMPLETED' | 'CONFIRMED' | 'NO_SHOW' | 'CANCELLED'

interface Slot {
  key: string; classId: string; className: string; dayOfWeek: number; time: string; endTime: string
  capacity: number | null; sessions: number; avgAttended: number; avgBooked: number; fill: number | null
  prevAvgAttended: number | null; trend: 'UP' | 'DOWN' | null; low: boolean; full: boolean
  overlaps: { className: string; time: string; avgAttended: number }[]
}
interface OffSession { classId: string; className: string; date: string; time: string; booked: number; attended: number; reason: 'NO_SCHEDULE' | 'NOT_IN_SCHEDULE' }
interface Unmarked { classId: string; className: string; date: string; time: string; unmarked: number }
interface ReportData {
  period: Period; from: string; to: string; hasBookings: boolean
  slots: Slot[]; offSchedule: OffSession[]; unmarked: Unmarked[]
  totals: {
    sessions: number; attended: number; avgPerSession: number | null; prevAvgPerSession: number | null
    fill: number | null; students: number; prevStudents: number; selfBooked: number; staffBooked: number
  }
  trend: { key: string; booked: number; attended: number; cancelled: number }[]
}
interface ListRow {
  id: string; userId: string; userName: string; userEmail: string; classId: string; className: string
  scheduledAt: string; status: string; attended: boolean; bookedBy: 'STUDENT' | 'STAFF'
}

const PERIODS: Period[] = ['30d', '90d', '12m']
const LIST_STATUSES: ListStatus[] = ['ALL', 'COMPLETED', 'CONFIRMED', 'NO_SHOW', 'CANCELLED']
const LIST_PAGE = 25
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]
const LOW_COLOR = '#DC2626'
const FULL_COLOR = '#EA580C'

const CARD: React.CSSProperties = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16 }
const TH: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '10px 16px', textAlign: 'left', whiteSpace: 'nowrap' }
const TD: React.CSSProperties = { fontSize: 13, color: '#374151', padding: '10px 16px', borderTop: '1px solid #F3F4F6' }

function fillColor(fill: number | null): string {
  if (fill === null) return '#9CA3AF'
  if (fill >= 0.85) return FULL_COLOR
  if (fill >= 0.5) return '#16A34A'
  if (fill >= 0.25) return '#0870E2'
  return LOW_COLOR
}

export default function BookingsReportClient() {
  const { setMenuOpen } = useDashboard()
  const { t, locale } = useLanguage()
  const r = t.bookingsReport
  const [period, setPeriod] = useState<Period>('30d')
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [tab, setTab] = useState<ReviewTab | null>(null)
  const requestId = useRef(0)

  const load = useCallback(() => {
    const id = ++requestId.current
    setLoading(true); setError(false)
    fetch(`/api/dashboard/reports/bookings?period=${period}`)
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json() })
      .then((d: ReportData) => {
        if (id !== requestId.current) return
        setData(d)
        const count = (k: ReviewTab) => (k === 'LOW' ? d.slots.filter(s => s.low).length : k === 'FULL' ? d.slots.filter(s => s.full).length : k === 'UNMARKED' ? d.unmarked.length : d.offSchedule.length)
        setTab(prev => prev && count(prev) ? prev : (['LOW', 'FULL', 'UNMARKED', 'OFF'] as ReviewTab[]).find(k => count(k)) ?? 'LOW')
      })
      .catch(() => { if (id === requestId.current) setError(true) })
      .finally(() => { if (id === requestId.current) setLoading(false) })
  }, [period])
  useEffect(load, [load])

  const num = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 1 })
  const pct = (n: number) => `${Math.round(n * 100)}%`
  const dayName = (dow: number, style: 'short' | 'long' = 'short') =>
    new Date(Date.UTC(2026, 0, 4 + dow)).toLocaleDateString(locale, { weekday: style, timeZone: 'UTC' })
  const fmtDate = (ymd: string) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
  const trendLabel = (key: string) => key.length === 7
    ? new Date(`${key}-15T12:00:00Z`).toLocaleDateString(locale, { month: 'short', timeZone: 'UTC' })
    : new Date(`${key}T12:00:00Z`).toLocaleDateString(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' })
  const calendarHref = (u: { classId: string; date: string; time: string }) =>
    `/dashboard/classes/calendar?date=${u.date}&class=${encodeURIComponent(u.classId)}&time=${u.time}`

  const d = data && data.period === period ? data : null
  const tot = d?.totals
  const low = d?.slots.filter(s => s.low) ?? []
  const full = d?.slots.filter(s => s.full) ?? []
  const delta = (cur: number | null | undefined, prev: number | null | undefined) => {
    if (cur == null || prev == null || prev === 0) return null
    return Math.round(((cur - prev) / prev) * 100)
  }
  const cards = tot ? [
    { label: r.cardAvg, value: tot.avgPerSession === null ? '—' : num(tot.avgPerSession), hint: r.cardAvgHint, change: delta(tot.avgPerSession, tot.prevAvgPerSession) },
    { label: r.cardFill, value: tot.fill === null ? '—' : pct(tot.fill), hint: tot.fill === null ? r.noCapacity : r.cardFillHint, change: null },
    { label: r.cardStudents, value: String(tot.students), hint: r.cardStudentsHint, change: delta(tot.students, tot.prevStudents) },
    { label: r.cardSessions, value: String(tot.sessions), hint: r.cardSessionsHint, change: null },
  ] : []
  const bookedTotal = tot ? tot.selfBooked + tot.staffBooked : 0

  const reviewTabs: { key: ReviewTab; label: string; count: number; color: string }[] = d ? [
    { key: 'LOW', label: r.tabLow, count: low.length, color: LOW_COLOR },
    { key: 'FULL', label: r.tabFull, count: full.length, color: FULL_COLOR },
    { key: 'UNMARKED', label: r.tabUnmarked, count: d.unmarked.length, color: '#7C3AED' },
    { key: 'OFF', label: r.tabOff, count: d.offSchedule.length, color: '#6B7280' },
  ] : []

  return (
    <main style={{ flex: 1, minWidth: 0, width: '100%', overflow: 'auto' }}>
      <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20" style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
        <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0" aria-label="Menu"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(true)}>
          <Menu size={16} style={{ color: '#374151' }} />
        </button>
        <div className="flex-1" />
        <NotificationBell />
      </div>

      <div className="px-4 md:px-8 py-6 flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>{r.title}</h1>
            <p style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{r.subtitle}</p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: '#F3F4F6' }} role="group" aria-label={r.periodLabel}>
            {PERIODS.map(p => (
              <button key={p} onClick={() => setPeriod(p)} aria-pressed={period === p} className="cursor-pointer"
                style={{ fontSize: 12, fontWeight: period === p ? 600 : 400, padding: '5px 12px', borderRadius: 8, border: 'none',
                  background: period === p ? '#fff' : 'transparent', color: period === p ? '#111827' : '#4B5563',
                  boxShadow: period === p ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                {r.periods[p]}
              </button>
            ))}
          </div>
        </div>

        {error && !d ? (
          <div className="flex items-center justify-between gap-3 px-5 py-4" style={CARD}>
            <span role="alert" style={{ fontSize: 13, color: '#DC2626' }}>{r.loadError}</span>
            <button onClick={load} className="cursor-pointer" style={{ fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 999, border: '1px solid #E5E7EB', background: '#fff' }}>{r.retry}</button>
          </div>
        ) : !d ? (
          <p style={{ fontSize: 13, color: '#6B7280' }}>{r.loading}</p>
        ) : !d.hasBookings ? (
          <div className="px-5 py-6" style={CARD}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>{r.noBookingsTitle}</p>
            <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>{r.noBookingsHint}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6" style={{ opacity: loading ? 0.6 : 1, transition: 'opacity .15s' }}>
            {/* Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {cards.map(c => (
                <div key={c.label} style={{ ...CARD, padding: '16px 18px' }}>
                  <span style={{ display: 'block', fontSize: 12, color: '#4B5563', fontWeight: 500, marginBottom: 8 }}>{c.label}</span>
                  <span className="flex items-baseline gap-2">
                    <span style={{ fontSize: 26, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{c.value}</span>
                    {c.change !== null && c.change !== 0 && (
                      <span style={{ fontSize: 12, fontWeight: 600, color: c.change > 0 ? '#16A34A' : '#DC2626' }}>
                        {c.change > 0 ? '+' : ''}{c.change}%
                      </span>
                    )}
                  </span>
                  <span style={{ display: 'block', fontSize: 11, color: '#6B7280', marginTop: 6 }}>{c.change !== null ? `${c.hint} · ${r.vsPrev}` : c.hint}</span>
                </div>
              ))}
            </div>
            {bookedTotal > 0 && tot && (
              <p style={{ fontSize: 13, color: '#374151', margin: '-8px 0 0' }}>
                {r.channelLine
                  .replace('{self}', String(Math.round((tot.selfBooked / bookedTotal) * 100)))
                  .replace('{staff}', String(Math.round((tot.staffBooked / bookedTotal) * 100)))}
              </p>
            )}

            {/* Weekly timetable */}
            <section style={{ ...CARD, padding: 18 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>{r.timetable}</h2>
              <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 14px' }}>{r.timetableHint}</p>
              {d.slots.length === 0 ? (
                <p style={{ fontSize: 13, color: '#6B7280' }}>{r.noSessions}</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                  {WEEK_ORDER.filter(dow => d.slots.some(s => s.dayOfWeek === dow)).map(dow => (
                    <div key={dow} className="flex flex-col gap-2">
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{dayName(dow, 'long')}</span>
                      {d.slots.filter(s => s.dayOfWeek === dow).map(s => (
                        <div key={s.key} style={{ border: `1px solid ${s.low ? '#FECACA' : s.full ? '#FED7AA' : '#E5E7EB'}`, background: s.low ? '#FEF2F2' : s.full ? '#FFF7ED' : '#fff', borderRadius: 12, padding: '10px 12px' }}>
                          <span style={{ display: 'block', fontSize: 11, color: '#6B7280' }}>{s.time}–{s.endTime}</span>
                          <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#111827', lineHeight: 1.25, marginTop: 2 }}>{s.className}</span>
                          <span className="flex items-center gap-1" style={{ marginTop: 6, fontSize: 12, color: '#374151' }}>
                            <strong>{num(s.avgAttended)}</strong>
                            <span style={{ color: '#6B7280' }}>{s.capacity ? r.ofCapacity.replace('{cap}', String(s.capacity)) : r.perSession}</span>
                            {s.trend && (
                              <span title={s.trend === 'UP' ? r.trendUp : r.trendDown} aria-label={s.trend === 'UP' ? r.trendUp : r.trendDown} style={{ color: s.trend === 'UP' ? '#16A34A' : '#DC2626', display: 'inline-flex' }}>
                                {s.trend === 'UP' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                              </span>
                            )}
                          </span>
                          {s.fill !== null && (
                            <span style={{ display: 'block', height: 4, borderRadius: 999, background: '#F3F4F6', marginTop: 6, overflow: 'hidden' }}>
                              <span style={{ display: 'block', height: '100%', width: `${Math.min(100, Math.round(s.fill * 100))}%`, background: fillColor(s.fill) }} />
                            </span>
                          )}
                          {(s.low || s.full) && (
                            <span style={{ display: 'inline-block', marginTop: 6, fontSize: 10, fontWeight: 700, color: s.low ? LOW_COLOR : FULL_COLOR, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              {s.low ? r.badgeLow : r.badgeFull}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* To review */}
            <section style={{ ...CARD, overflow: 'hidden' }}>
              <div className="flex flex-wrap gap-2 px-4 pt-4 pb-3" role="tablist">
                {reviewTabs.map(rt => (
                  <button key={rt.key} role="tab" aria-selected={tab === rt.key} onClick={() => setTab(rt.key)} className="cursor-pointer flex items-center gap-2"
                    style={{ fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 999,
                      border: tab === rt.key ? `1.5px solid ${rt.color}` : '1px solid #E5E7EB', background: tab === rt.key ? '#fff' : '#F9FAFB', color: '#111827' }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: rt.color }} aria-hidden />
                    {rt.label}
                    <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 500 }}>{rt.count}</span>
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 12, color: '#6B7280', padding: '0 16px 10px', margin: 0 }}>
                {tab === 'LOW' ? r.lowHint : tab === 'FULL' ? r.fullHint : tab === 'UNMARKED' ? r.unmarkedHint : r.offHint}
              </p>
              <div style={{ overflowX: 'auto' }}>
                {tab === 'LOW' && (low.length === 0 ? <Empty text={r.emptyLow} /> : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
                    <thead><tr style={{ background: '#F9FAFB' }}><th style={TH}>{r.colClass}</th><th style={TH}>{r.colWhen}</th><th style={TH}>{r.colAvg}</th><th style={TH}>{r.colPrev}</th><th style={TH}>{r.colSessions}</th><th style={TH}>{r.colOverlap}</th></tr></thead>
                    <tbody>{low.map(s => (
                      <tr key={s.key}>
                        <td style={{ ...TD, fontWeight: 600, color: '#111827' }}>{s.className}</td>
                        <td style={TD}>{dayName(s.dayOfWeek)} {s.time}</td>
                        <td style={{ ...TD, color: LOW_COLOR, fontWeight: 600 }}>{num(s.avgAttended)}</td>
                        <td style={TD}>{s.prevAvgAttended === null ? '—' : num(s.prevAvgAttended)}</td>
                        <td style={TD}>{s.sessions}</td>
                        <td style={TD}>{s.overlaps.length ? s.overlaps.map(o => `${o.className} (${num(o.avgAttended)})`).join(', ') : '—'}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                ))}
                {tab === 'FULL' && (full.length === 0 ? <Empty text={r.emptyFull} /> : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                    <thead><tr style={{ background: '#F9FAFB' }}><th style={TH}>{r.colClass}</th><th style={TH}>{r.colWhen}</th><th style={TH}>{r.colAvg}</th><th style={TH}>{r.colBookedAvg}</th><th style={TH}>{r.colCapacity}</th><th style={TH}>{r.colSessions}</th></tr></thead>
                    <tbody>{full.map(s => (
                      <tr key={s.key}>
                        <td style={{ ...TD, fontWeight: 600, color: '#111827' }}>{s.className}</td>
                        <td style={TD}>{dayName(s.dayOfWeek)} {s.time}</td>
                        <td style={{ ...TD, color: FULL_COLOR, fontWeight: 600 }}>{num(s.avgAttended)}</td>
                        <td style={TD}>{num(s.avgBooked)}</td>
                        <td style={TD}>{s.capacity}</td>
                        <td style={TD}>{s.sessions}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                ))}
                {tab === 'UNMARKED' && (d.unmarked.length === 0 ? <Empty text={r.emptyUnmarked} /> : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
                    <thead><tr style={{ background: '#F9FAFB' }}><th style={TH}>{r.colDate}</th><th style={TH}>{r.colClass}</th><th style={TH}>{r.colUnmarked}</th><th style={TH} /></tr></thead>
                    <tbody>{d.unmarked.map(u => (
                      <tr key={`${u.classId}|${u.date}|${u.time}`}>
                        <td style={TD}>{fmtDate(u.date)} · {u.time}</td>
                        <td style={{ ...TD, fontWeight: 600, color: '#111827' }}>{u.className}</td>
                        <td style={TD}>{u.unmarked}</td>
                        <td style={{ ...TD, textAlign: 'right' }}>
                          <Link href={calendarHref(u)} className="inline-flex items-center gap-1" style={{ fontSize: 12, fontWeight: 600, color: '#0870E2' }}>
                            {r.markAttendance} <ExternalLink size={12} />
                          </Link>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                ))}
                {tab === 'OFF' && (d.offSchedule.length === 0 ? <Empty text={r.emptyOff} /> : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                    <thead><tr style={{ background: '#F9FAFB' }}><th style={TH}>{r.colDate}</th><th style={TH}>{r.colClass}</th><th style={TH}>{r.colBooked}</th><th style={TH}>{r.colAttended}</th><th style={TH}>{r.colReason}</th></tr></thead>
                    <tbody>{d.offSchedule.map(o => (
                      <tr key={`${o.classId}|${o.date}|${o.time}`}>
                        <td style={TD}>{fmtDate(o.date)} · {o.time}</td>
                        <td style={{ ...TD, fontWeight: 600, color: '#111827' }}>{o.className}</td>
                        <td style={TD}>{o.booked}</td>
                        <td style={TD}>{o.attended}</td>
                        <td style={{ ...TD, color: '#6B7280' }}>{o.reason === 'NO_SCHEDULE' ? r.reasonNoSchedule : r.reasonNotInSchedule}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                ))}
              </div>
            </section>

            {/* Trend */}
            <section style={{ ...CARD, padding: 18 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>{d.period === '12m' ? r.trendMonthly : r.trendWeekly}</h2>
              <div style={{ width: '100%', height: 240 }}>
                <ResponsiveContainer>
                  <AreaChart data={d.trend.map(p => ({ ...p, label: trendLabel(p.key) }))} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #E5E7EB' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="booked" name={r.booked} stroke="#0870E2" fill="#0870E2" fillOpacity={0.08} strokeWidth={2} />
                    <Area type="monotone" dataKey="attended" name={r.attended} stroke="#16A34A" fill="#16A34A" fillOpacity={0.12} strokeWidth={2} />
                    <Area type="monotone" dataKey="cancelled" name={r.cancelled} stroke="#DC2626" fill="#DC2626" fillOpacity={0.06} strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            <AllBookings period={period} />
          </div>
        )}
      </div>
    </main>
  )
}

function Empty({ text }: { text: string }) {
  return <p style={{ fontSize: 13, color: '#6B7280', padding: '14px 16px', margin: 0, borderTop: '1px solid #F3F4F6' }}>{text}</p>
}

/** Every booking of the period, folded away by default (no other page lists them) */
function AllBookings({ period }: { period: Period }) {
  const { t, locale } = useLanguage()
  const r = t.bookingsReport
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<ListStatus>('ALL')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<ListRow[] | null>(null)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState(false)
  const [exporting, setExporting] = useState(false)
  // A failed export is reported apart: the rows on screen are still current
  const [exportError, setExportError] = useState(false)
  const requestId = useRef(0)

  // Debounce the search box
  useEffect(() => { const h = setTimeout(() => setQuery(search.trim()), 300); return () => clearTimeout(h) }, [search])
  useEffect(() => { setPage(1) }, [period, status, query])

  const params = useCallback((p: number, size: number) =>
    new URLSearchParams({ period, status, search: query, page: String(p), pageSize: String(size) }).toString(), [period, status, query])

  useEffect(() => {
    if (!open) return
    const id = ++requestId.current
    // Drop the rows of the previous filter/page: on an error they would sit
    // under the new filter and be exported as if they belonged to it
    setError(false); setExportError(false); setRows(null); setTotal(0)
    fetch(`/api/dashboard/reports/bookings/list?${params(page, LIST_PAGE)}`)
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json() })
      .then((d: { bookings: ListRow[]; total: number }) => { if (id === requestId.current) { setRows(d.bookings); setTotal(d.total) } })
      .catch(() => { if (id === requestId.current) setError(true) })
  }, [open, page, params])

  const fmt = (iso: string) => new Date(iso).toLocaleString(locale, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
  const statusLabel = (s: string) => r.status[s as keyof typeof r.status] ?? s

  async function exportCsv() {
    setExporting(true); setExportError(false)
    try {
      const res = await fetch(`/api/dashboard/reports/bookings/list?${params(1, 5000)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const d: { bookings: ListRow[] } = await res.json()
      downloadCsv('bookings', [r.colMember, 'Email', r.colClass, r.colDate, r.colStatus, r.colAttended, r.colBookedBy],
        d.bookings.map(b => [b.userName, b.userEmail, b.className, fmt(b.scheduledAt), statusLabel(b.status), b.attended ? '✓' : '', b.bookedBy === 'STAFF' ? r.byStaff : r.bySelf]), { locale })
    } catch { setExportError(true) } finally { setExporting(false) }
  }

  const pages = Math.max(1, Math.ceil(total / LIST_PAGE))
  return (
    <section style={{ ...CARD, overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} className="w-full flex items-center justify-between cursor-pointer"
        style={{ padding: '14px 18px', background: 'none', border: 'none', textAlign: 'left' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{r.allBookings}</span>
        {open ? <ChevronUp size={16} style={{ color: '#6B7280' }} /> : <ChevronDown size={16} style={{ color: '#6B7280' }} />}
      </button>
      {open && (
        <div>
          <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
            {LIST_STATUSES.map(s => (
              <button key={s} onClick={() => setStatus(s)} aria-pressed={status === s} className="cursor-pointer"
                style={{ fontSize: 12, fontWeight: status === s ? 600 : 500, padding: '5px 11px', borderRadius: 999, border: status === s ? '1.5px solid #0870E2' : '1px solid #E5E7EB', background: status === s ? '#EFF6FF' : '#fff', color: status === s ? '#0870E2' : '#374151' }}>
                {s === 'ALL' ? r.statusAll : statusLabel(s)}
              </button>
            ))}
            <div className="flex items-center gap-2 px-3 rounded-xl flex-1" style={{ minWidth: 180, height: 32, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <Search size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
              <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder={r.searchPlaceholder} aria-label={r.searchPlaceholder}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', width: '100%' }} />
            </div>
            <button onClick={exportCsv} disabled={exporting || error || rows === null || total === 0} className="flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-default"
              style={{ fontSize: 12, fontWeight: 600, height: 32, padding: '0 12px', borderRadius: 999, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>
              <Download size={13} /> {r.exportCsv}
            </button>
          </div>
          {(error || exportError) && <p role="alert" style={{ fontSize: 12, color: '#DC2626', padding: '0 16px 8px', margin: 0 }}>{r.loadError}</p>}
          <div style={{ overflowX: 'auto' }}>
            {rows === null ? (error ? null : <Empty text={r.loading} />) : rows.length === 0 ? <Empty text={r.noResults} /> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                <thead><tr style={{ background: '#F9FAFB' }}><th style={TH}>{r.colMember}</th><th style={TH}>{r.colClass}</th><th style={TH}>{r.colDate}</th><th style={TH}>{r.colStatus}</th><th style={TH}>{r.colBookedBy}</th></tr></thead>
                <tbody>{rows.map(b => (
                  <tr key={b.id}>
                    <td style={TD}><span style={{ display: 'block', fontWeight: 600, color: '#111827' }}>{b.userName}</span><span style={{ fontSize: 11, color: '#6B7280' }}>{b.userEmail}</span></td>
                    <td style={TD}>{b.className}</td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>{fmt(b.scheduledAt)}</td>
                    <td style={TD}>{statusLabel(b.status)}</td>
                    <td style={{ ...TD, color: '#6B7280' }}>{b.bookedBy === 'STAFF' ? r.byStaff : r.bySelf}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
          {total > LIST_PAGE && (
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="cursor-pointer disabled:opacity-40 disabled:cursor-default" style={{ fontSize: 12, fontWeight: 600, background: 'none', border: 'none', color: '#374151' }}>{r.prev}</button>
              <span style={{ fontSize: 12, color: '#6B7280' }}>{r.pageOf.replace('{page}', String(page)).replace('{pages}', String(pages))} · {total}</span>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages} className="cursor-pointer disabled:opacity-40 disabled:cursor-default" style={{ fontSize: 12, fontWeight: 600, background: 'none', border: 'none', color: '#374151' }}>{r.next}</button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
