'use client'

import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '../lib/i18n/LanguageContext'
import type { Locale } from '../lib/i18n/translations'

// ── Flag icons (same as Header) ───────────────────────────────────────────────
function FlagIcon({ lang }: { lang: string }) {
  if (lang === 'es') return (
    <div className="w-5 h-3.5 flex flex-col rounded-sm border border-gray-200 overflow-hidden shrink-0">
      <div className="h-1 bg-red-600 w-full" />
      <div className="h-1.5 bg-amber-400 w-full flex items-center pl-1">
        <div className="w-1 h-1 bg-red-600 rounded-full shrink-0" />
      </div>
      <div className="h-1 bg-red-600 w-full" />
    </div>
  )
  if (lang === 'pt') return (
    <div className="w-5 h-3.5 flex rounded-sm border border-gray-200 overflow-hidden shrink-0">
      <div className="w-[40%] bg-emerald-700 h-full" />
      <div className="w-[60%] bg-red-600 h-full relative flex items-center justify-start">
        <div className="absolute -left-1 w-2.5 h-2.5 bg-amber-400 rounded-full border border-blue-800 shrink-0" />
      </div>
    </div>
  )
  if (lang === 'fr') return (
    <div className="w-5 h-3.5 flex rounded-sm border border-gray-200 overflow-hidden shrink-0">
      <div className="w-1/3 bg-blue-800 h-full" />
      <div className="w-1/3 bg-white h-full" />
      <div className="w-1/3 bg-red-600 h-full" />
    </div>
  )
  // EN (default)
  return (
    <div className="w-5 h-3.5 bg-blue-800 relative overflow-hidden rounded-sm border border-gray-200 shrink-0">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full h-0.5 bg-white rotate-45 absolute" />
        <div className="w-full h-0.5 bg-white -rotate-45 absolute" />
        <div className="w-full h-1 bg-white absolute" />
        <div className="w-1 h-full bg-white absolute" />
        <div className="w-full h-[0.5px] bg-red-600 rotate-45 absolute" />
        <div className="w-full h-[0.5px] bg-red-600 -rotate-45 absolute" />
        <div className="w-full h-[0.6px] bg-red-600 absolute" />
        <div className="w-[0.6px] h-full bg-red-600 absolute" />
      </div>
    </div>
  )
}

const LANGUAGES: { code: Locale; name: string }[] = [
  { code: 'en', name: 'English'    },
  { code: 'es', name: 'Español'    },
  { code: 'pt', name: 'Português'  },
  { code: 'fr', name: 'Français'   },
]

export default function DashboardLanguageSelector() {
  const { locale, setLocale } = useLanguage()
  const [open, setOpen]       = useState(false)
  const ref                   = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Select language"
        className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
        style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
      >
        <FlagIcon lang={locale} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-11 rounded-xl overflow-hidden z-50"
          style={{
            background: '#fff',
            border: '1px solid #E5E7EB',
            boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
            minWidth: 140,
          }}
        >
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => { setLocale(lang.code); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 cursor-pointer text-left"
              style={{
                fontSize: 13,
                fontWeight: locale === lang.code ? 600 : 400,
                color: locale === lang.code ? '#0071E3' : '#374151',
                background: locale === lang.code ? '#EFF6FF' : 'transparent',
                border: 'none',
              }}
              onMouseEnter={e => { if (locale !== lang.code) (e.currentTarget as HTMLElement).style.background = '#F9FAFB' }}
              onMouseLeave={e => { if (locale !== lang.code) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <FlagIcon lang={lang.code} />
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
