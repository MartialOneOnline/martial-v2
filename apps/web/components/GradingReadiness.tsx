'use client'

import { useState } from 'react'
import { Check, Lock, AlertTriangle, Award } from 'lucide-react'
import { useLanguage } from '../lib/i18n/LanguageContext'
import type { GradingStep, Readiness, ReadinessStatus } from '../lib/grading/readiness'
import type { Translations } from '../lib/i18n/translations'
import { OVERDUE_DAYS, daysSince } from '../lib/grading/overdue'

type RT = Translations['readiness']

export const READINESS_STYLE: Record<ReadinessStatus, { bg: string; color: string; bar: string }> = {
  READY:        { bg: '#DCFCE7', color: '#15803D', bar: '#22C55E' },
  ALMOST_READY: { bg: '#FEF9C3', color: '#A16207', bar: '#EAB308' },
  NOT_READY:    { bg: '#F3F4F6', color: '#4B5563', bar: '#9CA3AF' },
  NO_RULES:     { bg: '#F3F4F6', color: '#9CA3AF', bar: '#E5E7EB' },
  TOP_RANK:     { bg: '#DBEAFE', color: '#1D4ED8', bar: '#3B82F6' },
}

export function readinessLabel(status: ReadinessStatus, rt: RT): string {
  return {
    READY: rt.ready, ALMOST_READY: rt.almostReady, NOT_READY: rt.notReady, NO_RULES: rt.noRules, TOP_RANK: rt.topRank,
  }[status]
}

/** "+3 stripes → Blanco 3" / "Promote to Azul" */
export function dueLabel(r: Readiness, rt: RT): string | null {
  const d = r.due
  if (!d) return null
  if (d.kind === 'BELT') return rt.dueBelt.replace('{belt}', d.rankName)
  return (d.count === 1 ? rt.dueStripe : rt.dueStripes)
    .replace('{n}', String(d.count)).replace('{belt}', d.rankName).replace('{deg}', String(d.degree))
}

export function stepLabel(s: Pick<GradingStep, 'kind' | 'rankName' | 'degree'>, rt: RT): string {
  return s.kind === 'BELT' ? rt.beltStep.replace('{belt}', s.rankName) : rt.stripeN.replace('{n}', String(s.degree))
}

/** "Rules incomplete: no class count for Stripe 2" — null when the config is complete */
export function incompleteLabel(r: Readiness, rt: RT): string | null {
  return r.incompleteRules ? rt.incompleteRules.replace('{step}', stepLabel(r.incompleteRules, rt)) : null
}

/** "6 classes to Stripe 4" — null when the next step isn't measured in classes */
export function toNextLabel(r: Readiness, rt: RT): string | null {
  const n = r.next
  if (!n || n.classes === null || n.required === null || n.classes >= n.required) return null
  return rt.classesToNext.replace('{n}', String(n.required - n.classes)).replace('{step}', stepLabel(n, rt))
}

/**
 * Why the first held-back step isn't due — one line per unmet rule (time,
 * age, unknown date). Shared by the profile card and the report.
 */
export function blockReasons(r: Readiness, rt: RT): string[] {
  const step = r.steps.find(s => s.blockedBy.length > 0)
  if (!step) return []
  return step.gates.filter(g => !g.met).map(q => {
    const text = q.unknown
      ? (q.kind === 'GRADING_MONTHS' ? rt.gradingDateUnknown : rt.beltDateUnknown)
      : ({ AGE: rt.blockedAge, MONTHS: rt.blockedMonths, GRADING_MONTHS: rt.blockedGradingMonths } as const)[q.kind]
    return text.replace('{current}', String(q.current)).replace('{required}', String(q.required))
  })
}

/** "2 classes don't count (max 3/week)" — null without a cap or nothing over it */
export function overCapLabel(r: Readiness, rt: RT): string | null {
  if (!r.classCap || r.classesOverCap <= 0) return null
  return rt.overCap.replace('{n}', String(r.classesOverCap)).replace('{max}', String(r.classCap.max))
    .replace('{unit}', r.classCap.periodType === 'MONTH' ? rt.perMonth : rt.perWeek)
}

/**
 * Why attended classes aren't counted, from the week-by-week rule: over the
 * max, in weeks under the min, and the current week still under the min.
 */
export function countNotes(r: Readiness, rt: RT): string[] {
  const notes: string[] = []
  const overCap = overCapLabel(r, rt)
  if (overCap) notes.push(overCap)
  if (r.classMin) {
    const unit = r.classMin.periodType === 'MONTH' ? rt.perMonth : rt.perWeek
    const min = String(r.classMin.min)
    if (r.classesBelowMin > 0) {
      notes.push(rt.belowMin.replace('{n}', String(r.classesBelowMin)).replace('{min}', min).replace('{unit}', unit))
    }
    if (r.classesPendingPeriod > 0) {
      notes.push(rt.pendingPeriod.replace('{period}', r.classMin.periodType === 'MONTH' ? rt.thisMonth : rt.thisWeek)
        .replace('{n}', String(r.classesPendingPeriod)).replaceAll('{min}', min))
    }
  }
  return notes
}

export function ReadinessBadge({ status }: { status: ReadinessStatus }) {
  const { t } = useLanguage()
  const s = READINESS_STYLE[status]
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
      {readinessLabel(status, t.readiness)}
    </span>
  )
}

export function ReadinessBar({ readiness, height = 6 }: { readiness: Readiness; height?: number }) {
  const s = READINESS_STYLE[readiness.status]
  return (
    <div style={{ height, background: '#F3F4F6', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${readiness.percent ?? 0}%`, background: s.bar, borderRadius: 999, transition: 'width .5s' }} />
    </div>
  )
}

export interface GradeTarget {
  userId: string
  name: string
  fromBelt: string | null
  fromBeltRankId: string | null
}

/** Records the due grading (POST /api/dashboard/gradings), which also updates the member's belt. */
export async function awardDueGrading(target: GradeTarget, r: Readiness): Promise<boolean> {
  if (!r.due) return false
  const res = await fetch('/api/dashboard/gradings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: target.userId,
      fromBelt: target.fromBelt,
      fromBeltRankId: target.fromBeltRankId,
      toBeltRankId: r.due.rankId,
      toDegree: r.due.degree,
      gradedAt: new Date().toISOString(),
    }),
  })
  return res.ok
}

export function GradeButton({ target, readiness, onDone, compact = false }: {
  target: GradeTarget; readiness: Readiness; onDone: () => void; compact?: boolean
}) {
  const { t } = useLanguage()
  const rt = t.readiness
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  if (!readiness.due) return null
  const label = dueLabel(readiness, rt) ?? ''

  async function go() {
    if (!window.confirm(rt.gradeConfirm.replace('{target}', label).replace('{name}', target.name))) return
    setBusy(true); setError(false)
    const ok = await awardDueGrading(target, readiness).catch(() => false)
    setBusy(false)
    if (ok) onDone(); else setError(true)
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button onClick={go} disabled={busy} className="inline-flex items-center gap-1.5 cursor-pointer"
        style={{ fontSize: compact ? 12 : 13, fontWeight: 600, padding: compact ? '4px 10px' : '7px 14px', borderRadius: 999,
          border: 'none', background: '#16A34A', color: '#fff', opacity: busy ? 0.6 : 1, whiteSpace: 'nowrap' }}>
        <Award size={compact ? 12 : 14} /> {busy ? '…' : rt.gradeBtn}
      </button>
      {error && <span style={{ fontSize: 11, color: '#DC2626' }}>{rt.gradeError}</span>}
    </span>
  )
}

/** One row per remaining stripe (and the next belt) — classes punched toward each. */
function StepRow({ step, rt }: { step: GradingStep; rt: RT }) {
  const done = step.earned
  const blocked = step.blockedBy.length > 0
  const accent = done ? '#22C55E' : blocked ? '#F59E0B' : '#0870E2'
  const dots = step.required !== null && step.required <= 20
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 shrink-0" style={{ width: 112 }}>
        {step.kind === 'BELT'
          ? <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: step.rankColor, border: '1px solid #D1D5DB' }} />
          : <span className="w-2.5 h-1 rounded-sm shrink-0" style={{ background: '#111827' }} />}
        <span style={{ fontSize: 12, fontWeight: step.kind === 'BELT' ? 600 : 500, color: '#374151' }} className="truncate">{stepLabel(step, rt)}</span>
      </div>
      <div className="flex-1 min-w-0">
        {step.required === null ? null : dots ? (
          <div className="flex flex-wrap gap-[3px]">
            {Array.from({ length: step.required }, (_, i) => (
              <span key={i} className="rounded-full" style={{ width: 9, height: 9, background: i < (step.classes ?? 0) ? accent : '#E5E7EB' }} />
            ))}
          </div>
        ) : (
          <div style={{ height: 6, background: '#F3F4F6', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.floor(((step.classes ?? 0) / step.required) * 100)}%`, background: accent, borderRadius: 999 }} />
          </div>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-1 justify-end" style={{ width: 58 }}>
        {step.required !== null && (
          <span style={{ fontSize: 11, fontWeight: 600, color: done ? '#15803D' : '#6B7280' }}>{step.classes}/{step.required}</span>
        )}
        {done ? <Check size={13} style={{ color: '#16A34A' }} /> : blocked ? <Lock size={12} style={{ color: '#D97706' }} /> : null}
      </div>
    </div>
  )
}

/** Attendance & grading card for the student profile. */
export function AttendanceGradingCard({ readiness, lastGradedAt, target, onGraded, onViewAttendance }: {
  readiness: Readiness
  lastGradedAt: string | null
  target?: GradeTarget
  onGraded?: () => void
  onViewAttendance?: () => void
}) {
  const { t, locale } = useLanguage()
  const rt = t.readiness
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
  const dueDays = daysSince(readiness.dueSince, new Date())

  if (readiness.status === 'TOP_RANK') return <ReadinessBadge status="TOP_RANK" />
  const incomplete = incompleteLabel(readiness, rt)
  if (readiness.status === 'NO_RULES') {
    return incomplete
      ? <p className="flex items-center gap-1.5" style={{ fontSize: 12, color: '#B45309', margin: 0 }}><AlertTriangle size={12} /> {incomplete}</p>
      : <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>{rt.noRulesHint}</p>
  }

  const due = dueLabel(readiness, rt)
  const toNext = toNextLabel(readiness, rt)
  const notes = countNotes(readiness, rt)

  return (
    <div className="flex flex-col gap-3">
      {/* What is due */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{rt.due}</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: due ? '#15803D' : '#111827', margin: '2px 0 0', letterSpacing: '-0.01em' }}>
            {due ?? rt.nothingDue}
          </p>
          {dueDays !== null && readiness.dueSince && (
            <p style={{ fontSize: 12, margin: '2px 0 0', fontWeight: dueDays >= OVERDUE_DAYS ? 600 : 400, color: dueDays >= OVERDUE_DAYS ? '#B91C1C' : '#6B7280' }}>
              {dueDays === 0 ? rt.dueToday : rt.dueForDays.replace('{n}', String(dueDays)).replace('{date}', fmt(readiness.dueSince))}
              {readiness.dueSinceEstimated && (
                <span title={rt.estimatedHint} style={{ fontWeight: 400, color: '#9CA3AF', cursor: 'help' }}> · {rt.estimatedTag}</span>
              )}
            </p>
          )}
          {toNext && <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>{toNext}</p>}
        </div>
        {target && onGraded && readiness.due
          ? <GradeButton target={target} readiness={readiness} onDone={onGraded} />
          : <ReadinessBadge status={readiness.status} />}
      </div>

      {/* Counters */}
      <div className="grid grid-cols-2 gap-2">
        <div style={{ background: '#fff', border: '1px solid #F3F4F6', borderRadius: 10, padding: '8px 10px' }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.1 }}>{readiness.classesSince}</p>
          <p style={{ fontSize: 11, color: '#6B7280', margin: '2px 0 0' }}>{rt.classesSinceGrading}</p>
        </div>
        <div style={{ background: '#fff', border: '1px solid #F3F4F6', borderRadius: 10, padding: '8px 10px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0, lineHeight: 1.4 }}>{lastGradedAt ? fmt(lastGradedAt) : rt.never}</p>
          <p style={{ fontSize: 11, color: '#6B7280', margin: '2px 0 0' }}>{rt.lastGrading}</p>
        </div>
      </div>

      {/* Punch card: one row per remaining stripe + next belt */}
      {readiness.steps.length > 0 && (
        <div className="flex flex-col gap-2" style={{ background: '#fff', border: '1px solid #F3F4F6', borderRadius: 10, padding: '10px 12px' }}>
          {readiness.steps.map(s => <StepRow key={`${s.kind}-${s.degree}`} step={s} rt={rt} />)}
        </div>
      )}

      {blockReasons(readiness, rt).map(text => (
        <p key={text} className="flex items-center gap-1.5" style={{ fontSize: 12, color: '#B45309', margin: 0 }}>
          <Lock size={12} /> {text}
        </p>
      ))}

      {notes.map(text => (
        <p key={text} className="flex items-center gap-1.5" style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
          <AlertTriangle size={12} /> {text}
        </p>
      ))}

      {incomplete && (
        <p className="flex items-center gap-1.5" style={{ fontSize: 12, color: '#B45309', margin: 0 }}>
          <AlertTriangle size={12} /> {incomplete}
        </p>
      )}


      {readiness.manualChecks.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {readiness.manualChecks.map(c => (
            <span key={c} style={{ fontSize: 11, color: '#6B7280', background: '#fff', border: '1px solid #E5E7EB', padding: '2px 8px', borderRadius: 999 }}>
              {c === 'EXAM' ? rt.manualExam : rt.manualCompetition}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>
          {readiness.countSince ? rt.countingSince.replace('{date}', fmt(readiness.countSince)) : rt.countingSinceJoin}
        </p>
        {onViewAttendance && (
          <button onClick={onViewAttendance} className="cursor-pointer shrink-0"
            style={{ fontSize: 12, color: '#0870E2', background: 'none', border: 'none', fontWeight: 500, padding: 0 }}>
            {rt.viewAttendance}
          </button>
        )}
      </div>
    </div>
  )
}
