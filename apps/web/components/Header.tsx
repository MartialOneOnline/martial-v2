'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ChevronDown } from 'lucide-react'
import { useLanguage, useT } from '../lib/i18n/LanguageContext'
import type { Locale } from '../lib/i18n/translations'
import { createClient } from '../lib/supabase/client'

// ── Flag icons ────────────────────────────────────────────────────────────────
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

const LANGUAGES = [
  { code: 'en' as Locale, name: 'English' },
  { code: 'es' as Locale, name: 'Español' },
  { code: 'pt' as Locale, name: 'Português' },
  { code: 'fr' as Locale, name: 'Français' },
]

interface HeaderProps {
  onOpenLoginModal?: () => void
}

export default function Header({ onOpenLoginModal }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [langOpen, setLangOpen]     = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [accountLink, setAccountLink] = useState<{ label: string; href: string }>({ label: 'My Account', href: '/my' })
  const { locale, setLocale }       = useLanguage()
  const t                           = useT()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session)
      if (!data.session) return

      fetch('/api/auth/me').then(res => res.json()).then(json => {
        if (json.user?.globalRole === 'SUPERADMIN') {
          setAccountLink({ label: 'Admin', href: '/admin' })
          return
        }
        const schools = json.contexts?.schools ?? []
        const isStaff = schools.some((s: { role: string }) => s.role !== 'STUDENT')
        setAccountLink(isStaff ? { label: 'Dashboard', href: '/dashboard' } : { label: 'My Profile', href: '/my' })
      }).catch(() => {})
    })
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const NAV_LINKS = [
    { label: 'Explore',     href: '/explore' },
    { label: 'For Schools', href: '#for-schools' },
    { label: 'Camps',       href: '#camps' },
    { label: 'Marketplace', href: '#marketplace' },
    { label: 'Pricing',     href: '#pricing' },
  ]

  const selectLang = (code: Locale) => {
    setLocale(code)
    setLangOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between h-20">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 overflow-hidden rounded-xl group-hover:scale-105 transition-transform shrink-0">
              <Image src="/martial-logo.png" alt="Martial App" width={48} height={48} className="object-contain" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xl font-black tracking-wider text-[#101828] leading-none" style={{ fontFamily: 'var(--font-display)' }}>
                MARTIAL
              </span>
              <span className="text-[9px] font-bold tracking-[0.25em] text-cyan-600 mt-0.5 leading-none uppercase">
                Take Control
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            {NAV_LINKS.map(link => (
              <Link
                key={link.label}
                href={link.href}
                className="text-[12.5px] lg:text-[13px] font-extrabold text-[#667085] hover:text-[#0870E2] transition-colors uppercase tracking-wide"
              >
                {link.label}
              </Link>
            ))}
            {isLoggedIn && (
              <Link
                href={accountLink.href}
                className="text-[12.5px] lg:text-[13px] font-extrabold text-[#0870E2] hover:text-[#004e7c] transition-colors uppercase tracking-wide"
              >
                {accountLink.label}
              </Link>
            )}
          </nav>

          {/* Right: language + buttons */}
          <div className="hidden md:flex items-center gap-4 lg:gap-5">

            {/* Language selector */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-2 text-[#667085] hover:text-[#101828] font-extrabold text-[12.5px] py-2 cursor-pointer focus:outline-none"
              >
                <FlagIcon lang={locale} />
                <span className="uppercase">{locale}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50"
                  >
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => selectLang(lang.code)}
                        className={`w-full px-4 py-2.5 text-left text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer ${
                          locale === lang.code ? 'bg-sky-50 text-sky-600' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <FlagIcon lang={lang.code} />
                        <span>{lang.name}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* CTA buttons */}
            <div className="flex items-center select-none">
              <a
                href="/claim"
                className="relative bg-[#0870E2] text-white font-black text-[11px] uppercase tracking-wider py-2.5 px-6 rounded-l-md hover:bg-[#007cd7] shadow-sm -skew-x-[15deg] transition-all"
              >
                <span className="skew-x-[15deg] inline-block">Claim Your School</span>
              </a>
              {isLoggedIn ? (
                <button
                  onClick={handleSignOut}
                  className="relative bg-slate-800 text-slate-200 font-extrabold text-[11px] uppercase tracking-widest py-2.5 px-6 rounded-r-md hover:bg-slate-900 border-l border-slate-700 -skew-x-[15deg] transition-all cursor-pointer"
                >
                  <span className="skew-x-[15deg] inline-block">Sign out</span>
                </button>
              ) : (
                <button
                  onClick={() => onOpenLoginModal?.()}
                  className="relative bg-slate-800 text-slate-200 font-extrabold text-[11px] uppercase tracking-widest py-2.5 px-6 rounded-r-md hover:bg-slate-900 border-l border-slate-700 -skew-x-[15deg] transition-all cursor-pointer"
                >
                  <span className="skew-x-[15deg] inline-block">{t.nav.login}</span>
                </button>
              )}
            </div>

          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex md:hidden text-[#667085] hover:text-[#101828] p-2 rounded-lg"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-gray-100"
          >
            <div className="px-6 pt-4 pb-6 space-y-3">
              {/* Language selector mobile */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 mb-1">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Language</span>
                <div className="flex gap-2">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => selectLang(lang.code)}
                      className={`px-2.5 py-1 text-[11px] font-black rounded uppercase border transition-all ${
                        locale === lang.code
                          ? 'border-[#0870E2]/20 border-sky-REMOVED500 bg-[#0870E2] text-white'
                          : 'border-gray-200 bg-white text-[#667085] hover:bg-slate-50'
                      }`}
                    >
                      {lang.code}
                    </button>
                  ))}
                </div>
              </div>

              {NAV_LINKS.map(link => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2.5 rounded-lg text-sm font-black text-[#667085] hover:bg-slate-50 hover:text-[#0870E2] transition-all uppercase tracking-wider"
                >
                  {link.label}
                </Link>
              ))}
              {isLoggedIn && (
                <Link
                  href={accountLink.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2.5 rounded-lg text-sm font-black text-[#0870E2] hover:bg-sky-50 transition-all uppercase tracking-wider"
                >
                  {accountLink.label}
                </Link>
              )}

              <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
                <Link
                  href="/claim"
                  className="w-full text-center py-3 bg-[#0870E2] hover:bg-[#007cd7] text-white font-black text-xs uppercase tracking-wider rounded-lg transition-colors"
                >
                  Claim Your School
                </Link>
                {isLoggedIn ? (
                  <button
                    onClick={() => { setMobileOpen(false); handleSignOut() }}
                    className="w-full text-center py-3 bg-slate-800 hover:bg-slate-900 text-slate-200 font-black text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                  >
                    Sign out
                  </button>
                ) : (
                  <button
                    onClick={() => { setMobileOpen(false); onOpenLoginModal?.() }}
                    className="w-full text-center py-3 bg-slate-800 hover:bg-slate-900 text-slate-200 font-black text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                  >
                    {t.nav.login}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
