'use client'

/**
 * EventTicketCTA — "Get Tickets" button for public events.
 *
 * Logic (mirrors TrialBookingCTA):
 * - If 1 upcoming event  → open EventTicketModal directly for that event
 * - If multiple          → show a chooser, then open modal
 */

import { useState } from 'react'
import { Calendar, ChevronRight, Ticket } from 'lucide-react'
import EventTicketModal from './EventTicketModal'
import { fmtPrice } from '@/lib/format'

export type EventTicket = {
  id: string
  name: string
  description: string | null
  price: number
  currency: string
  capacity: number | null
  booked: number
}

export type EventForCta = {
  id: string
  title: string
  type: string
  location: string | null
  startAt: string
  coverUrl: string | null
  paymentMethods: string[]
  capacity: number | null
  booked: number
  tickets: EventTicket[]
}

interface Props {
  events: EventForCta[]
  schoolSlug: string
  className?: string
  iconOnly?: boolean
  // Where login/register should send the user back to after auth. Defaults
  // to the school profile's events section; the event's own page overrides
  // this so a shared link keeps working after the auth round-trip.
  redirectPath?: string
}

export default function EventTicketCTA({ events, schoolSlug, className = '', iconOnly = false, redirectPath }: Props) {
  const [state, setState] = useState<'idle' | 'choosing' | 'modal'>('idle')
  const [selected, setSelected] = useState<EventForCta | null>(null)

  function handleClick() {
    if (events.length === 1) {
      setSelected(events[0]!)
      setState('modal')
    } else {
      setState('choosing')
    }
  }

  function selectEvent(ev: EventForCta) {
    setSelected(ev)
    setState('modal')
  }

  return (
    <>
      <button onClick={handleClick} className={className}>
        <Ticket className="w-4 h-4" />
        {!iconOnly && 'Get Tickets'}
      </button>

      {/* Chooser */}
      {state === 'choosing' && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center" onClick={() => setState('idle')}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            onClick={e => e.stopPropagation()}
            className="relative w-full md:w-[440px] bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="md:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1.5 rounded-full bg-[#E5E7EB]" />
            </div>

            <div className="px-6 pt-4 pb-6">
              <h2 className="text-lg font-bold text-[#111827] mb-1">Get Tickets</h2>
              <p className="text-sm text-[#6B7280] mb-4">Choose an event:</p>
              <div className="space-y-2">
                {events.map(ev => {
                  const minPrice = ev.tickets.length > 0 ? Math.min(...ev.tickets.map(t => t.price)) : null
                  return (
                    <button
                      key={ev.id}
                      onClick={() => selectEvent(ev)}
                      className="w-full flex items-center justify-between gap-3 border border-[#E5E7EB] rounded-xl px-4 py-3 hover:border-[#0870E2] hover:bg-[#f0f9ff] transition-colors text-left"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#111827] truncate">{ev.title}</div>
                        <div className="flex items-center gap-1 text-xs text-[#6B7280] mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {new Date(ev.startAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {minPrice !== null && (
                          <span className="text-sm font-bold text-[#0870E2]">{fmtPrice(minPrice, ev.tickets[0]!.currency)}</span>
                        )}
                        <ChevronRight className="w-4 h-4 text-[#9CA3AF]" />
                      </div>
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => setState('idle')}
                className="w-full text-sm text-[#6B7280] py-3 mt-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket modal */}
      {state === 'modal' && selected && (
        <EventTicketModal
          event={selected}
          schoolSlug={schoolSlug}
          redirectPath={redirectPath}
          onClose={() => setState('idle')}
        />
      )}
    </>
  )
}
