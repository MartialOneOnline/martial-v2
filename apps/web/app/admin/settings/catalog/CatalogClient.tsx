'use client'

import { useEffect, useState } from 'react'
import { Dumbbell, Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import { Section } from '../SettingsClient'
import { adminFetch } from '@/lib/api/adminFetch'

type Discipline = {
  id: string
  name: string
  slug: string
  _count: { schools: number; classes: number }
}

export default function CatalogClient() {
  const [disciplines, setDisciplines] = useState<Discipline[] | null>(null)
  const [error, setError] = useState('')

  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [saving, setSaving] = useState(false)

  function load() {
    adminFetch('/api/admin/disciplines')
      .then(r => r.json())
      .then(d => setDisciplines(d.disciplines))
  }

  useEffect(load, [])

  async function handleAdd() {
    if (!newName.trim()) return
    setAdding(true)
    setError('')
    const res = await adminFetch('/api/admin/disciplines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    const data = await res.json()
    setAdding(false)
    if (!res.ok) { setError(data.error || 'Failed to add discipline'); return }
    setNewName('')
    load()
  }

  function startEdit(d: Discipline) {
    setEditingId(d.id)
    setEditName(d.name)
    setEditSlug(d.slug)
    setError('')
  }

  async function handleSaveEdit(id: string) {
    setSaving(true)
    setError('')
    const res = await adminFetch(`/api/admin/disciplines/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), slug: editSlug.trim() }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error || 'Failed to save'); return }
    setEditingId(null)
    load()
  }

  async function handleDelete(d: Discipline) {
    if (!confirm(`Delete "${d.name}"? This cannot be undone.`)) return
    setError('')
    const res = await adminFetch(`/api/admin/disciplines/${d.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed to delete'); return }
    load()
  }

  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold text-[#101828]">Discipline Catalog</h1>
          <p className="text-xs text-gray-400">Master list of disciplines offered platform-wide</p>
        </div>
      </div>

      <div className="p-8 max-w-2xl space-y-6">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-600">{error}</div>
        )}

        <Section title="Disciplines" icon={Dumbbell}>
          <div className="flex gap-2 -mt-2 mb-1">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="New discipline name…"
              className="flex-1 h-9 px-3 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0870E2]/20 focus:border-[#0870E2]"
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newName.trim()}
              className="flex items-center gap-1.5 h-9 px-4 rounded-xl text-white text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ background: '#0870E2' }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>

          {!disciplines ? (
            <p className="text-xs text-gray-400">Loading…</p>
          ) : disciplines.length === 0 ? (
            <p className="text-xs text-gray-400">No disciplines yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {disciplines.map(d => (
                <div key={d.id} className="flex items-center justify-between py-2 gap-3">
                  {editingId === d.id ? (
                    <>
                      <div className="flex-1 flex gap-2">
                        <input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="flex-1 h-8 px-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0870E2]"
                        />
                        <input
                          value={editSlug}
                          onChange={e => setEditSlug(e.target.value)}
                          className="w-32 h-8 px-2 rounded-lg border border-gray-200 text-xs font-mono text-gray-500 focus:outline-none focus:border-[#0870E2]"
                        />
                      </div>
                      <button onClick={() => handleSaveEdit(d.id)} disabled={saving} className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="w-7 h-7 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-gray-100">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-sm font-medium text-[#101828]">{d.name}</p>
                        <p className="text-[11px] text-gray-400 font-mono">{d.slug} · {d._count.schools} school{d._count.schools === 1 ? '' : 's'}, {d._count.classes} class{d._count.classes === 1 ? '' : 'es'}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEdit(d)} className="w-7 h-7 rounded-lg text-gray-400 flex items-center justify-center hover:bg-gray-100 hover:text-gray-600">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(d)}
                          disabled={d._count.schools > 0 || d._count.classes > 0}
                          title={d._count.schools > 0 || d._count.classes > 0 ? 'In use — cannot delete' : 'Delete'}
                          className="w-7 h-7 rounded-lg text-gray-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}
