'use client'

import { useState } from 'react'
import { Bell, Globe, Moon, ChevronRight } from 'lucide-react'

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

const LANGUAGES = ['English', 'Español', 'Português', 'Français']

export default function MySettingsPage() {
  const [notifClass,    setNotifClass]    = useState(true)
  const [notifBooking,  setNotifBooking]  = useState(true)
  const [notifMembership, setNotifMembership] = useState(true)
  const [notifPromo,    setNotifPromo]    = useState(false)
  const [darkMode,      setDarkMode]      = useState(false)
  const [language,      setLanguage]      = useState('English')
  const [showLangPicker, setShowLangPicker] = useState(false)

  return (
    <div className="min-h-screen pb-4" style={{ background: '#F2F2F7' }}>
      <div className="max-w-lg mx-auto">

        <div className="px-4 md:px-6 pt-4 md:pt-7 pb-4">
          <p className="text-xs" style={{ color: '#6B6B70' }}>Student portal</p>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#1C1C1E', letterSpacing: '-0.5px' }}>Settings</h1>
        </div>

        {/* Notifications */}
        <p className="px-4 md:px-6 pb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B6B70' }}>Notifications</p>
        <div className="mx-4 md:mx-6 mb-4 rounded-2xl overflow-hidden" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)' }}>
          {[
            { label: 'Class reminders',    sub: 'Before your booked classes',     val: notifClass,       set: setNotifClass },
            { label: 'Booking confirmed',  sub: 'When a booking is confirmed',     val: notifBooking,     set: setNotifBooking },
            { label: 'Membership updates', sub: 'Renewals & plan changes',         val: notifMembership,  set: setNotifMembership },
            { label: 'Promotions',         sub: 'Offers & news from your academy', val: notifPromo,       set: setNotifPromo },
          ].map(({ label, sub, val, set }, i, arr) => (
            <div
              key={label}
              className="flex items-center justify-between px-4 py-3.5"
              style={i < arr.length - 1 ? { borderBottom: '0.5px solid rgba(60,60,67,.12)' } : {}}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(0,122,255,.10)' }}>
                  <Bell className="w-4 h-4" style={{ color: '#007AFF' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#1C1C1E' }}>{label}</p>
                  <p className="text-[11px]" style={{ color: '#6B6B70' }}>{sub}</p>
                </div>
              </div>
              <Toggle on={val} onChange={set} />
            </div>
          ))}
        </div>

        {/* Appearance */}
        <p className="px-4 md:px-6 pb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B6B70' }}>Appearance</p>
        <div className="mx-4 md:mx-6 mb-4 rounded-2xl overflow-hidden" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)' }}>
          <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '0.5px solid rgba(60,60,67,.12)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(88,86,214,.10)' }}>
                <Moon className="w-4 h-4" style={{ color: '#5856D6' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: '#1C1C1E' }}>Dark mode</p>
                <p className="text-[11px]" style={{ color: '#6B6B70' }}>Coming soon</p>
              </div>
            </div>
            <Toggle on={darkMode} onChange={setDarkMode} />
          </div>

          {/* Language */}
          <button
            onClick={() => setShowLangPicker(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3.5"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(50,173,230,.10)' }}>
                <Globe className="w-4 h-4" style={{ color: '#32ADE6' }} />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium" style={{ color: '#1C1C1E' }}>Language</p>
                <p className="text-[11px]" style={{ color: '#6B6B70' }}>{language}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: '#C7C7CC', transform: showLangPicker ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }} />
          </button>

          {showLangPicker && (
            <div style={{ borderTop: '0.5px solid rgba(60,60,67,.12)' }}>
              {LANGUAGES.map((lang, i) => (
                <button
                  key={lang}
                  onClick={() => { setLanguage(lang); setShowLangPicker(false) }}
                  className="w-full flex items-center justify-between px-4 py-3"
                  style={i < LANGUAGES.length - 1 ? { borderBottom: '0.5px solid rgba(60,60,67,.08)' } : {}}
                >
                  <span className="text-sm" style={{ color: '#1C1C1E' }}>{lang}</span>
                  {language === lang && (
                    <span className="text-sm font-semibold" style={{ color: '#007AFF' }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* App info */}
        <p className="px-4 md:px-6 pb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B6B70' }}>About</p>
        <div className="mx-4 md:mx-6 mb-4 rounded-2xl overflow-hidden" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)' }}>
          {[
            { label: 'Version', value: '2.0.0' },
            { label: 'Terms of Service', value: '' },
            { label: 'Privacy Policy', value: '' },
          ].map(({ label, value }, i) => (
            <div
              key={label}
              className="flex items-center justify-between px-4 py-3.5"
              style={i < 2 ? { borderBottom: '0.5px solid rgba(60,60,67,.12)' } : {}}
            >
              <p className="text-sm font-medium" style={{ color: '#1C1C1E' }}>{label}</p>
              <p className="text-sm" style={{ color: '#6B6B70' }}>{value}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
