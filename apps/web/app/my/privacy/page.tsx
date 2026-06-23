'use client'

import { useState } from 'react'
import { ChevronRight, Eye, Trash2, Download } from 'lucide-react'

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="relative shrink-0 transition-colors"
      style={{
        width: 51, height: 31, borderRadius: 15.5,
        background: on ? '#34C759' : '#E5E5EA',
        border: 'none', cursor: 'pointer', padding: 0,
      }}
    >
      <span
        className="absolute top-0.5 transition-transform"
        style={{
          width: 27, height: 27, borderRadius: '50%', background: '#fff',
          boxShadow: '0 2px 6px rgba(0,0,0,.20)',
          transform: on ? 'translateX(21px)' : 'translateX(2px)',
          display: 'block',
        }}
      />
    </button>
  )
}

export default function MyPrivacyPage() {
  const [analytics,  setAnalytics]  = useState(true)
  const [showDelete, setShowDelete] = useState(false)

  return (
    <div className="min-h-screen pb-4" style={{ background: '#F2F2F7' }}>
      <div className="max-w-lg mx-auto">

        <div className="px-4 md:px-6 pt-4 md:pt-7 pb-4">
          <p className="text-xs" style={{ color: '#6B6B70' }}>Student portal</p>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#1C1C1E', letterSpacing: '-0.5px' }}>Privacy</h1>
        </div>

        {/* Data controls */}
        <p className="px-4 md:px-6 pb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B6B70' }}>Data & permissions</p>
        <div className="mx-4 md:mx-6 mb-4 rounded-2xl overflow-hidden" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)' }}>
          <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '0.5px solid rgba(60,60,67,.12)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(88,86,214,.10)' }}>
                <Eye className="w-4 h-4" style={{ color: '#5856D6' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: '#1C1C1E' }}>Usage analytics</p>
                <p className="text-[11px]" style={{ color: '#6B6B70' }}>Help improve the app anonymously</p>
              </div>
            </div>
            <Toggle on={analytics} onChange={setAnalytics} />
          </div>

          <a
            href="#"
            className="flex items-center gap-4 px-4 py-3.5"
            style={{ borderBottom: '0.5px solid rgba(60,60,67,.12)' }}
            onClick={e => e.preventDefault()}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(50,173,230,.10)' }}>
              <Download className="w-4 h-4" style={{ color: '#32ADE6' }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: '#1C1C1E' }}>Download my data</p>
              <p className="text-[11px]" style={{ color: '#6B6B70' }}>Export a copy of your personal data</p>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0" style={{ color: '#C7C7CC' }} />
          </a>

          <button
            onClick={() => setShowDelete(true)}
            className="w-full flex items-center gap-4 px-4 py-3.5"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,59,48,.10)' }}>
              <Trash2 className="w-4 h-4" style={{ color: '#FF3B30' }} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium" style={{ color: '#FF3B30' }}>Delete my account</p>
              <p className="text-[11px]" style={{ color: '#6B6B70' }}>Permanently remove all your data</p>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0" style={{ color: '#C7C7CC' }} />
          </button>
        </div>

        {/* Policy links */}
        <p className="px-4 md:px-6 pb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B6B70' }}>Legal</p>
        <div className="mx-4 md:mx-6 mb-4 rounded-2xl overflow-hidden" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)' }}>
          {[
            { label: 'Privacy Policy', sub: 'How we handle your data' },
            { label: 'Terms of Service', sub: 'Rules and conditions of use' },
            { label: 'Cookie Policy', sub: 'How we use cookies' },
          ].map(({ label, sub }, i) => (
            <a
              key={label}
              href="#"
              onClick={e => e.preventDefault()}
              className="flex items-center justify-between px-4 py-3.5"
              style={i < 2 ? { borderBottom: '0.5px solid rgba(60,60,67,.12)' } : {}}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: '#1C1C1E' }}>{label}</p>
                <p className="text-[11px]" style={{ color: '#6B6B70' }}>{sub}</p>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0" style={{ color: '#C7C7CC' }} />
            </a>
          ))}
        </div>

        <p className="text-center text-xs pb-4 px-6" style={{ color: '#AEAEB2' }}>
          Your data is stored securely and never sold to third parties.
        </p>

        {/* Delete confirm modal */}
        {showDelete && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowDelete(false)}
          >
            <div
              className="w-full max-w-lg bg-white rounded-t-3xl p-6 pb-28 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-center mb-4">
                <div className="w-10 h-1 rounded-full" style={{ background: '#E5E5EA' }} />
              </div>
              <h2 className="text-base font-semibold mb-1" style={{ color: '#1C1C1E' }}>Delete account?</h2>
              <p className="text-sm mb-6" style={{ color: '#6B6B70' }}>
                This will permanently delete your profile, bookings, and membership history. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDelete(false)}
                  className="flex-1 py-3 rounded-2xl text-sm font-semibold"
                  style={{ border: '1px solid #E5E5EA', color: '#6B6B70', background: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white"
                  style={{ background: '#FF3B30', border: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
                >
                  Delete account
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
