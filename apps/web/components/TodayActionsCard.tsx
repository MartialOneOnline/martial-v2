'use client'

// Dashboard home: the three most urgent actions of today, from
// /api/dashboard/today (replaces the old hard-coded "suggested actions").
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ListChecks, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useLanguage } from '../lib/i18n/LanguageContext'

interface TopAction { kind: string; count: number; href: string }

export default function TodayActionsCard({ schoolId, compact = false }: { schoolId: string | null | undefined; compact?: boolean }) {
  const { t } = useLanguage()
  const r = t.today
  const [top, setTop] = useState<TopAction[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!schoolId) return
    // Switching school aborts the previous request
    const ctrl = new AbortController()
    setTop(null); setError(false)
    fetch('/api/dashboard/today', { signal: ctrl.signal })
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json() })
      .then((d: { top: TopAction[] }) => { if (!ctrl.signal.aborted) setTop(d.top) })
      .catch(() => { if (!ctrl.signal.aborted) setError(true) })
    return () => ctrl.abort()
  }, [schoolId])

  const label = (kind: string) => r.actions[kind as keyof typeof r.actions] ?? kind

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E5E7EB', background: '#fff' }}>
      <div className="flex items-center justify-between px-4 pt-4 pb-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#EFF6FF' }}>
            <ListChecks size={14} strokeWidth={1.75} style={{ color: '#0870E2' }} />
          </div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', lineHeight: 1.2, margin: 0 }}>{r.cardTitle}</p>
        </div>
        <Link href="/dashboard/today" className="inline-flex items-center gap-1" style={{ fontSize: 12, fontWeight: 600, color: '#0870E2' }}>
          {r.cardSeeAll} <ArrowRight size={12} />
        </Link>
      </div>
      <div className="px-4 py-3">
        {error ? (
          <p role="alert" style={{ fontSize: 12, color: '#DC2626', margin: 0 }}>{r.loadError}</p>
        ) : top === null ? (
          <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>{r.loading}</p>
        ) : top.length === 0 ? (
          <p className="flex items-center gap-1.5" style={{ fontSize: 13, color: '#16A34A', fontWeight: 600, margin: 0 }}><CheckCircle2 size={15} /> {r.allClear}</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {top.slice(0, compact ? 2 : 3).map((a, i) => (
              <li key={a.kind} style={{ borderTop: i ? '1px solid #F3F4F6' : 'none' }}>
                <Link href={a.href} className="flex items-center justify-between gap-3" style={{ padding: '8px 0' }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#111827', lineHeight: 1.35 }}>{label(a.kind)}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0870E2', background: '#EFF6FF', borderRadius: 999, padding: '2px 9px', flexShrink: 0 }}>{a.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
