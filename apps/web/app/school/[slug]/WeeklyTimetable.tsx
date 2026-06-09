'use client'

import { useState } from 'react'
import ClassBookingModal from './ClassBookingModal'

type ScheduleEntry = { dayOfWeek: number; startTime: string; endTime: string }
type Plan = { id: string; name: string; price: number; currency: string; billingCycle: string; isPopular: boolean }
type ClassItem = {
  id: string
  name: string
  level: string | null
  duration: number | null
  schedule: ScheduleEntry[]
}

const DAYS = [
  { short: 'Mon', label: 'Monday',    idx: 1 },
  { short: 'Tue', label: 'Tuesday',   idx: 2 },
  { short: 'Wed', label: 'Wednesday', idx: 3 },
  { short: 'Thu', label: 'Thursday',  idx: 4 },
  { short: 'Fri', label: 'Friday',    idx: 5 },
  { short: 'Sat', label: 'Saturday',  idx: 6 },
]

const CLASS_COLORS: Record<string, string> = {
  'jiu jitsu todos':      'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100',
  'jiu jitsu avanzado':   'bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100',
  'jiu jitsu iniciación': 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100',
  'nogi':                 'bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100',
  'open mat':             'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100',
}

function getColor(name: string) {
  const key = name.toLowerCase()
  for (const [k, v] of Object.entries(CLASS_COLORS)) {
    if (key.includes(k)) return v
  }
  return 'bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100'
}

type SessionItem = { classId: string; name: string; startTime: string; endTime: string; level: string }

export default function WeeklyTimetable({
  classes,
  schoolSlug,
  plans,
}: {
  classes: ClassItem[]
  schoolSlug: string
  plans: Plan[]
}) {
  const today = new Date().getDay()
  const defaultDay = today >= 1 && today <= 6 ? today : 1
  const [activeDay, setActiveDay] = useState(defaultDay)
  const [modalSession, setModalSession] = useState<SessionItem | null>(null)

  // Build map: dayOfWeek → sessions[]
  const dayMap: Record<number, SessionItem[]> = {}
  for (const cls of classes) {
    if (!cls.schedule?.length) continue
    for (const entry of cls.schedule) {
      if (!dayMap[entry.dayOfWeek]) dayMap[entry.dayOfWeek] = []
      ;(dayMap[entry.dayOfWeek] as SessionItem[]).push({
        classId: cls.id,
        name: cls.name,
        startTime: entry.startTime,
        endTime: entry.endTime,
        level: cls.level ?? 'All levels',
      })
    }
  }
  for (const day of Object.keys(dayMap)) {
    ;(dayMap[Number(day)] as SessionItem[]).sort((a, b) => a.startTime.localeCompare(b.startTime))
  }

  const sessions = dayMap[activeDay] ?? []
  const activeDayLabel = DAYS.find(d => d.idx === activeDay)?.label ?? ''

  return (
    <>
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
        {/* Day tabs */}
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {DAYS.map(day => {
            const count = dayMap[day.idx]?.length ?? 0
            const isActive = activeDay === day.idx
            return (
              <button
                key={day.idx}
                onClick={() => setActiveDay(day.idx)}
                className={`flex-1 min-w-[56px] py-3 px-2 text-center transition-colors relative ${
                  isActive ? 'text-[#006197] font-semibold' : 'text-[#6b7280] hover:text-[#006197]'
                }`}
              >
                <div className="text-xs font-medium">{day.short}</div>
                {count > 0 && (
                  <div className={`mx-auto mt-1 w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#006197]' : 'bg-slate-300'}`} />
                )}
                {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#006197]" />}
              </button>
            )
          })}
        </div>

        {/* Sessions */}
        <div className="p-4 space-y-2 min-h-[160px]">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-[#9ca3af]">
              <svg className="w-8 h-8 mb-2 opacity-40" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <span className="text-sm">No classes this day</span>
            </div>
          ) : (
            sessions.map((s, i) => (
              <button
                key={i}
                onClick={() => setModalSession(s)}
                className={`w-full flex items-center justify-between gap-3 border rounded-xl px-4 py-3 transition-all cursor-pointer text-left ${getColor(s.name)}`}
              >
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{s.name}</div>
                  <div className="text-xs opacity-75 mt-0.5">{s.level}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-mono font-semibold">{s.startTime}</div>
                  <div className="text-xs opacity-60">–{s.endTime}</div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        {sessions.length > 0 && (
          <div className="px-4 pb-3 text-xs text-[#9ca3af]">
            Tap a class to book
          </div>
        )}
      </div>

      {/* Booking modal */}
      {modalSession && (
        <ClassBookingModal
          session={{
            classId: modalSession.classId,
            className: modalSession.name,
            level: modalSession.level,
            startTime: modalSession.startTime,
            endTime: modalSession.endTime,
            dayLabel: activeDayLabel,
          }}
          schoolSlug={schoolSlug}
          plans={plans}
          onClose={() => setModalSession(null)}
        />
      )}
    </>
  )
}
