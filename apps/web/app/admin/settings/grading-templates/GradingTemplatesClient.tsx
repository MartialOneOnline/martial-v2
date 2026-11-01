'use client'

import { useEffect, useState } from 'react'
import { Award, Plus, Trash2, Menu, ChevronDown, ChevronUp, ArrowUp, ArrowDown, X } from 'lucide-react'
import { Section, Toggle } from '../SettingsClient'
import { adminFetch } from '@/lib/api/adminFetch'
import { useAdminShell } from '../../AdminLayoutClient'
import {
  COLOR_PRESETS, RankRulesFields, frequencyError, trimRankLists, type RankRulesValue,
} from '@/components/grading/RankRulesFields'
import { translations } from '@/lib/i18n/translations'

// The admin panel is English-only, whatever language the viewer picked
const rt = translations.en.readiness

interface TemplateRank extends RankRulesValue {
  requireExam: boolean
  requireCompetition: boolean
}
interface Template {
  id: string
  name: string
  activity: string | null
  description: string | null
  isPublished: boolean
  ranks: TemplateRank[]
  _count: { systems: number }
}

/** Local row: a stable key so React keeps the right row open while reordering. */
type RankRow = TemplateRank & { key: string }

let keySeq = 0
const nextKey = () => `r${++keySeq}`

function emptyRank(name: string, color: string): TemplateRank {
  return {
    name, color, maxDegrees: 0, minAge: null, minMonthsAtPrevious: null, totalClassesRequired: null,
    classesByDegree: [], monthsByDegree: [], minAgeByDegree: [],
    classesPerPeriod: null, maxClassesPerPeriod: null, periodType: null,
    requireExam: false, requireCompetition: false,
  }
}

function toRows(ranks: TemplateRank[]): RankRow[] {
  return ranks.map(r => ({ ...emptyRank(r.name, r.color), ...r, key: nextKey() }))
}

function withoutKey(row: RankRow): TemplateRank {
  const rank: Partial<RankRow> = { ...row }
  delete rank.key
  return rank as TemplateRank
}

/** Short summary for a collapsed rank: "4 stripes · 8·16·24 classes · 36 mo". */
function rankSummary(r: TemplateRank): string {
  const parts: string[] = []
  if (r.maxDegrees) parts.push(`${r.maxDegrees} stripes`)
  const classes = r.classesByDegree.some(n => n > 0)
    ? Array.from({ length: r.maxDegrees + 1 }, (_, i) => r.classesByDegree[i] || r.totalClassesRequired || '—').join('·')
    : r.totalClassesRequired ? String(r.totalClassesRequired) : null
  if (classes) parts.push(`${classes} classes`)
  if (r.monthsByDegree.some(n => n > 0)) parts.push(`${r.monthsByDegree.map(n => n || '—').join('·')} mo per grading`)
  if (r.minMonthsAtPrevious) parts.push(`${r.minMonthsAtPrevious} mo at previous belt`)
  if (r.minAge) parts.push(`age ${r.minAge}+`)
  return parts.join(' · ')
}

export default function GradingTemplatesClient() {
  const { menuOpen, setMenuOpen } = useAdminShell()
  const [templates, setTemplates] = useState<Template[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [newName, setNewName] = useState('')
  const [newActivity, setNewActivity] = useState('')
  const [adding, setAdding] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  function load() {
    setLoadError('')
    adminFetch('/api/admin/grading-templates')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => setTemplates(d.templates))
      .catch(() => setLoadError('Could not load templates.'))
  }
  useEffect(load, [])

  async function handleAdd() {
    if (!newName.trim()) return
    setAdding(true)
    setError('')
    try {
      const res = await adminFetch('/api/admin/grading-templates', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), activity: newActivity.trim() || null, ranks: [] }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || 'Failed to create template'); return }
      setTemplates(prev => [...(prev ?? []), data.template])
      setOpenId(data.template.id)
      setNewName(''); setNewActivity('')
    } catch {
      setError('Failed to create template')
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(t: Template) {
    const used = t._count.systems
    const msg = used
      ? `Delete "${t.name}"? ${used} school system${used === 1 ? '' : 's'} copied from it keep their own copy.`
      : `Delete "${t.name}"? This cannot be undone.`
    if (!confirm(msg)) return
    setError('')
    const res = await adminFetch(`/api/admin/grading-templates/${t.id}`, { method: 'DELETE' }).catch(() => null)
    if (!res?.ok) { setError('Failed to delete template'); return }
    setTemplates(prev => (prev ?? []).filter(x => x.id !== t.id))
  }

  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-gray-100 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(!menuOpen)}>
            <Menu size={16} style={{ color: '#374151' }} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-[#101828]">Grading Templates</h1>
            <p className="text-xs text-gray-400">Belt systems (IBJJF, Judo, Karate…) that schools can copy into Settings → Grading</p>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-3xl space-y-6">
        {error && <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-600">{error}</div>}

        <Section title="Templates" icon={Award}>
          <p className="text-xs text-gray-500 -mt-2">
            Schools only see published templates. Applying one creates the school&apos;s own copy: editing or deleting a template here never changes schools that already used it.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="New template name (e.g. IBJJF Adults)…"
              className="flex-1 h-9 px-3 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-[#0870E2]" />
            <input value={newActivity} onChange={e => setNewActivity(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Activity (BJJ, Judo…)"
              className="sm:w-44 h-9 px-3 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-[#0870E2]" />
            <button onClick={handleAdd} disabled={adding || !newName.trim()}
              className="flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50"
              style={{ background: '#0870E2' }}>
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>

          {loadError ? (
            <div className="flex items-center gap-3 text-xs text-red-600">
              {loadError}
              <button onClick={load} className="underline cursor-pointer">Retry</button>
            </div>
          ) : !templates ? (
            <p className="text-xs text-gray-400">Loading…</p>
          ) : templates.length === 0 ? (
            <p className="text-xs text-gray-400">No templates yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {templates.map(t => (
                <TemplateCard key={t.id} template={t} open={openId === t.id}
                  onToggle={() => setOpenId(id => (id === t.id ? null : t.id))}
                  onSaved={saved => setTemplates(prev => (prev ?? []).map(x => (x.id === saved.id ? saved : x)))}
                  onDelete={() => handleDelete(t)} />
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}

function TemplateCard({ template, open, onToggle, onSaved, onDelete }: {
  template: Template
  open: boolean
  onToggle: () => void
  onSaved: (t: Template) => void
  onDelete: () => void
}) {
  const [name, setName] = useState(template.name)
  const [activity, setActivity] = useState(template.activity ?? '')
  const [description, setDescription] = useState(template.description ?? '')
  const [isPublished, setIsPublished] = useState(template.isPublished)
  const [ranks, setRanks] = useState<RankRow[]>(() => toRows(template.ranks))
  const [openRank, setOpenRank] = useState<string | null>(null)
  const [newRank, setNewRank] = useState('')
  const [newColor, setNewColor] = useState(COLOR_PRESETS[0]!)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [savedNote, setSavedNote] = useState(false)

  const touch = () => { setDirty(true); setSavedNote(false) }

  function updateRank(key: string, patch: Partial<TemplateRank>) {
    setRanks(rs => rs.map(r => (r.key === key ? { ...r, ...patch } : r)))
    touch()
  }
  function move(i: number, dir: -1 | 1) {
    setRanks(rs => {
      const j = i + dir
      if (j < 0 || j >= rs.length) return rs
      const next = [...rs]
      ;[next[i], next[j]] = [next[j]!, next[i]!]
      return next
    })
    touch()
  }
  function addRank() {
    if (!newRank.trim()) return
    const row = { ...emptyRank(newRank.trim(), newColor), key: nextKey() }
    setRanks(rs => [...rs, row])
    setOpenRank(row.key)
    setNewRank('')
    touch()
  }

  async function save() {
    setError('')
    if (!name.trim()) { setError('Name is required'); return }
    for (const [i, r] of ranks.entries()) {
      if (!r.name.trim()) { setError(`Rank ${i + 1}: name is required`); setOpenRank(r.key); return }
      const freqErr = frequencyError(r, rt)
      if (freqErr) { setError(`${r.name}: ${freqErr}`); setOpenRank(r.key); return }
    }
    if (isPublished && ranks.length === 0) { setError('Add at least one rank before publishing'); return }
    setSaving(true)
    try {
      const res = await adminFetch(`/api/admin/grading-templates/${template.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(), activity: activity.trim() || null, description: description.trim() || null, isPublished,
          ranks: ranks.map(withoutKey).map(trimRankLists),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || 'Failed to save'); return }
      onSaved(data.template)
      setRanks(toRows(data.template.ranks))
      setOpenRank(null)
      setDirty(false)
      setSavedNote(true)
    } catch {
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex gap-0.5 shrink-0">
          {(template.ranks.length ? template.ranks : [{ color: '#E5E7EB' }]).slice(0, 8).map((r, i) => (
            <div key={i} className="w-2 h-5 rounded-sm" style={{ background: r.color, border: '1px solid #E5E7EB' }} />
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-[#101828] truncate">{template.name}</p>
            {template.activity && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#F0F7FF', color: '#0870E2', border: '1px solid #BFDBFE' }}>
                {template.activity}
              </span>
            )}
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={template.isPublished
                ? { background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }
                : { background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }}>
              {template.isPublished ? 'Published' : 'Draft'}
            </span>
          </div>
          <p className="text-[11px] text-gray-400">
            {template.ranks.length} rank{template.ranks.length === 1 ? '' : 's'} · used by {template._count.systems} school system{template._count.systems === 1 ? '' : 's'}
          </p>
        </div>
        <button onClick={onDelete} title="Delete" disabled={saving}
          className="disabled:opacity-30 w-7 h-7 rounded-lg text-gray-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 cursor-pointer">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={onToggle}
          className="flex items-center gap-1 h-8 px-3 rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-700 cursor-pointer">
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {open ? 'Close' : 'Edit'}
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-100 px-4 py-4 flex flex-col gap-4">
          {/* Read-only while saving: edits made after the request was sent would be overwritten by its response */}
          <fieldset disabled={saving} className="flex flex-col gap-4" style={{ border: 0, padding: 0, margin: 0, minWidth: 0, opacity: saving ? 0.7 : 1 }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-[11px] font-semibold text-gray-500">Name
              <input value={name} onChange={e => { setName(e.target.value); touch() }}
                className="mt-1 w-full h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-800 font-normal focus:outline-none focus:border-[#0870E2]" />
            </label>
            <label className="text-[11px] font-semibold text-gray-500">Activity
              <input value={activity} onChange={e => { setActivity(e.target.value); touch() }} placeholder="BJJ, Judo, Karate…"
                className="mt-1 w-full h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-800 font-normal focus:outline-none focus:border-[#0870E2]" />
            </label>
          </div>
          <label className="text-[11px] font-semibold text-gray-500">Description (shown to schools)
            <textarea value={description} onChange={e => { setDescription(e.target.value); touch() }} rows={2}
              placeholder="e.g. IBJJF adult belts: minimum ages and time at each belt; black belt degrees by time."
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 font-normal focus:outline-none focus:border-[#0870E2]" />
          </label>
          <Toggle label="Published" description="Schools can see and apply this template"
            checked={isPublished} onChange={v => { setIsPublished(v); touch() }} />

          {/* Ranks */}
          <div className="flex flex-col">
            <p className="text-xs font-semibold text-gray-700 mb-1">Ranks, in order</p>
            {ranks.length === 0 && <p className="text-xs text-gray-400 py-3">No ranks yet. Add the first rank below.</p>}
            {ranks.map((r, i) => (
              <div key={r.key} className="border-b border-gray-50 last:border-b-0">
                <div className="flex items-center gap-2 py-2">
                  <span className="w-4 h-4 rounded-full shrink-0" style={{ background: r.color, border: '1px solid #D1D5DB' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#101828] truncate">{r.name || '—'}</p>
                    <p className="text-[11px] text-gray-400 truncate">{rankSummary(r) || 'No rules yet'}</p>
                  </div>
                  <button onClick={() => move(i, -1)} disabled={i === 0} title="Move up"
                    className="w-7 h-7 rounded-lg text-gray-400 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 cursor-pointer">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === ranks.length - 1} title="Move down"
                    className="w-7 h-7 rounded-lg text-gray-400 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 cursor-pointer">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setOpenRank(k => (k === r.key ? null : r.key))}
                    className="h-7 px-2 rounded-lg text-xs text-[#0870E2] hover:bg-blue-50 cursor-pointer">
                    {openRank === r.key ? 'Done' : 'Rules'}
                  </button>
                  <button onClick={() => { setRanks(rs => rs.filter(x => x.key !== r.key)); touch() }} title="Remove"
                    className="w-7 h-7 rounded-lg text-gray-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {openRank === r.key && (
                  <div className="mb-3 p-4 rounded-xl flex flex-col gap-4" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                    <RankRulesFields value={r} nextRankName={ranks[i + 1]?.name ?? null} labels={rt}
                      onChange={(k, v) => updateRank(r.key, { [k]: v } as Partial<TemplateRank>)} />
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 text-xs text-gray-600">
                        <input type="checkbox" checked={r.requireExam} onChange={e => updateRank(r.key, { requireExam: e.target.checked })} />
                        Exam required to reach this belt
                      </label>
                      <label className="flex items-center gap-2 text-xs text-gray-600">
                        <input type="checkbox" checked={r.requireCompetition} onChange={e => updateRank(r.key, { requireCompetition: e.target.checked })} />
                        Competition required to reach this belt
                      </label>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div className="flex items-center gap-2 mt-2">
              <input value={newRank} onChange={e => setNewRank(e.target.value)} onKeyDown={e => e.key === 'Enter' && addRank()}
                placeholder="Rank name (e.g. Blue)"
                className="flex-1 h-8 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0870E2]" />
              <div className="hidden sm:flex gap-1">
                {COLOR_PRESETS.map(c => (
                  <button key={c} onClick={() => setNewColor(c)} aria-label={c}
                    style={{ width: 18, height: 18, borderRadius: '50%', background: c, border: newColor === c ? '2.5px solid #0870E2' : '1px solid #E5E7EB', cursor: 'pointer' }} />
                ))}
              </div>
              <button onClick={addRank} disabled={!newRank.trim()}
                className="flex items-center gap-1 h-8 px-3 rounded-lg text-white text-xs font-semibold disabled:opacity-50 cursor-pointer" style={{ background: '#0870E2' }}>
                <Plus className="w-3.5 h-3.5" /> Add rank
              </button>
            </div>
          </div>

          </fieldset>

          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex items-center justify-end gap-3">
            {savedNote && !dirty && <span className="text-xs text-emerald-600">Saved</span>}
            {dirty && <span className="text-xs text-amber-600">Unsaved changes</span>}
            <button onClick={save} disabled={saving || !dirty}
              className="h-9 px-5 rounded-xl text-white text-xs font-semibold disabled:opacity-50 cursor-pointer" style={{ background: '#0870E2' }}>
              {saving ? 'Saving…' : 'Save template'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
