'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Menu, Download, Phone, MessageCircle, Mail, ExternalLink } from 'lucide-react'
import { useDashboard } from '../../../../components/DashboardShell'
import NotificationBell from '../../../../components/NotificationBell'
import { useLanguage } from '../../../../lib/i18n/LanguageContext'
import { downloadCsv } from '../../../../lib/csvExport'
import { CONTACT_WITHIN_HOURS, type FollowUp } from '../../../../lib/leads/funnel'

type Period = '30d' | '90d' | '12m' | 'all'

interface FollowUpRow {
  id: string; name: string; email: string | null; phone: string | null; whatsapp: string | null
  source: string; status: string; interestedIn: string | null; createdAt: string; stage: string
  followUpDays: number | null; upcomingAt: string | null; lastAttendedAt: string | null; notesCount: number
}
interface Counts { total: number; contacted: number; trialBooked: number; tried: number; joined: number; lost: number }
interface ReportData {
  funnel: Counts
  rates: { contacted: number | null; trialBooked: number | null; tried: number | null; joined: number | null; joinedOfTried: number | null }
  bySource: Array<Counts & { source: string; joinedRate: number | null }>
  monthly: Array<Counts & { month: string; joinedRate: number | null }>
  followUps: Record<FollowUp, FollowUpRow[]>
}

const TABS: FollowUp[] = ['NOT_CONTACTED', 'NO_SHOW', 'TRIED_NOT_JOINED', 'UPCOMING_TRIAL']
const PAGE = 25

const CARD: React.CSSProperties = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16 }
const TH: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '10px 16px', textAlign: 'left' }
const TD: React.CSSProperties = { fontSize: 13, color: '#374151', padding: '10px 16px', borderTop: '1px solid #F3F4F6' }
const iconBtn: React.CSSProperties = { width: 26, height: 26, borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }

export default function LeadsReportClient() {
  const { setMenuOpen } = useDashboard()
  const { t, locale } = useLanguage()
  const r = t.leadsReport
  const [period, setPeriod] = useState<Period>('90d')
  const [includeInvites, setIncludeInvites] = useState(false)
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [tab, setTab] = useState<FollowUp | null>(null)
  const [shown, setShown] = useState(PAGE)
  // Ignore a slower response for a period/filter the user has already left
  const requestId = useRef(0)

  const load = useCallback(() => {
    const id = ++requestId.current
    setLoading(true); setError(false)
    const params = new URLSearchParams({ period, ...(includeInvites ? { includeInvites: '1' } : {}) })
    fetch(`/api/dashboard/reports/leads?${params}`)
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json() })
      .then((d: ReportData) => {
        if (id !== requestId.current) return
        setData(d)
        // Land on the first list that has someone in it
        setTab(prev => prev && d.followUps[prev].length ? prev : TABS.find(k => d.followUps[k].length) ?? TABS[0]!)
        setShown(PAGE)
      })
      .catch(() => { if (id === requestId.current) setError(true) })
      .finally(() => { if (id === requestId.current) setLoading(false) })
  }, [period, includeInvites])
  useEffect(load, [load])

  const fmt = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
  const fmtMonth = (key: string) => {
    const [y, m] = key.split('-').map(Number) as [number, number]
    return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString(locale, { month: 'short', year: 'numeric', timeZone: 'UTC' })
  }
  const ago = (n: number | null) => (n === null ? '—' : n === 0 ? r.today : r.daysAgo.replace('{n}', String(n)))
  const sourceLabel = (s: string) => (r.source as Record<string, string>)[s] ?? s
  const pct = (n: number | null) => (n === null ? '—' : `${n}%`)

  const tabLabel: Record<FollowUp, string> = {
    NOT_CONTACTED: r.tabNotContacted, NO_SHOW: r.tabNoShow, TRIED_NOT_JOINED: r.tabTried, UPCOMING_TRIAL: r.tabUpcoming,
  }
  const tabHint: Record<FollowUp, string> = {
    NOT_CONTACTED: r.tabNotContactedHint.replace('{h}', String(CONTACT_WITHIN_HOURS)),
    NO_SHOW: r.tabNoShowHint, TRIED_NOT_JOINED: r.tabTriedHint, UPCOMING_TRIAL: r.tabUpcomingHint,
  }
  /** What the "When" column says for each list */
  const whenLabel = (row: FollowUpRow, kind: FollowUp) => {
    if (kind === 'UPCOMING_TRIAL') return row.upcomingAt ? r.trialOn.replace('{date}', fmt(row.upcomingAt)) : '—'
    if (kind === 'TRIED_NOT_JOINED') return row.followUpDays === null ? '—' : r.lastClass.replace('{n}', String(row.followUpDays))
    if (kind === 'NO_SHOW') return row.followUpDays === null ? '—' : r.bookedDaysAgo.replace('{n}', String(row.followUpDays))
    return ago(row.followUpDays)
  }

  const rows = data && tab ? data.followUps[tab] : []
  // While a new period/filter loads (or after it failed) the table still shows
  // the previous one — never export that as if it were the current selection
  // (Project Audit PR #43 P2).
  const canExport = rows.length > 0 && !loading && !error

  function exportList() {
    if (!tab || !canExport) return
    downloadCsv(`${r.exportFile}-${tabLabel[tab]}`, [
      r.colName, r.email, r.colPhone, r.colSource, r.colCreated, r.colWhen, r.colNotes,
    ], rows.map(x => [x.name, x.email, x.phone, sourceLabel(x.source), fmt(x.createdAt), whenLabel(x, tab), x.notesCount]), { locale })
  }

  const f = data?.funnel
  const stages = f ? [
    { label: r.stageTotal, value: f.total, rate: null as number | null, color: '#0870E2' },
    { label: r.stageContacted, value: f.contacted, rate: data!.rates.contacted, color: '#6D28D9' },
    { label: r.stageBooked, value: f.trialBooked, rate: data!.rates.trialBooked, color: '#C2410C' },
    { label: r.stageTried, value: f.tried, rate: data!.rates.tried, color: '#0F766E' },
    { label: r.stageJoined, value: f.joined, rate: data!.rates.joined, color: '#16A34A' },
  ] : []

  return (
    <main style={{ flex: 1, minWidth: 0, width: '100%', overflow: 'auto' }}>
      <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20 flex-wrap" style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
        <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(true)}>
          <Menu size={16} style={{ color: '#374151' }} />
        </button>
        <label className="flex items-center gap-2 cursor-pointer" title={r.includeInvitesHint} style={{ fontSize: 12, color: '#6B7280' }}>
          <input type="checkbox" checked={includeInvites} onChange={e => setIncludeInvites(e.target.checked)} />
          {r.includeInvites}
        </label>
        <div className="flex-1" />
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: '#F3F4F6' }}>
          {(['30d', '90d', '12m', 'all'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className="cursor-pointer"
              style={{ fontSize: 12, fontWeight: period === p ? 600 : 400, padding: '5px 12px', borderRadius: 8, border: 'none',
                background: period === p ? '#fff' : 'transparent', color: period === p ? '#111827' : '#6B7280',
                boxShadow: period === p ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
              {{ '30d': r.period30, '90d': r.period90, '12m': r.period12, all: r.periodAll }[p]}
            </button>
          ))}
        </div>
        <NotificationBell />
      </div>

      <div className="px-4 md:px-8 py-6 flex flex-col gap-6">
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>{r.title}</h1>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>{r.subtitle}</p>
        </div>

        {error && !data ? (
          <div className="flex items-center justify-between gap-3 px-5 py-4" style={CARD}>
            <span style={{ fontSize: 13, color: '#DC2626' }}>{r.loadError}</span>
            <button onClick={load} className="cursor-pointer" style={{ fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 999, border: '1px solid #E5E7EB', background: '#fff' }}>{r.retry}</button>
          </div>
        ) : !data ? (
          <p style={{ fontSize: 13, color: '#9CA3AF' }}>{r.loading}</p>
        ) : (
          <div className="flex flex-col gap-6" style={{ opacity: loading ? 0.6 : 1 }}>
            {error && (
              <div className="flex items-center justify-between gap-3 px-4 py-2 rounded-xl" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
                <span style={{ fontSize: 12, color: '#92400E' }}>{r.loadError}</span>
                <button onClick={load} className="cursor-pointer" style={{ fontSize: 12, fontWeight: 600, color: '#92400E', background: 'none', border: 'none' }}>{r.retry}</button>
              </div>
            )}

            {/* Funnel */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {stages.map(s => (
                <div key={s.label} style={{ ...CARD, padding: '16px 18px' }}>
                  <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                    <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>{s.label}</span>
                  </div>
                  <p style={{ fontSize: 26, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1 }}>{s.value}</p>
                  {s.rate !== null && <p style={{ fontSize: 11, color: '#9CA3AF', margin: '6px 0 0' }}>{r.ofLeads.replace('{n}', String(s.rate))}</p>}
                </div>
              ))}
            </div>
            {f && f.total > 0 && (
              <p style={{ fontSize: 13, color: '#374151', margin: '-8px 0 0' }}>
                {data.rates.joinedOfTried === null ? r.joinedOfTriedNone : r.joinedOfTried.replace('{n}', String(data.rates.joinedOfTried))}
                {f.lost > 0 && <span style={{ color: '#9CA3AF' }}> · {r.lost.replace('{n}', String(f.lost))}</span>}
              </p>
            )}

            {/* Follow-up lists */}
            <div style={CARD}>
              <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>{r.followUpTitle}</p>
                  <p style={{ fontSize: 12, color: '#9CA3AF', margin: '2px 0 0' }}>{r.followUpHint}</p>
                </div>
                {rows.length > 0 && (
                  <button onClick={exportList} disabled={!canExport} className="cursor-pointer inline-flex items-center gap-1.5 disabled:cursor-not-allowed"
                    style={{ fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 999, background: '#fff', color: '#374151', border: '1.5px solid #E5E7EB', opacity: canExport ? 1 : 0.5 }}>
                    <Download size={13} /> {r.export}
                  </button>
                )}
              </div>
              <div className="px-5 flex gap-2 flex-wrap">
                {TABS.map(k => {
                  const on = tab === k
                  return (
                    <button key={k} onClick={() => { setTab(k); setShown(PAGE) }} className="cursor-pointer inline-flex items-center gap-2"
                      style={{ fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 999,
                        background: on ? '#111827' : '#fff', color: on ? '#fff' : '#374151', border: `1.5px solid ${on ? '#111827' : '#E5E7EB'}` }}>
                      {tabLabel[k]}
                      <span style={{ fontSize: 11, padding: '0 6px', borderRadius: 999, background: on ? 'rgba(255,255,255,0.2)' : '#F3F4F6' }}>{data.followUps[k].length}</span>
                    </button>
                  )
                })}
              </div>
              {tab && <p style={{ fontSize: 12, color: '#6B7280', margin: '10px 20px 0' }}>{tabHint[tab]}</p>}
              <div className="overflow-x-auto" style={{ marginTop: 10 }}>
                <table className="w-full" style={{ minWidth: 720, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>{[r.colName, r.colSource, r.colCreated, r.colWhen, r.colNotes, r.colContact].map(h => <th key={h} style={TH}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr><td colSpan={6} style={{ ...TD, textAlign: 'center', color: '#9CA3AF', padding: '32px 16px' }}>{f?.total ? r.emptyTab : r.empty}</td></tr>
                    ) : rows.slice(0, shown).map(x => (
                      <tr key={x.id}>
                        <td style={TD}>
                          <Link href={`/dashboard/school/leads?lead=${x.id}`} prefetch={false} title={r.openLead}
                            className="inline-flex items-center gap-1.5" style={{ fontWeight: 600, color: '#111827' }}>
                            {x.name} <ExternalLink size={11} style={{ color: '#9CA3AF' }} />
                          </Link>
                          {x.interestedIn && <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0' }}>{x.interestedIn}</p>}
                        </td>
                        <td style={TD}>{sourceLabel(x.source)}</td>
                        <td style={{ ...TD, whiteSpace: 'nowrap' }}>{fmt(x.createdAt)}</td>
                        <td style={{ ...TD, whiteSpace: 'nowrap' }}>{tab ? whenLabel(x, tab) : '—'}</td>
                        <td style={TD}>{x.notesCount || '—'}</td>
                        <td style={TD}>
                          <div className="flex items-center gap-1.5">
                            {x.phone && (
                              <a href={`tel:${x.phone.replace(/[^\d+]/g, '')}`} title={r.call} aria-label={r.call} style={iconBtn}>
                                <Phone size={11} style={{ color: '#374151' }} />
                              </a>
                            )}
                            {x.whatsapp && (
                              <a href={`https://wa.me/${x.whatsapp}`} target="_blank" rel="noopener noreferrer" title={r.whatsapp} aria-label={r.whatsapp} style={iconBtn}>
                                <MessageCircle size={11} style={{ color: '#16A34A' }} />
                              </a>
                            )}
                            {x.email && (
                              <a href={`mailto:${x.email}`} title={r.email} aria-label={r.email} style={iconBtn}>
                                <Mail size={11} style={{ color: '#0870E2' }} />
                              </a>
                            )}
                            {!x.phone && !x.email && <span style={{ fontSize: 11, color: '#D1D5DB' }}>{r.noContact}</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > shown && (
                <div className="px-5 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
                  <button onClick={() => setShown(n => n + PAGE)} className="cursor-pointer"
                    style={{ fontSize: 12, fontWeight: 600, color: '#0870E2', background: 'none', border: 'none', padding: 0 }}>
                    {r.showMore.replace('{n}', String(Math.min(PAGE, rows.length - shown)))}
                  </button>
                </div>
              )}
            </div>

            {/* By source + by month */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {[
                { title: r.bySourceTitle, first: r.colSource, list: data.bySource.map(x => ({ key: x.source, label: sourceLabel(x.source), ...x })) },
                { title: r.monthlyTitle, first: r.colMonth, list: data.monthly.map(x => ({ key: x.month, label: fmtMonth(x.month), ...x })) },
              ].map(block => (
                <div key={block.title} style={CARD}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0, padding: '18px 20px 6px' }}>{block.title}</p>
                  <div className="overflow-x-auto">
                    <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>{[block.first, r.colLeads, r.colTried, r.colJoined, r.colJoinedRate].map(h => <th key={h} style={TH}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {block.list.length === 0 ? (
                          <tr><td colSpan={5} style={{ ...TD, textAlign: 'center', color: '#9CA3AF' }}>{r.empty}</td></tr>
                        ) : block.list.map(x => (
                          <tr key={x.key}>
                            <td style={{ ...TD, fontWeight: 500, color: '#111827' }}>{x.label}</td>
                            <td style={TD}>{x.total}</td>
                            <td style={TD}>{x.tried}</td>
                            <td style={TD}>{x.joined}</td>
                            <td style={{ ...TD, fontWeight: 600 }}>{pct(x.joinedRate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
