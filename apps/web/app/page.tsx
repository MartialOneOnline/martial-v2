'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useT } from '../lib/i18n/LanguageContext'
import LoginModal        from '../components/LoginModal'
import RegisterModal     from '../components/RegisterModal'
import Header           from '../components/Header'
import HeroSection       from '../components/HeroSection'
import FeaturesCloud     from '../components/FeaturesCloud'
import MissionSection    from '../components/MissionSection'
import MembersAndAcademies from '../components/MembersAndAcademies'
import HomeDiscovery     from '../components/HomeDiscovery'
import { TrySomethingNew } from '../components/HomeSections'
import PartnersSection   from '../components/PartnersSection'
import AppPromotion      from '../components/AppPromotion'
import Testimonials      from '../components/Testimonials'
import CallToAction      from '../components/CallToAction'
import PaymentMethods    from '../components/PaymentMethods'
import AppDownloadBanner from '../components/AppDownloadBanner'
import Footer            from '../components/Footer'


// Inner component — uses useSearchParams (must be inside Suspense)
function HomeContent() {
  const searchParams = useSearchParams()
  const t = useT()
  const [showModal, setShowModal]                 = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const openModal    = () => setShowModal(true)
  const openRegister = () => setShowRegisterModal(true)

  const redirectAfterLogin = searchParams.get('redirect') ?? undefined

  // Auto-open modals when redirected from /login or /register
  useEffect(() => {
    if (searchParams.get('login') === 'true')    setShowModal(true)
    if (searchParams.get('register') === 'true') setShowRegisterModal(true)
  }, [searchParams])

  return (
    <div className="min-h-screen bg-white text-[#061229] font-sans">

      {showModal && <LoginModal onClose={() => setShowModal(false)} onOpenRegister={() => { setShowModal(false); openRegister() }} redirectTo={redirectAfterLogin} />}
      {showRegisterModal && <RegisterModal onClose={() => setShowRegisterModal(false)} onOpenLogin={() => { setShowRegisterModal(false); openModal() }} />}

      {/* ── NAVBAR ──────────────────────────────────────────────── */}
      <Header onOpenLoginModal={openModal} />

      {/* 1. Hero */}
      <HeroSection onOpenLoginModal={openModal} />

      {/* 2. Free Platform Bar */}
      <section className="bg-[#0E3A7A] py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm font-semibold text-[#7DE7EC] uppercase tracking-widest mb-3">
            {t.platform.badge}
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-white leading-snug">
            {t.platform.title}
          </h2>
        </div>
      </section>

      {/* 3. Dashboard mock */}
      <FeaturesCloud />

      {/* 4. Mission */}
      <MissionSection />

      {/* 5. For Members / For Academies */}
      <MembersAndAcademies />

      {/* 6. Try Something New */}
      <TrySomethingNew />

      {/* 7. Discovery — Academies Near You */}
      <HomeDiscovery />


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

// Outer export — wraps HomeContent in Suspense (required by useSearchParams)
export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  )
}
