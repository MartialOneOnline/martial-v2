'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

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

export default function EventCountdown(
  { startAt, className = '', action }: { startAt: string; className?: string; action?: ReactNode },
) {
  const target = new Date(startAt).getTime()
  // Starts null so the server-rendered and first client-rendered pass match —
  // the live value only appears after mount, avoiding a hydration mismatch.
  const [remaining, setRemaining] = useState<Remaining | null>(null)

  useEffect(() => {
    setRemaining(diff(target))
    const id = setInterval(() => setRemaining(diff(target)), 1000)
    return () => clearInterval(id)
  }, [target])

  if (!remaining) return action ? <div className={`flex justify-end ${className}`}>{action}</div> : null

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Starts in</p>
        {action}
      </div>
      <div className="flex items-center gap-1.5">
        {([['d', remaining.days], ['h', remaining.hours], ['m', remaining.minutes], ['s', remaining.seconds]] as const).map(([unit, val]) => (
          <div key={unit} className="flex flex-1 flex-col items-center justify-center bg-blue-50/70 rounded-xl py-2">
            <span className="text-sm md:text-base font-semibold text-[#0870E2] tabular-nums leading-none">{String(val).padStart(2, '0')}</span>
            <span className="text-[9px] text-slate-400 uppercase tracking-wide mt-1">{unit}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
