'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '../../../../lib/i18n/LanguageContext'
import type { ReadinessStatus } from '../../../../lib/grading/readiness'
import type { MemberReadiness } from '../../../../lib/grading/readinessData'
import {
  READINESS_STYLE, ReadinessBadge, ReadinessBar, GradeButton, dueLabel, readinessLabel, toNextLabel,
} from '../../../../components/GradingReadiness'

type Counts = Record<ReadinessStatus, number>
type Filter = 'ALL' | 'READY' | 'ALMOST_READY' | 'NOT_READY'

const PAGE = 25

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

/** Students due a grading (and close to one) — the day-to-day grading management view. */
export default function ReadinessSection({ onGraded }: { onGraded?: () => void }) {
  const { t, locale } = useLanguage()
  const rt = t.readiness
  const [students, setStudents] = useState<MemberReadiness[]>([])
  const [counts, setCounts] = useState<Counts | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('READY')
  const [belt, setBelt] = useState('ALL')
  const [shown, setShown] = useState(PAGE)
  const firstLoad = useRef(true)

  const load = useCallback(() => {
    fetch('/api/dashboard/reports/grading-readiness')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d) return
        setStudents(d.students)
        setCounts(d.counts)
        // First open: land on the most useful non-empty group.
        if (firstLoad.current && !d.counts.READY) setFilter(d.counts.ALMOST_READY ? 'ALMOST_READY' : 'ALL')
        firstLoad.current = false
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const belts = useMemo(() => {
    const seen = new Map<string, string>()
    for (const s of students) if (s.rankName && !seen.has(s.rankName)) seen.set(s.rankName, s.rankColor ?? '#E5E7EB')
    return [...seen.entries()]
  }, [students])

  if (!loading && (!counts || counts.READY + counts.ALMOST_READY + counts.NOT_READY === 0)) return null

  const visible = students.filter(s =>
    (filter === 'ALL' || s.readiness.status === filter) && (belt === 'ALL' || s.rankName === belt))
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })
  const heads = [rt.student, rt.currentBelt, rt.dueCol, rt.classesCol, rt.lastCol, '']

  return (
    <div className="rounded-2xl" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
      <div className="px-5 pt-5 pb-4">
        <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>{rt.title}</p>
        <p style={{ fontSize: 12, color: '#9CA3AF', margin: '2px 0 0' }}>{rt.subtitle}</p>

        <div className="grid grid-cols-3 gap-3" style={{ marginTop: 16 }}>
          {(['READY', 'ALMOST_READY', 'NOT_READY'] as const).map(st => {
            const s = READINESS_STYLE[st]
            const on = filter === st
            return (
              <button key={st} onClick={() => { setFilter(on ? 'ALL' : st); setShown(PAGE) }}
                className="rounded-xl text-left cursor-pointer"
                style={{ padding: '12px 14px', background: on ? s.bg : '#fff', border: `1.5px solid ${on ? s.bar : '#E5E7EB'}` }}>
                <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.bar }} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#6B7280' }}>{readinessLabel(st, rt)}</span>
                </div>
                <p style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1 }}>
                  {loading ? '—' : counts?.[st] ?? 0}
                </p>
              </button>
            )
          })}
        </div>

        {belts.length > 1 && (
          <div className="flex gap-2 flex-wrap items-center" style={{ marginTop: 12 }}>
            <span style={{ fontSize: 12, color: '#9CA3AF', marginRight: 2 }}>{rt.beltFilter}</span>
            {[['ALL', ''] as [string, string], ...belts].map(([name, color]) => {
              const on = belt === name
              return (
                <button key={name} onClick={() => { setBelt(name); setShown(PAGE) }} className="cursor-pointer inline-flex items-center gap-1.5"
                  style={{ fontSize: 12, fontWeight: on ? 600 : 400, padding: '4px 12px', borderRadius: 8,
                    background: on ? '#111827' : '#fff', color: on ? '#fff' : '#6B7280',
                    border: `1.5px solid ${on ? '#111827' : '#E5E7EB'}` }}>
                  {name !== 'ALL' && <span className="w-2 h-2 rounded-full" style={{ background: color, border: '1px solid #D1D5DB' }} />}
                  {name === 'ALL' ? rt.all : name}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full" style={{ minWidth: 820 }}>
          <thead>
            <tr style={{ borderTop: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6' }}>
              {heads.map((h, i) => (
                <th key={i} className="px-4 py-3 text-left"
                  style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF', fontSize: 13 }}>{rt.loading}</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF', fontSize: 13 }}>{rt.empty}</td></tr>
            ) : visible.slice(0, shown).map(s => {
              const r = s.readiness
              const due = dueLabel(r, rt)
              const toNext = toNextLabel(r, rt)
              return (
                <tr key={s.memberId} className="hover:bg-[#FAFAFA] transition-colors" style={{ borderBottom: '1px solid #F9FAFB' }}>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/users/${s.memberId}`} prefetch={false} className="flex items-center gap-2.5">
                      {s.avatarUrl
                        ? <img src={s.avatarUrl} alt={s.name} width={28} height={28} className="rounded-full" style={{ flexShrink: 0 }} />
                        : <div className="rounded-full shrink-0 flex items-center justify-center"
                            style={{ width: 28, height: 28, background: '#E0E7FF', color: '#3730A3', fontSize: 10, fontWeight: 700 }}>{initials(s.name)}</div>}
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{s.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.rankColor ?? '#E5E7EB', border: '1px solid #D1D5DB' }} />
                      <span style={{ fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}>{s.rankName ?? s.belt ?? '—'}</span>
                      {s.maxDegrees > 0 && (
                        <span className="flex gap-[2px]">
                          {Array.from({ length: s.maxDegrees }, (_, i) => (
                            <span key={i} style={{ width: 4, height: 10, borderRadius: 1, background: i < s.beltDegree ? '#111827' : '#E5E7EB' }} />
                          ))}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ minWidth: 190 }}>
                    {due ? (
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#15803D' }}>{due}</span>
                    ) : r.status === 'NO_RULES' || r.status === 'TOP_RANK' ? (
                      <ReadinessBadge status={r.status} />
                    ) : (
                      <div>
                        <div className="flex items-center gap-2">
                          <div style={{ flex: 1, maxWidth: 110 }}><ReadinessBar readiness={r} /></div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: READINESS_STYLE[r.status].color }}>{r.percent ?? 0}%</span>
                        </div>
                        {toNext && <p style={{ fontSize: 11, color: '#9CA3AF', margin: '3px 0 0' }}>{toNext}</p>}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{r.classesSince}</span>
                    {r.classesPerStep && <span style={{ fontSize: 11, color: '#9CA3AF' }}> / {r.classesPerStep}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span style={{ fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{s.lastGradedAt ? fmt(s.lastGradedAt) : rt.never}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <GradeButton compact readiness={r}
                      target={{ userId: s.userId, name: s.name, fromBelt: s.belt, fromBeltRankId: s.rankId }}
                      onDone={() => { load(); onGraded?.() }} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {!loading && visible.length > shown && (
        <div className="px-5 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
          <button onClick={() => setShown(n => n + PAGE)} className="cursor-pointer"
            style={{ fontSize: 13, color: '#0870E2', background: 'none', border: 'none', fontWeight: 500 }}>
            + {Math.min(PAGE, visible.length - shown)}
          </button>
        </div>
      )}
    </div>
  )
}
