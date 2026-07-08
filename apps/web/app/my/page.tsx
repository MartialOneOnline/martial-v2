'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Calendar, Clock, CalendarCheck, QrCode, CalendarPlus,
  CreditCard, TrendingUp, ChevronRight,
} from 'lucide-react'
import { fmtPrice } from '../../lib/format'
import { getBeltImage } from '../../lib/belts'
import { useT } from '../../lib/i18n/LanguageContext'

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
      school: { id: string; name: string; slug: string; logoUrl: string | null; city: string | null }
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
    schoolMembers: {
      id: string
      belt: string | null
      beltDegree: number | null
      beltDate: string | null
      role: string
      status: string
      school: { id: string; name: string; slug: string; logoUrl: string | null }
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
function classGradient(name: string) {
  const lower = name.toLowerCase()
  const key = Object.keys(DISCIPLINE_GRADIENTS).find(k => lower.includes(k))
  return key ? DISCIPLINE_GRADIENTS[key] : DISCIPLINE_GRADIENTS.bjj
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
}
function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}
function fmtDateShortFn(iso: string, todayLabel: string, tomorrowLabel: string) {
  const d = new Date(iso)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  const day = new Date(iso); day.setHours(0, 0, 0, 0)
  if (day.getTime() === today.getTime()) return todayLabel
  if (day.getTime() === tomorrow.getTime()) return tomorrowLabel
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
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

// ── Quick actions ─────────────────────────────────────────────────────────────

const QUICK_ACTION_KEYS = [
  { labelKey: 'quickBookClass', href: '/my/classes',   icon: CalendarPlus },
  { labelKey: 'quickQr',        href: '/my/qr',         icon: QrCode },
  { labelKey: 'quickMembership',href: '/my/membership', icon: CreditCard },
  { labelKey: 'quickProgress',  href: '/my/progress',   icon: TrendingUp },
]

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MyHomePage() {
  const t = useT()
  const [data, setData]             = useState<UserData | null>(null)
  const [loading, setLoading]       = useState(true)
  const [occurrences, setOccurrences] = useState<Occurrence[]>([])
  const [bookingId, setBookingId]   = useState<string | null>(null)
  const [activeDot, setActiveDot]   = useState(0)
  const [detailOcc, setDetailOcc]   = useState<Occurrence | null>(null)
  const [cancelOcc, setCancelOcc]   = useState<Occurrence | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const carRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/my')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
    fetch('/api/my/school-classes')
      .then(r => r.json())
      .then(d => setOccurrences(d.occurrences ?? []))
      .catch(() => {})
  }, [])

  // Carousel dot sync
  useEffect(() => {
    const el = carRef.current
    if (!el) return
    const handler = () => {
      const cards = el.querySelectorAll<HTMLElement>('.car-card')
      let closest = 0, minDist = Infinity
      const elLeft = el.getBoundingClientRect().left
      cards.forEach((c, i) => {
        const dist = Math.abs(c.getBoundingClientRect().left - elLeft)
        if (dist < minDist) { minDist = dist; closest = i }
      })
      setActiveDot(closest)
    }
    el.addEventListener('scroll', handler, { passive: true })
    return () => el.removeEventListener('scroll', handler)
  }, [occurrences])

  async function bookClass(occ: Occurrence) {
    if (bookingId) return
    setBookingId(`${occ.classId}:${occ.scheduledAt}`)
    try {
      const res = await fetch('/api/bookings', {
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
      const res = await fetch(`/api/my/bookings/${booking.id}`, { method: 'DELETE' })
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: '#F2F2F7' }}>
        <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#007AFF', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  const user              = data?.user
  const firstName         = user?.name?.split(' ')[0] ?? 'there'
  const activeMembership  = user?.memberships?.find(m => m.status === 'ACTIVE')
  const pendingMembership = user?.memberships?.find(m => m.status === 'PENDING')
  const shownMembership   = activeMembership ?? pendingMembership
  const nextBooking       = user?.bookings?.[0]
  const primaryMember     = user?.schoolMembers?.[0]
  const hour              = new Date().getHours()
  const greeting          = hour < 12 ? t.my.goodMorning : hour < 18 ? t.my.goodAfternoon : t.my.goodEvening
  const days              = nextBooking ? daysUntil(nextBooking.scheduledAt) : null
  const dotCount          = Math.min(occurrences.length, 4)

  return (
    <div className="min-h-screen pb-4" style={{ background: '#F2F2F7', overflowX: 'hidden' }}>
      <div className="max-w-2xl mx-auto">

      {/* ── Greeting ──────────────────────────────────────────────────────── */}
      <div className="px-4 md:px-6 pt-4 md:pt-7 pb-4 md:pb-5">
        <p className="text-xs md:text-sm" style={{ color: '#6B6B70' }}>{greeting}</p>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight" style={{ color: '#1C1C1E', letterSpacing: '-0.5px' }}>{firstName}</h1>
      </div>

      {/* ── Hero card — next booking ───────────────────────────────────────── */}
      {nextBooking ? (
        <div className="mx-4 md:mx-6 mb-5 md:mb-6 rounded-3xl overflow-hidden relative" style={{ background: 'linear-gradient(145deg, #0d2d52 0%, #08213D 55%, #061729 100%)', padding: '22px 22px 20px' }}>
          {/* Decorative circles */}
          <div className="absolute" style={{ right: -20, top: -40, width: 160, height: 160, borderRadius: '50%', border: '28px solid rgba(255,255,255,.04)' }} />
          <div className="absolute" style={{ right: 60, top: -70, width: 100, height: 100, borderRadius: '50%', border: '16px solid rgba(255,255,255,.025)' }} />

          {/* Pill badge */}
          {days !== null && (
            <div className="inline-flex items-center gap-1 mb-3 rounded-full" style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.16)', padding: '3px 10px' }}>
              <Clock className="w-3 h-3" style={{ color: 'rgba(255,255,255,.7)' }} />
              <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,.88)' }}>
                {days === 0 ? t.my.today : days === 1 ? t.my.tomorrow : t.my.inDays.replace('{n}', String(days))}
              </span>
            </div>
          )}

          <p className="text-[10px] font-medium uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,.35)', letterSpacing: '1.5px' }}>{t.my.nextClass}</p>
          <p className="text-lg font-medium mb-0.5" style={{ color: '#fff', letterSpacing: '-0.2px' }}>{nextBooking.class.name}</p>
          <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,.4)' }}>{nextBooking.class.school.name}</p>

          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,.7)' }}>
              <Calendar className="w-3 h-3" style={{ color: 'rgba(255,255,255,.38)' }} />
              <span className="text-xs">{fmtDate(nextBooking.scheduledAt)}</span>
            </div>
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,.2)' }}>·</span>
            <div className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,.7)' }}>
              <Clock className="w-3 h-3" style={{ color: 'rgba(255,255,255,.38)' }} />
              <span className="text-xs">{fmtTime(nextBooking.scheduledAt)}</span>
              {nextBooking.class.duration && (
                <span className="text-xs" style={{ color: 'rgba(255,255,255,.35)' }}>· {nextBooking.class.duration}min</span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href="/my/classes"
              prefetch={false}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium rounded-full"
              style={{ background: 'rgba(255,255,255,.22)', color: '#fff', border: '1px solid rgba(255,255,255,.35)', padding: '9px 10px' }}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              {t.my.viewBooking}
            </Link>
            <Link
              href="/my/qr"
              prefetch={false}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-normal rounded-full"
              style={{ background: 'rgba(255,255,255,.08)', color: '#fff', border: '1px solid rgba(255,255,255,.2)', padding: '9px 10px' }}
            >
              <QrCode className="w-3.5 h-3.5" style={{ opacity: 0.8 }} />
              {t.my.qrCheckIn}
            </Link>
          </div>
        </div>
      ) : (
        /* No upcoming booking */
        <div className="mx-4 md:mx-6 mb-5 md:mb-6 rounded-3xl overflow-hidden relative" style={{ background: 'linear-gradient(145deg, #0d2d52 0%, #08213D 55%, #061729 100%)', padding: '22px 22px 20px' }}>
          <div className="absolute" style={{ right: -20, top: -40, width: 160, height: 160, borderRadius: '50%', border: '28px solid rgba(255,255,255,.04)' }} />
          <div className="absolute" style={{ right: 60, top: -70, width: 100, height: 100, borderRadius: '50%', border: '16px solid rgba(255,255,255,.025)' }} />
          <p className="text-[10px] font-medium uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,.35)', letterSpacing: '1.5px' }}>{t.my.nextClass}</p>
          <p className="text-lg font-medium mb-3" style={{ color: '#fff' }}>{t.my.noUpcomingClasses}</p>
          <Link
            href="/my/classes"
            prefetch={false}
            className="inline-flex items-center gap-1.5 text-xs font-medium rounded-full"
            style={{ background: 'rgba(255,255,255,.22)', color: '#fff', border: '1px solid rgba(255,255,255,.35)', padding: '9px 14px' }}
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            {t.my.bookAClass}
          </Link>
        </div>
      )}

      {/* ── Quick actions ──────────────────────────────────────────────────── */}
      <div className="px-4 md:px-6 mb-5 md:mb-7">
        <div className="grid grid-cols-4 md:gap-2">
          {QUICK_ACTION_KEYS.map(qa => (
            <Link key={qa.href} href={qa.href} prefetch={false} className="flex flex-col items-center gap-2 py-1">
              <div className="w-[50px] h-[50px] md:w-[56px] md:h-[56px] rounded-full flex items-center justify-center" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.08), 0 0 0 0.5px rgba(0,0,0,.05)' }}>
                <qa.icon className="w-5 h-5 md:w-6 md:h-6" style={{ color: '#007AFF' }} />
              </div>
              <span className="text-[10px] md:text-[11px] font-normal text-center leading-tight" style={{ color: '#6B6B70' }}>{t.my[qa.labelKey as keyof typeof t.my]}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Upcoming classes carousel ──────────────────────────────────────── */}
      {occurrences.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between px-4 md:px-6 mb-3">
            <span className="text-base md:text-lg font-semibold" style={{ color: '#1C1C1E', letterSpacing: '-0.2px' }}>{t.my.upcomingClasses}</span>
            <Link href="/my/classes" prefetch={false} className="flex items-center text-sm font-normal" style={{ color: '#007AFF' }}>
              {t.my.viewAll}<ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Scrollable cards */}
          <div
            ref={carRef}
            className="flex gap-3 overflow-x-auto pb-1"
            style={{ scrollSnapType: 'x mandatory', scrollPaddingLeft: 16, paddingLeft: 16, WebkitOverflowScrolling: 'touch' }}
          >

            {occurrences.slice(0, 4).map(occ => {
              const isFull     = occ.capacity !== null && occ.booked >= occ.capacity
              const isBooking  = bookingId === `${occ.classId}:${occ.scheduledAt}`
              const endTime    = occ.duration
                ? new Date(new Date(occ.scheduledAt).getTime() + occ.duration * 60000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
                : null

              return (
                <div
                  key={`${occ.classId}:${occ.scheduledAt}`}
                  className="car-card flex flex-col shrink-0 rounded-xl overflow-hidden"
                  style={{ width: 'calc(88vw)', maxWidth: 320, background: '#fff', border: '1px solid rgba(0,0,0,.07)', boxShadow: '0 1px 4px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.04)', scrollSnapAlign: 'start' }}
                >
                  {/* Photo */}
                  <div className="relative shrink-0 overflow-hidden" style={{ height: 132, borderRadius: '8px 8px 0 0', background: classGradient(occ.className) }}>
                    {occ.coverUrl && (
                      <img
                        src={occ.coverUrl}
                        alt={occ.className}
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ borderRadius: '8px 8px 0 0' }}
                      />
                    )}
                    {/* Overlay */}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,.04) 0%, rgba(0,0,0,.22) 100%)', zIndex: 1 }} />
                    {/* Badge */}
                    <span className="absolute top-2 left-2 text-[10px] font-medium uppercase tracking-wide" style={{ zIndex: 2, background: 'rgba(14,0,0,.45)', border: '0.6px solid rgba(255,255,255,.2)', borderRadius: 4, padding: '3px 7px', color: 'rgba(255,255,255,.95)', letterSpacing: '.5px' }}>
                      {classTypeBadge(occ.className)}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="flex flex-col flex-1" style={{ padding: '10px 12px 11px' }}>
                    <div className="flex items-start justify-between gap-1.5 mb-1">
                      <span className="text-sm font-medium leading-tight" style={{ color: '#061229' }}>{occ.className}</span>
                      {occ.capacity !== null && (
                        <span className="text-xs font-normal shrink-0" style={{ color: '#061229' }}>{occ.booked}/{occ.capacity}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10.5px] font-medium" style={{ color: '#4f4f4f' }}>{classTypeBadge(occ.className)}</span>
                      <span className="text-[10.5px] font-normal" style={{ color: '#4f4f4f' }}>{fmtDateShortFn(occ.scheduledAt, t.my.today, t.my.tomorrow)}</span>
                      <span className="text-[10.5px] font-normal text-right" style={{ color: '#4f4f4f' }}>
                        {fmtTime(occ.scheduledAt)}{endTime ? `–${endTime}` : ''}
                      </span>
                    </div>
                    <div className="mb-2" style={{ height: 0.5, background: '#eaeaea' }} />
                    <p className="text-[11px] font-normal leading-relaxed mb-2.5 overflow-hidden" style={{ color: '#111', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {occ.instructor ? `${t.my.instructor}: ${occ.instructor.name}` : occ.school.name}
                    </p>
                    <div className="flex gap-1.5 mt-auto">
                      <button
                        onClick={() => setDetailOcc(occ)}
                        className="flex-1 text-center text-xs font-medium rounded-lg"
                        style={{ background: '#ECEAEA', color: '#000', padding: '6px 0', fontSize: 11.5, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        {t.my.details}
                      </button>
                      {occ.alreadyBooked ? (
                        <button
                          onClick={() => setCancelOcc(occ)}
                          className="flex-1 text-center text-xs font-medium rounded-lg"
                          style={{ background: '#FFEBEE', color: '#C62828', padding: '6px 0', fontSize: 11.5, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          {t.my.cancel}
                        </button>
                      ) : isFull ? (
                        <span
                          className="flex-1 text-center text-xs font-medium rounded-lg"
                          style={{ background: '#F5F5F5', color: '#9E9E9E', padding: '6px 0', fontSize: 11.5 }}
                        >
                          {t.my.full}
                        </span>
                      ) : (
                        <button
                          onClick={() => bookClass(occ)}
                          disabled={!!bookingId}
                          className="flex-1 text-center text-xs font-medium rounded-lg disabled:opacity-60"
                          style={{ background: '#E8F7FF', color: '#006197', padding: '6px 0', fontSize: 11.5, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          {isBooking
                            ? <span className="inline-block w-3 h-3 border-2 border-t-transparent rounded-full animate-spin align-middle" style={{ borderColor: '#006197', borderTopColor: 'transparent' }} />
                            : t.my.bookNow}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {/* Right-edge spacer — paddingRight doesn't work reliably in flex scroll */}
            <div className="shrink-0" style={{ width: 16 }} />
          </div>

          {/* Dots */}
          {dotCount > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-2 pb-1">
              {Array.from({ length: dotCount }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === activeDot ? 18 : 6,
                    height: 6,
                    borderRadius: i === activeDot ? 4 : '50%',
                    background: i === activeDot ? '#007AFF' : '#AEAEB2',
                    transition: 'all .2s',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Progress + Membership — side by side on desktop ──────────────── */}
      <div className="md:grid md:grid-cols-2 md:gap-4 md:px-6 md:mb-0">

      {/* ── Belt badge ─────────────────────────────────────────────────────── */}
      {primaryMember?.belt && (
        <div className="mx-4 md:mx-0 mb-4 rounded-2xl overflow-hidden" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)', padding: 18 }}>
          <div className="flex items-center gap-4">
            <img
              src={getBeltImage(primaryMember.belt, primaryMember.beltDegree ?? 0)}
              alt={primaryMember.belt}
              className="h-8 w-auto max-w-[90px] object-contain shrink-0"
            />
            <div className="flex-1" style={{ minWidth: 0 }}>
              <p className="text-sm font-medium" style={{ color: '#1C1C1E' }}>
                {primaryMember.belt}
                {(primaryMember.beltDegree ?? 0) > 0 && ` · ${primaryMember.beltDegree} ${t.my.stripesLabel}`}
              </p>
              <Link href="/my/progress" prefetch={false} className="flex items-center gap-0.5 text-sm font-medium mt-1" style={{ color: '#007AFF' }}>
                {t.my.viewProgress}<ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Membership card ────────────────────────────────────────────────── */}
      {shownMembership && (
        <div className="mx-4 md:mx-0 mb-4 rounded-2xl overflow-hidden" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)', padding: 18 }}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[10px] font-normal uppercase tracking-widest mb-0.5" style={{ color: '#6B6B70', letterSpacing: '.8px' }}>{t.my.activePlan}</p>
              <p className="text-sm font-medium" style={{ color: '#1C1C1E' }}>{shownMembership.planName}</p>
            </div>
            {activeMembership ? (
              <span className="text-xs font-medium rounded-full px-2.5 py-1" style={{ background: '#E4F7EB', color: '#1E8734' }}>{t.my.active}</span>
            ) : (
              <span className="text-xs font-medium rounded-full px-2.5 py-1" style={{ background: '#FFFBEB', color: '#D97706' }}>{t.my.statusPending}</span>
            )}
          </div>
          <p className="text-[22px] font-medium mb-0.5" style={{ color: '#1C1C1E', letterSpacing: '-0.4px' }}>
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
          <Link href="/my/membership" prefetch={false} className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: '#007AFF' }}>{t.my.manageMembership}</span>
            <ChevronRight className="w-3.5 h-3.5" style={{ color: '#AEAEB2' }} />
          </Link>
        </div>
      )}

      </div>{/* end md:grid */}

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
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => !cancelling && setCancelOcc(null)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl p-6 pb-28"
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
          className="fixed inset-0 z-50 flex items-end"
          style={{ background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setDetailOcc(null)}
        >
          <div
            className="w-full bg-white rounded-t-3xl shadow-2xl overflow-y-auto"
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

              {detailOcc.level && (
                <span className="inline-block text-xs font-medium px-3 py-1 rounded-full mb-4" style={{ background: '#E8F7FF', color: '#006197' }}>
                  {detailOcc.level}
                </span>
              )}

              {detailOcc.instructor && (
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

              <div className="flex gap-3">
                <button
                  onClick={() => setDetailOcc(null)}
                  className="flex-1 py-3 rounded-2xl text-sm font-medium"
                  style={{ border: '1px solid #E5E5EA', color: '#6B6B70', background: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
                >
                  {t.my.close}
                </button>
                {detailOcc.alreadyBooked ? (
                  <div className="flex-1 py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-1" style={{ background: '#E4F7EB', color: '#1E8734' }}>
                    {t.my.bookedCheck}
                  </div>
                ) : detailOcc.capacity !== null && detailOcc.booked >= detailOcc.capacity ? (
                  <div className="flex-1 py-3 rounded-2xl text-sm font-medium flex items-center justify-center" style={{ background: '#F5F5F5', color: '#9E9E9E' }}>
                    {t.my.full}
                  </div>
                ) : (
                  <button
                    onClick={() => { setDetailOcc(null); bookClass(detailOcc) }}
                    className="flex-1 py-3 rounded-2xl text-sm font-medium"
                    style={{ background: '#E8F7FF', color: '#006197', border: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
                  >
                    {t.my.bookNow}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
