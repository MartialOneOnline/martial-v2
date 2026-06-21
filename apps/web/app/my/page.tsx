'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Play, Calendar, Clock, MapPin, Users, Plus, CheckCircle2 } from 'lucide-react'
import { fmtPrice } from '../../lib/format'

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

const DISCIPLINE_COLORS: Record<string, string> = {
  BJJ: 'linear-gradient(135deg, #1e3a5f 0%, #0870E2 100%)',
  MMA: 'linear-gradient(135deg, #1a1a2e 0%, #e94560 100%)',
  Muay: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)',
  Boxing: 'linear-gradient(135deg, #1c1917 0%, #d97706 100%)',
  Judo: 'linear-gradient(135deg, #1e1b4b 0%, #4f46e5 100%)',
  Kickboxing: 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)',
}
function classGradient(name: string) {
  const key = Object.keys(DISCIPLINE_COLORS).find(k => name.toLowerCase().includes(k.toLowerCase()))
  return key ? DISCIPLINE_COLORS[key] : 'linear-gradient(135deg, #1e3a5f 0%, #0870E2 100%)'
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

const BELT_COLORS: Record<string, string> = {
  'White Belt':  '#E5E7EB',
  'Blue Belt':   '#3B82F6',
  'Purple Belt': '#8B5CF6',
  'Brown Belt':  '#92400E',
  'Black Belt':  '#111827',
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
  const today = new Date(); today.setHours(0,0,0,0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1)
  const day = new Date(iso); day.setHours(0,0,0,0)
  if (day.getTime() === today.getTime()) return 'Today'
  if (day.getTime() === tomorrow.getTime()) return 'Tomorrow'
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function MyHomePage() {
  const [data, setData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [occurrences, setOccurrences] = useState<Occurrence[]>([])
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [confirmedClass, setConfirmedClass] = useState<string | null>(null)

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
        setConfirmedClass(occ.className)
        setTimeout(() => setConfirmedClass(null), 3500)
      }
    } finally {
      setBookingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-5 h-5 border-2 border-[#0870E2] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const user = data?.user
  const firstName = user?.name?.split(' ')[0] ?? 'there'
  const activeMembership = user?.memberships?.find(m => m.status === 'ACTIVE')
  const expiredCount = user?.memberships?.filter(m => m.status !== 'ACTIVE').length ?? 0
  const nextBooking = user?.bookings?.[0]
  const primaryMember = user?.schoolMembers?.[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const days = nextBooking ? daysUntil(nextBooking.scheduledAt) : null

  return (
    <div className="min-h-screen">

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 px-5 py-5">
        <div className="flex items-center gap-3 max-w-2xl">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-[#0870E2]/10" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-[#0870E2]/10 flex items-center justify-center text-[#0870E2] font-bold text-sm shrink-0">
              {(user?.name || user?.email || 'U').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-xs text-gray-400">{greeting}</p>
            <h1 className="text-base font-bold text-[#101828] leading-tight">{user?.name ?? user?.email}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl px-4 py-5 space-y-4">

        {/* ── Upcoming class card (hero) ── */}
        {nextBooking ? (
          <div className="relative rounded-2xl overflow-hidden bg-[#101828] shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0870E2] to-[#003d5c]" />
            <div className="relative px-5 py-5">
              {days !== null && (
                <span className="inline-block text-[10px] font-semibold bg-white/20 text-white px-2.5 py-1 rounded-full mb-3">
                  {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`}
                </span>
              )}
              <p className="text-[11px] text-white/60 font-medium uppercase tracking-wide mb-1">Next class</p>
              <p className="text-lg font-bold text-white leading-tight">{nextBooking.class.name}</p>
              <p className="text-sm text-white/70 mt-0.5">{nextBooking.class.school.name}</p>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-1.5 text-white/80 text-xs">
                  <Calendar className="w-3.5 h-3.5" />
                  {fmtDate(nextBooking.scheduledAt)}
                </div>
                <div className="flex items-center gap-1.5 text-white/80 text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  {fmtTime(nextBooking.scheduledAt)}
                  {nextBooking.class.duration && <span className="text-white/50">· {nextBooking.class.duration}min</span>}
                </div>
              </div>
              <Link
                href="/my/classes"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold bg-white text-[#0870E2] px-4 py-2 rounded-xl hover:bg-white/90 transition-colors"
              >
                View booking <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#0870E2]/8 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-[#0870E2]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#101828]">No upcoming classes</p>
              <p className="text-xs text-gray-400 mt-0.5">Find and book your next session</p>
            </div>
            <Link href="/my/classes" className="text-xs font-semibold text-[#0870E2] shrink-0">
              Book a class →
            </Link>
          </div>
        )}

        {/* ── Upcoming classes ── */}
        {occurrences.length > 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <p className="text-sm font-bold text-[#101828]">Upcoming classes</p>
              <Link href="/my/classes" className="text-xs font-semibold text-[#0870E2]">View all →</Link>
            </div>
            <div className="p-3 space-y-2.5">
              {occurrences.slice(0, 4).map(occ => {
                const isFull = occ.capacity !== null && occ.booked >= occ.capacity
                const isBooking = bookingId === `${occ.classId}:${occ.scheduledAt}`
                const gradient = classGradient(occ.className)
                return (
                  <div key={`${occ.classId}:${occ.scheduledAt}`} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                    {/* Class image / gradient */}
                    <div className="w-12 h-12 rounded-xl shrink-0 overflow-hidden">
                      {occ.coverUrl
                        ? <img src={occ.coverUrl} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full" style={{ background: gradient }} />
                      }
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#101828] truncate">{occ.className}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{fmtDateShort(occ.scheduledAt)}</span>
                        <span className="text-gray-200">·</span>
                        <span className="text-xs text-gray-400">
                          {new Date(occ.scheduledAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}
                        </span>
                        {occ.capacity !== null && (
                          <>
                            <span className="text-gray-200">·</span>
                            <span className="text-xs text-gray-400">{occ.booked}/{occ.capacity}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {/* Action */}
                    {occ.alreadyBooked ? (
                      <div className="flex items-center gap-1 text-emerald-500 shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-xs font-semibold">Booked</span>
                      </div>
                    ) : isFull ? (
                      <span className="text-xs text-gray-400 shrink-0">Full</span>
                    ) : (
                      <button
                        onClick={() => bookClass(occ)}
                        disabled={!!bookingId}
                        className="shrink-0 flex items-center gap-1 bg-[#0870E2] text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-[#0558b0] transition-colors disabled:opacity-60"
                      >
                        {isBooking
                          ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : <><Plus className="w-3 h-3" />Book</>
                        }
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Stats row ── */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            {[
              {
                label: 'Classes attended',
                value: activeMembership?.classesUsed ?? 0,
                href: '/my/classes',
              },
              {
                label: 'Schools',
                value: user?.schoolMembers?.length ?? 0,
                href: '/explore',
              },
              {
                label: 'Current belt',
                value: primaryMember?.belt?.split(' ')[0] ?? '—',
                href: '/my/progress',
              },
            ].map(({ label, value, href }) => (
              <Link key={label} href={href} className="flex flex-col items-center py-4 hover:bg-gray-50 transition-colors">
                <p className="text-xl font-bold text-[#101828]">{value}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 text-center px-2 leading-tight">{label}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Personal info ── */}
        {(user?.email || user?.phone || user?.dateOfBirth) && (
          <Link href="/my/profile" className="block bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
              <p className="text-sm font-bold text-[#101828]">Personal info</p>
              <span className="text-xs font-semibold text-[#0870E2]">Edit →</span>
            </div>
            <div className="divide-y divide-gray-50">
              {[
                { label: 'Email', value: user.email },
                { label: 'Phone', value: user.phone ?? '—' },
                { label: 'Date of birth', value: user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-5 py-3">
                  <span className="text-xs text-gray-400 font-medium">{label}</span>
                  <span className="text-xs font-semibold text-[#101828] text-right max-w-[60%] truncate">{value}</span>
                </div>
              ))}
            </div>
          </Link>
        )}

        {/* ── Ranking section ── */}
        {primaryMember?.belt && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-[#101828]">{primaryMember.school.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">Ranks</p>
              </div>
              <Link href="/my/progress" className="flex items-center gap-1 text-xs font-semibold text-[#0870E2] hover:underline">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="flex items-center gap-5">
              {/* Donut */}
              <div className="relative w-24 h-24 shrink-0">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="38" fill="none" stroke="#F0F1F3" strokeWidth="9" />
                  <circle
                    cx="48" cy="48" r="38"
                    fill="none"
                    stroke={BELT_COLORS[primaryMember.belt] ?? '#9CA3AF'}
                    strokeWidth="9"
                    strokeDasharray={`${2 * Math.PI * 38 * 0.75} ${2 * Math.PI * 38 * 0.25}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-[#101828]">75%</span>
                  <span className="text-[9px] text-gray-400 leading-tight text-center">2 to go</span>
                </div>
              </div>
              {/* Legend */}
              <div className="flex-1 space-y-2">
                {[
                  { label: 'Ready', count: 12, color: '#22C55E' },
                  { label: 'Almost Ready', count: 10, color: '#F59E0B' },
                  { label: 'Not Ready', count: 5, color: '#EF4444' },
                ].map(({ label, count, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                      <span className="text-xs text-gray-500">{label}</span>
                    </div>
                    <span className="text-xs font-semibold text-[#0870E2]">{count} classes</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Belt progress bar */}
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold text-[#101828]">{primaryMember.belt}</p>
                  <p className="text-[10px] text-gray-400">
                    {primaryMember.beltDate
                      ? new Date(primaryMember.beltDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
                      : 'Last grading'}
                  </p>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: '65%', background: BELT_COLORS[primaryMember.belt] ?? '#9CA3AF' }}
                  />
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-[#101828] mb-1.5">
                  {primaryMember.belt} {(primaryMember.beltDegree ?? 0) + 1} Stripe
                </p>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: '20%', background: BELT_COLORS[primaryMember.belt] ?? '#9CA3AF' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Membership ── */}
        {activeMembership && (
          <Link href="/my/membership" className="block bg-white border border-gray-100 rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium">Active membership</p>
                <p className="text-sm font-bold text-[#101828] mt-0.5">{activeMembership.planName}</p>
                <p className="text-xs text-gray-400 mt-0.5">{activeMembership.school.name}</p>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-[#0870E2]">
                  {fmtPrice(activeMembership.price, activeMembership.currency)}
                </p>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Active</span>
              </div>
            </div>
            {activeMembership.classesUsed > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] text-gray-400">Classes used</p>
                  <p className="text-[11px] font-semibold text-gray-600">{activeMembership.classesUsed}</p>
                </div>
              </div>
            )}
          </Link>
        )}

        {/* ── My schools ── */}
        {(user?.schoolMembers?.length ?? 0) > 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <p className="text-sm font-bold text-[#101828]">My academies</p>
              <Link href="/explore" className="text-xs font-semibold text-[#0870E2]">Find more →</Link>
            </div>
            {user?.schoolMembers.map(m => (
              <Link
                key={m.id}
                href={`/school/${m.school.slug}`}
                className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-xl bg-[#0870E2]/8 flex items-center justify-center shrink-0 overflow-hidden">
                  {m.school.logoUrl
                    ? <img src={m.school.logoUrl} alt="" className="w-9 h-9 object-cover" />
                    : <span className="text-[#0870E2] font-bold text-sm">{m.school.name[0]}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#101828] truncate">{m.school.name}</p>
                    {m.status === 'LEAD' && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 shrink-0">Pending</span>
                    )}
                  </div>
                  {m.belt && (
                    <p className="text-xs text-gray-400 mt-0.5">{m.belt}{m.beltDegree ? ` · ${m.beltDegree} stripe` : ''}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 shrink-0" />
              </Link>
            ))}
          </div>
        )}

        {/* ── Empty state ── */}
        {!activeMembership && !nextBooking && (user?.schoolMembers?.length ?? 0) === 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#0870E2]/8 flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-6 h-6 text-[#0870E2]" />
            </div>
            <h3 className="text-sm font-bold text-[#101828] mb-1">Find your academy</h3>
            <p className="text-xs text-gray-400 mb-4">Search for martial arts schools near you and join today.</p>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-semibold bg-[#0870E2] hover:bg-[#005580] transition-colors"
            >
              Explore schools
            </Link>
          </div>
        )}

        {/* ── Videos teaser ── */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <p className="text-sm font-bold text-[#101828]">Videos</p>
            <button className="text-xs font-semibold text-[#0870E2]">View all →</button>
          </div>
          <div className="grid grid-cols-2 gap-2 p-3">
            {[1, 2].map(i => (
              <div key={i} className="relative aspect-video rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden group cursor-pointer">
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                  <div className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <Play className="w-3.5 h-3.5 text-[#0870E2] fill-[#0870E2] ml-0.5" />
                  </div>
                  <p className="text-[10px] text-gray-500 font-medium">15m 10s</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Booking confirmation toast */}
      {confirmedClass && (
        <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 bg-[#101828] text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Booking confirmed — {confirmedClass}</span>
        </div>
      )}
    </div>
  )
}
