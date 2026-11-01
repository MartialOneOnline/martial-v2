'use client'

// Belt rule fields — shared by Settings → Grading (a school's own ranks) and
// the super admin's grading templates. Pure form: the parent owns the value
// and saving.
import { Fragment } from 'react'
import { useT } from '../../lib/i18n/LanguageContext'
import type { Translations } from '../../lib/i18n/translations'

export interface RankRulesValue {
  name: string
  color: string
  maxDegrees: number
  minAge: number | null
  minMonthsAtPrevious: number | null
  totalClassesRequired: number | null
  classesByDegree: number[]
  monthsByDegree: number[]
  minAgeByDegree: number[]
  classesPerPeriod: number | null
  maxClassesPerPeriod: number | null
  periodType: string | null
}

export const COLOR_PRESETS = [
  '#9CA3AF', // white/grey
  '#2563EB', // blue
  '#7C3AED', // purple
  '#92400E', // brown
  '#111827', // black
  '#EAB308', // yellow
  '#F97316', // orange
  '#16A34A', // green
  '#DC2626', // red
]

/** Per-grading list edited cell by cell: blanks are 0, trailing blanks dropped. */
export function setStepValue(list: number[], i: number, raw: string): number[] {
  const next = [...list]
  while (next.length <= i) next.push(0)
  next[i] = raw ? Math.max(0, Math.round(Number(raw)) || 0) : 0
  while (next.length && !next[next.length - 1]) next.pop()
  return next
}

/** Client-side check matching the API's parseFrequency — null when fine. */
export function frequencyError(v: RankRulesValue, rt: Translations['readiness']): string | null {
  const hasFreq = (v.classesPerPeriod ?? 0) > 0 || (v.maxClassesPerPeriod ?? 0) > 0
  if (hasFreq && !v.periodType) return rt.freqPeriodRequired
  if (v.classesPerPeriod && v.maxClassesPerPeriod && v.maxClassesPerPeriod < v.classesPerPeriod) return rt.freqMaxBelowMin
  return null
}

/** One entry per grading at the belt (each stripe, then the next belt); ages per stripe only. */
export function trimRankLists<T extends RankRulesValue>(v: T): T {
  return {
    ...v,
    classesByDegree: v.classesByDegree.slice(0, v.maxDegrees + 1),
    monthsByDegree: v.monthsByDegree.slice(0, v.maxDegrees + 1),
    minAgeByDegree: v.minAgeByDegree.slice(0, v.maxDegrees),
  }
}

const INP: React.CSSProperties = {
  border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '7px 10px',
  fontSize: 13, color: '#111827', background: '#fff', outline: 'none', width: '100%', minWidth: 0,
}
const LBL: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }
const SUB: React.CSSProperties = { fontSize: 10, color: '#9CA3AF', display: 'block', marginBottom: 2 }

export function RankRulesFields<T extends RankRulesValue>({ value: form, onChange: set, nextRankName, labels }: {
  value: T
  onChange: <K extends keyof RankRulesValue>(key: K, v: RankRulesValue[K]) => void
  nextRankName: string | null
  /** Fixed labels instead of the viewer's language — the admin panel is English-only */
  labels?: Translations['readiness']
}) {
  const viewerLabels = useT().readiness
  const rt = labels ?? viewerLabels
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label style={LBL}>{rt.rankName}</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} style={INP} />
        </div>
        <div>
          <label style={LBL}>{rt.rankStripes}</label>
          <select value={form.maxDegrees} onChange={e => set('maxDegrees', Number(e.target.value))} style={INP}>
            <option value={0}>{rt.rankNoStripes}</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>{rt.rankNStripes.replace('{n}', String(n))}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Color */}
      <div>
        <label style={{ ...LBL, marginBottom: 6 }}>{rt.rankColor}</label>
        <div className="flex items-center gap-2 flex-wrap">
          {COLOR_PRESETS.map(c => (
            <button key={c} onClick={() => set('color', c)}
              style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: form.color === c ? '3px solid #0870E2' : '2px solid transparent', cursor: 'pointer', outline: 'none' }} />
          ))}
          <input type="color" value={form.color} onChange={e => set('color', e.target.value)}
            style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #E5E7EB', cursor: 'pointer', padding: 2, background: '#fff' }} />
        </div>
      </div>

      {/* Requirements to reach this belt */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label style={LBL}>{rt.rankMinAge}</label>
          <input type="number" min={0} max={99} value={form.minAge ?? ''} placeholder="—"
            onChange={e => set('minAge', e.target.value ? Number(e.target.value) : null)} style={INP} />
        </div>
        <div>
          <label style={LBL}>{rt.rankMonthsAtPrev}</label>
          <input type="number" min={0} value={form.minMonthsAtPrevious ?? ''} placeholder="—"
            onChange={e => set('minMonthsAtPrevious', e.target.value ? Number(e.target.value) : null)} style={INP} />
        </div>
        <div>
          <label style={LBL}>{rt.rankDefaultClasses}</label>
          <input type="number" min={0} value={form.totalClassesRequired ?? ''} placeholder="—"
            onChange={e => set('totalClassesRequired', e.target.value ? Number(e.target.value) : null)} style={INP} />
        </div>
      </div>

      {/* Training frequency at this belt */}
      <div>
        <label style={{ ...LBL, marginBottom: 2 }}>{rt.freqLabel}</label>
        <p style={{ fontSize: 11, color: '#9CA3AF', margin: '0 0 6px' }}>{rt.freqHint}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <span style={SUB}>{rt.freqMin}</span>
            <input type="number" min={0} value={form.classesPerPeriod ?? ''} placeholder="—"
              onChange={e => set('classesPerPeriod', e.target.value ? Number(e.target.value) : null)} style={INP} />
          </div>
          <div>
            <span style={SUB}>{rt.freqMax}</span>
            <input type="number" min={0} value={form.maxClassesPerPeriod ?? ''} placeholder="—"
              onChange={e => set('maxClassesPerPeriod', e.target.value ? Number(e.target.value) : null)} style={INP} />
          </div>
          <div>
            <span style={SUB}>{rt.freqPeriod}</span>
            <select value={form.periodType ?? ''} onChange={e => set('periodType', e.target.value || null)} style={INP}>
              <option value="">—</option>
              <option value="WEEK">{rt.periodWeek}</option>
              <option value="MONTH">{rt.periodMonth}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Rules for each grading at this belt: classes, time, age */}
      <div>
        <label style={{ ...LBL, marginBottom: 2 }}>{rt.rulesStepsLabel}</label>
        <p style={{ fontSize: 11, color: '#9CA3AF', margin: '0 0 6px' }}>{rt.rulesStepsHint}</p>
        <div className="grid gap-x-2 gap-y-1.5 items-center" style={{ gridTemplateColumns: 'minmax(72px, 1.2fr) repeat(3, minmax(0, 1fr))' }}>
          <span style={SUB}>{rt.colStep}</span>
          <span style={SUB}>{rt.colClasses}</span>
          <span style={SUB}>{rt.colMonths}</span>
          <span style={SUB}>{rt.colAge}</span>
          {Array.from({ length: form.maxDegrees + 1 }, (_, i) => {
            const isBelt = i === form.maxDegrees
            return (
              <Fragment key={i}>
                <span style={{ fontSize: 12, color: '#374151', fontWeight: isBelt ? 600 : 500 }} className="truncate">
                  {isBelt ? rt.toNextBelt.replace('{belt}', nextRankName ?? '—') : rt.toStripe.replace('{n}', String(i + 1))}
                </span>
                <input type="number" min={0} value={form.classesByDegree[i] || ''}
                  placeholder={form.totalClassesRequired ? String(form.totalClassesRequired) : '—'}
                  onChange={e => set('classesByDegree', setStepValue(form.classesByDegree, i, e.target.value))} style={INP} />
                <input type="number" min={0} value={form.monthsByDegree[i] || ''} placeholder="—"
                  onChange={e => set('monthsByDegree', setStepValue(form.monthsByDegree, i, e.target.value))} style={INP} />
                {isBelt ? (
                  <span style={{ fontSize: 13, color: '#D1D5DB', textAlign: 'center' }} title={nextRankName ? rt.beltRowHint.replaceAll('{belt}', nextRankName) : undefined}>—</span>
                ) : (
                  <input type="number" min={0} max={99} value={form.minAgeByDegree[i] || ''} placeholder="—"
                    onChange={e => set('minAgeByDegree', setStepValue(form.minAgeByDegree, i, e.target.value))} style={INP} />
                )}
              </Fragment>
            )
          })}
        </div>
        {nextRankName && (
          <p style={{ fontSize: 11, color: '#9CA3AF', margin: '6px 0 0' }}>{rt.beltRowHint.replaceAll('{belt}', nextRankName)}</p>
        )}
      </div>
    </>
  )
}
