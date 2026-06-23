'use client'

import { useState } from 'react'
import { ChevronRight, Mail, MessageCircle } from 'lucide-react'

const FAQS = [
  {
    q: 'How do I book a class?',
    a: 'Go to the Classes tab, find the class you want to attend, and tap "Book Now". You\'ll receive a confirmation and the class will appear in your upcoming bookings.',
  },
  {
    q: 'How do I cancel a booking?',
    a: 'Open the Classes tab or the Dashboard, find your booking, and tap "Cancel". You can also cancel from the Details popup. Please cancel at least 2 hours before class starts.',
  },
  {
    q: 'How does QR check-in work?',
    a: 'Before class, open the QR Check-in page from the bottom nav or Dashboard. Show the QR code to your instructor and they will scan it to mark your attendance.',
  },
  {
    q: 'How do I manage my membership?',
    a: 'Go to the Membership page from the sidebar or Profile menu. You can view your current plan, renewal date, and contact your academy to make changes.',
  },
  {
    q: 'What happens if I miss a class?',
    a: 'If you have a session-based membership, missed classes may still count depending on your academy\'s policy. Contact your academy directly for clarification.',
  },
  {
    q: 'How do I update my profile?',
    a: 'Go to Profile and tap "Edit" in the top right corner. You can update your name and phone number. Email changes must be requested through your academy.',
  },
]

export default function MyHelpPage() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="min-h-screen pb-4" style={{ background: '#F2F2F7' }}>
      <div className="max-w-lg mx-auto">

        <div className="px-4 md:px-6 pt-4 md:pt-7 pb-4">
          <p className="text-xs" style={{ color: '#6B6B70' }}>Student portal</p>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#1C1C1E', letterSpacing: '-0.5px' }}>Help & Support</h1>
        </div>

        {/* FAQ */}
        <p className="px-4 md:px-6 pb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B6B70' }}>Frequently asked questions</p>
        <div className="mx-4 md:mx-6 mb-4 rounded-2xl overflow-hidden" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)' }}>
          {FAQS.map((faq, i) => (
            <div key={i} style={i < FAQS.length - 1 ? { borderBottom: '0.5px solid rgba(60,60,67,.12)' } : {}}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left"
              >
                <span className="text-sm font-medium pr-4" style={{ color: '#1C1C1E' }}>{faq.q}</span>
                <ChevronRight
                  className="w-4 h-4 shrink-0 transition-transform"
                  style={{ color: '#C7C7CC', transform: open === i ? 'rotate(90deg)' : 'none' }}
                />
              </button>
              {open === i && (
                <div className="px-4 pb-4">
                  <p className="text-sm leading-relaxed" style={{ color: '#6B6B70' }}>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact */}
        <p className="px-4 md:px-6 pb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B6B70' }}>Contact</p>
        <div className="mx-4 md:mx-6 mb-4 rounded-2xl overflow-hidden" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)' }}>
          <a
            href="mailto:support@martialapp.com"
            className="flex items-center gap-4 px-4 py-3.5"
            style={{ borderBottom: '0.5px solid rgba(60,60,67,.12)' }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(0,122,255,.10)' }}>
              <Mail className="w-4 h-4" style={{ color: '#007AFF' }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: '#1C1C1E' }}>Email support</p>
              <p className="text-[11px]" style={{ color: '#6B6B70' }}>support@martialapp.com</p>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0" style={{ color: '#C7C7CC' }} />
          </a>
          <div className="flex items-center gap-4 px-4 py-3.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(52,199,89,.10)' }}>
              <MessageCircle className="w-4 h-4" style={{ color: '#34C759' }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: '#1C1C1E' }}>Chat with your academy</p>
              <p className="text-[11px]" style={{ color: '#6B6B70' }}>Contact your school directly</p>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0" style={{ color: '#C7C7CC' }} />
          </div>
        </div>

        {/* App version note */}
        <p className="text-center text-xs pb-4" style={{ color: '#AEAEB2' }}>Martial App v2.0 · martialapp.com</p>

      </div>
    </div>
  )
}
