'use client'

import { useDashboard } from '../../../../components/DashboardShell'
import NotificationBell from '../../../../components/NotificationBell'
import { useEffect, useState } from 'react'
import MuxUploader from '@mux/mux-uploader-react'
import {Menu, X, Check, Plus, BookOpen, Loader2, AlertCircle, Trash2, Eye, PlayCircle} from 'lucide-react'
import { useT } from '../../../../lib/i18n/LanguageContext'

type LessonStatus = 'UPLOADING' | 'PROCESSING' | 'READY' | 'ERRORED'

interface Curriculum {
  id: string
  name: string
  description: string | null
  _count: { lessons: number }
}

interface Lesson {
  id: string
  title: string
  category: string | null
  description: string | null
  status: LessonStatus
  errorMessage: string | null
  muxPlaybackId: string | null
  thumbnailToken: string | null
  durationSec: number | null
  _count: { views: number }
}

const STATUS_MAP: Record<LessonStatus, { bg: string; color: string; border: string; label: string }> = {
  UPLOADING:  { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE', label: 'Uploading' },
  PROCESSING: { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A', label: 'Processing' },
  READY:      { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0', label: 'Ready' },
  ERRORED:    { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', label: 'Failed' },
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Request failed (${res.status})`)
  }
  return res.json()
}

function fmtDuration(sec: number | null) {
  if (!sec) return null
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function AddCurriculumModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (c: Curriculum) => void }) {
  const [name, setName] = useState('')
  const [description, setDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() { setName(''); setDesc(''); setSubmitting(false); setError(null) }
  function handleClose() { reset(); onClose() }

  async function handleCreate() {
    setSubmitting(true)
    setError(null)
    try {
      const { curriculum } = await jsonFetch<{ curriculum: Curriculum }>('/api/dashboard/school/curriculum/curriculums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: description || null }),
      })
      onCreated(curriculum)
      reset()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  if (!open) return null

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1px solid #E5E7EB', borderRadius: 10,
    padding: '9px 12px', fontSize: 13, color: '#111827', background: '#fff', outline: 'none',
  }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={handleClose}>
      <div className="rounded-2xl overflow-hidden" style={{ width: 'min(440px,92vw)', background: '#fff' }} onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5" style={{ borderBottom: '1px solid #E5E7EB' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>New Curriculum</h2>
          <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>A named program &mdash; &ldquo;White Belt&rdquo;, &ldquo;Leandro Lo Seminar&rdquo;, whatever fits</p>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label style={labelStyle}>Name</label>
            <input type="text" placeholder="e.g. White Belt" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Description <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span></label>
            <textarea rows={2} value={description} onChange={e => setDesc(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#FEF2F2', color: '#DC2626', fontSize: 12 }}>
              <AlertCircle size={14} />{error}
            </div>
          )}
        </div>
        <div className="px-6 py-4 flex items-center gap-3 justify-end" style={{ borderTop: '1px solid #E5E7EB' }}>
          <button onClick={handleClose} className="px-5 py-2.5 rounded-xl cursor-pointer"
            style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>
            Cancel
          </button>
          <button onClick={handleCreate} disabled={!name || submitting} className="px-6 py-2.5 rounded-xl cursor-pointer flex items-center gap-2"
            style={{ fontSize: 13, fontWeight: 600, border: 'none',
              background: name && !submitting ? '#0071E3' : '#93C5FD', color: '#fff' }}>
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Create
          </button>
        </div>
      </div>
    </div>
  )
}

function AddLessonDrawer({ open, curriculumId, onClose, onSuccess }: {
  open: boolean; curriculumId: string | null; onClose: () => void; onSuccess: () => void
}) {
  const [title, setTitle]       = useState('')
  const [category, setCategory] = useState('')
  const [description, setDesc]  = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [uploadUrl, setUploadUrl] = useState<string | null>(null)
  const [uploadDone, setUploadDone] = useState(false)

  function reset() {
    setTitle(''); setCategory(''); setDesc('')
    setSubmitting(false); setError(null); setUploadUrl(null); setUploadDone(false)
  }
  function handleClose() { reset(); onClose() }

  const canSubmit = title && curriculumId && !submitting

  async function handleCreate() {
    if (!curriculumId) return
    setSubmitting(true)
    setError(null)
    try {
      const { uploadUrl } = await jsonFetch<{ lesson: unknown; uploadUrl: string }>(
        '/api/dashboard/school/curriculum/lessons',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ curriculumId, title, category: category || null, description: description || null }),
        }
      )
      setUploadUrl(uploadUrl)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1px solid #E5E7EB', borderRadius: 10,
    padding: '9px 12px', fontSize: 13, color: '#111827', background: '#fff', outline: 'none',
  }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }

  return (
    <>
      <div className="fixed inset-0 z-40 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.35)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
        onClick={handleClose} />
      <div className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-hidden"
        style={{ width: 'min(560px,96vw)', background: '#F9FAFB',
          boxShadow: '-4px 0 32px rgba(0,0,0,0.12)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)' }}>
        <div className="flex items-center justify-between px-6 py-5 shrink-0"
          style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>Add Lesson</h2>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Add a video lesson to this curriculum</p>
          </div>
          <button onClick={handleClose} className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <X size={15} style={{ color: '#6B7280' }} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">
          {!uploadUrl && (
            <>
              <div>
                <label style={labelStyle}>Lesson Title</label>
                <input type="text" placeholder="e.g. Triangle Choke" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Category <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span></label>
                <input type="text" placeholder="e.g. Submission" value={category} onChange={e => setCategory(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Description <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span></label>
                <textarea rows={3} placeholder="Brief description of the lesson…" value={description} onChange={e => setDesc(e.target.value)}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
              </div>
              {error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#FEF2F2', color: '#DC2626', fontSize: 12 }}>
                  <AlertCircle size={14} />{error}
                </div>
              )}
            </>
          )}

          {uploadUrl && !uploadDone && (
            <div className="flex flex-col gap-3">
              <p style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>Now upload the video file</p>
              <MuxUploader
                endpoint={uploadUrl}
                style={{ ['--uploader-font-family' as string]: 'inherit', width: '100%' }}
                onSuccess={() => setUploadDone(true)}
                onUploadError={() => setError('Upload failed — check your connection and try again')}
              />
            </div>
          )}

          {uploadDone && (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#F0FDF4' }}>
                <Check size={22} style={{ color: '#16A34A' }} strokeWidth={3} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Video uploaded</p>
              <p style={{ fontSize: 12, color: '#9CA3AF', maxWidth: 320 }}>Mux is processing it now &mdash; it&rsquo;ll switch to &ldquo;Ready&rdquo; in the list in a few minutes.</p>
            </div>
          )}
        </div>
        <div className="px-6 py-4 flex items-center gap-3 justify-end shrink-0"
          style={{ background: '#fff', borderTop: '1px solid #E5E7EB' }}>
          {uploadDone ? (
            <button onClick={onSuccess} className="px-6 py-2.5 rounded-xl cursor-pointer"
              style={{ fontSize: 13, fontWeight: 600, border: 'none', background: '#0071E3', color: '#fff' }}>
              Done
            </button>
          ) : uploadUrl ? (
            <button onClick={handleClose} className="px-5 py-2.5 rounded-xl cursor-pointer"
              style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>
              Cancel
            </button>
          ) : (
            <>
              <button onClick={handleClose} className="px-5 py-2.5 rounded-xl cursor-pointer"
                style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>
                Cancel
              </button>
              <button onClick={handleCreate} disabled={!canSubmit} className="px-6 py-2.5 rounded-xl cursor-pointer flex items-center gap-2"
                style={{ fontSize: 13, fontWeight: 600, border: 'none',
                  background: canSubmit ? '#0071E3' : '#93C5FD', color: '#fff',
                  cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Continue
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}

interface Viewer {
  userId: string
  name: string | null
  email: string
  avatarUrl: string | null
  viewCount: number
  lastViewedAt: string
}

function fmtViewedDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ViewersModal({ lesson, onClose }: { lesson: Lesson; onClose: () => void }) {
  const [viewers, setViewers] = useState<Viewer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    jsonFetch<{ views: Viewer[] }>(`/api/dashboard/school/curriculum/lessons/${lesson.id}/views`)
      .then(({ views }) => { if (!cancelled) setViewers(views) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [lesson.id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={onClose}>
      <div className="rounded-2xl overflow-hidden flex flex-col" style={{ width: 'min(420px,92vw)', maxHeight: '80vh', background: '#fff' }} onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid #E5E7EB' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Watched by</h2>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }} className="truncate">{lesson.title}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer shrink-0" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <X size={14} style={{ color: '#6B7280' }} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {loading && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <Loader2 size={20} className="animate-spin" style={{ color: '#D1D5DB', margin: '0 auto' }} />
            </div>
          )}
          {!loading && viewers.length === 0 && (
            <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '32px 0' }}>No one has finished watching this yet.</p>
          )}
          {!loading && viewers.map(v => (
            <div key={v.userId} className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
              {v.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: '#EFF6FF' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#2563EB' }}>{(v.name ?? v.email).charAt(0).toUpperCase()}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate" style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{v.name ?? v.email}</p>
                <p style={{ fontSize: 11, color: '#9CA3AF' }}>Watched {fmtViewedDate(v.lastViewedAt)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SuccessToast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[70] flex items-center gap-3 px-5 py-3.5 rounded-2xl"
      style={{ background: '#fff', border: '1px solid #BBF7D0', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: '#F0FDF4' }}>
        <Check size={14} style={{ color: '#16A34A' }} strokeWidth={3} />
      </div>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{message}</p>
      <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', marginLeft: 4 }}>
        <X size={13} style={{ color: '#9CA3AF' }} />
      </button>
    </div>
  )
}

export default function CurriculumClient() {
  const { setMenuOpen } = useDashboard()
  const t = useT()
  const [curriculums, setCurriculums] = useState<Curriculum[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [activeStudentCount, setActiveStudentCount] = useState(0)
  const [loadingCurriculums, setLoadingCurriculums] = useState(true)
  const [loadingLessons, setLoadingLessons] = useState(false)
  const [addCurriculumOpen, setAddCurriculumOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [toast, setToast] = useState(false)
  const [viewersLesson, setViewersLesson] = useState<Lesson | null>(null)

  async function loadCurriculums(selectAfter?: string) {
    setLoadingCurriculums(true)
    try {
      const { curriculums } = await jsonFetch<{ curriculums: Curriculum[] }>('/api/dashboard/school/curriculum/curriculums')
      setCurriculums(curriculums)
      const next = selectAfter ?? (curriculums.some(c => c.id === selectedId) ? selectedId : curriculums[0]?.id ?? null)
      setSelectedId(next ?? null)
    } finally {
      setLoadingCurriculums(false)
    }
  }

  async function loadLessons(curriculumId: string) {
    setLoadingLessons(true)
    try {
      const { lessons, activeStudentCount } = await jsonFetch<{ lessons: Lesson[]; activeStudentCount: number }>(
        `/api/dashboard/school/curriculum/lessons?curriculumId=${curriculumId}`
      )
      setLessons(lessons)
      setActiveStudentCount(activeStudentCount)
    } finally {
      setLoadingLessons(false)
    }
  }

  useEffect(() => { loadCurriculums() }, [])
  useEffect(() => { if (selectedId) loadLessons(selectedId); else setLessons([]) }, [selectedId])

  async function handleDeleteLesson(id: string) {
    setLessons(v => v.filter(x => x.id !== id))
    await fetch(`/api/dashboard/school/curriculum/lessons/${id}`, { method: 'DELETE' }).catch(() => {})
  }

  async function handleDeleteCurriculum(id: string) {
    if (!confirm('Delete this curriculum and all its lessons? This cannot be undone.')) return
    setCurriculums(v => v.filter(x => x.id !== id))
    if (selectedId === id) setSelectedId(null)
    await fetch(`/api/dashboard/school/curriculum/curriculums/${id}`, { method: 'DELETE' }).catch(() => {})
    loadCurriculums()
  }

  const selected = curriculums.find(c => c.id === selectedId) ?? null

  return (
    <main style={{ flex: 1, minWidth: 0, width: '100%', overflow: 'auto' }}>
      <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20"
        style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
        <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(true)}>
          <Menu size={16} style={{ color: '#374151' }} />
        </button>
        <div className="flex-1" />
        <NotificationBell />
        <button onClick={() => setDrawerOpen(true)} disabled={!selectedId}
          className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer shrink-0"
          style={{ background: selectedId ? '#0071E3' : '#93C5FD', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600 }}>
          <Plus size={15} />Add Lesson
        </button>
      </div>

      <div className="px-4 md:px-8 py-6 flex flex-col gap-6">
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>{t.school.curriculumTitle}</h1>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>{t.school.curriculumSubtitle}</p>
        </div>

        <div className="flex gap-6">
          <div className="flex flex-col gap-1 shrink-0" style={{ width: 200 }}>
            {loadingCurriculums && <Loader2 size={16} className="animate-spin" style={{ color: '#D1D5DB', margin: '8px auto' }} />}
            {!loadingCurriculums && curriculums.map(c => {
              const isSelected = selectedId === c.id
              return (
                <button key={c.id} onClick={() => setSelectedId(c.id)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-left"
                  style={{ border: isSelected ? '1px solid #0071E3' : '1px solid transparent',
                    background: isSelected ? '#EFF6FF' : 'transparent' }}>
                  <span style={{ fontSize: 13, fontWeight: isSelected ? 600 : 400, color: isSelected ? '#1D4ED8' : '#374151', flex: 1, minWidth: 0 }}
                    className="truncate">{c.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: isSelected ? '#1D4ED8' : '#9CA3AF' }}>{c._count.lessons}</span>
                </button>
              )
            })}
            {!loadingCurriculums && curriculums.length === 0 && (
              <p style={{ fontSize: 12, color: '#9CA3AF', padding: '8px 4px' }}>No curriculums yet</p>
            )}
            <button onClick={() => setAddCurriculumOpen(true)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer text-left mt-1"
              style={{ border: '1px dashed #D1D5DB', background: 'transparent', color: '#6B7280' }}>
              <Plus size={13} /><span style={{ fontSize: 13, fontWeight: 500 }}>New Curriculum</span>
            </button>
          </div>

          <div className="flex-1 rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
            {!selected ? (
              <div style={{ textAlign: 'center', padding: '64px 0' }}>
                <BookOpen size={28} style={{ color: '#E5E7EB', margin: '0 auto 10px' }} />
                <p style={{ fontSize: 14, color: '#9CA3AF' }}>
                  {curriculums.length === 0 ? 'Create your first curriculum to get started' : 'Select a curriculum'}
                </p>
              </div>
            ) : (
              <>
                <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>{selected.name}</h2>
                    <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                      {lessons.length} lesson{lessons.length === 1 ? '' : 's'}
                      {selected.description ? ` · ${selected.description}` : ''}
                    </p>
                  </div>
                  <button onClick={() => handleDeleteCurriculum(selected.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer shrink-0"
                    style={{ background: 'transparent', border: 'none' }} title="Delete curriculum">
                    <Trash2 size={14} style={{ color: '#D1D5DB' }} />
                  </button>
                </div>

                <div className="p-5">
                  {loadingLessons && (
                    <div style={{ textAlign: 'center', padding: '48px 0' }}>
                      <Loader2 size={22} className="animate-spin" style={{ color: '#D1D5DB', margin: '0 auto' }} />
                    </div>
                  )}
                  {!loadingLessons && lessons.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '48px 0' }}>
                      <PlayCircle size={28} style={{ color: '#E5E7EB', margin: '0 auto 10px' }} />
                      <p style={{ fontSize: 14, color: '#9CA3AF' }}>{t.school.noCurriculum}</p>
                    </div>
                  )}
                  {!loadingLessons && lessons.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {lessons.map(lesson => {
                        const st = STATUS_MAP[lesson.status]
                        const thumbUrl = lesson.muxPlaybackId && lesson.thumbnailToken
                          ? `https://image.mux.com/${lesson.muxPlaybackId}/thumbnail.jpg?token=${lesson.thumbnailToken}&width=480`
                          : null
                        return (
                          <div key={lesson.id} className="rounded-xl overflow-hidden flex flex-col" style={{ border: '1px solid #E5E7EB' }}>
                            <div className="relative flex items-center justify-center" style={{ aspectRatio: '16/9', background: '#111827' }}>
                              {thumbUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <PlayCircle size={28} style={{ color: 'rgba(255,255,255,0.35)' }} />
                              )}
                              {fmtDuration(lesson.durationSec) && (
                                <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded"
                                  style={{ fontSize: 10, fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,0.7)' }}>
                                  {fmtDuration(lesson.durationSec)}
                                </span>
                              )}
                            </div>
                            <div className="p-3 flex flex-col gap-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate" style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{lesson.title}</p>
                                <span className="inline-flex items-center gap-1 shrink-0" style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 999, background: st.bg, color: st.color, border: '1px solid ' + st.border }}>
                                  {(lesson.status === 'UPLOADING' || lesson.status === 'PROCESSING') && <Loader2 size={9} className="animate-spin" />}
                                  {st.label}
                                </span>
                              </div>
                              {lesson.category && (
                                <span className="self-start" style={{ fontSize: 10, fontWeight: 600, color: '#6B7280' }}>{lesson.category}</span>
                              )}
                              {lesson.status === 'ERRORED' && lesson.errorMessage && (
                                <p style={{ fontSize: 11, color: '#DC2626' }}>{lesson.errorMessage}</p>
                              )}
                              <div className="flex items-center justify-between mt-1">
                                {lesson.status === 'READY' ? (
                                  <button onClick={() => setViewersLesson(lesson)} title="See who's watched this"
                                    className="inline-flex items-center gap-1 cursor-pointer"
                                    style={{ fontSize: 11, color: '#6B7280', background: 'transparent', border: 'none', padding: 0, fontFamily: 'inherit' }}>
                                    <Eye size={12} style={{ color: '#9CA3AF' }} />{lesson._count.views}/{activeStudentCount}
                                  </button>
                                ) : <span />}
                                <button onClick={() => handleDeleteLesson(lesson.id)}
                                  className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer"
                                  style={{ background: 'transparent', border: 'none' }}>
                                  <Trash2 size={12} style={{ color: '#D1D5DB' }} />
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <AddCurriculumModal
        open={addCurriculumOpen}
        onClose={() => setAddCurriculumOpen(false)}
        onCreated={c => { setAddCurriculumOpen(false); setCurriculums(v => [...v, c]); setSelectedId(c.id) }}
      />
      <AddLessonDrawer
        open={drawerOpen}
        curriculumId={selectedId}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => { setDrawerOpen(false); setToast(true); if (selectedId) loadLessons(selectedId); loadCurriculums(selectedId ?? undefined); setTimeout(() => setToast(false), 3500) }}
      />
      {toast && <SuccessToast message="Lesson added — processing now" onClose={() => setToast(false)} />}
      {viewersLesson && <ViewersModal lesson={viewersLesson} onClose={() => setViewersLesson(null)} />}
    </main>
  )
}
