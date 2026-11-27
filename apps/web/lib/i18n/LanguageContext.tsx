'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { translations, Locale, Translations } from './translations'

interface LanguageCtx {
  locale: Locale
  setLocale: (l: Locale) => void
  t: Translations
}

const LanguageContext = createContext<LanguageCtx>({
  locale: 'en',
  setLocale: () => {},
  t: translations.en,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    const saved = localStorage.getItem('martial_locale') as Locale | null
    if (saved && saved in translations) { setLocaleState(saved); return }
    // No explicit choice yet: follow the device/browser language (the app's
    // WebView reports the phone's language here). Not saved, so changing the
    // phone's language later still takes effect until the user picks one.
    const device = detectDeviceLocale()
    if (device) setLocaleState(device)
  }, [])

  const setLocale = (l: Locale) => {
    setLocaleState(l)
    localStorage.setItem('martial_locale', l)
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t: translations[locale] }}>
      {children}
    </LanguageContext.Provider>
  )
}

function detectDeviceLocale(): Locale | null {
  if (typeof navigator === 'undefined') return null
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const lang of langs) {
    const base = lang?.toLowerCase().split('-')[0]
    if (base && base in translations) return base as Locale
  }
  return null
}

export function useLanguage() {
  return useContext(LanguageContext)
}

export function useT() {
  return useContext(LanguageContext).t
}
