'use client'

/**
 * TrialBookingCTA — replaces the static `mailto:` "Book a Trial Class" button.
 *
 * Logic:
 * - If 1 trial class  → open ClassBookingModal directly for that class
 * - If multiple trial → show a chooser, then open modal
 * - If none           → show fallback state with email/WhatsApp links
 */

import { useState } from 'react'
import { Dumbbell, Mail, MessageCircle, ChevronRight } from 'lucide-react'
import ClassBookingModal from './ClassBookingModal'
import type { ScheduleSlot } from '@/lib/scheduling'
import { buildBookingSession, hasBookableSchedule, selectBookingSession } from '@/lib/trialBooking'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface TrialClass {
  id: string
  name: string
  schedule: ScheduleSlot[]
  level: string | null
}

interface Plan {
  id: string
  name: string
  price: number
  currency: string
  billingCycle: string
  isPopular: boolean
}

interface Props {
  /** Trial classes for this school (isActive + isPublished + isTrial) */
  trialClasses: TrialClass[]
  schoolSlug: string
  schoolEmail: string | null
  schoolPhone: string | null
  plans: Plan[]
  /** Rendered as the button label (e.g. "Book a Trial Class") */
  label?: string
  className?: string
  /** School.hasFreeTrialCls — gates the trial-specific copy below, same flag
      ClassBookingModal itself checks before offering the trial action. */
  hasFreeTrialCls: boolean
}

export default function TrialBookingCTA({
  trialClasses,
  schoolSlug,
  schoolEmail,
  schoolPhone,
  plans,
  label,
  className = '',
  hasFreeTrialCls,
}: Props) {
  const heading = hasFreeTrialCls ? 'Book a Trial Class' : 'Book a Class'
  const buttonLabel = label ?? heading
  const [state, setState] = useState<'idle' | 'choosing' | 'modal'>('idle')
  const [session, setSession] = useState<ReturnType<typeof buildBookingSession>>(null)

  function handleClick() {
    // Auto-open the modal only when there's exactly one class AND it's
    // actually bookable — otherwise fall through to the chooser, which
    // renders that single class in its (now correctly non-interactive)
    // no-schedule state instead of the button silently doing nothing.
    if (trialClasses.length === 1 && hasBookableSchedule(trialClasses[0]!)) {
      const s = buildBookingSession(trialClasses[0]!)
      if (s) { setSession(s); setState('modal') }
      return
    }
    setState('choosing')
  }

  function selectClass(classId: string) {
    const s = selectBookingSession(trialClasses, classId)
    if (s) { setSession(s); setState('modal') }
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={className}
      >
        <Dumbbell className="w-4 h-4" />
        {buttonLabel}
      </button>

      {/* Chooser / fallback overlay */}
      {state === 'choosing' && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center" onClick={() => setState('idle')}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            onClick={e => e.stopPropagation()}
            className="relative w-full md:w-[440px] bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Drag handle mobile */}
            <div className="md:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1.5 rounded-full bg-[#E5E7EB]" />
            </div>

            <div className="px-6 pt-4 pb-6">
              <h2 className="text-lg font-bold text-[#111827] mb-1">{heading}</h2>

              {trialClasses.length === 0 ? (
                /* No trial classes published */
                <>
                  <p className="text-sm text-[#6B7280] mb-4">
                    {hasFreeTrialCls
                      ? 'There are no trial classes available online right now. Contact us directly to arrange a trial.'
                      : 'There are no bookable classes available online right now. Contact us directly to book one.'}
                  </p>
                  <div className="space-y-2">
                    {schoolEmail && (
                      <a
                        href={`mailto:${schoolEmail}?subject=Trial Class Enquiry`}
                        className="flex items-center gap-2 w-full h-12 rounded-xl bg-[#0870E2] text-white font-semibold text-sm justify-center transition-colors hover:bg-[#005580]"
                      >
                        <Mail className="w-4 h-4" />
                        Email Us
                      </a>
                    )}
                    {schoolPhone && (
                      <a
                        href={`https://wa.me/${schoolPhone.replace(/\D/g, '')}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 w-full h-12 rounded-xl border border-emerald-500 text-emerald-700 font-semibold text-sm justify-center transition-colors hover:bg-emerald-50"
                      >
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp
                      </a>
                    )}
                    <button
                      onClick={() => setState('idle')}
                      className="w-full text-sm text-[#6B7280] py-2"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                /* Multiple trial classes — let user choose */
                <>
                  <p className="text-sm text-[#6B7280] mb-4">{hasFreeTrialCls ? 'Choose a trial class to book:' : 'Choose a class to book:'}</p>
                  <div className="space-y-2">
                    {trialClasses.map(cls => {
                      const slot = cls.schedule?.[0]
                      const bookable = hasBookableSchedule(cls)
                      return (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={bookable ? () => selectClass(cls.id) : undefined}
                          disabled={!bookable}
                          aria-disabled={!bookable}
                          className={`w-full flex items-center justify-between gap-3 border rounded-xl px-4 py-3 text-left transition-colors ${
                            bookable
                              ? 'border-[#E5E7EB] hover:border-[#0870E2] hover:bg-[#f0f9ff] cursor-pointer'
                              : 'border-[#F3F4F6] bg-[#FAFAFA] cursor-not-allowed'
                          }`}
                        >
                          <div>
                            <div className={`text-sm font-semibold ${bookable ? 'text-[#111827]' : 'text-[#9CA3AF]'}`}>{cls.name}</div>
                            {slot ? (
                              <div className="text-xs text-[#6B7280] mt-0.5">
                                {DAY_NAMES[slot.dayOfWeek]} · {slot.startTime}–{slot.endTime}
                              </div>
                            ) : (
                              <div className="text-xs text-[#9CA3AF] mt-0.5">No online schedule — contact us</div>
                            )}
                            {cls.level && (
                              <div className="text-[10px] text-[#9CA3AF] mt-0.5">{cls.level}</div>
                            )}
                          </div>
                          {bookable && <ChevronRight className="w-4 h-4 text-[#9CA3AF] shrink-0" />}
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
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Booking modal */}
      {state === 'modal' && session && (
        <ClassBookingModal
          session={session}
          schoolSlug={schoolSlug}
          plans={plans}
          onClose={() => setState('idle')}
        />
      )}
    </>
  )
}
