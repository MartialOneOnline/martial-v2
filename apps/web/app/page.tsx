'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import LoginModal        from '../components/LoginModal'
import HeroSection       from '../components/HeroSection'
import FeaturesCloud     from '../components/FeaturesCloud'
import MissionSection    from '../components/MissionSection'
import MembersAndAcademies from '../components/MembersAndAcademies'
import FeaturedSchools   from '../components/FeaturedSchools'
import PartnersSection   from '../components/PartnersSection'
import AppPromotion      from '../components/AppPromotion'
import Testimonials      from '../components/Testimonials'
import CallToAction      from '../components/CallToAction'
import PaymentMethods    from '../components/PaymentMethods'
import AppDownloadBanner from '../components/AppDownloadBanner'
import Footer            from '../components/Footer'

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
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 h-16 flex items-center justify-between">
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
              <Link key={l.label} href={l.href} className="hover:text-[#0092ff] transition-colors">{l.label}</Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={openModal} className="text-sm text-[#006197] font-semibold hover:underline px-3 py-2 cursor-pointer">
              Sign In
            </button>
            <button onClick={openModal} className="text-sm bg-[#006197] text-white font-semibold px-5 py-2 rounded-md hover:bg-[#004f7a] transition-colors cursor-pointer">
              Dashboard
            </button>
          </div>
        </div>
      </nav>

      {/* 1. Hero */}
      <HeroSection onOpenLoginModal={openModal} />

      {/* 2. Free Platform Bar */}
      <section className="bg-sky-950 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm font-semibold text-sky-400 uppercase tracking-widest mb-3">
            Enterprise Cloud Architecture
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-white leading-snug">
            A <span className="text-sky-400">FREE</span> to user Platform for{' '}
            <span className="text-sky-400">Martial Arts Businesses &amp; Practitioners</span>
          </h2>
        </div>
      </section>

      {/* 3. Dashboard mock */}
      <FeaturesCloud />

      {/* 4. Mission */}
      <MissionSection />

      {/* 5. For Members / For Academies */}
      <MembersAndAcademies />

      {/* 6. Featured Schools */}
      <FeaturedSchools />

      {/* 7. Partners */}
      <PartnersSection />

      {/* 8. App Promotion */}
      <AppPromotion />

      {/* 9. Testimonials */}
      <Testimonials />

      {/* 10. Call to Action */}
      <CallToAction />

      {/* 11. Payment Methods */}
      <PaymentMethods />

      {/* 12. App Download Banner */}
      <AppDownloadBanner />

      {/* 13. Footer */}
      <Footer />

    </div>
  )
}
