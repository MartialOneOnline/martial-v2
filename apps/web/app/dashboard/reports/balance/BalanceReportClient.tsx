'use client'

// Balance — monthly profit & loss (see lib/balance/pnl.ts).
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Menu, AlertTriangle, Plus, Copy, ArrowRight, X } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useDashboard } from '../../../../components/DashboardShell'
import NotificationBell from '../../../../components/NotificationBell'
import { useLanguage } from '../../../../lib/i18n/LanguageContext'
import { fmtPrice } from '../../../../lib/format'

type Period = 'month' | '3m' | '12m' | 'year'
interface Row {
  key: string; income: Record<string, number>; expenses: Record<string, number>
  incomeTotal: number; expenseTotal: number; net: number; margin: number | null; missingExpenses: boolean
  copyable?: boolean; expensesElsewhere?: boolean
}
interface Unusual { id: string; category: string; amount: number; currency: string; date: string; description: string | null; reason: 'OTHER' | 'LARGE' }
interface Data {
  period: Period; currency: string; otherCurrencies: string[]
  months: Row[]; totals: Omit<Row, 'key'>
  lastExpenseMonth: string | null
  unusual: Unusual[]
  canManage: boolean
}

const EXPENSE_CATEGORIES = ['RENT', 'SALARY', 'EQUIPMENT', 'MARKETING', 'OTHER'] as const
const CARD: React.CSSProperties = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16 }
const TH: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '10px 16px', textAlign: 'left' }
const TD: React.CSSProperties = { fontSize: 13, color: '#374151', padding: '10px 16px', borderTop: '1px solid #F3F4F6' }
const INPUT: React.CSSProperties = { height: 40, boxSizing: 'border-box', border: '1px solid #E5E7EB', borderRadius: 10, padding: '0 12px', fontSize: 14, color: '#111827', background: '#fff' }

export default function BalanceReportClient() {
  const { setMenuOpen } = useDashboard()
  const { t, locale } = useLanguage()
  const r = t.balanceReport
  const [period, setPeriod] = useState<Period>('12m')
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ category: 'RENT', amount: '', date: '', description: '' })
  const requestId = useRef(0)
  // Writes reload whatever period is on screen WHEN they finish, not the one
  // they started in (Project Audit PR #50 P2)
  const periodRef = useRef(period)
  periodRef.current = period

  const load = useCallback(() => {
    const id = ++requestId.current
    setLoading(true); setError(false)
    fetch(`/api/dashboard/balance?period=${periodRef.current}`)
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json() })
      .then((d: Data) => { if (id === requestId.current) setData(d) })
      .catch(() => { if (id === requestId.current) setError(true) })
      .finally(() => { if (id === requestId.current) setLoading(false) })
  }, [])
  useEffect(load, [load, period])

  // Errors stay until dismissed; successes fade
  const say = (ok: boolean, text: string) => { setToast({ ok, text }); if (ok) setTimeout(() => setToast(t => (t?.text === text ? null : t)), 3500) }
  const cur = data?.currency ?? 'EUR'
  const money = (n: number) => fmtPrice(n, cur)
  const monthLabel = (key: string, long = false) => new Date(`${key}-15T12:00:00Z`).toLocaleDateString(locale, { month: long ? 'long' : 'short', year: 'numeric', timeZone: 'UTC' })
  const catLabel = (c: string) => (r.categories as Record<string, string>)[c] ?? c
  const periodLabel: Record<Period, string> = { month: r.periodMonth, '3m': r.period3m, '12m': r.period12m, year: r.periodYear }
  // The rows on screen must be the period asked for
  const stale = !!data && data.period !== period
  const shown = data && !stale ? data : null
  const missing = shown ? shown.months.filter(m => m.missingExpenses) : []
  const copyable = shown ? shown.months.filter(m => m.copyable) : []

  /** null = copied; otherwise why it wasn't */
  async function copyInto(month: string): Promise<string | null> {
    const res = await fetch('/api/dashboard/balance/copy-expenses', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ month }),
    }).catch(() => null)
    if (res?.status === 201) return null
    const code = (await res?.json().catch(() => null))?.error
    return code === 'ALREADY_HAS_EXPENSES' ? r.copyAlready.replace('{month}', monthLabel(month, true))
      : code === 'NO_EXPENSES_TO_COPY' ? r.copyNothing : r.actionError
  }

  async function copyOne(month: string) {
    if (busy) return
    setBusy(true)
    try {
      const failed = await copyInto(month)
      say(!failed, failed ?? r.copied.replace('{month}', monthLabel(month, true)))
      load()
    } finally { setBusy(false) }
  }

  /** Oldest first: each month copies the one just filled before it. Stops at the first failure and says so. */
  async function copyAll() {
    if (busy || !copyable.length) return
    if (!confirm(r.copyAllConfirm.replace('{n}', String(copyable.length)))) return
    setBusy(true)
    let done = 0
    try {
      for (const m of copyable) {
        const failed = await copyInto(m.key)
        if (failed) {
          say(false, r.copyPartial.replace('{done}', String(done)).replace('{month}', monthLabel(m.key, true))
            .replace('{reason}', failed).replace('{left}', String(copyable.length - done)))
          return
        }
        done++
      }
      say(true, r.copiedMany.replace('{n}', String(done)))
    } finally { setBusy(false); load() }
  }

  async function addExpense() {
    const amount = Number(form.amount.replace(',', '.'))
    if (busy || !(amount > 0) || !form.date) return
    setBusy(true)
    try {
      // The school's calendar day; the server stores it at 12:00 school time
      const res = await fetch('/api/dashboard/balance/expense', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: form.category, amount, currency: cur, date: form.date, description: form.description }),
      }).catch(() => null)
      if (!res?.ok) { say(false, r.actionError); return }
      say(true, r.expenseAdded)
      setForm(f => ({ ...f, amount: '', description: '' })); setAdding(false)
      load()
    } finally { setBusy(false) }
  }

  const tot = shown?.totals
  const cards = tot ? [
    { label: r.income, value: money(tot.incomeTotal), color: '#16A34A' },
    { label: r.expenses, value: money(tot.expenseTotal), color: '#DC2626' },
    { label: r.result, value: money(tot.net), color: '#0870E2' },
    { label: r.margin, value: tot.margin === null ? '—' : `${tot.margin}%`, color: '#6D28D9', hint: tot.margin === null && missing.length ? r.marginNotReal : undefined },
  ] : []
  const categories = (kind: 'income' | 'expenses') => Object.entries(tot?.[kind] ?? {}).sort(([, a], [, b]) => b - a)

  return (
    <main style={{ flex: 1, minWidth: 0, width: '100%', overflow: 'auto' }}>
      <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20 flex-wrap" style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
        <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0" aria-label="Menu"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(true)}>
          <Menu size={16} style={{ color: '#374151' }} />
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-1 p-1 rounded-xl" role="group" aria-label={r.title} style={{ background: '#F3F4F6' }}>
          {(['month', '3m', '12m', 'year'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} aria-pressed={period === p} className="cursor-pointer"
              style={{ fontSize: 12, fontWeight: period === p ? 600 : 400, padding: '5px 12px', borderRadius: 8, border: 'none',
                background: period === p ? '#fff' : 'transparent', color: period === p ? '#111827' : '#4B5563', boxShadow: period === p ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
              {periodLabel[p]}
            </button>
          ))}
        </div>
        <NotificationBell />
      </div>

      <div className="px-4 md:px-8 py-6 flex flex-col gap-6">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>{r.title}</h1>
            <p style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{r.subtitle}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {shown?.canManage && (
              <button onClick={() => setAdding(a => !a)} className="cursor-pointer inline-flex items-center gap-1.5"
                style={{ fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 999, background: '#0870E2', color: '#fff', border: 'none' }}>
                <Plus size={14} aria-hidden /> {r.addExpense}
              </button>
            )}
            <Link href="/dashboard/payments/transactions" prefetch={false} className="inline-flex items-center gap-1.5" style={{ fontSize: 13, fontWeight: 600, color: '#0870E2' }}>
              {r.allTransactions} <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
        </div>

        {toast && (
          <div role={toast.ok ? 'status' : 'alert'} className="flex items-start justify-between gap-3 px-4 py-2 rounded-xl" style={{ fontSize: 13, fontWeight: 500, background: toast.ok ? '#ECFDF5' : '#FEF2F2', color: toast.ok ? '#047857' : '#B91C1C', border: `1px solid ${toast.ok ? '#A7F3D0' : '#FECACA'}` }}>
            <span>{toast.text}</span>
            <button onClick={() => setToast(null)} aria-label={r.cancel} className="cursor-pointer" style={{ background: 'none', border: 'none', padding: 0, color: 'inherit' }}><X size={14} /></button>
          </div>
        )}

        {adding && shown?.canManage && (
          <div className="flex flex-wrap items-end gap-3 p-4" style={CARD}>
            <label className="flex flex-col gap-1" style={{ fontSize: 12, color: '#4B5563' }}>{r.category}
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={INPUT}>
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1" style={{ fontSize: 12, color: '#4B5563' }}>{r.amount} ({cur})
              <input inputMode="decimal" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="500" style={{ ...INPUT, width: 120 }} />
            </label>
            <label className="flex flex-col gap-1" style={{ fontSize: 12, color: '#4B5563' }}>{r.date}
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={INPUT} />
            </label>
            <label className="flex flex-col gap-1" style={{ fontSize: 12, color: '#4B5563', flex: '1 1 180px' }}>{r.concept}
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={r.conceptPlaceholder} style={INPUT} />
            </label>
            <button onClick={addExpense} disabled={busy || !(Number(form.amount.replace(',', '.')) > 0) || !form.date} className="cursor-pointer disabled:cursor-not-allowed"
              style={{ height: 40, padding: '0 18px', borderRadius: 10, border: 'none', background: '#0870E2', color: '#fff', fontSize: 14, fontWeight: 600, opacity: busy || !(Number(form.amount.replace(',', '.')) > 0) || !form.date ? 0.5 : 1 }}>
              {r.save}
            </button>
            <button onClick={() => setAdding(false)} aria-label={r.cancel} className="cursor-pointer" style={{ height: 40, width: 40, borderRadius: 10, border: 'none', background: 'transparent' }}>
              <X size={16} style={{ color: '#6B7280' }} />
            </button>
          </div>
        )}

        {error && !shown ? (
          <div className="flex items-center justify-between gap-3 px-5 py-4" style={CARD}>
            <span role="alert" style={{ fontSize: 13, color: '#DC2626' }}>{r.loadError}</span>
            <button onClick={load} className="cursor-pointer" style={{ fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 999, border: '1px solid #E5E7EB', background: '#fff' }}>{r.retry}</button>
          </div>
        ) : !shown ? (
          <p style={{ fontSize: 13, color: '#6B7280' }}>{r.loading}</p>
        ) : (
          <div className="flex flex-col gap-6" style={{ opacity: loading ? 0.6 : 1 }}>
            {missing.length > 0 && (
              <div className="flex items-start justify-between gap-3 flex-wrap px-4 py-3 rounded-xl" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <p className="flex items-start gap-2" style={{ fontSize: 13, color: '#92400E', margin: 0, flex: '1 1 300px' }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden />
                  <span>
                    {shown.lastExpenseMonth
                      ? r.missingSince.replace('{month}', monthLabel(shown.lastExpenseMonth, true)).replace('{n}', String(missing.length))
                      : r.missingNever.replace('{n}', String(missing.length))}
                  </span>
                </p>
                {shown.canManage && copyable.length > 0 && (
                  <button onClick={copyAll} disabled={busy} className="cursor-pointer inline-flex items-center gap-1.5 disabled:cursor-not-allowed"
                    style={{ fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 999, background: '#fff', color: '#92400E', border: '1px solid #FCD34D', opacity: busy ? 0.6 : 1 }}>
                    <Copy size={13} aria-hidden /> {r.copyAll}
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {cards.map(c => (
                <div key={c.label} style={{ ...CARD, padding: '16px 18px' }}>
                  <span className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: c.color }} aria-hidden />
                    <span style={{ fontSize: 12, color: '#4B5563', fontWeight: 500 }}>{c.label}</span>
                  </span>
                  <span style={{ display: 'block', fontSize: 24, fontWeight: 700, color: '#111827', lineHeight: 1.1 }}>{c.value}</span>
                  {c.hint && <span style={{ display: 'block', fontSize: 11, color: '#92400E', marginTop: 6 }}>{c.hint}</span>}
                </div>
              ))}
            </div>
            {shown.otherCurrencies.length > 0 && (
              <p style={{ fontSize: 12, color: '#6B7280', margin: '-12px 0 0' }}>{r.otherCurrencies.replace('{currency}', cur).replace('{list}', shown.otherCurrencies.join(', '))}</p>
            )}

            {/* Month by month */}
            <div style={CARD}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0, padding: '18px 20px 6px' }}>{r.byMonthTitle}</p>
              <div className="overflow-x-auto">
                <table className="w-full" style={{ minWidth: 640, borderCollapse: 'collapse' }}>
                  <thead><tr>{[r.month, r.income, r.expenses, r.result, r.margin, ''].map((h, i) => <th key={i} style={{ ...TH, textAlign: i && i < 5 ? 'right' : 'left' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {[...shown.months].reverse().map(m => (
                      <tr key={m.key} style={{ background: m.missingExpenses ? '#FFFDF5' : undefined }}>
                        <td style={{ ...TD, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>{monthLabel(m.key)}</td>
                        <td style={{ ...TD, textAlign: 'right', whiteSpace: 'nowrap' }}>{money(m.incomeTotal)}</td>
                        <td style={{ ...TD, textAlign: 'right', whiteSpace: 'nowrap', color: m.missingExpenses ? '#B45309' : '#374151' }}>
                          {m.missingExpenses ? r.noExpenses : money(m.expenseTotal)}
                        </td>
                        <td style={{ ...TD, textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600, color: m.missingExpenses ? '#9CA3AF' : m.net < 0 ? '#B91C1C' : '#111827' }}>{money(m.net)}</td>
                        <td style={{ ...TD, textAlign: 'right', whiteSpace: 'nowrap', color: m.margin === null ? '#9CA3AF' : '#374151' }}>{m.margin === null ? '—' : `${m.margin}%`}</td>
                        <td style={{ ...TD, textAlign: 'right' }}>
                          {m.expensesElsewhere && (
                            <span title={r.expensesElsewhereHint} style={{ fontSize: 11, color: '#6B7280', whiteSpace: 'nowrap' }}>{r.expensesElsewhere}</span>
                          )}
                          {m.copyable && shown.canManage && (
                            <button onClick={() => copyOne(m.key)} disabled={busy} className="cursor-pointer inline-flex items-center gap-1 disabled:cursor-not-allowed"
                              style={{ fontSize: 12, fontWeight: 600, color: '#0870E2', background: 'none', border: 'none', padding: 0, opacity: busy ? 0.5 : 1, whiteSpace: 'nowrap' }}>
                              <Copy size={12} aria-hidden /> {r.copyPrevious}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="xl:col-span-2" style={{ ...CARD, padding: 20 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 12px' }}>{r.chartTitle}</p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={shown.months.map(m => ({ label: monthLabel(m.key), income: m.incomeTotal, expenses: m.expenseTotal }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} width={56} tickFormatter={(v: number) => money(v)} />
                    <Tooltip formatter={v => money(Number(v))} contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="income" name={r.income} fill="#16A34A" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name={r.expenses} fill="#DC2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ ...CARD, padding: 20 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 12px' }}>{r.byCategoryTitle}</p>
                {(['income', 'expenses'] as const).map(kind => (
                  <div key={kind} style={{ marginBottom: 14 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 6px' }}>{kind === 'income' ? r.income : r.expenses}</p>
                    {categories(kind).length === 0 ? <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>—</p> : (
                      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} className="flex flex-col gap-1.5">
                        {categories(kind).map(([c, n]) => (
                          <li key={c} className="flex items-center justify-between" style={{ fontSize: 13 }}>
                            <span style={{ color: '#374151' }}>{catLabel(c)}</span>
                            <span style={{ fontWeight: 600, color: '#111827' }}>{money(n)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {shown.unusual.length > 0 && (
              <div style={CARD}>
                <div style={{ padding: '18px 20px 6px' }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>{r.unusualTitle}</p>
                  <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>{r.unusualHint}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full" style={{ minWidth: 560, borderCollapse: 'collapse' }}>
                    <thead><tr>{[r.date, r.concept, r.category, r.amount, r.why].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                    <tbody>
                      {shown.unusual.map(u => (
                        <tr key={u.id}>
                          <td style={{ ...TD, whiteSpace: 'nowrap' }}>{new Date(u.date).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                          <td style={TD}>{u.description ?? '—'}</td>
                          <td style={TD}>{catLabel(u.category)}</td>
                          <td style={{ ...TD, fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtPrice(u.amount, u.currency)}</td>
                          <td style={TD}>{u.reason === 'OTHER' ? r.whyOther : r.whyLarge}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
