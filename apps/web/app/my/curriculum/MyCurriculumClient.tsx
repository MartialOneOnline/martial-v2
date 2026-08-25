'use client'

import { useEffect, useRef, useState } from 'react'
import MuxPlayer from '@mux/mux-player-react'
import type MuxPlayerElement from '@mux/mux-player'
import { PlayCircle, X, BookOpen } from 'lucide-react'
import { myFetch } from '../../../lib/api/myFetch'

interface Lesson {
  id: string
  title: string
  category: string | null
  description: string | null
  muxPlaybackId: string | null
  playbackToken: string | null
  thumbnailToken: string | null
  durationSec: number | null
}

interface CurriculumGroup {
  id: string
  name: string
  description: string | null
  lessons: Lesson[]
}

function fmtDuration(sec: number | null) {
  if (!sec) return null
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function MyCurriculumClient() {
  const [curriculums, setCurriculums] = useState<CurriculumGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [playing, setPlaying] = useState<Lesson | null>(null)
  const markedThisSession = useRef<Set<string>>(new Set())
  const playerRef = useRef<MuxPlayerElement>(null)

  function markWatched(lessonId: string) {
    // Fires from onTimeUpdate/onEnded below once the lesson is essentially
    // finished, not from onPlay — a few seconds of playback before closing
    // the lightbox shouldn't count as "watched". timeupdate keeps firing
    // after the 90% threshold, so dedupe per open-the-lightbox session.
    if (markedThisSession.current.has(lessonId)) return
    markedThisSession.current.add(lessonId)
    myFetch(`/api/my/curriculum/lessons/${lessonId}/view`, { method: 'POST' }).catch(() => {})
  }

  function handleProgress() {
    if (!playing) return
    const el = playerRef.current
    if (!el || !el.duration || Number.isNaN(el.duration)) return
    if (el.currentTime / el.duration >= 0.9) markWatched(playing.id)
  }

  useEffect(() => {
    myFetch('/api/my/curriculum')
      .then(async r => {
        if (r.status === 403) { setForbidden(true); return }
        const d = await r.json()
        const groups: CurriculumGroup[] = d.curriculums ?? []
        setCurriculums(groups)
        setSelectedId(groups[0]?.id ?? null)
      })
      .finally(() => setLoading(false))
  }, [])

  const selected = curriculums.find(c => c.id === selectedId) ?? null

  return (
    <div className="min-h-screen pb-8" style={{ background: '#F2F2F7' }}>
      <div className="max-w-lg mx-auto px-4 pt-6">
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>Curriculum</h1>
        <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>Technique videos from your school</p>

        {loading && <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 24 }}>…</p>}

        {!loading && forbidden && (
          <div className="flex flex-col items-center justify-center text-center" style={{ marginTop: 64 }}>
            <BookOpen size={40} style={{ color: '#D1D5DB' }} />
            <p style={{ fontSize: 14, color: '#9CA3AF', marginTop: 12, maxWidth: 260 }}>
              Curriculum videos are available to active members of your school.
            </p>
          </div>
        )}

        {!loading && !forbidden && curriculums.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center" style={{ marginTop: 64 }}>
            <BookOpen size={40} style={{ color: '#D1D5DB' }} />
            <p style={{ fontSize: 14, color: '#9CA3AF', marginTop: 12 }}>No curriculum videos yet.</p>
          </div>
        )}

        {!loading && !forbidden && curriculums.length > 0 && (
          <>
            <div className="flex gap-2 mt-5 overflow-x-auto" style={{ paddingBottom: 4 }}>
              {curriculums.map(c => {
                const isSelected = selectedId === c.id
                return (
                  <button key={c.id} onClick={() => setSelectedId(c.id)}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-full cursor-pointer shrink-0"
                    style={{ border: isSelected ? '1px solid #2563EB' : '1px solid #E5E7EB',
                      background: isSelected ? '#EFF6FF' : '#fff' }}>
                    <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: isSelected ? '#1D4ED8' : '#374151' }}>{c.name}</span>
                  </button>
                )
              })}
            </div>

            <div className="flex flex-col gap-3 mt-5">
              {selected?.lessons.map(lesson => {
                const thumbUrl = lesson.muxPlaybackId && lesson.thumbnailToken
                  ? `https://image.mux.com/${lesson.muxPlaybackId}/thumbnail.jpg?token=${lesson.thumbnailToken}&width=240`
                  : null
                return (
                  <button key={lesson.id} onClick={() => lesson.muxPlaybackId && setPlaying(lesson)}
                    className="flex items-center gap-4 p-3 rounded-2xl text-left cursor-pointer"
                    style={{ background: '#fff', border: 'none' }}>
                    <div className="relative w-20 shrink-0 rounded-xl overflow-hidden flex items-center justify-center"
                      style={{ aspectRatio: '16/9', background: '#111827' }}>
                      {thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <PlayCircle size={18} style={{ color: 'rgba(255,255,255,0.35)' }} />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.15)' }}>
                        <PlayCircle size={18} style={{ color: '#fff' }} fill="rgba(0,0,0,0.3)" />
                      </div>
                      {fmtDuration(lesson.durationSec) && (
                        <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded"
                          style={{ fontSize: 9, fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,0.7)', lineHeight: 1 }}>
                          {fmtDuration(lesson.durationSec)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{lesson.title}</p>
                      <p style={{ fontSize: 12, color: '#9CA3AF' }}>{lesson.category ?? 'Lesson'}</p>
                    </div>
                  </button>
                )
              })}
              {selected && selected.lessons.length === 0 && (
                <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 24 }}>No lessons in this curriculum yet.</p>
              )}
            </div>
          </>
        )}
      </div>

      {playing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={() => setPlaying(null)}>
          <div className="w-full max-w-lg px-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{playing.title}</p>
              <button onClick={() => setPlaying(null)} className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none' }}>
                <X size={16} style={{ color: '#fff' }} />
              </button>
            </div>
            {playing.muxPlaybackId && (
              <MuxPlayer
                ref={playerRef}
                playbackId={playing.muxPlaybackId}
                tokens={playing.playbackToken ? { playback: playing.playbackToken } : undefined}
                streamType="on-demand"
                autoPlay
                onTimeUpdate={handleProgress}
                onEnded={() => markWatched(playing.id)}
                style={{ width: '100%', aspectRatio: '16/9', borderRadius: 12 }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
