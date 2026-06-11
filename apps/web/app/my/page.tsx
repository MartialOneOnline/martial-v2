'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Calendar, CreditCard, Award, ChevronRight,
  MapPin, Clock, CheckCircle2, AlertCircle,
} from 'lucide-react'

type UserData = {
  user: {
    id: string
    name: string | null
    email: string
    avatarUrl: string | null
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
      plan: { classLimit: number | null } | null
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
  'White Belt':  '#FFFFFF',
  'Blue Belt':   '#3B82F6',
  'Purple Belt': '#8B5CF6',
  'Brown Belt':  '#92400E',
  'Black Belt':  '#111827',
}

function BeltBadge({ belt, degree }: { belt: string; degree?: number | null }) {
  const color = BELT_COLORS[belt] ?? '#9CA3AF'
  const isWhite = belt === 'White Belt'
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-8 h-3 rounded-sm border ${isWhite ? 'border-gray-300' : 'border-transparent'}`}
        style={{ background: color }}
      />
      <span className="text-xs font-semibold text-gray-700">{belt}</span>
      {!!degree && (
        <div className="flex gap-0.5">
          {Array.from({ length: degree }).map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-amber-400" />
          ))}
        </div>
      )}
    </div>
  )
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
function daysUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function MyHomePage() {
  const [data, setData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/my')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-[#006197] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const user = data?.user
  const firstName = user?.name?.split(' ')[0] ?? 'there'
  const activeMembership = user?.memberships?.[0]
  const nextClass = user?.bookings?.[0]
  const currentBelt = user?.schoolMembers?.[0]

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="flex items-center gap-3">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#006197]/10 flex items-center justify-center text-[#006197] font-bold text-sm">
              {(user?.name || user?.email || 'U').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-base font-bold text-[#0D1B2A]">{greeting}, {firstName} 👋</h1>
            <p className="text-xs text-gray-400">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5 max-w-2xl">

        {/* Next class */}
        {nextClass ? (
          <div className="bg-[#006197] rounded-2xl p-5 text-white">
            <p className="text-xs font-semibold opacity-70 uppercase tracking-wide mb-2">Next class</p>
            <p className="text-lg font-bold">{nextClass.class.name}</p>
            <p className="text-sm opacity-80 mt-0.5">{nextClass.class.school.name}</p>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-sm">
                <Calendar className="w-4 h-4 opacity-70" />
                {fmtDate(nextClass.scheduledAt)}
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <Clock className="w-4 h-4 opacity-70" />
                {fmtTime(nextClass.scheduledAt)}
              </div>
            </div>
            <div className="mt-3 inline-flex items-center gap-1.5 bg-white/20 rounded-lg px-3 py-1.5 text-xs font-semibold">
              {daysUntil(nextClass.scheduledAt) === 0 ? 'Today!' : `In ${daysUntil(nextClass.scheduledAt)} day${daysUntil(nextClass.scheduledAt) !== 1 ? 's' : ''}`}
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#006197]/8 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#006197]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0D1B2A]">No upcoming classes</p>
                <p className="text-xs text-gray-400 mt-0.5">Book your next session</p>
              </div>
              <Link href="/explore" className="ml-auto text-xs font-semibold text-[#006197] hover:underline">
                Find a class →
              </Link>
            </div>
          </div>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          <Link href="/my/membership" className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <CreditCard className="w-5 h-5 text-[#006197] mb-2" />
            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Membership</p>
            <p className="text-sm font-bold text-[#0D1B2A] mt-0.5 truncate">
              {activeMembership?.planName ?? 'None'}
            </p>
            {activeMembership?.endDate && (
              <p className="text-[10px] text-gray-400 mt-0.5">
                Until {new Date(activeMembership.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </p>
            )}
          </Link>

          <Link href="/my/progress" className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <Award className="w-5 h-5 text-amber-500 mb-2" />
            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Belt</p>
            {currentBelt?.belt ? (
              <BeltBadge belt={currentBelt.belt} degree={currentBelt.beltDegree} />
            ) : (
              <p className="text-sm font-bold text-gray-300 mt-0.5">—</p>
            )}
          </Link>

          <Link href="/my/classes" className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <Calendar className="w-5 h-5 text-violet-500 mb-2" />
            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Upcoming</p>
            <p className="text-sm font-bold text-[#0D1B2A] mt-0.5">
              {user?.bookings?.length ?? 0} class{(user?.bookings?.length ?? 0) !== 1 ? 'es' : ''}
            </p>
          </Link>
        </div>

        {/* My schools */}
        {(user?.schoolMembers?.length ?? 0) > 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <p className="text-sm font-bold text-[#0D1B2A]">My schools</p>
              <Link href="/explore" className="text-xs text-[#006197] font-semibold hover:underline">
                Find more →
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {user?.schoolMembers.map(m => (
                <Link
                  key={m.id}
                  href={`/school/${m.school.slug}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#006197]/8 flex items-center justify-center shrink-0 overflow-hidden">
                    {m.school.logoUrl
                      ? <img src={m.school.logoUrl} alt="" className="w-9 h-9 object-cover" />
                      : <span className="text-[#006197] font-bold text-sm">{m.school.name[0]}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0D1B2A] truncate">{m.school.name}</p>
                    {m.belt && (
                      <div className="mt-0.5">
                        <BeltBadge belt={m.belt} degree={m.beltDegree} />
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming classes list */}
        {(user?.bookings?.length ?? 0) > 1 && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <p className="text-sm font-bold text-[#0D1B2A]">Upcoming classes</p>
              <Link href="/my/classes" className="text-xs text-[#006197] font-semibold hover:underline">
                View all →
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {user?.bookings.slice(0, 4).map(b => (
                <div key={b.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4 text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#0D1B2A] truncate">{b.class.name}</p>
                    <p className="text-[11px] text-gray-400">{b.class.school.name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-gray-600">{fmtDate(b.scheduledAt)}</p>
                    <p className="text-[11px] text-gray-400">{fmtTime(b.scheduledAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent gradings */}
        {(user?.gradings?.length ?? 0) > 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <p className="text-sm font-bold text-[#0D1B2A]">Belt history</p>
              <Link href="/my/progress" className="text-xs text-[#006197] font-semibold hover:underline">
                Full timeline →
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {user?.gradings.slice(0, 3).map(g => (
                <div key={g.id} className="flex items-center gap-3 px-5 py-3">
                  <Award className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-[#0D1B2A]">
                      {g.fromBelt ? `${g.fromBelt} → ${g.toBelt}` : g.toBelt}
                    </p>
                    <p className="text-[11px] text-gray-400">{g.school.name}</p>
                  </div>
                  <p className="text-[11px] text-gray-400 shrink-0">
                    {new Date(g.gradedAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state when no data */}
        {!activeMembership && !nextClass && (user?.schoolMembers?.length ?? 0) === 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#006197]/8 flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-7 h-7 text-[#006197]" />
            </div>
            <h3 className="text-base font-bold text-[#0D1B2A] mb-1">Find your academy</h3>
            <p className="text-sm text-gray-400 mb-4">Search for martial arts schools near you and join today.</p>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              style={{ background: '#006197' }}
            >
              Explore schools
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
