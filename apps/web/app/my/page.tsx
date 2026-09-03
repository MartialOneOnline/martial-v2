'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import MuxPlayer from '@mux/mux-player-react'
import type MuxPlayerElement from '@mux/mux-player'
import {
  Calendar, Clock, CalendarCheck, QrCode, CalendarPlus,
  ChevronRight, CheckCircle2, Ticket, Users, Info, PlayCircle, X,
  AlertCircle, RotateCw,
} from 'lucide-react'
import { fmtPrice } from '../../lib/format'
import { getBeltImage } from '../../lib/belts'
import { useT, useLanguage } from '../../lib/i18n/LanguageContext'
import { isStudentContextRequired, chooseProfileUrl } from '../../lib/studentContext'
import { myFetch } from '../../lib/api/myFetch'
import ClassRow, { type ClassRowState } from '../../components/ClassRow'

// ── Types ─────────────────────────────────────────────────────────────────────

type Occurrence = {
  classId: string
  className: string
  scheduledAt: string
  duration: number | null
  level: string | null
  capacity: number | null
  coverUrl: string | null
  school: { name: string; slug: string; logoUrl: string | null; city: string | null }
  instructor: { name: string; photoUrl: string | null } | null
  booked: number
  alreadyBooked: boolean
  canBook: boolean
  cancelled: boolean
  cancelReason: string | null
}

type Attendee = { id: string; name: string; avatarUrl: string | null; belt: string | null; beltDegree: number }

type CurriculumLessonPreview = {
  id: string
  title: string
  category: string | null
  muxPlaybackId: string | null
  playbackToken: string | null
  thumbnailToken: string | null
  durationSec: number | null
}

type UserData = {
  user: {
    id: string
    name: string | null
    email: string
    phone: string | null
    avatarUrl: string | null
    dateOfBirth: string | null
    role: string
    memberships: {
      id: string
      planName: string
      price: number
      currency: string
      status: string
      startDate: string
      endDate: string | null
      classesUsed: number
      school: { id: string; name: string; slug: string; logoUrl: string | null; coverUrl: string | null; coverPosY: number; city: string | null }
      plan: { classAccess: Record<string, unknown> } | null
    }[]
    bookings: {
      id: string
      scheduledAt: string
      status: string
      class: {
        id: string
        name: string
        duration: number | null
        school: { name: string; slug: string }
      }
    }[]
    eventBookings: {
      id: string
      quantity: number
      status: string
      amountPaid: number | null
      currency: string
      ticketName: string
      paymentMethod: string
      qrToken: string | null
      checkedIn: boolean
      event: {
        id: string
        title: string
        startAt: string
        location: string | null
        school: { name: string; slug: string }
      }
    }[]
    schoolMembers: {
      id: string
      belt: string | null
      beltDegree: number | null
      beltDate: string | null
      role: string
      status: string
      school: { id: string; name: string; slug: string; logoUrl: string | null; coverUrl: string | null; coverPosY: number }
    }[]
    gradings: {
      id: string
      fromBelt: string | null
      toBelt: string
      gradedAt: string
      school: { name: string }
    }[]
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DISCIPLINE_GRADIENTS: Record<string, string> = {
  bjj:        'linear-gradient(180deg, rgba(0,0,0,0) 20%, rgba(0,0,0,.32) 100%), radial-gradient(ellipse at 38% 32%, #3a72d0 0%, #0e2a78 42%, #060f2a 100%)',
  jiu:        'linear-gradient(180deg, rgba(0,0,0,0) 20%, rgba(0,0,0,.32) 100%), radial-gradient(ellipse at 38% 32%, #3a72d0 0%, #0e2a78 42%, #060f2a 100%)',
  nogi:       'linear-gradient(180deg, rgba(0,0,0,0) 20%, rgba(0,0,0,.38) 100%), radial-gradient(ellipse at 50% 32%, #424242 0%, #1c1c1c 48%, #080808 100%)',
  mma:        'linear-gradient(180deg, rgba(0,0,0,0) 20%, rgba(0,0,0,.38) 100%), radial-gradient(ellipse at 50% 20%, #8b1a1a 0%, #1a0808 60%, #050000 100%)',
  boxing:     'linear-gradient(180deg, rgba(0,0,0,0) 20%, rgba(0,0,0,.35) 100%), radial-gradient(ellipse at 50% 28%, #7c4a00 0%, #2a1700 50%, #0d0700 100%)',
  muay:       'linear-gradient(180deg, rgba(0,0,0,0) 20%, rgba(0,0,0,.35) 100%), radial-gradient(ellipse at 50% 28%, #7c0000 0%, #2a0000 50%, #0d0000 100%)',
  wrestling:  'linear-gradient(180deg, rgba(0,0,0,0) 20%, rgba(0,0,0,.35) 100%), radial-gradient(ellipse at 50% 28%, #1a4d1a 0%, #0a1f0a 50%, #030803 100%)',
}
function classGradient(name: string): string {
  const lower = name.toLowerCase()
  const key = Object.keys(DISCIPLINE_GRADIENTS).find(k => lower.includes(k))
  // Non-null: 'bjj' is always a real key in DISCIPLINE_GRADIENTS above, so
  // this expression is never actually undefined — only typed that way
  // because noUncheckedIndexedAccess can't see the index is provably safe.
  return (key ? DISCIPLINE_GRADIENTS[key] : DISCIPLINE_GRADIENTS.bjj)!
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
}
// Event.startAt, unlike Class.scheduledAt, is a real UTC instant (the
// dashboard event editor converts a wall-clock date+time picked in the
// browser to true UTC on save — see EventsClient.tsx's own submit handler).
// Displaying it needs an explicit timeZone to convert back, same as the
// dashboard itself does (EventsClient.tsx's fmtDate/fmtTime both hardcode
// 'Europe/Madrid') — reusing the UTC-forced fmtDate/fmtTime above like a
// Class would silently show the raw UTC hour instead of the real one.
function fmtEventDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Madrid' })
}
function fmtEventTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' })
}
function daysUntil(iso: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const day = new Date(iso); day.setHours(0, 0, 0, 0)
  return Math.round((day.getTime() - today.getTime()) / 86400000)
}
function fmtDuration(sec: number | null) {
  if (!sec) return null
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
function classTypeBadge(name: string) {
  const lower = name.toLowerCase()
  if (lower.includes('nogi') || lower.includes('no-gi')) return 'NOGI'
  if (lower.includes('jiu') || lower.includes('bjj')) return 'JIU JITSU'
  if (lower.includes('mma')) return 'MMA'
  if (lower.includes('boxing')) return 'BOXING'
  if (lower.includes('muay')) return 'MUAY THAI'
  return 'CLASS'
}

// Occurrence.scheduledAt is a naive-UTC wall-clock value (same convention
// fmtTime above relies on — no timeZone conversion, just read the UTC
// components directly), so both the day-strip's own dates and the key used
// to bucket occurrences by day must read UTC getters, not local ones, or a
// browser whose local timezone differs from the school's would file classes
// under the wrong day.
function dateKey(d: Date) {
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`
}
function occDateKey(iso: string) {
  return dateKey(new Date(iso))
}

// App locale → BCP47 tag, for the day-strip's weekday labels (translations.ts
// only has an internal 'en'|'es'|'pt'|'fr' code, not a full tag).
const LOCALE_TAG: Record<string, string> = { en: 'en-GB', es: 'es-ES', pt: 'pt-PT', fr: 'fr-FR' }

// ── Date strip — horizontal, scrollable day picker for "Upcoming classes" ───

function DateStrip({ days, selected, onSelect, localeTag }: { days: Date[]; selected: Date; onSelect: (d: Date) => void; localeTag: string }) {
  const selectedKey = dateKey(selected)
  return (
    <div className="flex gap-1.5 overflow-x-auto" style={{ paddingLeft: 16, paddingRight: 16, WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
      {days.map(d => {
        const isSelected = dateKey(d) === selectedKey
        const weekday = new Intl.DateTimeFormat(localeTag, { weekday: 'short', timeZone: 'UTC' }).format(d).replace('.', '').toUpperCase()
        return (
          <button
            key={dateKey(d)}
            onClick={() => onSelect(d)}
            className="flex flex-col items-center shrink-0 rounded-2xl transition-colors"
            style={{
              width: 52, padding: '8px 0', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              background: isSelected ? 'rgba(8,112,226,.10)' : 'transparent',
            }}
          >
            <span className="text-[10px] font-semibold" style={{ color: isSelected ? '#0870E2' : '#9CA3AF', letterSpacing: '.3px' }}>{weekday}</span>
            <span className="text-base font-semibold mt-0.5" style={{ color: isSelected ? '#0870E2' : '#1C1C1E' }}>{d.getUTCDate()}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── Desktop/tablet stat tile ────────────────────────────────────────────────

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-[20px]" style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', boxShadow: '0 1px 2px rgba(16,24,40,.04)', padding: '18px 20px' }}>
      <p className="text-[11px] mb-2" style={{ color: '#6B6B70' }}>{label}</p>
      <p className="text-[22px] font-semibold" style={{ color: '#1C1C1E', letterSpacing: '-0.2px' }}>{value}</p>
      {sub && <p className="text-[11.5px] mt-0.5" style={{ color: '#9CA3AF' }}>{sub}</p>}
    </div>
  )
}

// ── Loading skeleton — same dimensions as the real sections below, so the
// page doesn't jump/reflow once data arrives. ──────────────────────────────

function Block({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded-xl ${className}`} style={{ background: '#E5E7EB', ...style }} />
}

function HomeSkeleton() {
  return (
    <div className="min-h-screen pb-4" style={{ background: '#F2F2F7' }}>
      <div className="max-w-2xl lg:max-w-[1180px] mx-auto">
        <div className="px-4 md:px-6 pt-4 md:pt-7 pb-4 md:pb-5">
          <Block style={{ width: 180, height: 22 }} />
        </div>
        <div className="mx-4 md:mx-6 mb-5 rounded-[20px] overflow-hidden">
          <Block style={{ height: 190, borderRadius: 20 }} />
        </div>
        <div className="px-4 md:px-6 mb-3 flex items-center justify-between">
          <Block style={{ width: 140, height: 18 }} />
          <Block style={{ width: 70, height: 18 }} />
        </div>
        <div className="flex gap-1.5 px-4 mb-3">
          {[0, 1, 2, 3, 4].map(i => <Block key={i} style={{ width: 52, height: 52, borderRadius: 16 }} />)}
        </div>
        <div className="px-4 md:px-6 space-y-1">
          {[0, 1].map(i => (
            <div key={i} className="flex items-center gap-3 py-2.5">
              <Block style={{ width: 84, height: 84, borderRadius: 16 }} />
              <div className="flex-1 space-y-2">
                <Block style={{ width: '60%', height: 14 }} />
                <Block style={{ width: '40%', height: 12 }} />
              </div>
              <Block style={{ width: 80, height: 36, borderRadius: 999 }} />
            </div>
          ))}
        </div>
        <div className="mx-4 md:mx-6 mt-4 rounded-[20px] overflow-hidden">
          <Block style={{ height: 110, borderRadius: 20 }} />
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

// "Today" as a UTC-anchored midnight instant for the *local* calendar day —
// built once from local Y/M/D getters, then always read back with UTC
// getters from there on, so it lines up with occDateKey() (which reads
// Occurrence.scheduledAt, a naive-UTC wall-clock value, the same way) without
// either drifting a day depending on the browser's own timezone offset.
function localTodayUTC() {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
}
function buildDateStripDays(count: number): Date[] {
  const today = localTodayUTC()
  return Array.from({ length: count }, (_, i) => new Date(today.getTime() + i * 86400000))
}

export default function MyHomePage() {
  const t = useT()
  const { locale } = useLanguage()
  const router = useRouter()
  const pathname = usePathname()
  const [data, setData]             = useState<UserData | null>(null)
  const [loading, setLoading]       = useState(true)
  const [loadError, setLoadError]   = useState(false)
  const [occurrences, setOccurrences] = useState<Occurrence[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(localTodayUTC)
  const dateStripDays = buildDateStripDays(14)
  const [bookingId, setBookingId]   = useState<string | null>(null)
  const [activeLessonDot, setActiveLessonDot] = useState(0)
  const [detailOcc, setDetailOcc]   = useState<Occurrence | null>(null)
  const [cancelOcc, setCancelOcc]   = useState<Occurrence | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [bookSuccessOcc, setBookSuccessOcc] = useState<Occurrence | null>(null)
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [loadingAttendees, setLoadingAttendees] = useState(true)
  const [curriculumLessons, setCurriculumLessons] = useState<CurriculumLessonPreview[]>([])
  const [playingLesson, setPlayingLesson] = useState<CurriculumLessonPreview | null>(null)
  const lessonCarRef = useRef<HTMLDivElement>(null)
  const markedThisSession = useRef<Set<string>>(new Set())
  const playerRef = useRef<MuxPlayerElement>(null)

  function markLessonWatched(lessonId: string) {
    // Fires once the lesson is essentially finished, not on play — see the
    // same guard in MyCurriculumClient.tsx.
    if (markedThisSession.current.has(lessonId)) return
    markedThisSession.current.add(lessonId)
    myFetch(`/api/my/curriculum/lessons/${lessonId}/view`, { method: 'POST' }).catch(() => {})
  }

  function handleLessonProgress() {
    if (!playingLesson) return
    const el = playerRef.current
    if (!el || !el.duration || Number.isNaN(el.duration)) return
    if (el.currentTime / el.duration >= 0.9) markLessonWatched(playingLesson.id)
  }

  useEffect(() => {
    if (!detailOcc || detailOcc.cancelled) { setLoadingAttendees(false); return }
    setLoadingAttendees(true)
    myFetch(`/api/my/school-classes/${detailOcc.classId}/attendees?scheduledAt=${encodeURIComponent(detailOcc.scheduledAt)}`)
      .then(res => res.ok ? res.json() : { attendees: [] })
      .then(d => setAttendees(d.attendees ?? []))
      .catch(() => setAttendees([]))
      .finally(() => setLoadingAttendees(false))
  }, [detailOcc])

  function loadCore() {
    setLoading(true)
    setLoadError(false)
    myFetch('/api/my')
      .then(r => {
        if (!r.ok) throw new Error(`status ${r.status}`)
        return r.json()
      })
      .then(d => {
        // A student in 2+ schools with no resolved active context can't be
        // served here without silently mixing schools — send them to pick
        // one instead of rendering an empty/broken dashboard. Any other
        // error shape (network failure already caught below, 401/500 with a
        // different body) falls through to the normal empty state exactly
        // as before this check existed.
        if (isStudentContextRequired(d)) {
          router.replace(chooseProfileUrl(pathname))
          return
        }
        setData(d); setLoading(false)
      })
      .catch(() => { setLoading(false); setLoadError(true) })
    myFetch('/api/my/school-classes')
      .then(r => r.json())
      .then(d => {
        if (isStudentContextRequired(d)) return
        setOccurrences(d.occurrences ?? [])
      })
      .catch(() => {})
  }

  useEffect(() => {
    loadCore()
    // 403 here just means the school hasn't turned the Curriculum module on
    // (or this student isn't ACTIVE yet) — the section below simply stays
    // hidden in that case, same as every other conditionally-shown card.
    myFetch('/api/my/curriculum')
      .then(async r => {
        if (!r.ok) return
        const d = await r.json()
        type CurriculumGroup = { lessons: CurriculumLessonPreview[] }
        const groups: CurriculumGroup[] = d.curriculums ?? []
        setCurriculumLessons(groups.flatMap(c => c.lessons).filter(l => l.muxPlaybackId))
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount; loadCore is redefined each render but only ever (re)invoked here or from the retry button's own onClick
  }, [router, pathname])

  // Curriculum carousel dot sync
  useEffect(() => {
    const el = lessonCarRef.current
    if (!el) return
    const handler = () => {
      const cards = el.querySelectorAll<HTMLElement>('.lesson-car-card')
      let closest = 0, minDist = Infinity
      const elLeft = el.getBoundingClientRect().left
      cards.forEach((c, i) => {
        const dist = Math.abs(c.getBoundingClientRect().left - elLeft)
        if (dist < minDist) { minDist = dist; closest = i }
      })
      setActiveLessonDot(closest)
    }
    el.addEventListener('scroll', handler, { passive: true })
    return () => el.removeEventListener('scroll', handler)
  }, [curriculumLessons])

  async function bookClass(occ: Occurrence) {
    if (bookingId) return
    setBookingId(`${occ.classId}:${occ.scheduledAt}`)
    try {
      const res = await myFetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: occ.classId, scheduledAt: occ.scheduledAt }),
      })
      if (res.ok) {
        setOccurrences(prev => prev.map(o =>
          o.classId === occ.classId && o.scheduledAt === occ.scheduledAt
            ? { ...o, alreadyBooked: true, booked: o.booked + 1 }
            : o
        ))
        setDetailOcc(prev =>
          prev && prev.classId === occ.classId && prev.scheduledAt === occ.scheduledAt ? null : prev
        )
        setBookSuccessOcc(occ)
      } else {
        const data = await res.json().catch(() => ({}))
        if (data.code === 'WAIVER_REQUIRED') router.push('/my/waivers')
      }
    } finally {
      setBookingId(null)
    }
  }

  async function cancelClass(occ: Occurrence) {
    const booking = data?.user?.bookings?.find(
      b => b.class.id === occ.classId && b.scheduledAt === occ.scheduledAt
    )
    if (!booking) return
    setCancelling(true)
    try {
      const res = await myFetch(`/api/my/bookings/${booking.id}`, { method: 'DELETE' })
      if (res.ok) {
        setOccurrences(prev => prev.map(o =>
          o.classId === occ.classId && o.scheduledAt === occ.scheduledAt
            ? { ...o, alreadyBooked: false, booked: Math.max(0, o.booked - 1) }
            : o
        ))
        setCancelOcc(null)
      }
    } finally {
      setCancelling(false)
    }
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center" style={{ background: '#F2F2F7' }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,.08)' }}>
          <AlertCircle className="w-6 h-6" style={{ color: '#EF4444' }} />
        </div>
        <p className="text-sm font-medium" style={{ color: '#1C1C1E' }}>{t.my.couldntLoadDashboard}</p>
        <button
          onClick={loadCore}
          className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white"
          style={{ background: '#0870E2', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <RotateCw className="w-3.5 h-3.5" />
          {t.common.retry}
        </button>
      </div>
    )
  }

  if (loading) {
    return <HomeSkeleton />
  }

  const user              = data?.user
  const firstName         = user?.name?.split(' ')[0] ?? 'there'
  const activeMembership  = user?.memberships?.find(m => m.status === 'ACTIVE')
  const pendingMembership = user?.memberships?.find(m => m.status === 'PENDING')
  const shownMembership   = activeMembership ?? pendingMembership
  const nextBooking       = user?.bookings?.[0]
  const nextEventBooking  = user?.eventBookings?.[0]
  const primaryMember     = user?.schoolMembers?.[0]
  const hour              = new Date().getHours()
  const greeting          = hour < 12 ? t.my.goodMorning : hour < 18 ? t.my.goodAfternoon : t.my.goodEvening
  const days              = nextBooking ? daysUntil(nextBooking.scheduledAt) : null
  const lessonDotCount    = Math.min(curriculumLessons.length, 3)

  // Classes for the selected day strip, excluding whichever occurrence is
  // already shown as the hero "next booking" card above (spec: don't repeat
  // it in the list below).
  const nextBookingKey = nextBooking ? `${nextBooking.class.id}:${nextBooking.scheduledAt}` : null
  const selectedKey = dateKey(selectedDate)
  const dayOccurrences = occurrences.filter(o => occDateKey(o.scheduledAt) === selectedKey && `${o.classId}:${o.scheduledAt}` !== nextBookingKey)

  // A single "up next" hero slot: whichever of the next class or the next
  // paid event ticket happens sooner wins it, so a confirmed seminar isn't
  // buried under a class carousel it isn't part of (or hidden entirely
  // behind an empty "No upcoming classes" message).
  const eventIsNext = nextEventBooking
    ? !nextBooking || new Date(nextEventBooking.event.startAt) < new Date(nextBooking.scheduledAt)
    : false
  const eventDays = nextEventBooking ? daysUntil(nextEventBooking.event.startAt) : null
  const isCashPending = nextEventBooking?.status === 'PENDING' && nextEventBooking.paymentMethod === 'CASH'
  const eventStatus = !nextEventBooking
    ? null
    : nextEventBooking.checkedIn
    ? { label: t.my.checkedInLabel, color: '#1E8734' }
    : isCashPending
    ? { label: t.my.payAtDoorBtn, color: '#D97706' }
    : nextEventBooking.status === 'CONFIRMED'
    ? { label: t.my.ticketStatusConfirmed, color: '#1E8734' }
    : { label: t.my.ticketStatusPending, color: '#D97706' }

  // Cross-reference the booked class against the occurrences list (which carries
  // coverUrl) so the desktop hero can show a real photo without a second API call.
  const nextBookingOcc = nextBooking
    ? occurrences.find(o => o.classId === nextBooking.class.id && o.scheduledAt === nextBooking.scheduledAt)
    : undefined

  const primarySchool: { name: string; slug: string; logoUrl: string | null; coverUrl?: string | null; coverPosY?: number; city?: string | null } | undefined =
    activeMembership?.school ?? pendingMembership?.school ?? primaryMember?.school

  // Check-in window: open from 30 minutes before the class starts through its
  // scheduled end. Both sides of the comparison are built the same way —
  // wall-clock digits read straight through as if they were UTC — because
  // that's the (slightly unusual) convention Occurrence.scheduledAt already
  // uses (see fmtTime above); comparing a *real* local "now" against it would
  // drift by exactly the browser's UTC offset.
  const nowAsWallClockMs = (() => {
    const n = new Date()
    return Date.UTC(n.getFullYear(), n.getMonth(), n.getDate(), n.getHours(), n.getMinutes(), n.getSeconds())
  })()
  const nextBookingDurationMin = nextBookingOcc?.duration ?? nextBooking?.class.duration ?? 60
  const checkInOpen = !!nextBooking && (() => {
    const startMs = new Date(nextBooking.scheduledAt).getTime()
    const endMs = startMs + nextBookingDurationMin * 60000
    return nowAsWallClockMs >= startMs - 30 * 60000 && nowAsWallClockMs <= endMs
  })()

  // ── Desktop rail cards — shared between the mobile stacked layout and the
  // lg+ right rail so both stay in sync from one source of markup. ──────────

  function renderSchoolCard() {
    if (!primarySchool) return null
    return (
      <div className="rounded-[20px]" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)', padding: 20 }}>
        <div className="flex items-center gap-3.5">
          <div
            className="rounded-2xl overflow-hidden flex items-center justify-center shrink-0"
            style={{ width: 52, height: 52, background: 'rgba(0,122,255,.08)' }}
          >
            {primarySchool.logoUrl ? (
              <img src={primarySchool.logoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-base font-bold" style={{ color: '#007AFF' }}>{primarySchool.name[0]}</span>
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <p className="text-sm font-semibold truncate" style={{ color: '#1C1C1E' }}>{primarySchool.name}</p>
            {primarySchool.city && <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{primarySchool.city}</p>}
          </div>
        </div>
        <Link
          href={`/school/${primarySchool.slug}`}
          className="mt-4 flex items-center justify-center text-xs font-semibold rounded-full"
          style={{ border: '1px solid #E5E5EA', padding: '10px 0', color: '#1C1C1E', textDecoration: 'none' }}
        >
          {t.my.viewSchool} {primarySchool.name}
        </Link>
      </div>
    )
  }

  function renderBeltCard() {
    if (!primaryMember?.belt) return null
    const degree = primaryMember.beltDegree ?? 0
    // Same fixed scale the /my/progress ranking card uses — stripes are
    // awarded by an instructor, not earned on a schedule, so degree/MAX is
    // the only honest "progress" figure available (no fabricated percentage).
    const MAX_STRIPES = 4
    return (
      <div className="rounded-[20px]" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)', padding: 20 }}>
        <p className="text-[11px] font-semibold uppercase" style={{ color: '#9CA3AF', letterSpacing: '.6px' }}>{t.my.currentBelt}</p>
        <p className="text-[19px] font-semibold mt-0.5" style={{ color: '#1C1C1E', letterSpacing: '-0.2px' }}>
          {primaryMember.belt}
          {degree > 0 && ` · ${degree} ${t.my.stripesLabel}`}
        </p>

        <div className="mt-4 rounded-xl flex items-center justify-center" style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', padding: '14px 16px' }}>
          <img
            src={getBeltImage(primaryMember.belt, degree)}
            alt={primaryMember.belt}
            className="w-full h-auto object-contain"
            style={{ maxWidth: 220 }}
          />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-medium mb-1.5" style={{ color: '#6B6B70' }}>
            <span>{t.my.stripesCount}</span>
            <span className="font-semibold" style={{ color: '#1C1C1E' }}>{degree} / {MAX_STRIPES}</span>
          </div>
          <div className="rounded-full overflow-hidden" style={{ height: 7, background: '#EEF0F4' }}>
            <div className="h-full rounded-full" style={{ width: `${(degree / MAX_STRIPES) * 100}%`, background: 'linear-gradient(90deg, #007AFF, #3C9DFF)' }} />
          </div>
        </div>

        <Link
          href="/my/progress"
          prefetch={false}
          className="mt-4 flex items-center justify-center gap-1 text-sm font-semibold rounded-xl"
          style={{ background: 'rgba(0,122,255,.08)', color: '#007AFF', padding: '11px 0', textDecoration: 'none' }}
        >
          {t.my.viewProgress}<ChevronRight className="w-3.5 h-3.5 shrink-0" />
        </Link>
      </div>
    )
  }

  function renderMembershipCard() {
    if (!shownMembership) return null
    return (
      <div className="rounded-[20px]" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)', padding: 20 }}>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <p className="text-[10px] font-normal uppercase tracking-widest mb-0.5 truncate" style={{ color: '#6B6B70', letterSpacing: '.8px' }}>{t.my.activePlan}</p>
            <p className="text-sm font-medium truncate" style={{ color: '#1C1C1E' }}>{shownMembership.planName}</p>
          </div>
          {activeMembership ? (
            <span className="text-xs font-medium rounded-full px-2.5 py-1 shrink-0 whitespace-nowrap" style={{ background: '#E4F7EB', color: '#1E8734' }}>{t.my.active}</span>
          ) : (
            <span className="text-xs font-medium rounded-full px-2.5 py-1 shrink-0 whitespace-nowrap" style={{ background: '#FFFBEB', color: '#D97706' }}>{t.my.statusPending}</span>
          )}
        </div>
        <p className="text-[22px] font-medium mb-0.5 whitespace-nowrap" style={{ color: '#1C1C1E', letterSpacing: '-0.4px' }}>
          {fmtPrice(shownMembership.price, shownMembership.currency)}
          <span className="text-sm font-normal" style={{ color: '#6B6B70' }}> {t.my.perMonth}</span>
        </p>
        {activeMembership?.endDate && (
          <p className="text-xs mb-3" style={{ color: '#6B6B70' }}>
            {t.my.renews} {new Date(activeMembership.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </p>
        )}
        {pendingMembership && !activeMembership && (
          <div className="mt-1 mb-3 rounded-xl flex items-start gap-2" style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '10px 12px' }}>
            <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#D97706' }} />
            <div>
              <p className="text-xs font-semibold" style={{ color: '#92400E' }}>{t.my.pendingApproval}</p>
              <p className="text-xs leading-relaxed" style={{ color: '#B45309' }}>{t.my.pendingDesc}</p>
            </div>
          </div>
        )}
        <div style={{ height: 0.5, background: 'rgba(60,60,67,.1)', margin: '14px 0' }} />
        <Link href="/my/membership" prefetch={false} className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium truncate" style={{ color: '#007AFF' }}>{t.my.manageMembership}</span>
          <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: '#AEAEB2' }} />
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-4" style={{ background: '#F2F2F7', overflowX: 'hidden' }}>
      <div className="max-w-2xl lg:max-w-[1180px] mx-auto">

      {/* ── Greeting — one compact line, name carries the weight ──────────── */}
      <div className="px-4 md:px-6 pt-4 md:pt-6 pb-3 md:pb-4">
        <p className="text-base md:text-lg" style={{ color: '#1C1C1E' }}>
          {greeting}, <span className="font-semibold">{firstName}</span>
        </p>
      </div>

      {/* ── Stat row — desktop/tablet only ───────────────────────────────── */}
      <div className="hidden lg:grid lg:grid-cols-4 lg:gap-4 lg:px-6 lg:mb-6">
        <StatBox label={t.my.currentBelt} value={primaryMember?.belt ?? '—'} sub={primaryMember?.beltDegree ? `${primaryMember.beltDegree} ${t.my.stripesLabel}` : undefined} />
        <StatBox
          label={t.my.activePlan}
          value={shownMembership ? fmtPrice(shownMembership.price, shownMembership.currency) : '—'}
          sub={shownMembership ? (activeMembership ? t.my.active : t.my.statusPending) : undefined}
        />
        <StatBox label={t.my.myClasses} value={String(user?.bookings?.length ?? 0)} sub={t.my.upcomingClasses} />
        <StatBox
          label={t.my.nextClass}
          value={nextBooking ? fmtTime(nextBooking.scheduledAt) : '—'}
          sub={nextBooking ? (days === 0 ? t.my.today : days === 1 ? t.my.tomorrow : fmtDate(nextBooking.scheduledAt)) : undefined}
        />
      </div>

      {/* ── Hero card — next booking ─────────────────────────────────────────
          Minimal white card with small color accents, not a full navy banner —
          keeps the app's info-card language consistent instead of one big
          promotional-looking block at the top of every visit. ──────────────── */}
      {eventIsNext && nextEventBooking && eventStatus ? (
        <div className="mx-4 md:mx-6 mb-5 md:mb-6 lg:mb-8 rounded-[20px] overflow-hidden" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)' }}>
          <div style={{ padding: '18px 20px 20px' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center justify-center rounded-full shrink-0" style={{ width: 26, height: 26, background: 'rgba(0,122,255,.1)' }}>
                <Ticket className="w-3.5 h-3.5" style={{ color: '#007AFF' }} />
              </div>
              <span className="text-[11px] font-semibold uppercase truncate min-w-0" style={{ color: '#9CA3AF', letterSpacing: '.6px' }}>{t.my.upcomingEventLabel}</span>
              {eventDays !== null && (
                <span className="ml-auto text-[11px] font-semibold rounded-full shrink-0 whitespace-nowrap" style={{ background: '#E8F4FF', color: '#007AFF', padding: '3px 10px' }}>
                  {eventDays === 0 ? t.my.today : eventDays === 1 ? t.my.tomorrow : t.my.inDays.replace('{n}', String(eventDays))}
                </span>
              )}
            </div>

            <p className="text-base font-semibold mb-0.5" style={{ color: '#1C1C1E', letterSpacing: '-0.2px' }}>{nextEventBooking.event.title}</p>
            <p className="text-xs mb-3" style={{ color: '#9CA3AF' }}>
              {nextEventBooking.event.location
                ? `${nextEventBooking.event.location} · ${nextEventBooking.event.school.name}`
                : nextEventBooking.event.school.name}
            </p>

            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <div className="flex items-center gap-1" style={{ color: '#6B6B70' }}>
                <Calendar className="w-3 h-3" style={{ color: '#AEAEB2' }} />
                <span className="text-xs">{fmtEventDate(nextEventBooking.event.startAt)}</span>
              </div>
              <span className="text-[10px]" style={{ color: '#D1D5DB' }}>·</span>
              <div className="flex items-center gap-1" style={{ color: '#6B6B70' }}>
                <Clock className="w-3 h-3" style={{ color: '#AEAEB2' }} />
                <span className="text-xs">{fmtEventTime(nextEventBooking.event.startAt)}</span>
              </div>
              <span className="text-[10px]" style={{ color: '#D1D5DB' }}>·</span>
              <span className="text-xs font-semibold" style={{ color: eventStatus.color }}>{eventStatus.label}</span>
            </div>

            <div className="flex gap-2">
              <Link
                href={`/my/events?ticket=${nextEventBooking.id}`}
                prefetch={false}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-full"
                style={{ background: '#E8F7FF', color: '#006197', padding: '10px' }}
              >
                <QrCode className="w-3.5 h-3.5 shrink-0" />
                {t.my.showTicketBtn}
              </Link>
              <Link
                href="/my/events"
                prefetch={false}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium rounded-full"
                style={{ background: '#F5F5F5', color: '#374151', padding: '10px' }}
              >
                {t.my.details}
              </Link>
            </div>
          </div>
        </div>
      ) : nextBooking ? (
        <div className="relative mx-4 md:mx-6 mb-5 md:mb-6 lg:mb-8 rounded-[20px] overflow-hidden" style={{ height: 192, boxShadow: '0 2px 8px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)' }}>
          {/* Backdrop — the booked class's own cover photo when it has one,
              else the discipline gradient (same fallback the class rows
              below use), so the card reads in white text either way. */}
          <div className="absolute inset-0" style={{ background: classGradient(nextBooking.class.name) }} />
          {nextBookingOcc?.coverUrl && (
            <Image src={nextBookingOcc.coverUrl} alt="" fill priority className="object-cover" />
          )}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,.2) 0%, rgba(0,0,0,.62) 100%)' }} />

          <div className="relative h-full flex flex-col" style={{ padding: '16px 18px 16px' }}>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-[11px] font-semibold uppercase truncate min-w-0" style={{ color: 'rgba(255,255,255,.75)', letterSpacing: '.6px' }}>{t.my.nextClass}</span>
              {days !== null && (
                <span className="ml-auto text-[11px] font-semibold rounded-full shrink-0 whitespace-nowrap" style={{ background: '#fff', color: '#0870E2', padding: '3px 10px' }}>
                  {days === 0 ? t.my.today : days === 1 ? t.my.tomorrow : t.my.inDays.replace('{n}', String(days))}
                </span>
              )}
            </div>

            <p className="text-lg font-semibold leading-tight mb-1 truncate" style={{ color: '#fff', letterSpacing: '-0.2px' }}>{nextBooking.class.name}</p>

            <div className="flex items-center gap-2 mb-1">
              <div className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,.85)' }}>
                <Clock className="w-3 h-3" style={{ color: 'rgba(255,255,255,.6)' }} />
                <span className="text-xs">
                  {days === 0 ? t.my.today : days === 1 ? t.my.tomorrow : fmtDate(nextBooking.scheduledAt)} · {fmtTime(nextBooking.scheduledAt)}
                  {nextBooking.class.duration && `–${new Date(new Date(nextBooking.scheduledAt).getTime() + nextBooking.class.duration * 60000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}`}
                </span>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 text-xs font-medium mb-3" style={{ color: '#fff' }}>
              <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#4ADE80' }} />
              {t.my.reservedLabel}
            </span>

            <div className="mt-auto">
              {checkInOpen ? (
                <Link
                  href="/my/qr"
                  prefetch={false}
                  className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-full"
                  style={{ background: '#fff', color: '#0870E2', padding: '11px 22px' }}
                >
                  <QrCode className="w-4 h-4 shrink-0" />
                  {t.my.doCheckIn}
                </Link>
              ) : (
                <button
                  onClick={() => nextBookingOcc && setDetailOcc(nextBookingOcc)}
                  className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-full"
                  style={{ background: '#fff', color: '#0870E2', padding: '11px 22px', border: 'none', cursor: nextBookingOcc ? 'pointer' : 'default', fontFamily: 'inherit' }}
                >
                  <CalendarCheck className="w-4 h-4 shrink-0" />
                  {t.my.manageBooking}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* No upcoming booking — compact empty state, no backdrop photo. */
        <div
          className="mx-4 md:mx-6 mb-5 md:mb-6 rounded-[20px] flex items-center gap-4"
          style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)', padding: '18px 20px' }}
        >
          <div className="flex items-center justify-center rounded-2xl shrink-0" style={{ width: 44, height: 44, background: 'rgba(8,112,226,.10)' }}>
            <CalendarPlus className="w-5 h-5" style={{ color: '#0870E2' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium mb-2" style={{ color: '#1C1C1E' }}>{t.my.noBookingYet}</p>
            <Link
              href="/my/classes"
              prefetch={false}
              className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full"
              style={{ background: '#E8F7FF', color: '#0870E2', padding: '9px 14px' }}
            >
              {t.my.findAClass}
            </Link>
          </div>
        </div>
      )}

      {/* ── Main column + right rail — rail is desktop/tablet only ─────────── */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 lg:items-start lg:px-6">
      <div>
      {/* ── Upcoming classes — date strip + vertical list, mirroring the same
          thumbnail/name/time/availability row language the school side uses
          for its own class list (see DashboardClient.tsx), adapted to the
          student's perspective (availability + personal booking state
          instead of occupancy + management actions). ─────────────────────── */}
      <div className="mb-2">
        <div className="flex items-center justify-between px-4 md:px-6 lg:px-0 mb-3">
          <span className="text-base md:text-lg font-semibold" style={{ color: '#1C1C1E', letterSpacing: '-0.2px' }}>{t.my.upcomingClasses}</span>
          <Link href="/my/classes" prefetch={false} className="flex items-center text-sm font-normal" style={{ color: '#0870E2' }}>
            {t.my.viewSchedule}<ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="lg:px-0 mb-1">
          <DateStrip days={dateStripDays} selected={selectedDate} onSelect={setSelectedDate} localeTag={LOCALE_TAG[locale] ?? 'en-GB'} />
        </div>

        <div className="px-4 md:px-6 lg:px-0">
          {dayOccurrences.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: '#9CA3AF' }}>{t.my.noUpcomingClasses}</p>
          ) : dayOccurrences.slice(0, 6).map((occ, i, arr) => {
            const state: ClassRowState = occ.cancelled
              ? 'cancelled'
              : occ.alreadyBooked
              ? 'booked'
              : !occ.canBook
              ? (occ.capacity !== null && occ.booked >= occ.capacity ? 'full' : 'closed')
              : 'available'
            const isBooking = bookingId === `${occ.classId}:${occ.scheduledAt}`
            const remaining = occ.capacity !== null ? Math.max(0, occ.capacity - occ.booked) : null
            const availabilityLabel = remaining === null || state === 'full' || state === 'cancelled'
              ? null
              : remaining <= 5
              ? t.my.fewSpotsLeft.replace('{n}', String(remaining))
              : t.my.spotsAvailable.replace('{n}', String(remaining))
            const endTime = occ.duration
              ? new Date(new Date(occ.scheduledAt).getTime() + occ.duration * 60000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
              : null
            const timeLabel = `${fmtTime(occ.scheduledAt)}${endTime ? `–${endTime}` : ''}`
            const action =
              state === 'cancelled' ? { label: t.my.classCancelledBadge } :
              state === 'booked'    ? { label: t.my.reservedLabel } :
              state === 'full'      ? { label: t.my.full } :
              state === 'closed'    ? { label: t.my.activateToBook, href: '/my/membership' } :
              { label: t.my.bookNow, onClick: () => bookClass(occ), loading: isBooking }

            return (
              <div key={`${occ.classId}:${occ.scheduledAt}`} style={{ borderBottom: i < arr.length - 1 ? '0.5px solid rgba(60,60,67,.08)' : 'none' }}>
                <ClassRow
                  photoUrl={occ.coverUrl}
                  fallbackBackground={classGradient(occ.className)}
                  badgeLabel={classTypeBadge(occ.className)}
                  name={occ.className}
                  timeLabel={timeLabel}
                  availabilityLabel={availabilityLabel}
                  state={state}
                  action={action}
                  onRowClick={() => setDetailOcc(occ)}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Curriculum preview — technique videos, hidden if the school hasn't
          enabled the module or this student can't see it (see the 403 case
          in the fetch above). ────────────────────────────────────────────── */}
      {curriculumLessons.length > 0 && (
        <div className="mb-2 mt-2">
          <div className="flex items-center justify-between px-4 md:px-6 lg:px-0 mb-3">
            <span className="text-base md:text-lg font-semibold" style={{ color: '#1C1C1E', letterSpacing: '-0.2px' }}>Curriculum</span>
            <Link href="/my/curriculum" prefetch={false} className="flex items-center text-sm font-normal" style={{ color: '#007AFF' }}>
              {t.my.viewAll}<ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* One lesson per row, lateral scroll, snap-carousel with dot sync
              (lessonCarRef / lessonDotCount below). */}
          <div
            ref={lessonCarRef}
            className="flex gap-3 overflow-x-auto pb-1"
            style={{ scrollSnapType: 'x mandatory', scrollPaddingLeft: 16, paddingLeft: 16, WebkitOverflowScrolling: 'touch' }}
          >
            {curriculumLessons.slice(0, 3).map(lesson => {
              const thumbUrl = lesson.muxPlaybackId && lesson.thumbnailToken
                ? `https://image.mux.com/${lesson.muxPlaybackId}/thumbnail.jpg?token=${lesson.thumbnailToken}&width=640`
                : null
              return (
                <button
                  key={lesson.id}
                  onClick={() => lesson.muxPlaybackId && setPlayingLesson(lesson)}
                  className="lesson-car-card flex flex-col text-left cursor-pointer shrink-0 rounded-2xl overflow-hidden"
                  style={{ width: 'calc(100vw - 32px)', maxWidth: 420, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)', border: 'none', padding: 0, fontFamily: 'inherit', scrollSnapAlign: 'start' }}
                >
                  <div className="relative w-full overflow-hidden flex items-center justify-center" style={{ aspectRatio: '16/9', background: '#111827' }}>
                    {thumbUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,.55) 100%)' }} />
                    {lesson.category && (
                      <span
                        className="absolute top-3 left-3 text-[11px] font-semibold rounded-full"
                        style={{ color: '#fff', background: 'rgba(255,255,255,.18)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,.28)', padding: '4px 10px' }}
                      >
                        {lesson.category}
                      </span>
                    )}
                    <div
                      className="relative w-14 h-14 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,.22)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,.3)' }}
                    >
                      <PlayCircle className="w-7 h-7 ml-0.5" style={{ color: '#fff' }} strokeWidth={1.5} />
                    </div>
                    {fmtDuration(lesson.durationSec) && (
                      <span className="absolute bottom-3 right-3 px-2 py-1 rounded-lg" style={{ fontSize: 11, fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(6px)' }}>
                        {fmtDuration(lesson.durationSec)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2" style={{ padding: '12px 14px 13px' }}>
                    <div style={{ minWidth: 0 }}>
                      <p className="truncate" style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E', letterSpacing: '-0.2px' }}>{lesson.title}</p>
                      <p className="truncate" style={{ fontSize: 12.5, color: '#9CA3AF', marginTop: 2 }}>{lesson.category ?? 'Lesson'}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 shrink-0" style={{ color: '#C7C7CC' }} />
                  </div>
                </button>
              )
            })}
            {/* Right-edge spacer — paddingRight doesn't work reliably in flex scroll */}
            <div className="shrink-0" style={{ width: 16 }} />
          </div>

          {/* Dots */}
          {lessonDotCount > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-2 pb-1">
              {Array.from({ length: lessonDotCount }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === activeLessonDot ? 18 : 6,
                    height: 6,
                    borderRadius: i === activeLessonDot ? 4 : '50%',
                    background: i === activeLessonDot ? '#007AFF' : '#AEAEB2',
                    transition: 'all .2s',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
      </div>{/* end main column */}

      {/* ── Right rail — school, membership, belt — desktop/tablet only ────── */}
      <aside className="hidden lg:flex lg:flex-col lg:gap-5">
        {renderSchoolCard()}
        {renderMembershipCard()}
        {renderBeltCard()}
      </aside>
      </div>{/* end lg:grid main+rail */}

      {/* ── Progress + Membership — compact two-column card, mobile/tablet only
          (replaced by the fuller rail cards on lg+). Progress uses the real
          stripe-degree scale (see renderBeltCard above) rather than a class
          count — this school's grading isn't tracked as "N classes toward
          next belt" (see the comment on MAX_STRIPES below). Membership covers
          all 5 real statuses instead of just active/pending. ─────────────── */}
      {(() => {
        const pausedMembership   = user?.memberships?.find(m => m.status === 'PAUSED')
        const inactiveMembership = user?.memberships?.find(m => m.status === 'EXPIRED' || m.status === 'CANCELLED')
        const compactMembership  = activeMembership ?? pendingMembership ?? pausedMembership ?? inactiveMembership
        const MEMBERSHIP_STYLE: Record<string, { label: string; color: string }> = {
          ACTIVE:    { label: t.my.statusActive,    color: '#1E8734' },
          PENDING:   { label: t.my.statusPending,   color: '#D97706' },
          PAUSED:    { label: t.my.statusPaused,    color: '#3B82F6' },
          CANCELLED: { label: t.my.statusCancelled, color: '#6B7280' },
          EXPIRED:   { label: t.my.statusExpired,   color: '#DC2626' },
        }
        const membershipStyle = compactMembership ? MEMBERSHIP_STYLE[compactMembership.status] : undefined
        const MAX_STRIPES = 4
        const degree = primaryMember?.beltDegree ?? 0
        const showProgress = !!primaryMember?.belt
        // "No membership" is only worth a column for someone who actually
        // belongs to a school — a visitor with no school at all gets the
        // dedicated empty-state card further down instead of this fallback.
        const belongsToSchool = (user?.schoolMembers?.length ?? 0) > 0 || !!primarySchool
        const showMembershipCol = belongsToSchool
        if (!showProgress && !showMembershipCol) return null

        return (
          <div className="mx-4 md:mx-6 mb-4 lg:hidden rounded-[20px] overflow-hidden" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)' }}>
            <div className="flex">
              {showProgress && (
                <Link href="/my/progress" prefetch={false} className="flex-1 min-w-0" style={{ padding: '16px 18px' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold" style={{ color: '#1C1C1E' }}>{t.my.yourProgress}</span>
                    <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: '#C7C7CC' }} />
                  </div>
                  <p className="text-xs mb-2 truncate" style={{ color: '#6B6B70' }}>
                    {primaryMember?.belt} · {degree}/{MAX_STRIPES} {t.my.stripesLabel}
                  </p>
                  <div className="rounded-full overflow-hidden" style={{ height: 6, background: '#EEF0F4' }}>
                    <div className="h-full rounded-full" style={{ width: `${(degree / MAX_STRIPES) * 100}%`, background: 'linear-gradient(90deg, #0870E2, #3C9DFF)' }} />
                  </div>
                </Link>
              )}
              {showProgress && showMembershipCol && <div style={{ width: 1, background: 'rgba(60,60,67,.10)' }} />}
              {showMembershipCol && (
                <Link href="/my/membership" prefetch={false} className="flex-1 min-w-0" style={{ padding: '16px 18px' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold" style={{ color: '#1C1C1E' }}>{t.my.navMembership}</span>
                    <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: '#C7C7CC' }} />
                  </div>
                  {compactMembership && membershipStyle ? (
                    <>
                      <p className="text-sm font-semibold mb-1" style={{ color: membershipStyle.color }}>{membershipStyle.label}</p>
                      {compactMembership.status === 'ACTIVE' && compactMembership.endDate && (
                        <p className="text-xs truncate" style={{ color: '#6B6B70' }}>
                          {t.my.renews} {new Date(compactMembership.endDate).toLocaleDateString(LOCALE_TAG[locale] ?? 'en-GB', { day: 'numeric', month: 'short' })}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm font-medium" style={{ color: '#9CA3AF' }}>{t.my.noMembershipShort}</p>
                  )}
                </Link>
              )}
            </div>
          </div>
        )
      })()}

      {/* ── Empty state (no school / membership) ──────────────────────────── */}
      {!activeMembership && !nextBooking && (user?.schoolMembers?.length ?? 0) === 0 && (
        <div className="mx-4 md:mx-6 mb-4 rounded-2xl p-8 text-center" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(0,122,255,.08)' }}>
            <CalendarPlus className="w-6 h-6" style={{ color: '#007AFF' }} />
          </div>
          <h3 className="text-sm font-semibold mb-1" style={{ color: '#1C1C1E' }}>{t.my.findYourAcademy}</h3>
          <p className="text-xs mb-4" style={{ color: '#6B6B70' }}>{t.my.searchNearYou}</p>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-semibold"
            style={{ background: '#007AFF' }}
          >
            {t.my.exploreSchools}
          </Link>
        </div>
      )}

      </div>{/* end max-w-lg */}

      {/* ── Cancel confirm modal ──────────────────────────────────────────── */}
      {cancelOcc && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => !cancelling && setCancelOcc(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 pb-28 sm:pb-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full" style={{ background: '#E5E5EA' }} />
            </div>
            <h2 className="text-base font-semibold mb-1" style={{ color: '#1C1C1E' }}>{t.my.cancelBookingTitle}</h2>
            <p className="text-sm mb-6" style={{ color: '#6B6B70' }}>
              {cancelOcc.className} · {new Date(cancelOcc.scheduledAt).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })} at {new Date(cancelOcc.scheduledAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelOcc(null)}
                disabled={cancelling}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold disabled:opacity-50"
                style={{ border: '1px solid #E5E5EA', color: '#6B6B70', background: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
              >
                {t.my.keepIt}
              </button>
              <button
                onClick={() => cancelClass(cancelOcc)}
                disabled={cancelling}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: '#EF4444', border: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
              >
                {cancelling
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                  : t.my.cancelBookingBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Class detail bottom sheet ──────────────────────────────────────── */}
      {detailOcc && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setDetailOcc(null)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl overflow-y-auto"
            style={{ maxHeight: '85vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: '#E5E5EA' }} />
            </div>

            {/* Photo */}
            {detailOcc.coverUrl && (
              <div className="mx-4 mt-2 rounded-2xl overflow-hidden" style={{ height: 192 }}>
                <img src={detailOcc.coverUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="p-5 pb-32">
              <div className="flex items-start justify-between gap-3 mb-1">
                <h2 className="text-lg font-semibold leading-snug" style={{ color: '#1C1C1E' }}>{detailOcc.className}</h2>
                {detailOcc.capacity !== null && (
                  <span className="text-sm shrink-0" style={{ color: '#6B6B70' }}>{detailOcc.booked}/{detailOcc.capacity}</span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs mb-4" style={{ color: '#6B6B70' }}>
                <span>{fmtDate(detailOcc.scheduledAt)}</span>
                <span style={{ color: '#D1D1D6' }}>·</span>
                <span>{fmtTime(detailOcc.scheduledAt)}{detailOcc.duration ? ` · ${detailOcc.duration}min` : ''}</span>
                <span style={{ color: '#D1D1D6' }}>·</span>
                <span>{detailOcc.school.name}</span>
              </div>

              {detailOcc.cancelled && (
                <div className="flex items-start gap-3 p-3.5 rounded-2xl mb-4" style={{ background: '#F5F5F5' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: '#E5E5EA' }}>
                    <Info className="w-4 h-4" style={{ color: '#6B6B70' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#1C1C1E' }}>{t.my.classCancelledTitle}</p>
                    {detailOcc.cancelReason && (
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#6B6B70' }}>{detailOcc.cancelReason}</p>
                    )}
                  </div>
                </div>
              )}

              {!detailOcc.cancelled && detailOcc.level && (
                <span className="inline-block text-xs font-medium px-3 py-1 rounded-full mb-4" style={{ background: '#E8F7FF', color: '#006197' }}>
                  {detailOcc.level}
                </span>
              )}

              {!detailOcc.cancelled && detailOcc.instructor && (
                <div className="flex items-center gap-3 p-3 rounded-2xl mb-4" style={{ background: '#F5F5F5' }}>
                  {detailOcc.instructor.photoUrl ? (
                    <img src={detailOcc.instructor.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: '#E8F7FF' }}>
                      <span className="text-sm font-semibold" style={{ color: '#006197' }}>{detailOcc.instructor.name[0]}</span>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#1C1C1E' }}>{detailOcc.instructor.name}</p>
                    <p className="text-xs" style={{ color: '#6B6B70' }}>{t.my.instructor}</p>
                  </div>
                </div>
              )}

              {!detailOcc.cancelled && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: '#1C1C1E' }}>
                    <Users className="w-3.5 h-3.5" style={{ color: '#9E9E9E' }} />
                    {t.my.whosComingLabel}
                  </p>
                  {detailOcc.capacity !== null && (
                    <span className="text-xs font-semibold" style={{ color: '#9E9E9E' }}>{detailOcc.booked}/{detailOcc.capacity}</span>
                  )}
                </div>
                {loadingAttendees ? (
                  <div className="space-y-2">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="flex items-center gap-2.5 animate-pulse">
                        <div className="w-8 h-8 rounded-full shrink-0" style={{ background: '#F0F0F0' }} />
                        <div className="h-3 w-24 rounded" style={{ background: '#F0F0F0' }} />
                      </div>
                    ))}
                  </div>
                ) : attendees.length === 0 ? (
                  <p className="text-xs py-1" style={{ color: '#9E9E9E' }}>{t.my.noOneBookedYet}</p>
                ) : (
                  <div className="space-y-2.5">
                    {attendees.map(a => (
                      <div key={a.id} className="flex items-center gap-2.5">
                        {a.avatarUrl ? (
                          <img src={a.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: '#E8F7FF' }}>
                            <span className="text-xs font-semibold" style={{ color: '#006197' }}>{a.name[0]}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: '#1C1C1E' }}>{a.name}</p>
                          {a.belt && (
                            <img src={getBeltImage(a.belt, a.beltDegree)} alt={a.belt} className="h-2.5 w-auto max-w-[70px] object-contain mt-1" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setDetailOcc(null)}
                  className="flex-1 py-3 rounded-2xl text-sm font-medium"
                  style={{ border: '1px solid #E5E5EA', color: '#6B6B70', background: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
                >
                  {t.my.close}
                </button>
                {detailOcc.cancelled ? (
                  <div className="flex-1 py-3 rounded-2xl text-sm font-medium flex items-center justify-center" style={{ background: '#F5F5F5', color: '#9E9E9E' }}>
                    {t.my.classCancelledBadge}
                  </div>
                ) : detailOcc.alreadyBooked ? (
                  <div className="flex-1 py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-1" style={{ background: '#E4F7EB', color: '#1E8734' }}>
                    {t.my.bookedCheck}
                  </div>
                ) : !detailOcc.canBook ? (
                  <Link
                    href="/my/membership"
                    prefetch={false}
                    onClick={() => setDetailOcc(null)}
                    className="flex-1 py-3 rounded-2xl text-sm font-medium flex items-center justify-center"
                    style={{ background: '#FFFBEB', color: '#D97706', textDecoration: 'none' }}
                  >
                    {t.my.activateToBook}
                  </Link>
                ) : detailOcc.capacity !== null && detailOcc.booked >= detailOcc.capacity ? (
                  <div className="flex-1 py-3 rounded-2xl text-sm font-medium flex items-center justify-center" style={{ background: '#F5F5F5', color: '#9E9E9E' }}>
                    {t.my.full}
                  </div>
                ) : (
                  <button
                    onClick={() => bookClass(detailOcc)}
                    disabled={!!bookingId}
                    className="flex-1 py-3 rounded-2xl text-sm font-medium disabled:opacity-60 flex items-center justify-center"
                    style={{ background: '#E8F7FF', color: '#006197', border: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
                  >
                    {bookingId === `${detailOcc.classId}:${detailOcc.scheduledAt}`
                      ? <span className="inline-block w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#006197', borderTopColor: 'transparent' }} />
                      : t.my.bookNow}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Booking success popup ──────────────────────────────────────────── */}
      {bookSuccessOcc && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setBookSuccessOcc(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 text-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#E4F7EB' }}>
              <CheckCircle2 className="w-7 h-7" style={{ color: '#1E8734' }} />
            </div>
            <h2 className="text-base font-semibold mb-1" style={{ color: '#1C1C1E' }}>{t.my.bookingConfirmedTitle}</h2>
            <p className="text-sm mb-1" style={{ color: '#6B6B70' }}>{bookSuccessOcc.className}</p>
            <p className="text-xs mb-5" style={{ color: '#9CA3AF' }}>
              {new Date(bookSuccessOcc.scheduledAt).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })} · {fmtTime(bookSuccessOcc.scheduledAt)}
            </p>
            <button
              onClick={() => setBookSuccessOcc(null)}
              className="w-full py-3 rounded-2xl text-sm font-semibold text-white"
              style={{ background: '#007AFF', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {t.common.done}
            </button>
          </div>
        </div>
      )}

      {/* ── Curriculum video lightbox ───────────────────────────────────── */}
      {playingLesson && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={() => setPlayingLesson(null)}>
          <div className="w-full max-w-lg px-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{playingLesson.title}</p>
              <button onClick={() => setPlayingLesson(null)} className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none' }}>
                <X size={16} style={{ color: '#fff' }} />
              </button>
            </div>
            {playingLesson.muxPlaybackId && (
              <MuxPlayer
                ref={playerRef}
                playbackId={playingLesson.muxPlaybackId}
                tokens={playingLesson.playbackToken ? { playback: playingLesson.playbackToken } : undefined}
                streamType="on-demand"
                autoPlay
                onTimeUpdate={handleLessonProgress}
                onEnded={() => markLessonWatched(playingLesson.id)}
                style={{ width: '100%', aspectRatio: '16/9', borderRadius: 12 }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
