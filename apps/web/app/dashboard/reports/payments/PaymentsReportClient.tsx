'use client'

// Payments report — money to collect (see lib/payments/collect.ts).
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Menu, Download, Phone, MessageCircle, Mail, ExternalLink, ArrowRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useDashboard } from '../../../../components/DashboardShell'
import NotificationBell from '../../../../components/NotificationBell'
import { useLanguage } from '../../../../lib/i18n/LanguageContext'
import { downloadCsv } from '../../../../lib/csvExport'
import { fmtPrice } from '../../../../lib/format'

type Money = Record<string, number>
interface Contact { memberId: string | null; name: string; email: string | null; phone: string | null; whatsapp: string | null }
interface CollectRow extends Contact {
  membershipId: string; endDate: string; amount: number; currency: string; daysOverdue: number; training: boolean
  lastClassAt: string | null; lastPaidAt: string | null; method: string; planName: string; pendingRecorded: boolean
}
type UnpaidState = 'NO_PLAN' | 'TRIAL_OVER' | 'FREE_PLAN' | 'TRIAL'
interface UnpaidRow extends Contact { state: UnpaidState; classes: number; lastClassAt: string | null; planName: string | null; planEndsAt: string | null }
interface FailedRow extends Contact { kind: 'PAST_DUE' | 'UNPAID' | 'FAILED'; amount: number; currency: string; label: string; date: string | null; method: string | null }
interface PendingRow extends Contact { id: string; amount: number; currency: string; label: string; date: string; daysPending: number; membershipStatus: string | null }
interface ReportData {
  currency: string
  month: { key: string; expected: Money; collected: Money; pending: Money }
  toCollect: CollectRow[]; toCollectTotal: Money
  unpaidTraining: UnpaidRow[]
  failed: FailedRow[]
  oldPending: PendingRow[]; oldPendingTotal: Money
  monthly: { key: string; amount: number }[]
  byMethod: { method: string; amount: number }[]
  otherCurrencies: string[]
}
type Tab = 'COLLECT' | 'UNPAID' | 'FAILED' | 'OLD_PENDING'

const TABS: Tab[] = ['COLLECT', 'UNPAID', 'FAILED', 'OLD_PENDING']
const PAGE = 25
const CARD: React.CSSProperties = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16 }
const TH: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '10px 16px', textAlign: 'left' }
const TD: React.CSSProperties = { fontSize: 13, color: '#374151', padding: '10px 16px', borderTop: '1px solid #F3F4F6' }
const iconBtn: React.CSSProperties = { width: 30, height: 30, borderRadius: 9, border: '1px solid #E5E7EB', background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }
const METHOD_COLOR: Record<string, string> = { CASH: '#16A34A', STRIPE: '#6D28D9', REVOLUT: '#0EA5E9', BANK_TRANSFER: '#0870E2', DIRECT_DEBIT: '#0F766E', OTHER: '#9CA3AF' }

export default function PaymentsReportClient() {
  const { setMenuOpen } = useDashboard()
  const { t, locale } = useLanguage()
  const r = t.paymentsReport
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [tab, setTab] = useState<Tab>('COLLECT')
  const [shown, setShown] = useState(PAGE)
  const requestId = useRef(0)

  const load = useCallback(() => {
    const id = ++requestId.current
    setLoading(true); setError(false)
    fetch('/api/dashboard/reports/payments')
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json() })
      .then((d: ReportData) => {
        if (id !== requestId.current) return
        setData(d)
        const n: Record<Tab, number> = { COLLECT: d.toCollect.length, UNPAID: d.unpaidTraining.length, FAILED: d.failed.length, OLD_PENDING: d.oldPending.length }
        setTab(prev => (n[prev] ? prev : TABS.find(k => n[k]) ?? 'COLLECT'))
      })
      .catch(() => { if (id === requestId.current) setError(true) })
      .finally(() => { if (id === requestId.current) setLoading(false) })
  }, [])
  useEffect(load, [load])

  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
  const days = (n: number) => (n === 1 ? r.oneDay : r.nDays.replace('{n}', String(n)))
  const cur = data?.currency ?? 'EUR'
  const main = (m: Money | undefined) => fmtPrice(m?.[cur] ?? 0, cur)
  /** Other currencies, never added to the main one */
  const extra = (m: Money | undefined) => Object.entries(m ?? {}).filter(([c, n]) => c !== cur && n > 0).map(([c, n]) => fmtPrice(n, c)).join(' · ')
  const methodLabel = (k: string | null) => (r.methods as Record<string, string>)[k ?? 'OTHER'] ?? k ?? '—'
  const stateLabel: Record<UnpaidState, string> = { NO_PLAN: r.stateNoPlan, TRIAL_OVER: r.stateTrialOver, FREE_PLAN: r.stateFreePlan, TRIAL: r.stateTrial }
  const stateColor: Record<UnpaidState, [string, string]> = { NO_PLAN: ['#FEF2F2', '#B91C1C'], TRIAL_OVER: ['#FFF7ED', '#C2410C'], FREE_PLAN: ['#F3F4F6', '#374151'], TRIAL: ['#EFF6FF', '#1D4ED8'] }
  const failedLabel = { PAST_DUE: r.failedPastDue, UNPAID: r.failedUnpaid, FAILED: r.failedTx }

  const tabLabel: Record<Tab, string> = { COLLECT: r.tabCollect, UNPAID: r.tabUnpaid, FAILED: r.tabFailed, OLD_PENDING: r.tabOldPending }
  const tabHint: Record<Tab, string> = { COLLECT: r.tabCollectHint, UNPAID: r.tabUnpaidHint, FAILED: r.tabFailedHint, OLD_PENDING: r.tabOldPendingHint }
  const count = (k: Tab) => !data ? 0 : { COLLECT: data.toCollect.length, UNPAID: data.unpaidTraining.length, FAILED: data.failed.length, OLD_PENDING: data.oldPending.length }[k]
  const total = count(tab)
  const canExport = total > 0 && !loading && !error

  function exportList() {
    if (!data || !canExport) return
    const file = `${r.exportFile}-${tabLabel[tab]}`
    if (tab === 'COLLECT') downloadCsv(file, [r.colStudent, r.email, r.colPhone, r.colPlan, r.colAmount, r.colDueSince, r.colDaysOverdue, r.colLastClass, r.colLastPaid, r.colMethod],
      data.toCollect.map(x => [x.name, x.email, x.phone, x.planName, fmtPrice(x.amount, x.currency), fmt(x.endDate), x.daysOverdue, fmt(x.lastClassAt), fmt(x.lastPaidAt), methodLabel(x.method)]), { locale })
    else if (tab === 'UNPAID') downloadCsv(file, [r.colStudent, r.email, r.colPhone, r.colState, r.colClasses30, r.colLastClass, r.colPlan],
      data.unpaidTraining.map(x => [x.name, x.email, x.phone, stateLabel[x.state], x.classes, fmt(x.lastClassAt), x.planName ?? '']), { locale })
    else if (tab === 'FAILED') downloadCsv(file, [r.colStudent, r.email, r.colPhone, r.colWhat, r.colAmount, r.colDate, r.colMethod],
      data.failed.map(x => [x.name, x.email, x.phone, failedLabel[x.kind], fmtPrice(x.amount, x.currency), fmt(x.date), methodLabel(x.method)]), { locale })
    else downloadCsv(file, [r.colStudent, r.email, r.colPhone, r.colConcept, r.colAmount, r.colDate, r.colDaysPending],
      data.oldPending.map(x => [x.name, x.email, x.phone, x.label, fmtPrice(x.amount, x.currency), fmt(x.date), x.daysPending]), { locale })
  }

  const contactCell = (x: Contact) => (
    <td style={TD}>
      <div className="flex items-center gap-1.5">
        {x.phone && <a href={`tel:${x.phone.replace(/[^\d+]/g, '')}`} title={r.call} aria-label={`${r.call} · ${x.name}`} style={iconBtn}><Phone size={13} style={{ color: '#374151' }} /></a>}
        {x.whatsapp && <a href={`https://wa.me/${x.whatsapp}`} target="_blank" rel="noopener noreferrer" title={r.whatsapp} aria-label={`${r.whatsapp} · ${x.name}`} style={iconBtn}><MessageCircle size={13} style={{ color: '#16A34A' }} /></a>}
        {x.email && <a href={`mailto:${x.email}`} title={r.email} aria-label={`${r.email} · ${x.name}`} style={iconBtn}><Mail size={13} style={{ color: '#0870E2' }} /></a>}
        {!x.phone && !x.email && <span style={{ fontSize: 11, color: '#9CA3AF' }}>{r.noContact}</span>}
      </div>
    </td>
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
  const empty = (cols: number) => <tr><td colSpan={cols} style={{ ...TD, textAlign: 'center', color: '#6B7280', padding: '32px 16px' }}>{r.emptyList}</td></tr>

  const m = data?.month
  const expectedMain = m?.expected[cur] ?? 0
  const collectedMain = m?.collected[cur] ?? 0
  const pct = expectedMain > 0 ? Math.round((collectedMain / expectedMain) * 100) : null
  const monthName = m ? new Date(`${m.key}-15T12:00:00Z`).toLocaleDateString(locale, { month: 'long', timeZone: 'UTC' }) : ''

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
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>{r.title}</h1>
            <p style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{r.subtitle}</p>
          </div>
          <Link href="/dashboard/payments/transactions" prefetch={false} className="inline-flex items-center gap-1.5" style={{ fontSize: 13, fontWeight: 600, color: '#0870E2' }}>
            {r.allTransactions} <ArrowRight size={14} aria-hidden />
          </Link>
        </div>

        {error && !data ? (
          <div className="flex items-center justify-between gap-3 px-5 py-4" style={CARD}>
            <span role="alert" style={{ fontSize: 13, color: '#DC2626' }}>{r.loadError}</span>
            <button onClick={load} className="cursor-pointer" style={{ fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 999, border: '1px solid #E5E7EB', background: '#fff' }}>{r.retry}</button>
          </div>
        ) : !data ? (
          <p style={{ fontSize: 13, color: '#6B7280' }}>{r.loading}</p>
        ) : (
          <div className="flex flex-col gap-6" style={{ opacity: loading ? 0.6 : 1 }}>
            {/* This month */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: r.cardExpected.replace('{month}', monthName), value: main(m?.expected), hint: r.cardExpectedHint, extra: extra(m?.expected), color: '#0870E2' },
                { label: r.cardCollected, value: main(m?.collected), hint: pct === null ? r.cardCollectedNoPlan : r.cardCollectedHint.replace('{pct}', String(pct)), extra: extra(m?.collected), color: '#16A34A' },
                { label: r.cardToCollect, value: main(data.toCollectTotal), hint: r.cardToCollectHint.replace('{n}', String(data.toCollect.length)), extra: extra(data.toCollectTotal), color: '#DC2626' },
                { label: r.cardPending, value: main(m?.pending), hint: r.cardPendingHint, extra: extra(m?.pending), color: '#D97706' },
              ].map(c => (
                <div key={c.label} style={{ ...CARD, padding: '16px 18px' }}>
                  <span className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: c.color }} aria-hidden />
                    <span style={{ fontSize: 12, color: '#4B5563', fontWeight: 500 }}>{c.label}</span>
                  </span>
                  <span style={{ display: 'block', fontSize: 24, fontWeight: 700, color: '#111827', lineHeight: 1.1 }}>{c.value}</span>
                  <span style={{ display: 'block', fontSize: 11, color: '#6B7280', marginTop: 6 }}>{c.hint}</span>
                  {c.extra && <span style={{ display: 'block', fontSize: 11, color: '#6B7280', marginTop: 2 }}>+ {c.extra}</span>}
                </div>
              ))}
            </div>
            {pct !== null && pct < 100 && (
              <div aria-hidden style={{ height: 8, borderRadius: 999, background: '#F3F4F6', overflow: 'hidden', marginTop: -12 }}>
                <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: '#16A34A' }} />
              </div>
            )}

            {/* Lists to act on */}
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
                      {tabLabel[k]}
                      <span style={{ fontSize: 11, padding: '0 6px', borderRadius: 999, background: on ? 'rgba(255,255,255,0.2)' : '#F3F4F6' }}>{count(k)}</span>
                    </button>
                  )
                })}
              </div>
              <p style={{ fontSize: 12, color: '#4B5563', margin: '10px 20px 0' }}>{tabHint[tab]}</p>

              <div className="overflow-x-auto" style={{ marginTop: 10 }}>
                <table className="w-full" style={{ minWidth: 760, borderCollapse: 'collapse' }}>
                  {tab === 'COLLECT' && (<>
                    <thead><tr>{[r.colStudent, r.colAmount, r.colDueSince, r.colLastClass, r.colLastPaid, r.colContact].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                    <tbody>{data.toCollect.length === 0 ? empty(6) : data.toCollect.slice(0, shown).map(x => (
                      <tr key={x.membershipId}>
                        {nameCell(x, `${x.planName} · ${methodLabel(x.method)}`)}
                        <td style={{ ...TD, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>
                          {fmtPrice(x.amount, x.currency)}
                          {x.pendingRecorded && <span style={{ display: 'block', fontSize: 11, fontWeight: 400, color: '#6B7280' }}>{r.pendingRecorded}</span>}
                        </td>
                        <td style={{ ...TD, whiteSpace: 'nowrap' }}><span style={{ fontWeight: 600, color: '#DC2626' }}>{days(x.daysOverdue)}</span><span style={{ color: '#6B7280' }}> · {fmt(x.endDate)}</span></td>
                        <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                          {x.training && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: '#ECFDF5', color: '#047857', marginRight: 6 }}>{r.stillTraining}</span>}
                          {fmt(x.lastClassAt)}
                        </td>
                        <td style={{ ...TD, whiteSpace: 'nowrap' }}>{fmt(x.lastPaidAt)}</td>
                        {contactCell(x)}
                      </tr>
                    ))}</tbody>
                  </>)}
                  {tab === 'UNPAID' && (<>
                    <thead><tr>{[r.colStudent, r.colState, r.colClasses30, r.colLastClass, r.colContact].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                    <tbody>{data.unpaidTraining.length === 0 ? empty(5) : data.unpaidTraining.slice(0, shown).map((x, i) => (
                      <tr key={`${x.memberId ?? x.name}-${i}`}>
                        {nameCell(x, x.planName ? `${x.planName}${x.planEndsAt ? ` · ${r.until.replace('{date}', fmt(x.planEndsAt))}` : ''}` : undefined)}
                        <td style={TD}><span style={{ fontSize: 12, fontWeight: 600, padding: '2px 9px', borderRadius: 999, whiteSpace: 'nowrap', background: stateColor[x.state][0], color: stateColor[x.state][1] }}>{stateLabel[x.state]}</span></td>
                        <td style={{ ...TD, fontWeight: 600 }}>{x.classes}</td>
                        <td style={{ ...TD, whiteSpace: 'nowrap' }}>{fmt(x.lastClassAt)}</td>
                        {contactCell(x)}
                      </tr>
                    ))}</tbody>
                  </>)}
                  {tab === 'FAILED' && (<>
                    <thead><tr>{[r.colStudent, r.colWhat, r.colAmount, r.colDate, r.colContact].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                    <tbody>{data.failed.length === 0 ? empty(5) : data.failed.slice(0, shown).map((x, i) => (
                      <tr key={`${x.kind}-${x.memberId ?? x.name}-${i}`}>
                        {nameCell(x, x.label)}
                        <td style={TD}>{failedLabel[x.kind]} · {methodLabel(x.method)}</td>
                        <td style={{ ...TD, fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtPrice(x.amount, x.currency)}</td>
                        <td style={{ ...TD, whiteSpace: 'nowrap' }}>{fmt(x.date)}</td>
                        {contactCell(x)}
                      </tr>
                    ))}</tbody>
                  </>)}
                  {tab === 'OLD_PENDING' && (<>
                    <thead><tr>{[r.colStudent, r.colConcept, r.colAmount, r.colDate, r.colContact].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                    <tbody>{data.oldPending.length === 0 ? empty(5) : data.oldPending.slice(0, shown).map(x => (
                      <tr key={x.id}>
                        {nameCell(x, x.membershipStatus && x.membershipStatus !== 'ACTIVE' ? r.planNotActive : undefined)}
                        <td style={TD}>{x.label || '—'}</td>
                        <td style={{ ...TD, fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtPrice(x.amount, x.currency)}</td>
                        <td style={{ ...TD, whiteSpace: 'nowrap' }}>{fmt(x.date)} <span style={{ color: '#6B7280' }}>· {days(x.daysPending)}</span></td>
                        {contactCell(x)}
                      </tr>
                    ))}</tbody>
                  </>)}
                </table>
              </div>
              {tab === 'OLD_PENDING' && data.oldPending.length > 0 && (
                <p style={{ fontSize: 12, color: '#4B5563', margin: 0, padding: '10px 20px', borderTop: '1px solid #F3F4F6' }}>
                  {r.oldPendingTotal.replace('{amount}', main(data.oldPendingTotal))}{' '}
                  <Link href="/dashboard/payments/transactions" prefetch={false} style={{ color: '#0870E2', fontWeight: 600 }}>{r.reviewInTransactions}</Link>
                </p>
              )}
              {total > shown && (
                <div className="px-5 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
                  <button onClick={() => setShown(n => n + PAGE)} className="cursor-pointer" style={{ fontSize: 12, fontWeight: 600, color: '#0870E2', background: 'none', border: 'none', padding: 0 }}>
                    {r.showMore.replace('{n}', String(Math.min(PAGE, total - shown)))}
                  </button>
                </div>
              )}
            </div>

            {/* 12 months */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="xl:col-span-2" style={{ ...CARD, padding: 20 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>{r.monthlyTitle}</p>
                <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 12px' }}>
                  {r.monthlyHint.replace('{currency}', cur)}{data.otherCurrencies.length > 0 && ` · ${r.otherCurrencies.replace('{list}', data.otherCurrencies.join(', '))}`}
                </p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.monthly.map(x => ({ ...x, label: new Date(`${x.key}-15T12:00:00Z`).toLocaleDateString(locale, { month: 'short', timeZone: 'UTC' }) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} width={56} tickFormatter={(v: number) => fmtPrice(v, cur)} />
                    <Tooltip formatter={(v) => fmtPrice(Number(v), cur)} contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12 }} />
                    <Bar dataKey="amount" name={r.collected} fill="#16A34A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ ...CARD, padding: 20 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 12px' }}>{r.byMethodTitle}</p>
                {data.byMethod.length === 0 ? <p style={{ fontSize: 13, color: '#6B7280' }}>{r.emptyList}</p> : (() => {
                  const sum = data.byMethod.reduce((s, x) => s + x.amount, 0) || 1
                  return (
                    <ul className="flex flex-col gap-3" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      {data.byMethod.map(x => (
                        <li key={x.method}>
                          <div className="flex items-center justify-between" style={{ fontSize: 13, marginBottom: 4 }}>
                            <span style={{ color: '#374151' }}>{methodLabel(x.method)}</span>
                            <span style={{ fontWeight: 600, color: '#111827' }}>{fmtPrice(x.amount, cur)} <span style={{ fontWeight: 400, color: '#6B7280' }}>· {Math.round((x.amount / sum) * 100)}%</span></span>
                          </div>
                          <div aria-hidden style={{ height: 6, borderRadius: 999, background: '#F3F4F6', overflow: 'hidden' }}>
                            <div style={{ width: `${(x.amount / sum) * 100}%`, height: '100%', background: METHOD_COLOR[x.method] ?? '#9CA3AF' }} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
