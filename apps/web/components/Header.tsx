'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ChevronDown } from 'lucide-react'

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
  // EN / default
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

// ── Nav links ─────────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: 'HOME',       href: '/' },
  { label: 'EXPLORE',    href: '/explore' },
  { label: 'ACADEMY',    href: '#academy' },
  { label: 'DASHBOARD',  href: '/dashboard' },
  { label: 'TECHNOLOGY', href: '#technology' },
  { label: 'PRICE',      href: '#payment-methods-section' },
]

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'pt', name: 'Português' },
  { code: 'fr', name: 'Français' },
]

// ── Props ─────────────────────────────────────────────────────────────────────
interface HeaderProps {
  onOpenLoginModal?: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Header({ onOpenLoginModal }: HeaderProps) {
  const [mobileOpen, setMobileOpen]       = useState(false)
  const [langOpen, setLangOpen]           = useState(false)
  const [activeLang, setActiveLang]       = useState('en')

  const selectLang = (code: string) => {
    setActiveLang(code)
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
              <span className="text-xl font-black tracking-wider text-slate-800 leading-none" style={{ fontFamily: 'var(--font-display)' }}>
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
                className="text-[12.5px] lg:text-[13px] font-extrabold text-slate-600 hover:text-sky-500 transition-colors uppercase tracking-wide"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right: language + buttons */}
          <div className="hidden md:flex items-center gap-4 lg:gap-5">

            {/* Language selector */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-extrabold text-[12.5px] py-2 cursor-pointer focus:outline-none"
              >
                <FlagIcon lang={activeLang} />
                <span className="uppercase">{activeLang}</span>
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
                          activeLang === lang.code ? 'bg-sky-50 text-sky-600' : 'text-slate-700 hover:bg-slate-50'
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

            {/* Parallelogram buttons */}
            <div className="flex items-center select-none">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="relative bg-[#0092ff] text-white font-black text-[11px] uppercase tracking-wider py-2.5 px-6 rounded-l-md hover:bg-[#007cd7] shadow-sm -skew-x-[15deg] transition-all cursor-pointer"
              >
                <span className="skew-x-[15deg] inline-block">Dashboard</span>
              </button>
              <button
                onClick={() => onOpenLoginModal?.()}
                className="relative bg-slate-800 text-slate-200 font-extrabold text-[11px] uppercase tracking-widest py-2.5 px-6 rounded-r-md hover:bg-slate-900 border-l border-slate-700 -skew-x-[15deg] transition-all cursor-pointer"
              >
                <span className="skew-x-[15deg] inline-block">Sign In</span>
              </button>
            </div>

          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex md:hidden text-slate-600 hover:text-slate-900 p-2 rounded-lg"
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
                      onClick={() => setActiveLang(lang.code)}
                      className={`px-2.5 py-1 text-[11px] font-black rounded uppercase border transition-all ${
                        activeLang === lang.code
                          ? 'border-sky-500 bg-sky-500 text-white'
                          : 'border-gray-200 bg-white text-slate-600 hover:bg-slate-50'
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
                  className="block px-3 py-2.5 rounded-lg text-sm font-black text-slate-600 hover:bg-slate-50 hover:text-sky-500 transition-all uppercase tracking-wider"
                >
                  {link.label}
                </Link>
              ))}

              <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
                <Link
                  href="/dashboard"
                  className="w-full text-center py-3 bg-[#0092ff] hover:bg-[#007cd7] text-white font-black text-xs uppercase tracking-wider rounded-lg transition-colors"
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => { setMobileOpen(false); onOpenLoginModal?.() }}
                  className="w-full text-center py-3 bg-slate-800 hover:bg-slate-900 text-slate-200 font-black text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
