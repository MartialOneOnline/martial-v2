'use client'

// Settings → Grading, one grading system: how classes count (shared by every
// belt), the belts table with an inline editor, and one Save for all of it.
// The data rules live in lib/grading/settingsDraft.ts.
import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, Minus, Plus, Trash2 } from 'lucide-react'
import { useLanguage, useT } from '../../lib/i18n/LanguageContext'
import { COLOR_PRESETS } from './RankRulesFields'
import {
  buildSavePayload, commonRules, estimateBelt, frequencyInvalid, hasOwnFrequency, normalizeFrequency,
  stepCount, toDraft, type CommonRules, type DraftRank, type Frequency, type PeriodType,
} from '../../lib/grading/settingsDraft'

export interface SchoolClassOption { id: string; name: string; isActive: boolean }

interface Snapshot { draft: DraftRank[]; common: CommonRules; own: Record<string, boolean> }

function snapshotFrom(ranks: DraftRank[]): Snapshot {
  const draft = toDraft(ranks)
  const common = commonRules(draft)
  const own: Record<string, boolean> = {}
  for (const r of draft) own[r.id] = hasOwnFrequency(r, common)
  // A system with no rule yet: give the steppers a period to start from
  if (!common.periodType) common.periodType = 'WEEK'
  return { draft, common, own }
}

const payloadKey = (s: Snapshot) => JSON.stringify(buildSavePayload(s.draft, s.common, s.own))

/** Text on a belt-coloured chip stays readable on light belts (white, yellow) */
function inkOn(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) return '#FFFFFF'
  const n = parseInt(m[1]!, 16)
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return lum > 0.6 ? '#111827' : '#FFFFFF'
}
const isLight = (hex: string) => inkOn(hex) === '#111827'

const CARD: React.CSSProperties = {
  background: '#FFFFFF', borderRadius: 18, overflow: 'hidden',
  boxShadow: '0 1px 2px rgba(16,24,40,0.05), 0 0 0 1px rgba(16,24,40,0.06)',
}
const H2: React.CSSProperties = { margin: 0, fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em', color: '#111827' }
const SUB: React.CSSProperties = { margin: 0, fontSize: 14, color: '#4B5563', lineHeight: 1.45 }
const LABEL: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: '#374151' }

function Stepper({ value, onChange, min = 0, max = 999, label, size = 'md', emptyLabel }: {
  value: number; onChange: (n: number) => void; min?: number; max?: number; label: string
  size?: 'md' | 'sm'; emptyLabel?: string
}) {
  const h = size === 'md' ? 44 : 32
  const btn: React.CSSProperties = {
    width: h, height: h, border: 'none', background: 'transparent', color: '#374151',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
  }
  const clamp = (n: number) => Math.min(max, Math.max(min, n))
  return (
    <div className="flex items-center" style={{ border: '1px solid #E5E7EB', borderRadius: size === 'md' ? 12 : 10, background: '#fff' }}>
      <button type="button" aria-label={`${label} −`} disabled={value <= min} onClick={() => onChange(clamp(value - 1))}
        style={{ ...btn, opacity: value <= min ? 0.35 : 1, cursor: value <= min ? 'default' : 'pointer' }}>
        <Minus size={size === 'md' ? 16 : 14} aria-hidden />
      </button>
      <input aria-label={label} inputMode="numeric" value={value === 0 && emptyLabel ? '' : String(value)} placeholder={emptyLabel}
        onChange={e => { const n = parseInt(e.target.value.replace(/\D/g, ''), 10); onChange(clamp(Number.isFinite(n) ? n : 0)) }}
        onFocus={e => e.currentTarget.select()}
        style={{
          width: size === 'md' ? 44 : 40, border: 'none', outline: 'none', textAlign: 'center', background: 'transparent',
          fontSize: size === 'md' ? 17 : 15, fontWeight: 600, color: '#111827', fontVariantNumeric: 'tabular-nums', padding: 0,
        }} />
      <button type="button" aria-label={`${label} +`} disabled={value >= max} onClick={() => onChange(clamp(value + 1))}
        style={{ ...btn, opacity: value >= max ? 0.35 : 1, cursor: value >= max ? 'default' : 'pointer' }}>
        <Plus size={size === 'md' ? 16 : 14} aria-hidden />
      </button>
    </div>
  )
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      style={{ position: 'relative', flexShrink: 0, width: 46, height: 28, borderRadius: 999, border: 'none', padding: 0, cursor: 'pointer',
        background: checked ? '#0870E2' : '#D1D5DB', transition: 'background .2s' }}>
      <span style={{ position: 'absolute', top: 3, left: checked ? 21 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left .2s' }} />
    </button>
  )
}

function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string
}) {
  return (
    <div role="group" aria-label={label} className="flex" style={{ padding: 3, background: '#F1F2F4', borderRadius: 12, gap: 2 }}>
      {options.map(o => {
        const on = o.value === value
        return (
          <button key={o.value} type="button" aria-pressed={on} onClick={() => onChange(o.value)}
            style={{ minHeight: 38, padding: '0 16px', border: 'none', borderRadius: 9, fontSize: 14, cursor: 'pointer',
              background: on ? '#fff' : 'transparent', color: on ? '#111827' : '#4B5563', fontWeight: on ? 600 : 500,
              boxShadow: on ? '0 1px 2px rgba(16,24,40,0.12)' : 'none' }}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function SettingRow({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between flex-wrap" style={{ gap: 12, minHeight: 52, padding: '6px 0', borderBottom: '1px solid #F1F2F4' }}>
      <div className="flex flex-col" style={{ gap: 2, flex: '1 1 200px', minWidth: 0 }}>
        <span style={{ fontSize: 14, color: '#111827' }}>{title}</span>
        {hint && <span style={{ fontSize: 12, color: '#4B5563' }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

export default function GradingSystemSettings({ systemId, ranks, classes, onRanksChange, onDirtyChange }: {
  systemId: string
  ranks: DraftRank[]
  classes: SchoolClassOption[]
  /** The saved belts changed (save, add, delete) — keeps the parent's list in sync */
  onRanksChange: (ranks: DraftRank[]) => void
  onDirtyChange?: (dirty: boolean) => void
}) {
  const g = useT().gradingSettings
  const { locale } = useLanguage()

  const [saved, setSaved] = useState<Snapshot>(() => snapshotFrom(ranks))
  const [cur, setCur] = useState<Snapshot>(saved)
  const [open, setOpen] = useState<string | null>(null)
  const [more, setMore] = useState<Record<string, boolean>>({})
  const [monthsOn, setMonthsOn] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(saved.draft.map(r => [r.id, r.monthsByDegree.some(n => n > 0)])))
  const [agesOn, setAgesOn] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(saved.draft.map(r => [r.id, r.minAgeByDegree.some(n => n > 0)])))
  const [fill, setFill] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(COLOR_PRESETS[0]!)
  const [busy, setBusy] = useState(false)
  const [structError, setStructError] = useState(false)

  const dirty = useMemo(() => payloadKey(cur) !== payloadKey(saved), [cur, saved])
  useEffect(() => { onDirtyChange?.(dirty) }, [dirty, onDirtyChange])
  // Closing the tab with unsaved belts asks first
  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  const { draft, common, own } = cur
  const unit = (p: PeriodType | null) => (p === 'MONTH' ? g.month : g.week)

  // ── edits ────────────────────────────────────────────────────────────────
  function setCommon(patch: Partial<CommonRules>) {
    setCur(c => ({ ...c, common: { ...c.common, ...patch } }))
  }
  function editRank(id: string, fn: (r: DraftRank) => DraftRank) {
    setCur(c => ({ ...c, draft: c.draft.map(r => (r.id === id ? fn({ ...r }) : r)) }))
  }
  function setStep(r: DraftRank, list: 'classesByDegree' | 'monthsByDegree' | 'minAgeByDegree', i: number, v: number) {
    editRank(r.id, x => { const l = [...x[list]]; while (l.length <= i) l.push(0); l[i] = v; return { ...x, [list]: l } })
  }
  function setOwn(id: string, on: boolean) {
    setCur(c => ({
      ...c, own: { ...c.own, [id]: on },
      // Starting your own from the shared value is what people expect
      draft: on ? c.draft.map(r => (r.id === id ? { ...r, ...normalizeFrequency(c.common), periodType: c.common.periodType ?? 'WEEK' } : r)) : c.draft,
    }))
  }
  /** "Use for all": a belt's own frequency becomes the shared one */
  function adoptFrequency(r: DraftRank) {
    setCur(c => ({
      ...c, common: { ...c.common, ...normalizeFrequency(r), periodType: (r.periodType as PeriodType) ?? 'WEEK' },
      own: Object.fromEntries(Object.keys(c.own).map(k => [k, false])),
    }))
  }
  function changeFreq(f: Frequency, patch: Partial<Frequency>, apply: (n: Frequency) => void) {
    const n = { ...f, ...patch }
    if ((n.classesPerPeriod ?? 0) > 0 || (n.maxClassesPerPeriod ?? 0) > 0) n.periodType = n.periodType ?? 'WEEK'
    // Raising the min past the max raises the max with it
    if (patch.classesPerPeriod !== undefined && n.maxClassesPerPeriod && n.classesPerPeriod && n.maxClassesPerPeriod < n.classesPerPeriod) n.maxClassesPerPeriod = n.classesPerPeriod
    apply({ classesPerPeriod: n.classesPerPeriod || null, maxClassesPerPeriod: n.maxClassesPerPeriod || null, periodType: n.periodType })
  }

  // ── save ─────────────────────────────────────────────────────────────────
  const invalid = frequencyInvalid(common) || draft.some(r => own[r.id] && frequencyInvalid(normalizeFrequency(r))) || draft.some(r => !r.name.trim())

  async function save() {
    if (invalid || saving) return
    setSaving(true); setSaveError(false)
    try {
      const res = await fetch(`/api/dashboard/grading-systems/${systemId}/ranks`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ranks: buildSavePayload(cur.draft, cur.common, cur.own) }),
      })
      if (!res.ok) { setSaveError(true); return }
      const { ranks: fresh } = await res.json() as { ranks: DraftRank[] }
      // Keep the screen exactly as edited; the server's copy is the new baseline
      const next = snapshotFrom(fresh)
      const keepOwn = { ...next.own }
      for (const r of next.draft) if (cur.own[r.id] && hasOwnFrequency(r, next.common)) keepOwn[r.id] = true
      const snap = { ...next, common: { ...next.common, periodType: next.common.periodType ?? cur.common.periodType }, own: keepOwn }
      setSaved(snap); setCur(snap)
      onRanksChange(fresh)
      setJustSaved(true); setTimeout(() => setJustSaved(false), 1800)
    } catch {
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }
  function discard() { setCur(saved); setSaveError(false) }

  // ── structure (immediate) ────────────────────────────────────────────────
  async function addBelt() {
    if (!newName.trim() || busy) return
    setBusy(true); setStructError(false)
    try {
      const f = normalizeFrequency(saved.common)
      const res = await fetch(`/api/dashboard/grading-systems/${systemId}/ranks`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), color: newColor, ...f, classTypeIds: saved.common.classTypeIds }),
      })
      if (!res.ok) { setStructError(true); return }
      const { rank } = await res.json() as { rank: DraftRank }
      const [d] = toDraft([rank])
      const add = (s: Snapshot): Snapshot => ({ ...s, draft: [...s.draft, d!], own: { ...s.own, [rank.id]: false } })
      setSaved(add); setCur(add)
      onRanksChange([...saved.draft, rank])
      setNewName(''); setAdding(false); setOpen(rank.id)
    } catch {
      setStructError(true)
    } finally {
      setBusy(false)
    }
  }
  async function deleteBelt(r: DraftRank) {
    if (busy || !confirm(g.deleteConfirm.replace('{name}', r.name))) return
    setBusy(true); setStructError(false)
    try {
      const res = await fetch(`/api/dashboard/grading-systems/${systemId}/ranks/${r.id}`, { method: 'DELETE' })
      if (!res.ok) { setStructError(true); return }
      const drop = (s: Snapshot): Snapshot => ({ ...s, draft: s.draft.filter(x => x.id !== r.id) })
      setSaved(drop); setCur(drop)
      onRanksChange(saved.draft.filter(x => x.id !== r.id))
      setOpen(null)
    } catch {
      setStructError(true)
    } finally {
      setBusy(false)
    }
  }

  // ── wording ──────────────────────────────────────────────────────────────
  const fmtMonths = (m: number | null): string => {
    if (!m) return '—'
    if (m < 12) return m === 1 ? g.oneMonth : g.nMonths.replace('{n}', String(m))
    const y = Math.round((m / 12) * 2) / 2
    return y === 1 ? g.oneYear : g.nYears.replace('{n}', y.toLocaleString(locale))
  }
  const approx = (m: number | null) => (m ? g.approx.replace('{t}', fmtMonths(m)) : '—')

  function freqSentence(f: Frequency): string {
    const u = unit(f.periodType)
    const min = f.classesPerPeriod, max = f.maxClassesPerPeriod
    if (min && max) return g.freqBoth.replace('{min}', String(min)).replace('{max}', String(max)).replaceAll('{unit}', u)
    if (min) return g.freqMinOnly.replace('{min}', String(min)).replaceAll('{unit}', u)
    if (max) return g.freqMaxOnly.replace('{max}', String(max)).replaceAll('{unit}', u)
    return g.freqNone
  }
  const freqShort = (f: Frequency | DraftRank) => {
    const n = normalizeFrequency(f)
    if (!n.classesPerPeriod && !n.maxClassesPerPeriod) return g.noRule
    return g.freqShort.replace('{min}', String(n.classesPerPeriod ?? 0)).replace('{max}', n.maxClassesPerPeriod ? String(n.maxClassesPerPeriod) : '∞').replace('{unit}', unit(n.periodType))
  }

  const classById = new Map(classes.map(c => [c.id, c]))
  const selectedNames = common.classTypeIds.map(id => classById.get(id)?.name).filter((n): n is string => !!n)
  const typesSentence = selectedNames.length ? g.onlyCount.replace('{list}', selectedNames.join(', ')) : g.allCount

  const ownBelts = draft.filter(r => own[r.id])
  const sorted = draft // already ordered by toDraft

  const estimates = sorted.map((r, i) => {
    const next = sorted[i + 1] ?? null
    const f = own[r.id] ? normalizeFrequency(r) : normalizeFrequency(common)
    return { r, next, f, e: estimateBelt(r, next, f) }
  })
  const journeyParts = estimates.filter(x => x.next)
  const journey = journeyParts.length && journeyParts.every(x => x.e.months)
    ? journeyParts.reduce((s, x) => s + (x.e.months ?? 0), 0) : null

  function summary(x: typeof estimates[number]): string {
    const { r, next, f, e } = x
    if (!e.totalClasses) {
      const m = r.monthsByDegree.slice(0, stepCount(r, !!next)).filter(n => n > 0)
      return m.length ? g.sumByTime.replace('{from}', r.name).replace('{t}', fmtMonths(Math.max(...m))) : g.sumNoRule.replace('{from}', r.name)
    }
    const per = f.maxClassesPerPeriod ?? f.classesPerPeriod
    let s = (next ? g.sumTo.replace('{to}', next.name) : g.sumLast).replace('{from}', r.name).replace('{n}', String(e.totalClasses))
    if (selectedNames.length) s += g.sumOf.replace('{list}', selectedNames.join(g.or))
    if (f.classesPerPeriod) s += g.sumAtLeast.replace('{min}', String(f.classesPerPeriod)).replace('{unit}', unit(f.periodType))
    s += '.'
    if (per && e.classMonths) s += ' ' + g.sumTraining.replace('{per}', String(per)).replace('{unit}', unit(f.periodType)).replace('{t}', fmtMonths(e.classMonths))
    if (next?.minMonthsAtPrevious) s += ' ' + g.sumMinTime.replace('{t}', fmtMonths(next.minMonthsAtPrevious)).replace('{from}', r.name)
    if (next?.minAge) s += ' ' + g.sumMinAge.replace('{n}', String(next.minAge))
    if (next?.requireExam) s += ' ' + g.sumExam
    return s
  }

  // ── render ───────────────────────────────────────────────────────────────
  const freqControls = (f: Frequency, apply: (n: Frequency) => void) => (
    <div className="flex flex-wrap items-end" style={{ gap: '14px 24px' }}>
      <div className="flex flex-col" style={{ gap: 8 }}>
        <span style={LABEL}>{g.minimum}</span>
        <Stepper label={g.minimum} value={f.classesPerPeriod ?? 0} max={99}
          onChange={n => changeFreq(f, { classesPerPeriod: n }, apply)} />
      </div>
      <div className="flex flex-col" style={{ gap: 8 }}>
        <span style={LABEL}>{g.maximum}</span>
        <Stepper label={g.maximum} value={f.maxClassesPerPeriod ?? 0} max={99} emptyLabel="∞"
          onChange={n => changeFreq(f, { maxClassesPerPeriod: n }, apply)} />
      </div>
      <div className="flex flex-col" style={{ gap: 8 }}>
        <span style={LABEL}>{g.per}</span>
        <Segmented label={g.per} value={(f.periodType ?? 'WEEK') as PeriodType}
          options={[{ value: 'WEEK', label: g.weekCap }, { value: 'MONTH', label: g.monthCap }]}
          onChange={p => apply({ ...f, periodType: p })} />
      </div>
    </div>
  )

  return (
    <div className="flex flex-col" style={{ gap: 24 }}>
      {/* How classes count */}
      <section aria-labelledby={`count-${systemId}`} style={CARD}>
        <div className="flex flex-col" style={{ padding: '22px 24px 4px', gap: 4 }}>
          <h2 id={`count-${systemId}`} style={H2}>{g.countTitle}</h2>
          <p style={SUB}>{g.countSub}</p>
        </div>
        <div className="flex flex-wrap items-end" style={{ padding: '18px 24px', gap: '16px 28px', borderBottom: '1px solid #F1F2F4' }}>
          {freqControls(common, n => setCommon(n))}
          <p aria-live="polite" style={{ flex: '1 1 220px', margin: 0, fontSize: 14, lineHeight: 1.5, color: '#374151', background: '#F7F9FC', borderRadius: 12, padding: '12px 14px' }}>
            {freqSentence(common)}
          </p>
        </div>
        {frequencyInvalid(common) && (
          <p role="alert" style={{ margin: 0, padding: '10px 24px', fontSize: 13, color: '#B91C1C', background: '#FEF2F2' }}>{g.maxBelowMin}</p>
        )}
        {ownBelts.length > 0 && (
          <div className="flex flex-wrap items-center justify-between" style={{ gap: 10, padding: '12px 24px', background: '#FFFBEB', borderBottom: '1px solid #FDE68A' }}>
            <p style={{ margin: 0, fontSize: 13, color: '#92400E', flex: '1 1 260px' }}>
              {g.ownHint.replace('{list}', ownBelts.map(r => `${r.name} (${freqShort(r)})`).join(', '))}
            </p>
            {ownBelts.length === 1 && (
              <button type="button" onClick={() => adoptFrequency(ownBelts[0]!)}
                style={{ minHeight: 36, padding: '0 14px', borderRadius: 999, border: '1px solid #FCD34D', background: '#fff', color: '#92400E', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {g.useForAll}
              </button>
            )}
          </div>
        )}
        <div className="flex flex-col" style={{ padding: '18px 24px 22px', gap: 12 }}>
          <div className="flex flex-wrap items-baseline justify-between" style={{ gap: 8 }}>
            <span style={LABEL}>{g.whichClasses}</span>
            <span style={{ fontSize: 13, color: '#4B5563' }}>{typesSentence}</span>
          </div>
          {classes.length === 0 ? (
            <p style={{ ...SUB, fontSize: 13 }}>{g.noClasses}</p>
          ) : (
            <div className="flex flex-wrap" style={{ gap: 8 }}>
              {classes.map(c => {
                const on = common.classTypeIds.includes(c.id)
                return (
                  <button key={c.id} type="button" aria-pressed={on}
                    onClick={() => setCommon({ classTypeIds: on ? common.classTypeIds.filter(x => x !== c.id) : [...common.classTypeIds, c.id] })}
                    className="inline-flex items-center cursor-pointer"
                    style={{ gap: 6, minHeight: 40, padding: '0 14px', borderRadius: 999, fontSize: 14,
                      background: on ? '#0870E2' : '#fff', border: `1px solid ${on ? '#0870E2' : '#E5E7EB'}`,
                      color: on ? '#fff' : '#374151', fontWeight: on ? 600 : 500 }}>
                    {on && <Check size={14} strokeWidth={2.5} aria-hidden />}
                    {c.name}
                    {!c.isActive && <span style={{ fontSize: 11, opacity: 0.8 }}>· {g.inactive}</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Belts */}
      <section aria-labelledby={`belts-${systemId}`} style={CARD}>
        <div className="flex flex-wrap items-end justify-between" style={{ padding: '22px 24px 14px', gap: 12 }}>
          <div className="flex flex-col" style={{ gap: 4 }}>
            <h2 id={`belts-${systemId}`} style={H2}>{g.beltsTitle}</h2>
            <p style={SUB}>{g.beltsSub}</p>
          </div>
          {journey && sorted.length > 1 && (
            <span style={{ fontSize: 13, color: '#4B5563' }}>
              {sorted[0]!.name} → {sorted[sorted.length - 1]!.name}: <strong style={{ color: '#111827', fontWeight: 600 }}>{approx(journey)}</strong>
            </span>
          )}
        </div>

        <div aria-hidden className="hidden sm:grid" style={{ gridTemplateColumns: 'minmax(150px,1.3fr) minmax(0,2fr) minmax(96px,.8fr) 20px', gap: 12, padding: '8px 24px', fontSize: 12, fontWeight: 500, color: '#4B5563', borderTop: '1px solid #F1F2F4', borderBottom: '1px solid #F1F2F4', background: '#FAFAFB' }}>
          <span>{g.colBelt}</span><span>{g.colSteps}</span><span style={{ textAlign: 'right' }}>{g.colTime}</span><span />
        </div>

        {sorted.length === 0 && <p style={{ ...SUB, padding: '16px 24px' }}>{g.noBelts}</p>}

        {estimates.map(({ r, next, f, e }) => {
          const isOpen = open === r.id
          const steps = stepCount(r, !!next)
          const usesClasses = e.totalClasses > 0
          const panelId = `belt-${r.id}`
          return (
            <div key={r.id} style={{ borderBottom: '1px solid #F1F2F4' }}>
              <button type="button" aria-expanded={isOpen} aria-controls={panelId} onClick={() => setOpen(isOpen ? null : r.id)}
                className="w-full grid items-center cursor-pointer text-left grid-cols-[minmax(0,1fr)_auto_20px] sm:grid-cols-[minmax(150px,1.3fr)_minmax(0,2fr)_minmax(96px,.8fr)_20px]"
                style={{ gap: '8px 12px', minHeight: 64, padding: '12px 24px', border: 'none', background: isOpen ? '#FCFCFD' : '#fff' }}>
                <span className="flex items-center" style={{ gap: 12, minWidth: 0 }}>
                  <span aria-hidden style={{ width: 28, height: 10, borderRadius: 3, flexShrink: 0, background: r.color, border: `1px solid ${isLight(r.color) ? '#D1D5DB' : r.color}` }} />
                  <span className="flex flex-col" style={{ gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{r.name || '—'}</span>
                    <span style={{ fontSize: 12, color: '#4B5563' }}>
                      {r.maxDegrees === 1 ? g.oneStripe : g.nStripes.replace('{n}', String(r.maxDegrees))}
                      {next?.minAge ? ` · ${g.agePlus.replace('{n}', String(next.minAge))}` : ''}
                    </span>
                  </span>
                </span>
                <span className="flex flex-wrap items-center col-span-3 sm:col-span-1 order-last sm:order-none" style={{ gap: 6, minWidth: 0 }}>
                  {usesClasses ? r.classesByDegree.slice(0, steps).map((n, i) => {
                    const toNext = !!next && i === steps - 1
                    return (
                      <span key={i} style={{ fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums', padding: '3px 8px', borderRadius: 8,
                        background: toNext ? next!.color : '#F3F4F6', color: toNext ? inkOn(next!.color) : '#374151',
                        border: toNext && isLight(next!.color) ? '1px solid #D1D5DB' : '1px solid transparent' }}>
                        {n || '—'}
                      </span>
                    )
                  }) : (
                    <span style={{ fontSize: 12, fontWeight: 500, padding: '3px 8px', borderRadius: 8, background: '#F3F4F6', color: '#374151' }}>
                      {r.monthsByDegree.some(n => n > 0) ? g.byTime : g.noClassRule}
                    </span>
                  )}
                  {own[r.id] && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#92400E', background: '#FEF3C7', padding: '3px 8px', borderRadius: 999 }}>{g.ownBadge}</span>
                  )}
                </span>
                <span style={{ textAlign: 'right', fontSize: 14, fontWeight: 500, color: '#111827', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {next ? approx(e.months) : '—'}
                </span>
                <ChevronDown size={16} aria-hidden style={{ color: '#6B7280', justifySelf: 'end', transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
              </button>

              {isOpen && (
                <div id={panelId} className="flex flex-col" style={{ padding: '4px 24px 24px', gap: 20, background: '#FCFCFD' }}>
                  <p aria-live="polite" style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: '#111827', background: '#EEF5FE', borderRadius: 14, padding: '14px 16px' }}>
                    {summary({ r, next, f, e })}
                  </p>

                  {steps > 0 && (
                    <div className="flex flex-col" style={{ gap: 10 }}>
                      <div className="flex flex-wrap items-center justify-between" style={{ gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{g.stepsTitle}</span>
                        <span className="flex items-center" style={{ gap: 8 }}>
                          <label htmlFor={`fill-${r.id}`} style={{ fontSize: 13, color: '#4B5563' }}>{g.allEqual}</label>
                          <input id={`fill-${r.id}`} inputMode="numeric" value={fill[r.id] ?? ''} placeholder="24"
                            onChange={e => setFill(p => ({ ...p, [r.id]: e.target.value.replace(/\D/g, '') }))}
                            style={{ width: 64, height: 36, boxSizing: 'border-box', border: '1px solid #E5E7EB', borderRadius: 10, padding: '0 10px', fontSize: 14, color: '#111827', background: '#fff' }} />
                          <button type="button" disabled={!fill[r.id]}
                            onClick={() => { const v = parseInt(fill[r.id] ?? '', 10); if (v > 0) editRank(r.id, x => ({ ...x, classesByDegree: Array.from({ length: steps }, () => v) })) }}
                            style={{ height: 36, padding: '0 12px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 600, color: '#0870E2', cursor: fill[r.id] ? 'pointer' : 'default', opacity: fill[r.id] ? 1 : 0.5 }}>
                            {g.apply}
                          </button>
                        </span>
                      </div>
                      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))', gap: 10 }}>
                        {Array.from({ length: steps }, (_, i) => {
                          const toNext = !!next && i === steps - 1
                          const label = toNext ? next!.name : g.nthStripe.replace('{n}', String(i + 1))
                          return (
                            <div key={i} className="flex flex-col" style={{ gap: 10, padding: 12, borderRadius: 14, background: '#fff', border: `1px solid ${toNext ? '#BFD7F6' : '#EEF0F3'}` }}>
                              <span className="flex items-center" style={{ gap: 6, fontSize: 12, fontWeight: 600, color: '#4B5563' }}>
                                <span aria-hidden style={toNext
                                  ? { width: 10, height: 10, borderRadius: '50%', background: next!.color, border: `1px solid ${isLight(next!.color) ? '#D1D5DB' : next!.color}` }
                                  : { width: 10, height: 4, borderRadius: 2, background: '#111827' }} />
                                {label}
                              </span>
                              <div className="flex flex-col" style={{ gap: 4 }}>
                                <span style={{ fontSize: 11, color: '#4B5563' }}>{g.classesLabel}</span>
                                <Stepper size="sm" label={`${g.classesLabel} · ${label}`} value={r.classesByDegree[i] ?? 0} max={9999} emptyLabel="—"
                                  onChange={n => setStep(r, 'classesByDegree', i, n)} />
                              </div>
                              {monthsOn[r.id] && (
                                <div className="flex flex-col" style={{ gap: 4 }}>
                                  <span style={{ fontSize: 11, color: '#4B5563' }}>{g.minMonthsLabel}</span>
                                  <Stepper size="sm" label={`${g.minMonthsLabel} · ${label}`} value={r.monthsByDegree[i] ?? 0} max={1200} emptyLabel="—"
                                    onChange={n => setStep(r, 'monthsByDegree', i, n)} />
                                </div>
                              )}
                              {agesOn[r.id] && !toNext && (
                                <div className="flex flex-col" style={{ gap: 4 }}>
                                  <span style={{ fontSize: 11, color: '#4B5563' }}>{g.minAgeLabel}</span>
                                  <Stepper size="sm" label={`${g.minAgeLabel} · ${label}`} value={r.minAgeByDegree[i] ?? 0} max={120} emptyLabel="—"
                                    onChange={n => setStep(r, 'minAgeByDegree', i, n)} />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* More requirements — out of the way until needed */}
                  <div className="flex flex-col" style={{ border: '1px solid #EEF0F3', borderRadius: 14, background: '#fff' }}>
                    <button type="button" aria-expanded={!!more[r.id]} onClick={() => setMore(m => ({ ...m, [r.id]: !m[r.id] }))}
                      className="flex items-center justify-between text-left cursor-pointer"
                      style={{ gap: 12, minHeight: 48, padding: '0 16px', border: 'none', background: 'transparent', fontSize: 14, fontWeight: 600, color: '#111827' }}>
                      <span>{g.moreTitle}</span>
                      <ChevronDown size={16} aria-hidden style={{ color: '#6B7280', transition: 'transform .2s', transform: more[r.id] ? 'rotate(180deg)' : 'none' }} />
                    </button>
                    {more[r.id] && (
                      <div className="flex flex-col" style={{ padding: '0 16px 12px' }}>
                        <SettingRow title={g.nameAndColor}>
                          <div className="flex flex-wrap items-center" style={{ gap: 10 }}>
                            <input aria-label={g.beltName} value={r.name} maxLength={60}
                              onChange={e => editRank(r.id, x => ({ ...x, name: e.target.value }))}
                              style={{ width: 150, height: 36, boxSizing: 'border-box', border: `1px solid ${r.name.trim() ? '#E5E7EB' : '#FCA5A5'}`, borderRadius: 10, padding: '0 10px', fontSize: 14, color: '#111827' }} />
                            <div className="flex" role="group" aria-label={g.color} style={{ gap: 4 }}>
                              {COLOR_PRESETS.map(c => (
                                <button key={c} type="button" aria-label={c} aria-pressed={r.color === c} onClick={() => editRank(r.id, x => ({ ...x, color: c }))}
                                  style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', padding: 0,
                                    border: r.color === c ? '2px solid #0870E2' : '2px solid #fff', boxShadow: '0 0 0 1px #E5E7EB' }} />
                              ))}
                            </div>
                          </div>
                        </SettingRow>
                        <SettingRow title={g.stripes} hint={g.stripesHint}>
                          <Stepper size="sm" label={g.stripes} value={r.maxDegrees} max={10}
                            onChange={n => editRank(r.id, x => ({ ...x, maxDegrees: n }))} />
                        </SettingRow>
                        {next && (
                          <>
                            <SettingRow title={g.minAgeFor.replace('{to}', next.name)} hint={g.emptyNoMin}>
                              <Stepper size="sm" label={g.minAgeFor.replace('{to}', next.name)} value={next.minAge ?? 0} max={120} emptyLabel="—"
                                onChange={n => editRank(next.id, x => ({ ...x, minAge: n || null }))} />
                            </SettingRow>
                            <SettingRow title={g.minTimeAt.replace('{from}', r.name).replace('{to}', next.name)} hint={g.minTimeHint}>
                              <Stepper size="sm" label={g.minTimeAt.replace('{from}', r.name).replace('{to}', next.name)} value={next.minMonthsAtPrevious ?? 0} max={1200} emptyLabel="—"
                                onChange={n => editRank(next.id, x => ({ ...x, minMonthsAtPrevious: n || null }))} />
                            </SettingRow>
                          </>
                        )}
                        <SettingRow title={g.monthsPerStep} hint={g.monthsPerStepHint}>
                          <Switch label={g.monthsPerStep} checked={!!monthsOn[r.id]} onChange={v => {
                            setMonthsOn(m => ({ ...m, [r.id]: v }))
                            if (!v) editRank(r.id, x => ({ ...x, monthsByDegree: [] }))
                          }} />
                        </SettingRow>
                        {r.maxDegrees > 0 && (
                          <SettingRow title={g.agePerStripe} hint={g.agePerStripeHint}>
                            <Switch label={g.agePerStripe} checked={!!agesOn[r.id]} onChange={v => {
                              setAgesOn(m => ({ ...m, [r.id]: v }))
                              if (!v) editRank(r.id, x => ({ ...x, minAgeByDegree: [] }))
                            }} />
                          </SettingRow>
                        )}
                        <SettingRow title={g.ownFreq} hint={own[r.id] ? g.ownFreqOn : g.ownFreqOff.replace('{f}', freqShort(common))}>
                          <Switch label={g.ownFreq} checked={!!own[r.id]} onChange={v => setOwn(r.id, v)} />
                        </SettingRow>
                        {own[r.id] && (
                          <div className="flex flex-col" style={{ gap: 10, padding: '12px 0', borderBottom: '1px solid #F1F2F4' }}>
                            {freqControls(normalizeFrequency(r), n => editRank(r.id, x => ({ ...x, ...n })))}
                            <p style={{ margin: 0, fontSize: 13, color: '#374151' }}>{freqSentence(normalizeFrequency(r))}</p>
                            {frequencyInvalid(normalizeFrequency(r)) && <p role="alert" style={{ margin: 0, fontSize: 13, color: '#B91C1C' }}>{g.maxBelowMin}</p>}
                          </div>
                        )}
                        {next && (
                          <>
                            <SettingRow title={g.examFor.replace('{to}', next.name)}>
                              <Switch label={g.examFor.replace('{to}', next.name)} checked={next.requireExam}
                                onChange={v => editRank(next.id, x => ({ ...x, requireExam: v }))} />
                            </SettingRow>
                            <SettingRow title={g.competitionFor.replace('{to}', next.name)}>
                              <Switch label={g.competitionFor.replace('{to}', next.name)} checked={next.requireCompetition}
                                onChange={v => editRank(next.id, x => ({ ...x, requireCompetition: v }))} />
                            </SettingRow>
                          </>
                        )}
                        <div style={{ paddingTop: 12 }}>
                          <button type="button" onClick={() => deleteBelt(r)} disabled={busy}
                            className="inline-flex items-center cursor-pointer"
                            style={{ gap: 6, minHeight: 36, padding: '0 12px', borderRadius: 10, border: '1px solid #FECACA', background: '#fff', color: '#B91C1C', fontSize: 13, fontWeight: 600 }}>
                            <Trash2 size={14} aria-hidden /> {g.deleteBelt}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        <div className="flex flex-wrap items-center" style={{ gap: 10, padding: '14px 24px 18px' }}>
          {adding ? (
            <div className="flex flex-wrap items-center" style={{ gap: 10 }}>
              <input aria-label={g.beltName} autoFocus value={newName} maxLength={60} placeholder={g.newBeltPlaceholder}
                onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addBelt(); if (e.key === 'Escape') setAdding(false) }}
                style={{ width: 180, height: 40, boxSizing: 'border-box', border: '1px solid #E5E7EB', borderRadius: 10, padding: '0 12px', fontSize: 14 }} />
              <div className="flex" role="group" aria-label={g.color} style={{ gap: 4 }}>
                {COLOR_PRESETS.map(c => (
                  <button key={c} type="button" aria-label={c} aria-pressed={newColor === c} onClick={() => setNewColor(c)}
                    style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', padding: 0,
                      border: newColor === c ? '2px solid #0870E2' : '2px solid #fff', boxShadow: '0 0 0 1px #E5E7EB' }} />
                ))}
              </div>
              <button type="button" onClick={addBelt} disabled={!newName.trim() || busy}
                style={{ minHeight: 40, padding: '0 16px', borderRadius: 10, border: 'none', background: '#0870E2', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: !newName.trim() || busy ? 0.5 : 1 }}>
                {busy ? '…' : g.add}
              </button>
              <button type="button" onClick={() => setAdding(false)}
                style={{ minHeight: 40, padding: '0 12px', borderRadius: 10, border: 'none', background: 'transparent', color: '#4B5563', fontSize: 14, cursor: 'pointer' }}>
                {g.cancel}
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center cursor-pointer"
              style={{ gap: 8, minHeight: 44, padding: '0 14px', borderRadius: 12, border: '1px dashed #D1D5DB', background: '#fff', fontSize: 14, fontWeight: 500, color: '#374151' }}>
              <Plus size={14} aria-hidden /> {g.addBelt}
            </button>
          )}
          {structError && <p role="alert" style={{ margin: 0, fontSize: 13, color: '#B91C1C' }}>{g.structError}</p>}
        </div>
      </section>

      {/* One Save for everything above */}
      {(dirty || justSaved) && (
        <div role="region" aria-label={g.unsaved} className="flex items-center justify-between"
          style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', zIndex: 40, width: 'calc(100% - 32px)', maxWidth: 560, boxSizing: 'border-box',
            gap: 12, padding: '10px 10px 10px 18px', borderRadius: 18, background: '#111827', color: '#fff', boxShadow: '0 12px 32px rgba(16,24,40,0.28)' }}>
          <span aria-live="polite" style={{ fontSize: 14, fontWeight: 500 }}>
            {!dirty ? `✓ ${g.saved}` : saveError ? g.saveError : invalid ? g.fixFirst : g.unsaved}
          </span>
          {dirty && (
            <span className="flex" style={{ gap: 8 }}>
              <button type="button" onClick={discard} disabled={saving}
                style={{ minHeight: 40, padding: '0 14px', borderRadius: 12, border: 'none', background: 'transparent', color: '#D1D5DB', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                {g.discard}
              </button>
              <button type="button" onClick={save} disabled={saving || invalid}
                style={{ minHeight: 40, padding: '0 18px', borderRadius: 12, border: 'none', background: '#0870E2', color: '#fff', fontSize: 14, fontWeight: 600,
                  cursor: saving || invalid ? 'default' : 'pointer', opacity: invalid ? 0.5 : 1 }}>
                {saving ? g.saving : saveError ? g.retry : g.save}
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
