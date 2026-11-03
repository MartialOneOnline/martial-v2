'use client'

// Today — what is worth doing today (see lib/today/actions.ts and
// /api/dashboard/today). Every block comes from an existing report; a block
// the person can't see is hidden, an empty one shows "All clear".
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Menu, Phone, MessageCircle, Mail, ExternalLink, CheckCircle2, ArrowRight } from 'lucide-react'
import { useDashboard } from '../../../components/DashboardShell'
import NotificationBell from '../../../components/NotificationBell'
import { useLanguage } from '../../../lib/i18n/LanguageContext'
import { fmtPrice } from '../../../lib/format'

type State = 'ok' | 'forbidden' | 'error' | 'off'
interface Contact { name: string; email: string | null; phone: string | null; whatsapp: string | null; memberId: string | null }
interface Session { classId: string; className: string; time: string; endTime: string; booked: number; capacity: number | null; cancelled: boolean }
interface Unmarked { classId: string; className: string; date: string; time: string; unmarked: number }
interface Lead extends Contact { id: string; followUpDays: number | null; upcomingAt: string | null; day?: 'TODAY' | 'TOMORROW' }
interface TodayData {
  date: string
  top: { kind: string; count: number; href: string }[]
  classes: { state: State; sessions: Session[]; unmarkedState: State; unmarked: Unmarked[]; unmarkedCount: number }
  collect: { state: State; count: number; items: (Contact & { daysOverdue: number; amount: number; currency: string; planName: string })[]; failedCount: number; failed: (Contact & { amount: number; currency: string; kind: string; label: string })[] }
  leads: { state: State; trials: Lead[]; trialsCount: number; notContacted: Lead[]; notContactedCount: number; triedNotJoined: Lead[]; triedNotJoinedCount: number }
  retain: { state: State; count: number; items: (Contact & { daysSince: number | null; planName: string | null })[] }
  approvals: { state: State; count: number; items: (Contact & { id: string; planName: string })[] }
  grading: { state: State; count?: number; items?: (Contact & { rankName: string | null; daysOverdue: number | null })[] }
}

const CARD: React.CSSProperties = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16 }
const ICON_BTN: React.CSSProperties = { width: 28, height: 28, borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }

export default function TodayClient() {
  const { setMenuOpen } = useDashboard()
  const { t, locale } = useLanguage()
  const r = t.today
  const [data, setData] = useState<TodayData | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const requestId = useRef(0)

  const load = useCallback(() => {
    const id = ++requestId.current
    setLoading(true); setError(false)
    fetch('/api/dashboard/today')
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json() })
      .then((d: TodayData) => { if (id === requestId.current) setData(d) })
      .catch(() => { if (id === requestId.current) setError(true) })
      .finally(() => { if (id === requestId.current) setLoading(false) })
  }, [])
  useEffect(load, [load])

  const fill = (s: string, vars: Record<string, string | number>) => Object.entries(vars).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), s)
  const longDate = (ymd: string) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
  const shortDate = (ymd: string) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
  const wallTime = (iso: string) => iso.slice(11, 16)

  const contact = (x: Contact) => (
    <span className="flex items-center gap-1.5 shrink-0">
      {x.phone && <a href={`tel:${x.phone.replace(/[^\d+]/g, '')}`} title={r.call} aria-label={`${r.call} · ${x.name}`} style={ICON_BTN}><Phone size={13} style={{ color: '#374151' }} /></a>}
      {x.whatsapp && <a href={`https://wa.me/${x.whatsapp}`} target="_blank" rel="noopener noreferrer" title="WhatsApp" aria-label={`WhatsApp · ${x.name}`} style={ICON_BTN}><MessageCircle size={13} style={{ color: '#16A34A' }} /></a>}
      {x.email && <a href={`mailto:${x.email}`} title={r.email} aria-label={`${r.email} · ${x.name}`} style={ICON_BTN}><Mail size={13} style={{ color: '#0870E2' }} /></a>}
    </span>
  )
  const person = (x: Contact, sub: string, key: string) => (
    <li key={key} className="flex items-center justify-between gap-3" style={{ padding: '8px 0', borderTop: '1px solid #F3F4F6' }}>
      <span className="min-w-0">
        {x.memberId
          ? <Link href={`/dashboard/users/${x.memberId}`} className="block truncate" style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{x.name}</Link>
          : <span className="block truncate" style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{x.name}</span>}
        <span className="block truncate" style={{ fontSize: 12, color: '#6B7280' }}>{sub}</span>
      </span>
      {contact(x)}
    </li>
  )
  const seeAll = (href: string, n: number, shown: number) => n > shown && (
    <Link href={href} className="inline-flex items-center gap-1" style={{ fontSize: 12, fontWeight: 600, color: '#0870E2', marginTop: 8 }}>
      {fill(r.seeAll, { n })} <ArrowRight size={12} />
    </Link>
  )
  const sub = (title: string, count: number) => (
    <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', margin: '12px 0 2px' }}>{title} <span style={{ color: '#6B7280', fontWeight: 500 }}>· {count}</span></p>
  )

  function Block({ title, hint, state, empty, children, href }: { title: string; hint: string; state: State; empty: boolean; children: React.ReactNode; href?: string }) {
    if (state === 'forbidden' || state === 'off') return null
    return (
      <section style={{ ...CARD, padding: 18 }}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>{title}</h2>
            <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>{hint}</p>
          </div>
          {href && <Link href={href} title={r.openReport} aria-label={`${r.openReport} · ${title}`} style={{ color: '#6B7280' }}><ExternalLink size={14} /></Link>}
        </div>
        {state === 'error'
          ? <p role="alert" style={{ fontSize: 13, color: '#DC2626', margin: '12px 0 0' }}>{r.blockError}</p>
          : empty
            ? <p className="flex items-center gap-1.5" style={{ fontSize: 13, color: '#16A34A', fontWeight: 600, margin: '12px 0 0' }}><CheckCircle2 size={15} /> {r.allClear}</p>
            : children}
      </section>
    )
  }

  const d = data
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
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 2, textTransform: d ? 'none' : undefined }}>
            {d ? `${longDate(d.date).replace(/^./, c => c.toUpperCase())} · ${r.subtitle}` : r.subtitle}
          </p>
        </div>

        {error && !d ? (
          <div className="flex items-center justify-between gap-3 px-5 py-4" style={CARD}>
            <span role="alert" style={{ fontSize: 13, color: '#DC2626' }}>{r.loadError}</span>
            <button onClick={load} className="cursor-pointer" style={{ fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 999, border: '1px solid #E5E7EB', background: '#fff' }}>{r.retry}</button>
          </div>
        ) : !d ? (
          <p style={{ fontSize: 13, color: '#6B7280' }}>{r.loading}</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start" style={{ opacity: loading ? 0.6 : 1 }}>
            {/* Today's classes */}
            <Block title={r.classesTitle} hint={r.classesHint} state={d.classes.state} href="/dashboard/classes/calendar"
              empty={d.classes.sessions.length === 0 && d.classes.unmarkedCount === 0 && d.leads.trials.filter(x => x.day === 'TODAY').length === 0}>
              {d.classes.sessions.length === 0
                ? <p style={{ fontSize: 13, color: '#6B7280', margin: '12px 0 0' }}>{r.noClassesToday}</p>
                : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0' }}>
                    {d.classes.sessions.map(s => (
                      <li key={`${s.classId}|${s.time}`} className="flex items-center justify-between gap-3" style={{ padding: '7px 0', borderTop: '1px solid #F3F4F6' }}>
                        <Link href={`/dashboard/classes/calendar?date=${d.date}&class=${encodeURIComponent(s.classId)}&time=${s.time}`} className="min-w-0">
                          <span className="block truncate" style={{ fontSize: 13, fontWeight: 600, color: s.cancelled ? '#9CA3AF' : '#111827', textDecoration: s.cancelled ? 'line-through' : 'none' }}>{s.className}</span>
                          <span style={{ fontSize: 12, color: '#6B7280' }}>{s.time}–{s.endTime}</span>
                        </Link>
                        <span style={{ fontSize: 12, fontWeight: 600, color: s.cancelled ? '#DC2626' : '#374151', whiteSpace: 'nowrap' }}>
                          {s.cancelled ? r.cancelled : s.capacity ? fill(r.bookedOf, { n: s.booked, cap: s.capacity }) : fill(r.booked, { n: s.booked })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              {d.leads.state === 'ok' && d.leads.trials.some(x => x.day === 'TODAY') && (
                <>
                  {sub(r.trialsToday, d.leads.trials.filter(x => x.day === 'TODAY').length)}
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {d.leads.trials.filter(x => x.day === 'TODAY').map(x => person(x, x.upcomingAt ? fill(r.trialAt, { time: wallTime(x.upcomingAt) }) : '', `t-${x.id}`))}
                  </ul>
                </>
              )}
              {d.classes.unmarkedState === 'ok' && d.classes.unmarkedCount > 0 && (
                <>
                  {sub(r.unmarkedTitle, d.classes.unmarkedCount)}
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {d.classes.unmarked.map(u => (
                      <li key={`${u.classId}|${u.date}|${u.time}`} className="flex items-center justify-between gap-3" style={{ padding: '7px 0', borderTop: '1px solid #F3F4F6' }}>
                        <span className="min-w-0">
                          <span className="block truncate" style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{u.className}</span>
                          <span style={{ fontSize: 12, color: '#6B7280' }}>{shortDate(u.date)} · {u.time} · {fill(r.unmarkedCount, { n: u.unmarked })}</span>
                        </span>
                        <Link href={`/dashboard/classes/calendar?date=${u.date}&class=${encodeURIComponent(u.classId)}&time=${u.time}`} style={{ fontSize: 12, fontWeight: 600, color: '#0870E2', whiteSpace: 'nowrap' }}>{r.markAttendance}</Link>
                      </li>
                    ))}
                  </ul>
                  {seeAll('/dashboard/reports/bookings?tab=UNMARKED', d.classes.unmarkedCount, d.classes.unmarked.length)}
                </>
              )}
            </Block>

            {/* Money */}
            <Block title={r.collectTitle} hint={r.collectHint} state={d.collect.state} href="/dashboard/reports/payments" empty={d.collect.count === 0 && d.collect.failedCount === 0}>
              {d.collect.count > 0 && (
                <>
                  {sub(r.overdueTraining, d.collect.count)}
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {d.collect.items.map((x, i) => person(x, `${fill(r.overdueDays, { n: x.daysOverdue })} · ${fmtPrice(x.amount, x.currency)} · ${x.planName}`, `c-${i}`))}
                  </ul>
                  {seeAll('/dashboard/reports/payments?tab=COLLECT', d.collect.count, d.collect.items.length)}
                </>
              )}
              {d.collect.failedCount > 0 && (
                <>
                  {sub(r.failedTitle, d.collect.failedCount)}
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {d.collect.failed.map((x, i) => person(x, `${fmtPrice(x.amount, x.currency)}${x.label ? ` · ${x.label}` : ''}`, `f-${i}`))}
                  </ul>
                  {seeAll('/dashboard/reports/payments?tab=FAILED', d.collect.failedCount, d.collect.failed.length)}
                </>
              )}
            </Block>

            {/* Leads */}
            <Block title={r.leadsTitle} hint={r.leadsHint} state={d.leads.state} href="/dashboard/reports/leads"
              empty={d.leads.trialsCount === 0 && d.leads.notContactedCount === 0 && d.leads.triedNotJoinedCount === 0}>
              {d.leads.trialsCount > 0 && (
                <>
                  {sub(r.trialsSoon, d.leads.trialsCount)}
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {d.leads.trials.map(x => person(x, `${x.day === 'TODAY' ? r.today : r.tomorrow}${x.upcomingAt ? ` · ${wallTime(x.upcomingAt)}` : ''}`, `ts-${x.id}`))}
                  </ul>
                  {seeAll('/dashboard/reports/leads?tab=UPCOMING_TRIAL', d.leads.trialsCount, d.leads.trials.length)}
                </>
              )}
              {d.leads.notContactedCount > 0 && (
                <>
                  {sub(r.notContacted, d.leads.notContactedCount)}
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {d.leads.notContacted.map(x => person(x, x.followUpDays !== null ? fill(r.waitingDays, { n: x.followUpDays }) : '', `nc-${x.id}`))}
                  </ul>
                  {seeAll('/dashboard/reports/leads?tab=NOT_CONTACTED', d.leads.notContactedCount, d.leads.notContacted.length)}
                </>
              )}
              {d.leads.triedNotJoinedCount > 0 && (
                <>
                  {sub(r.triedNotJoined, d.leads.triedNotJoinedCount)}
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {d.leads.triedNotJoined.map(x => person(x, x.followUpDays !== null ? fill(r.sinceTrial, { n: x.followUpDays }) : '', `tn-${x.id}`))}
                  </ul>
                  {seeAll('/dashboard/reports/leads?tab=TRIED_NOT_JOINED', d.leads.triedNotJoinedCount, d.leads.triedNotJoined.length)}
                </>
              )}
            </Block>

            {/* Retain */}
            <Block title={r.retainTitle} hint={r.retainHint} state={d.retain.state} href="/dashboard/reports/absents?tab=AT_RISK" empty={d.retain.count === 0}>
              <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0' }}>
                {d.retain.items.map((x, i) => person(x, `${fill(r.daysAway, { n: x.daysSince ?? 0 })}${x.planName ? ` · ${x.planName}` : ''}`, `r-${i}`))}
              </ul>
              {seeAll('/dashboard/reports/absents?tab=AT_RISK', d.retain.count, d.retain.items.length)}
            </Block>

            {/* Approvals */}
            <Block title={r.approvalsTitle} hint={r.approvalsHint} state={d.approvals.state} href="/dashboard/users?filter=Pending" empty={d.approvals.count === 0}>
              <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0' }}>
                {d.approvals.items.map(x => person(x, x.planName, `a-${x.id}`))}
              </ul>
              <Link href="/dashboard/users?filter=Pending" className="inline-flex items-center gap-1" style={{ fontSize: 12, fontWeight: 600, color: '#0870E2', marginTop: 8 }}>
                {fill(r.review, { n: d.approvals.count })} <ArrowRight size={12} />
              </Link>
            </Block>

            {/* Gradings */}
            <Block title={r.gradingTitle} hint={r.gradingHint} state={d.grading.state} href="/dashboard/reports/gradings" empty={(d.grading.count ?? 0) === 0}>
              <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0' }}>
                {(d.grading.items ?? []).map((x, i) => person(x, [x.rankName, x.daysOverdue ? fill(r.dueDays, { n: x.daysOverdue }) : null].filter(Boolean).join(' · '), `g-${i}`))}
              </ul>
              {seeAll('/dashboard/reports/gradings', d.grading.count ?? 0, d.grading.items?.length ?? 0)}
            </Block>
          </div>
        )}
      </div>
    </main>
  )
}
