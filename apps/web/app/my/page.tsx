'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Calendar, Clock, CalendarCheck, QrCode, CalendarPlus,
  CreditCard, TrendingUp, ChevronRight, Play, ArrowRight,
} from 'lucide-react'
import { fmtPrice } from '../../lib/format'
import { getBeltImage } from '../../lib/belts'

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
function fmtDateShort(iso: string) {
  const d = new Date(iso)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  const day = new Date(iso); day.setHours(0, 0, 0, 0)
  if (day.getTime() === today.getTime()) return 'Today'
  if (day.getTime() === tomorrow.getTime()) return 'Tomorrow'
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

const QUICK_ACTIONS = [
  { label: 'Book class',  href: '/my/classes',    icon: CalendarPlus },
  { label: 'QR',         href: '/my/qr',          icon: QrCode },
  { label: 'Membership', href: '/my/membership',  icon: CreditCard },
  { label: 'Progress',   href: '/my/progress',    icon: TrendingUp },
]

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MyHomePage() {
  const [data, setData]             = useState<UserData | null>(null)
  const [loading, setLoading]       = useState(true)
  const [occurrences, setOccurrences] = useState<Occurrence[]>([])
  const [bookingId, setBookingId]   = useState<string | null>(null)
  const [activeDot, setActiveDot]   = useState(0)
  const [detailOcc, setDetailOcc]   = useState<Occurrence | null>(null)
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
  const nextBooking       = user?.bookings?.[0]
  const primaryMember     = user?.schoolMembers?.[0]
  const hour              = new Date().getHours()
  const greeting          = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const days              = nextBooking ? daysUntil(nextBooking.scheduledAt) : null
  const dotCount          = Math.min(occurrences.length, 4)

  return (
    <div className="min-h-screen pb-4" style={{ background: '#F2F2F7', overflowX: 'hidden' }}>
      <div className="max-w-lg mx-auto">

      {/* ── Greeting ──────────────────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-4">
        <p className="text-xs" style={{ color: '#6B6B70' }}>{greeting}</p>
        <h1 className="text-2xl font-medium tracking-tight" style={{ color: '#1C1C1E', letterSpacing: '-0.2px' }}>{firstName}</h1>
      </div>

      {/* ── Hero card — next booking ───────────────────────────────────────── */}
      {nextBooking ? (
        <div className="mx-4 mb-5 rounded-3xl overflow-hidden relative" style={{ background: '#08213D', padding: '20px' }}>
          {/* Decorative circle */}
          <div className="absolute" style={{ right: -32, top: -32, width: 140, height: 140, borderRadius: '50%', border: '24px solid rgba(255,255,255,.03)' }} />

          {/* Pill badge */}
          {days !== null && (
            <div className="inline-flex items-center gap-1 mb-3 rounded-full" style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.16)', padding: '3px 10px' }}>
              <Clock className="w-3 h-3" style={{ color: 'rgba(255,255,255,.7)' }} />
              <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,.88)' }}>
                {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`}
              </span>
            </div>
          )}

          <p className="text-[10px] font-medium uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,.35)', letterSpacing: '1.5px' }}>Next class</p>
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
              View booking
            </Link>
            <Link
              href="/my/qr"
              prefetch={false}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-normal rounded-full"
              style={{ background: 'rgba(255,255,255,.08)', color: '#fff', border: '1px solid rgba(255,255,255,.2)', padding: '9px 10px' }}
            >
              <QrCode className="w-3.5 h-3.5" style={{ opacity: 0.8 }} />
              QR check-in
            </Link>
          </div>
        </div>
      ) : (
        /* No upcoming booking */
        <div className="mx-4 mb-5 rounded-3xl overflow-hidden relative" style={{ background: '#08213D', padding: '20px' }}>
          <div className="absolute" style={{ right: -32, top: -32, width: 140, height: 140, borderRadius: '50%', border: '24px solid rgba(255,255,255,.03)' }} />
          <p className="text-[10px] font-medium uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,.35)', letterSpacing: '1.5px' }}>Next class</p>
          <p className="text-lg font-medium mb-3" style={{ color: '#fff' }}>No upcoming classes</p>
          <Link
            href="/my/classes"
            prefetch={false}
            className="inline-flex items-center gap-1.5 text-xs font-medium rounded-full"
            style={{ background: 'rgba(255,255,255,.22)', color: '#fff', border: '1px solid rgba(255,255,255,.35)', padding: '9px 14px' }}
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            Book a class
          </Link>
        </div>
      )}

      {/* ── Quick actions ──────────────────────────────────────────────────── */}
      <div className="px-4 mb-5">
        <div className="grid grid-cols-4">
          {QUICK_ACTIONS.map(qa => (
            <Link key={qa.href} href={qa.href} prefetch={false} className="flex flex-col items-center gap-1.5 py-1">
              <div className="w-[46px] h-[46px] rounded-full flex items-center justify-center" style={{ background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,.07), 0 0 0 0.5px rgba(0,0,0,.04)' }}>
                <qa.icon className="w-5 h-5" style={{ color: '#007AFF' }} />
              </div>
              <span className="text-[10px] font-normal text-center leading-tight" style={{ color: '#6B6B70' }}>{qa.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Upcoming classes carousel ──────────────────────────────────────── */}
      {occurrences.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between px-4 mb-3">
            <span className="text-base font-medium" style={{ color: '#1C1C1E', letterSpacing: '-0.1px' }}>Upcoming classes</span>
            <Link href="/my/classes" prefetch={false} className="flex items-center text-sm font-normal" style={{ color: '#007AFF' }}>
              View all<ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Scrollable cards */}
          <div
            ref={carRef}
            className="flex gap-3 overflow-x-auto pb-1"
            style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
          >
            {/* Left spacer — aligns first card with page content (px-4) */}
            <div className="shrink-0" style={{ width: 16 }} />
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
                  style={{ width: 'calc(80vw)', maxWidth: 320, background: '#fff', border: '1px solid #eaeaea', boxShadow: '0 1px 3px rgba(0,0,0,.05)', scrollSnapAlign: 'start' }}
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
                      <span className="text-[10.5px] font-normal" style={{ color: '#4f4f4f' }}>{fmtDateShort(occ.scheduledAt)}</span>
                      <span className="text-[10.5px] font-normal text-right" style={{ color: '#4f4f4f' }}>
                        {fmtTime(occ.scheduledAt)}{endTime ? `–${endTime}` : ''}
                      </span>
                    </div>
                    <div className="mb-2" style={{ height: 0.5, background: '#eaeaea' }} />
                    <p className="text-[11px] font-normal leading-relaxed mb-2.5 overflow-hidden" style={{ color: '#111', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {occ.instructor ? `Instructor: ${occ.instructor.name}` : occ.school.name}
                    </p>
                    <div className="flex gap-1.5 mt-auto">
                      <button
                        onClick={() => setDetailOcc(occ)}
                        className="flex-1 text-center text-xs font-medium rounded-lg"
                        style={{ background: '#ECEAEA', color: '#000', padding: '6px 0', fontSize: 11.5, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        Details
                      </button>
                      {occ.alreadyBooked ? (
                        <Link
                          href="/my/classes"
                          prefetch={false}
                          className="flex-1 text-center text-xs font-medium rounded-lg"
                          style={{ background: '#FFEBEE', color: '#C62828', padding: '6px 0', fontSize: 11.5 }}
                        >
                          Cancel
                        </Link>
                      ) : isFull ? (
                        <span
                          className="flex-1 text-center text-xs font-medium rounded-lg"
                          style={{ background: '#F5F5F5', color: '#9E9E9E', padding: '6px 0', fontSize: 11.5 }}
                        >
                          Full
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
                            : 'Book Now'}
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

      {/* ── Progress ring ──────────────────────────────────────────────────── */}
      {primaryMember?.belt && (
        <div className="mx-4 mb-4 rounded-2xl overflow-hidden" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)', padding: 18 }}>
          <div className="flex items-center gap-4">
            {/* Ring */}
            <div className="relative shrink-0" style={{ width: 72, height: 72 }}>
              <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="36" cy="36" r="29" fill="none" stroke="#E5E5EA" strokeWidth="5" />
                <circle cx="36" cy="36" r="29" fill="none" stroke="#007AFF" strokeWidth="5" strokeDasharray="182.2" strokeDashoffset="45.6" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[17px] font-medium leading-none" style={{ color: '#1C1C1E' }}>75%</span>
                <span className="text-[9px] font-normal mt-0.5" style={{ color: '#6B6B70' }}>to stripe</span>
              </div>
            </div>
            {/* Info */}
            <div className="flex-1" style={{ minWidth: 0 }}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <img
                  src={getBeltImage(primaryMember.belt, primaryMember.beltDegree ?? 0)}
                  alt={primaryMember.belt}
                  className="h-3.5 w-auto max-w-[60px] object-contain"
                />
                <ArrowRight className="w-3.5 h-3.5" style={{ color: '#AEAEB2' }} />
                <span className="text-sm font-medium" style={{ color: '#1C1C1E' }}>
                  {primaryMember.belt} {(primaryMember.beltDegree ?? 0) + 1} Stripe
                </span>
              </div>
              <p className="text-sm font-medium mb-2" style={{ color: '#007AFF' }}>2 classes to go</p>
              <div className="h-1 rounded-full mb-3" style={{ background: '#E5E5EA' }}>
                <div className="h-full rounded-full" style={{ width: '75%', background: '#007AFF' }} />
              </div>
              <Link href="/my/progress" prefetch={false} className="flex items-center gap-0.5 text-sm font-medium" style={{ color: '#007AFF' }}>
                View progress<ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Membership card ────────────────────────────────────────────────── */}
      {activeMembership && (
        <div className="mx-4 mb-4 rounded-2xl overflow-hidden" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)', padding: 18 }}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[10px] font-normal uppercase tracking-widest mb-0.5" style={{ color: '#6B6B70', letterSpacing: '.8px' }}>Active plan</p>
              <p className="text-sm font-medium" style={{ color: '#1C1C1E' }}>{activeMembership.planName}</p>
            </div>
            <span className="text-xs font-medium rounded-full px-2.5 py-1" style={{ background: '#E4F7EB', color: '#1E8734' }}>Active</span>
          </div>
          <p className="text-[22px] font-medium mb-0.5" style={{ color: '#1C1C1E', letterSpacing: '-0.4px' }}>
            {fmtPrice(activeMembership.price, activeMembership.currency)}
            <span className="text-sm font-normal" style={{ color: '#6B6B70' }}> / month</span>
          </p>
          {activeMembership.endDate && (
            <p className="text-xs mb-3" style={{ color: '#6B6B70' }}>
              Renews {new Date(activeMembership.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </p>
          )}
          <div style={{ height: 0.5, background: 'rgba(60,60,67,.1)', margin: '14px 0' }} />
          <Link href="/my/membership" prefetch={false} className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: '#007AFF' }}>Manage membership</span>
            <ChevronRight className="w-3.5 h-3.5" style={{ color: '#AEAEB2' }} />
          </Link>
        </div>
      )}

      {/* ── Recommended video ──────────────────────────────────────────────── */}
      <div className="mx-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-base font-medium" style={{ color: '#1C1C1E', letterSpacing: '-0.1px' }}>Recommended</span>
          <button className="flex items-center text-sm font-normal" style={{ color: '#007AFF', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            View all<ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ background: '#08213D', boxShadow: '0 2px 8px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)' }}>
          {/* Thumbnail */}
          <div className="relative" style={{ height: 140, background: '#071624' }}>
            <img
              src="https://img.youtube.com/vi/pYvnU1DU1Vg/hqdefault.jpg"
              alt="Closed Guard Basics"
              className="absolute inset-0 w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,.32)', zIndex: 1 }} />
            <span className="absolute text-[9px] font-medium rounded-md px-1.5 py-0.5 tracking-wide" style={{ top: 9, left: 11, background: '#007AFF', color: '#fff', zIndex: 2, letterSpacing: '.5px' }}>
              RECOMMENDED
            </span>
            <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 2 }}>
              <div className="flex items-center justify-center rounded-full" style={{ width: 44, height: 44, background: 'rgba(255,255,255,.9)' }}>
                <Play className="w-5 h-5 fill-current ml-0.5" style={{ color: '#08213D' }} />
              </div>
            </div>
            <span className="absolute text-xs rounded-md px-1.5 py-0.5" style={{ bottom: 9, right: 11, background: 'rgba(0,0,0,.65)', color: '#fff', zIndex: 2 }}>
              15m 10s
            </span>
          </div>
          {/* Info */}
          <div style={{ padding: '11px 14px 13px' }}>
            <p className="text-[10px] font-medium mb-0.5" style={{ color: 'rgba(100,220,220,.88)', letterSpacing: '.9px' }}>Guard · Roger Gracie</p>
            <p className="text-sm font-medium" style={{ color: '#fff' }}>Closed Guard Basics</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,.42)' }}>Improve control and sweeps from closed guard</p>
          </div>
        </div>
      </div>

      {/* ── Empty state (no school / membership) ──────────────────────────── */}
      {!activeMembership && !nextBooking && (user?.schoolMembers?.length ?? 0) === 0 && (
        <div className="mx-4 mb-4 rounded-2xl p-8 text-center" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(0,122,255,.08)' }}>
            <CalendarPlus className="w-6 h-6" style={{ color: '#007AFF' }} />
          </div>
          <h3 className="text-sm font-semibold mb-1" style={{ color: '#1C1C1E' }}>Find your academy</h3>
          <p className="text-xs mb-4" style={{ color: '#6B6B70' }}>Search for martial arts schools near you and join today.</p>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-semibold"
            style={{ background: '#007AFF' }}
          >
            Explore schools
          </Link>
        </div>
      )}

      </div>{/* end max-w-lg */}

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

            <div className="p-5 pb-10">
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
                    <p className="text-xs" style={{ color: '#6B6B70' }}>Instructor</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setDetailOcc(null)}
                  className="flex-1 py-3 rounded-2xl text-sm font-medium"
                  style={{ border: '1px solid #E5E5EA', color: '#6B6B70', background: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
                >
                  Close
                </button>
                {detailOcc.alreadyBooked ? (
                  <div className="flex-1 py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-1" style={{ background: '#E4F7EB', color: '#1E8734' }}>
                    ✓ Booked
                  </div>
                ) : detailOcc.capacity !== null && detailOcc.booked >= detailOcc.capacity ? (
                  <div className="flex-1 py-3 rounded-2xl text-sm font-medium flex items-center justify-center" style={{ background: '#F5F5F5', color: '#9E9E9E' }}>
                    Full
                  </div>
                ) : (
                  <button
                    onClick={() => { setDetailOcc(null); bookClass(detailOcc) }}
                    className="flex-1 py-3 rounded-2xl text-sm font-medium"
                    style={{ background: '#E8F7FF', color: '#006197', border: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
                  >
                    Book Now
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
