'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Share2, Globe, ArrowUp, Dumbbell, HelpCircle } from 'lucide-react'
import { useT } from '../lib/i18n/LanguageContext'

const SOCIAL_ICONS = [
  { name: 'Facebook',  icon: <Share2 className="w-4 h-4" />, href: '#' },
  { name: 'Instagram', icon: <Globe  className="w-4 h-4" />, href: '#' },
  { name: 'Twitter',   icon: <Share2 className="w-4 h-4" />, href: '#' },
  { name: 'Youtube',   icon: <Globe  className="w-4 h-4" />, href: '#' },
]

export default function Footer() {
  const t = useT()

  const NAV_LINKS = [
    { label: t.nav.explore,    href: '/explore' },
    { label: t.nav.technology, href: '#technology' },
    { label: t.nav.dashboard,  href: '/dashboard' },
    { label: t.nav.academy,    href: '#academy' },
  ]

  return (
    <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 font-sans">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-8">

          {/* Brand */}
          <div className="md:col-span-5 flex flex-col space-y-6 text-left">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 overflow-hidden rounded-xl shrink-0">
                <Image src="/martial-logo.png" alt="Martial App" width={48} height={48} className="object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-wider text-slate-100">MARTIAL</span>
                <span className="text-[9px] font-bold tracking-[0.25em] text-cyan-500 -mt-1 leading-none uppercase">Take Control</span>
              </div>
            </Link>

            <p className="text-sm font-semibold leading-relaxed max-w-sm text-slate-400">
              {t.footer.tagline}
            </p>

            <div className="flex items-center gap-2.5">
              {SOCIAL_ICONS.map(s => (
                <a key={s.name} href={s.href} aria-label={s.name}
                   className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-800 hover:border-cyan-500 hover:bg-slate-950 text-slate-300 hover:text-cyan-400 flex items-center justify-center transition-all">
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Navigate */}
          <div className="md:col-span-3 text-left">
            <h4 className="text-white text-sm font-black uppercase tracking-wider mb-5 flex items-center gap-1.5">
              <Dumbbell className="w-4 h-4 text-cyan-400" />{t.footer.navigate}
            </h4>
            <ul className="space-y-3.5 text-sm font-semibold">
              {NAV_LINKS.map(link => (
                <li key={link.label}>
                  <Link href={link.href} className="hover:text-cyan-400 transition-colors py-0.5 block">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div className="md:col-span-3 text-left">
            <h4 className="text-white text-sm font-black uppercase tracking-wider mb-5 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-cyan-400" />{t.sidebar.support}
            </h4>
            <ul className="space-y-3.5 text-sm font-semibold">
              {['About Us', 'Contact Us', 'FAQs', 'Terms & Conditions', 'Privacy Policy'].map(item => (
                <li key={item}>
                  <a href="#" className="hover:text-cyan-400 transition-colors py-0.5 block">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Scroll to top */}
          <div className="md:col-span-1 flex items-start md:justify-end">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="w-11 h-11 bg-slate-800 hover:bg-slate-950 text-slate-300 hover:text-cyan-400 border border-slate-700 hover:border-cyan-500 rounded-xl flex items-center justify-center cursor-pointer transition-all"
              title="Scroll to Top"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-slate-950 border-t border-slate-800 text-slate-500 text-[11px] font-bold">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <span>© MartialApp. 2026 {t.footer.rights}</span>
            <span className="hidden sm:inline text-slate-800">|</span>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-slate-300 transition-colors">{t.footer.terms}</a>
              <a href="#" className="hover:text-slate-300 transition-colors">{t.footer.privacy}</a>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap opacity-60 hover:opacity-90 transition-opacity">
            <span className="mr-2 text-[10px] uppercase font-bold tracking-widest text-slate-600">Integrations:</span>
            <span className="text-slate-400 font-extrabold italic text-[11px]">stripe</span>
            <span className="text-slate-400 font-black italic text-[11px]">PayPal</span>
            <span className="text-slate-400 text-[9px] font-black tracking-widest uppercase">gocardless</span>
            <span className="text-[8px] border border-slate-600 px-1 rounded-sm uppercase font-black tracking-wider">Direct Debit</span>
            <span className="text-slate-400 font-black italic text-[11px]">VISA</span>
            <div className="flex -space-x-1 items-center">
              <span className="w-3.5 h-3.5 bg-rose-600 rounded-full block" />
              <span className="w-3.5 h-3.5 bg-amber-500 rounded-full block" />
            </div>
          </div>
        </div>
      </div>

    </footer>
  )
}
