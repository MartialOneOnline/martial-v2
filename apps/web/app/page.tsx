'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import LoginModal    from '../components/LoginModal'
import HeroSection   from '../components/HeroSection'
import FeaturedSchools from '../components/FeaturedSchools'
import PartnersSection from '../components/PartnersSection'
import AppDownloadBanner from '../components/AppDownloadBanner'
import Testimonials  from '../components/Testimonials'
import Footer        from '../components/Footer'

const NAV_LINKS = [
  { label: 'Home',       href: '/' },
  { label: 'Explore',    href: '/explore' },
  { label: 'Academy',    href: '#academy' },
  { label: 'Dashboard',  href: '/dashboard' },
  { label: 'Technology', href: '#technology' },
  { label: 'Price',      href: '#pricing' },
]

export default function Home() {
  const [showModal, setShowModal] = useState(false)
  const openModal = () => setShowModal(true)

  return (
    <div className="min-h-screen bg-white text-[#061229] font-sans">

      {showModal && <LoginModal onClose={() => setShowModal(false)} />}

      {/* ── NAVBAR ──────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-12 h-12 overflow-hidden rounded-xl group-hover:scale-105 transition-transform shrink-0">
              <Image src="/martial-logo.png" alt="Martial App" width={48} height={48} className="object-contain" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-black tracking-wider text-[#061229] text-base">MARTIAL</span>
              <span className="text-[8px] font-bold tracking-[0.2em] text-[#0092ff] uppercase">Take Control</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-[#333]">
            {NAV_LINKS.map(l => (
              <Link key={l.label} href={l.href} className="hover:text-[#0092ff] transition-colors">
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openModal}
              className="text-sm text-[#006197] font-semibold hover:underline px-3 py-2 cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={openModal}
              className="text-sm bg-[#006197] text-white font-semibold px-5 py-2 rounded-md hover:bg-[#004f7a] transition-colors cursor-pointer"
            >
              Dashboard
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <HeroSection onOpenLoginModal={openModal} />

      {/* ── FREE PLATFORM BAR ───────────────────────────────────── */}
      <section className="bg-gray-50 py-10 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm font-semibold text-[#006197] uppercase tracking-widest mb-2">
            Enterprise Cloud Architecture
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-[#061229]">
            A <span className="text-[#0092ff]">FREE</span> to user Platform for{' '}
            <span className="text-[#0092ff]">Martial Arts Businesses &amp; Practitioners</span>
          </h2>
        </div>
      </section>

      {/* ── FEATURED SCHOOLS ────────────────────────────────────── */}
      <FeaturedSchools />

      {/* ── PARTNERS / GLOBAL ECOSYSTEM ─────────────────────────── */}
      <PartnersSection />

      {/* ── APP DOWNLOAD BANNER ─────────────────────────────────── */}
      <AppDownloadBanner />

      {/* ── TESTIMONIALS ────────────────────────────────────────── */}
      <Testimonials />

      {/* ── FINAL CTA ───────────────────────────────────────────── */}
      <section className="bg-[#0092ff] py-20 text-white text-center">
        <div className="max-w-3xl mx-auto px-6 space-y-6">
          <h2 className="text-3xl md:text-4xl font-extrabold uppercase leading-tight">
            Join the Global Martial Arts Network
          </h2>
          <p className="text-white/80 text-lg font-semibold">
            Connect your academy, grow your student base and manage everything from one platform.
          </p>
          <button
            onClick={openModal}
            className="inline-block bg-white text-[#006197] font-semibold px-8 py-3 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Get Started Free
          </button>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <Footer />

    </div>
  )
}
