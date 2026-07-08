'use client'

import { useEffect, useState } from 'react'

type Remaining = { days: number; hours: number; minutes: number; seconds: number }

function diff(target: number): Remaining | null {
  const ms = target - Date.now()
  if (ms <= 0) return null
  const totalSeconds = Math.floor(ms / 1000)
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}

export default function EventCountdown({ startAt, className = '' }: { startAt: string; className?: string }) {
  const target = new Date(startAt).getTime()
  // Starts null so the server-rendered and first client-rendered pass match —
  // the live value only appears after mount, avoiding a hydration mismatch.
  const [remaining, setRemaining] = useState<Remaining | null>(null)

  useEffect(() => {
    setRemaining(diff(target))
    const id = setInterval(() => setRemaining(diff(target)), 1000)
    return () => clearInterval(id)
  }, [target])

  if (!remaining) return null

  return (
    <div className={className}>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Starts in</p>
      <div className="flex items-center gap-1.5">
        {([['d', remaining.days], ['h', remaining.hours], ['m', remaining.minutes], ['s', remaining.seconds]] as const).map(([unit, val]) => (
          <div key={unit} className="flex flex-col items-center bg-[#0870E2]/8 rounded-lg px-2 py-1.5 flex-1">
            <span className="text-base font-bold text-[#0870E2] tabular-nums">{String(val).padStart(2, '0')}</span>
            <span className="text-[9px] text-gray-400 uppercase">{unit}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
