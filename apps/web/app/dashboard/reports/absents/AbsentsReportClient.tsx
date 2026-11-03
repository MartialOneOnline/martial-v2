'use client'

// Absences report — who stopped coming (see lib/absences/stopped.ts).
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Menu, Download, Phone, MessageCircle, Mail, ExternalLink } from 'lucide-react'
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useDashboard } from '../../../../components/DashboardShell'
import NotificationBell from '../../../../components/NotificationBell'
import { useLanguage } from '../../../../lib/i18n/LanguageContext'
import { downloadCsv } from '../../../../lib/csvExport'
import { tabFromUrl } from '../../../../lib/urlTab'

type Period = '30d' | '90d' | '12m'
type ListKey = 'WARNING' | 'AT_RISK' | 'LOST' | 'NEVER'
type TabKey = ListKey | 'NO_SHOW'

interface Contact { memberId: string | null; name: string; email: string | null; phone: string | null; whatsapp: string | null; avatarUrl: string | null }
interface Row extends Contact {
  joinedAt: string | null; lastClassAt: string | null; daysSince: number | null; usualPerWeek: number | null
  plan: { name: string; paying: boolean; trial: boolean } | null
}
interface NoShowRow extends Contact { noShows: number; unmarked: number; lastAt: string; topClass: string }
interface ReportData {
  summary: { active: number; warning: number; atRisk: number; lost: number; never: number; payingAway: number }
  lists: Record<ListKey, Row[]>
  noShows: NoShowRow[]
  period: {
    key: Period; cancelled: number; noShows: number; unmarked: number
    trend: { key: string; kind: 'days' | 'month'; cancelled: number; missed: number }[]
    dow: { day: string; cancelled: number; missed: number }[]
  }
}

const TABS: TabKey[] = ['WARNING', 'AT_RISK', 'LOST', 'NEVER', 'NO_SHOW']
const PAGE = 25
const COLOR: Record<TabKey, string> = { WARNING: '#CA8A04', AT_RISK: '#EA580C', LOST: '#DC2626', NEVER: '#6B7280', NO_SHOW: '#7C3AED' }

const CARD: React.CSSProperties = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16 }
const TH: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '10px 16px', textAlign: 'left' }
const TD: React.CSSProperties = { fontSize: 13, color: '#374151', padding: '10px 16px', borderTop: '1px solid #F3F4F6' }
const iconBtn: React.CSSProperties = { width: 30, height: 30, borderRadius: 9, border: '1px solid #E5E7EB', background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }

export default function AbsentsReportClient() {
  const { setMenuOpen } = useDashboard()
  const { t, locale } = useLanguage()
  const r = t.absencesReport
  const [period, setPeriod] = useState<Period>('30d')
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [tab, setTab] = useState<TabKey | null>(null)
  const [shown, setShown] = useState(PAGE)
  // Ignore a slower response for a period the user has already left
  const requestId = useRef(0)

  const load = useCallback(() => {
    const id = ++requestId.current
    setLoading(true); setError(false)
    fetch(`/api/dashboard/reports/absents?period=${period}`)
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json() })
      .then((d: ReportData) => {
        if (id !== requestId.current) return
        setData(d)
        const count = (k: TabKey) => (k === 'NO_SHOW' ? d.noShows.length : d.lists[k].length)
        // Land on the most urgent list that has someone in it
        setTab(prev => prev && count(prev) ? prev : (['AT_RISK', 'LOST', 'WARNING', 'NEVER', 'NO_SHOW'] as TabKey[]).find(k => count(k)) ?? 'AT_RISK')
      })
      .catch(() => { if (id === requestId.current) setError(true) })
      .finally(() => { if (id === requestId.current) setLoading(false) })
  }, [period])
  // ?tab= from a link (e.g. the Today page) picks the list; kept if it has rows
  useEffect(() => { const t = tabFromUrl(TABS); if (t) setTab(t) }, [])
  useEffect(load, [load])

  const fmt = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
  const days = (n: number | null) => (n === null ? '—' : n === 1 ? r.oneDay : r.nDays.replace('{n}', String(n)))
  const perWeek = (n: number | null) => (n === null ? '—' : n === 0 ? r.lessThanWeekly : r.perWeek.replace('{n}', n.toLocaleString(locale)))
  const planLabel = (p: Row['plan']) => (!p ? r.noPlan : p.trial ? r.trial : p.paying ? p.name : r.free)

  const tabLabel: Record<TabKey, string> = { WARNING: r.tabWarning, AT_RISK: r.tabAtRisk, LOST: r.tabLost, NEVER: r.tabNever, NO_SHOW: r.tabNoShow }
  const tabHint: Record<TabKey, string> = { WARNING: r.tabWarningHint, AT_RISK: r.tabAtRiskHint, LOST: r.tabLostHint, NEVER: r.tabNeverHint, NO_SHOW: r.tabNoShowHint }
  const count = (k: TabKey) => (!data ? 0 : k === 'NO_SHOW' ? (data.period.key === period ? data.noShows.length : 0) : data.lists[k].length)

  const periodLabel = (p: Period) => ({ '30d': r.period30, '90d': r.period90, '12m': r.period12 })[p]
  // The no-show rows and booking figures belong to the period of the data on
  // screen; while another one loads (or failed), they are not shown as if
  // they were the new one (Project Audit PR #48 P2).
  const shownPeriod = data?.period.key ?? period
  const periodStale = !!data && shownPeriod !== period
  const listRows = data && tab && tab !== 'NO_SHOW' ? data.lists[tab] : []
  const noShowRows = data && tab === 'NO_SHOW' && !periodStale ? data.noShows : []
  const trendLabel = (pt: { key: string; kind: 'days' | 'month' }) => pt.kind === 'month'
    ? new Date(`${pt.key}-15T12:00:00Z`).toLocaleDateString(locale, { month: 'short', timeZone: 'UTC' })
    : new Date(`${pt.key}T12:00:00Z`).toLocaleDateString(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' })
  const total = tab === 'NO_SHOW' ? noShowRows.length : listRows.length
  // Never export a list that belongs to a period still loading or that failed
  const canExport = total > 0 && !loading && !error

  function exportList() {
    if (!tab || !canExport) return
    if (tab === 'NO_SHOW') {
      downloadCsv(`${r.exportFile}-${tabLabel[tab]}`, [r.colStudent, r.email, r.colPhone, r.colNoShows, r.colUnmarked, r.colLast, r.colClass],
        noShowRows.map(x => [x.name, x.email, x.phone, x.noShows, x.unmarked, fmt(x.lastAt), x.topClass]), { locale })
    } else {
      downloadCsv(`${r.exportFile}-${tabLabel[tab]}`, [r.colStudent, r.email, r.colPhone, r.colPlan, r.colLastClass, r.colDaysAway, r.colUsual],
        listRows.map(x => [x.name, x.email, x.phone, planLabel(x.plan), x.lastClassAt ? fmt(x.lastClassAt) : '', x.daysSince ?? '', x.usualPerWeek ?? '']), { locale })
    }
  }

  const contact = (x: Contact) => (
    <div className="flex items-center gap-1.5">
      {x.phone && (
        <a href={`tel:${x.phone.replace(/[^\d+]/g, '')}`} title={r.call} aria-label={`${r.call} · ${x.name}`} style={iconBtn}>
          <Phone size={13} style={{ color: '#374151' }} />
        </a>
      )}
      {x.whatsapp && (
        <a href={`https://wa.me/${x.whatsapp}`} target="_blank" rel="noopener noreferrer" title={r.whatsapp} aria-label={`${r.whatsapp} · ${x.name}`} style={iconBtn}>
          <MessageCircle size={13} style={{ color: '#16A34A' }} />
        </a>
      )}
      {x.email && (
        <a href={`mailto:${x.email}`} title={r.email} aria-label={`${r.email} · ${x.name}`} style={iconBtn}>
          <Mail size={13} style={{ color: '#0870E2' }} />
        </a>
      )}
      {!x.phone && !x.email && <span style={{ fontSize: 11, color: '#9CA3AF' }}>{r.noContact}</span>}
    </div>
  )
  const nameCell = (x: Contact, sub?: string) => (
    <td style={TD}>
      {x.memberId ? (
        <Link href={`/dashboard/users/${x.memberId}`} prefetch={false} title={r.openProfile} className="inline-flex items-center gap-1.5" style={{ fontWeight: 600, color: '#111827' }}>
          {x.name} <ExternalLink size={11} style={{ color: '#9CA3AF' }} aria-hidden />
        </Link>
      ) : <span style={{ fontWeight: 600, color: '#111827' }}>{x.name}</span>}
      {sub && <p style={{ fontSize: 11, color: '#6B7280', margin: '2px 0 0' }}>{sub}</p>}
    </td>
  )

  const s = data?.summary
  const cards: { key: ListKey; label: string; value: number | undefined; hint: string }[] = [
    { key: 'WARNING', label: r.tabWarning, value: s?.warning, hint: r.cardWarning },
    { key: 'AT_RISK', label: r.tabAtRisk, value: s?.atRisk, hint: r.cardAtRisk },
    { key: 'LOST', label: r.tabLost, value: s?.lost, hint: r.cardLost },
    { key: 'NEVER', label: r.tabNever, value: s?.never, hint: r.cardNever },
  ]
  const series = { cancelled: r.cancelled, missed: r.missed }

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
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>{r.title}</h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{r.subtitle}</p>
        </div>

        {error && !data ? (
          <div className="flex items-center justify-between gap-3 px-5 py-4" style={CARD}>
            <span role="alert" style={{ fontSize: 13, color: '#DC2626' }}>{r.loadError}</span>
            <button onClick={load} className="cursor-pointer" style={{ fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 999, border: '1px solid #E5E7EB', background: '#fff' }}>{r.retry}</button>
          </div>
        ) : !data ? (
          <p style={{ fontSize: 13, color: '#6B7280' }}>{r.loading}</p>
        ) : (
          <div className="flex flex-col gap-6">
            {error && (
              <div className="flex items-center justify-between gap-3 px-4 py-2 rounded-xl" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
                <span role="alert" style={{ fontSize: 12, color: '#92400E' }}>{r.loadError}</span>
                <button onClick={load} className="cursor-pointer" style={{ fontSize: 12, fontWeight: 600, color: '#92400E', background: 'none', border: 'none' }}>{r.retry}</button>
              </div>
            )}

            {/* Summary — each card opens its list */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {cards.map(c => (
                <button key={c.key} onClick={() => { setTab(c.key); setShown(PAGE) }} className="text-left cursor-pointer"
                  style={{ ...CARD, padding: '16px 18px', outline: tab === c.key ? `2px solid ${COLOR[c.key]}` : 'none', outlineOffset: -1 }}>
                  <span className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: COLOR[c.key] }} aria-hidden />
                    <span style={{ fontSize: 12, color: '#4B5563', fontWeight: 500 }}>{c.label}</span>
                  </span>
                  <span style={{ display: 'block', fontSize: 26, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{c.value ?? '—'}</span>
                  <span style={{ display: 'block', fontSize: 11, color: '#6B7280', marginTop: 6 }}>{c.hint}</span>
                </button>
              ))}
            </div>
            {s && (
              <p style={{ fontSize: 13, color: '#374151', margin: '-8px 0 0' }}>
                {r.summaryLine.replace('{away}', String(s.atRisk + s.lost)).replace('{active}', String(s.active))}
                {s.payingAway > 0 && <strong style={{ color: '#B91C1C' }}> {r.summaryPaying.replace('{n}', String(s.payingAway))}</strong>}
              </p>
            )}

            {/* Lists */}
            <div style={CARD}>
              <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>{r.listsTitle}</p>
                  <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>{r.listsHint}</p>
                </div>
                {total > 0 && (
                  <button onClick={exportList} disabled={!canExport} className="cursor-pointer inline-flex items-center gap-1.5 disabled:cursor-not-allowed"
                    style={{ fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 999, background: '#fff', color: '#374151', border: '1.5px solid #E5E7EB', opacity: canExport ? 1 : 0.5 }}>
                    <Download size={13} aria-hidden /> {r.export}
                  </button>
                )}
              </div>
              <div className="px-5 flex gap-2 flex-wrap" role="tablist" aria-label={r.listsTitle}>
                {TABS.map(k => {
                  const on = tab === k
                  return (
                    <button key={k} role="tab" aria-selected={on} onClick={() => { setTab(k); setShown(PAGE) }} className="cursor-pointer inline-flex items-center gap-2"
                      style={{ fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 999, minHeight: 32,
                        background: on ? '#111827' : '#fff', color: on ? '#fff' : '#374151', border: `1.5px solid ${on ? '#111827' : '#E5E7EB'}` }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: COLOR[k] }} aria-hidden />
                      {tabLabel[k]}
                      <span style={{ fontSize: 11, padding: '0 6px', borderRadius: 999, background: on ? 'rgba(255,255,255,0.2)' : '#F3F4F6' }}>{count(k)}</span>
                    </button>
                  )
                })}
              </div>
              {tab && <p style={{ fontSize: 12, color: '#4B5563', margin: '10px 20px 0' }}>{tab === 'NO_SHOW' ? tabHint[tab].replace('{period}', periodLabel(shownPeriod)) : tabHint[tab]}</p>}

              <div className="overflow-x-auto" style={{ marginTop: 10 }}>
                {tab === 'NO_SHOW' ? (
                  <table className="w-full" style={{ minWidth: 720, borderCollapse: 'collapse' }}>
                    <thead><tr>{[r.colStudent, r.colNoShows, r.colUnmarked, r.colLast, r.colClass, r.colContact].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                    <tbody>
                      {periodStale ? (
                        <tr><td colSpan={6} style={{ ...TD, textAlign: 'center', color: '#6B7280', padding: '32px 16px' }}>{error ? r.loadError : r.loading}</td></tr>
                      ) : noShowRows.length === 0 ? (
                        <tr><td colSpan={6} style={{ ...TD, textAlign: 'center', color: '#6B7280', padding: '32px 16px' }}>{r.emptyNoShows}</td></tr>
                      ) : noShowRows.slice(0, shown).map((x, i) => (
                        <tr key={`${x.memberId ?? x.email ?? x.name}-${i}`}>
                          {nameCell(x)}
                          <td style={{ ...TD, fontWeight: 600 }}>{x.noShows || '—'}</td>
                          <td style={TD}>{x.unmarked || '—'}</td>
                          <td style={{ ...TD, whiteSpace: 'nowrap' }}>{fmt(x.lastAt)}</td>
                          <td style={TD}>{x.topClass}</td>
                          <td style={TD}>{contact(x)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full" style={{ minWidth: 720, borderCollapse: 'collapse' }}>
                    <thead><tr>{[r.colStudent, r.colPlan, tab === 'NEVER' ? r.colJoined : r.colLastClass, tab === 'NEVER' ? r.colSinceJoined : r.colUsual, r.colContact].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                    <tbody>
                      {listRows.length === 0 ? (
                        <tr><td colSpan={5} style={{ ...TD, textAlign: 'center', color: '#6B7280', padding: '32px 16px' }}>{r.emptyList}</td></tr>
                      ) : listRows.slice(0, shown).map(x => (
                        <tr key={x.memberId ?? x.name}>
                          {nameCell(x)}
                          <td style={TD}>
                            <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 9px', borderRadius: 999, whiteSpace: 'nowrap',
                              background: x.plan?.paying ? '#ECFDF5' : x.plan?.trial ? '#EFF6FF' : '#F3F4F6',
                              color: x.plan?.paying ? '#047857' : x.plan?.trial ? '#1D4ED8' : '#4B5563' }}>
                              {planLabel(x.plan)}
                            </span>
                          </td>
                          {tab === 'NEVER' ? (
                            <>
                              <td style={{ ...TD, whiteSpace: 'nowrap' }}>{x.joinedAt ? fmt(x.joinedAt) : '—'}</td>
                              <td style={{ ...TD, whiteSpace: 'nowrap' }}>{days(x.daysSince)}</td>
                            </>
                          ) : (
                            <>
                              <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                                <span style={{ fontWeight: 600, color: COLOR[tab ?? 'AT_RISK'] }}>{days(x.daysSince)}</span>
                                {x.lastClassAt && <span style={{ color: '#6B7280' }}> · {fmt(x.lastClassAt)}</span>}
                              </td>
                              <td style={{ ...TD, whiteSpace: 'nowrap' }}>{perWeek(x.usualPerWeek)}</td>
                            </>
                          )}
                          <td style={TD}>{contact(x)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {total > shown && (
                <div className="px-5 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
                  <button onClick={() => setShown(n => n + PAGE)} className="cursor-pointer"
                    style={{ fontSize: 12, fontWeight: 600, color: '#0870E2', background: 'none', border: 'none', padding: 0 }}>
                    {r.showMore.replace('{n}', String(Math.min(PAGE, total - shown)))}
                  </button>
                </div>
              )}
            </div>

            {/* Bookings in the period: no-shows and cancellations */}
            <div className="flex flex-col gap-3">
              <div className="flex items-end justify-between gap-3 flex-wrap">
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>{r.bookingsTitle}</p>
                  <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>
                    {r.bookingsHint}{periodStale && <strong style={{ color: '#92400E' }}> · {r.showing.replace('{period}', periodLabel(shownPeriod))}</strong>}
                  </p>
                </div>
                <div className="flex items-center gap-1 p-1 rounded-xl" role="group" aria-label={r.bookingsTitle} style={{ background: '#F3F4F6' }}>
                  {(['30d', '90d', '12m'] as const).map(p => (
                    <button key={p} onClick={() => setPeriod(p)} aria-pressed={period === p} className="cursor-pointer"
                      style={{ fontSize: 12, fontWeight: period === p ? 600 : 400, padding: '5px 12px', borderRadius: 8, border: 'none',
                        background: period === p ? '#fff' : 'transparent', color: period === p ? '#111827' : '#4B5563',
                        boxShadow: period === p ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                      {periodLabel(p)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3" style={{ opacity: loading || periodStale ? 0.5 : 1 }}>
                {[
                  { label: r.statNoShows, value: data.period.noShows, color: '#7C3AED' },
                  { label: r.statUnmarked, value: data.period.unmarked, color: '#6B7280' },
                  { label: r.statCancelled, value: data.period.cancelled, color: '#D97706' },
                ].map(x => (
                  <div key={x.label} style={{ ...CARD, padding: '14px 16px' }}>
                    <span className="flex items-center gap-2" style={{ fontSize: 12, color: '#4B5563', fontWeight: 500 }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: x.color }} aria-hidden />{x.label}
                    </span>
                    <span style={{ display: 'block', fontSize: 22, fontWeight: 700, color: '#111827', marginTop: 6 }}>{x.value}</span>
                  </div>
                ))}
              </div>
              {data.period.unmarked > 0 && (
                <p style={{ fontSize: 12, color: '#4B5563', margin: 0 }}>{r.unmarkedHint}</p>
              )}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4" style={{ opacity: loading || periodStale ? 0.5 : 1 }}>
                <div style={{ ...CARD, padding: 20 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 12px' }}>{r.byDayTitle}</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.period.dow.map(d => ({ ...d, label: (r.dow as Record<string, string>)[d.day] ?? d.day }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="missed" name={series.missed} fill="#7C3AED" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="cancelled" name={series.cancelled} fill="#D97706" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ ...CARD, padding: 20 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 12px' }}>{r.trendTitle}</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={data.period.trend.map(pt => ({ ...pt, label: trendLabel(pt) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Area type="monotone" dataKey="missed" name={series.missed} stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.12} strokeWidth={2} />
                      <Area type="monotone" dataKey="cancelled" name={series.cancelled} stroke="#D97706" fill="#D97706" fillOpacity={0.1} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
