'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import LoginModal        from '../components/LoginModal'
import RegisterModal     from '../components/RegisterModal'
import Header            from '../components/Header'
import HeroSection       from '../components/HeroSection'
import HomeSearch        from '../components/HomeSearch'
import HomeThreeValues   from '../components/HomeThreeValues'
import HomeDiscovery     from '../components/HomeDiscovery'
import MembersAndAcademies from '../components/MembersAndAcademies'
import HomeCamps         from '../components/HomeCamps'
import PartnersSection   from '../components/PartnersSection'
import AppDownloadBanner from '../components/AppDownloadBanner'
import Footer            from '../components/Footer'

// Inner component — uses useSearchParams (must be inside Suspense)
function HomeContent() {
  const searchParams = useSearchParams()
  const [showModal, setShowModal]                 = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const openModal    = () => setShowModal(true)
  const openRegister = () => setShowRegisterModal(true)

  const redirectAfterLogin = searchParams.get('redirect') ?? undefined

  useEffect(() => {
    if (searchParams.get('login') === 'true')    setShowModal(true)
    if (searchParams.get('register') === 'true') setShowRegisterModal(true)
  }, [searchParams])

  return (
    <div className="min-h-screen bg-white text-[#061229] font-sans">

      {showModal && <LoginModal onClose={() => setShowModal(false)} onOpenRegister={() => { setShowModal(false); openRegister() }} redirectTo={redirectAfterLogin} />}
      {showRegisterModal && <RegisterModal onClose={() => setShowRegisterModal(false)} onOpenLogin={() => { setShowRegisterModal(false); openModal() }} />}

      {/* Navbar */}
      <Header onOpenLoginModal={openModal} />

      {/* 1. Hero — dark navy */}
      <HeroSection onOpenLoginModal={openModal} />

      {/* 2. Search block — overlaps hero bottom */}
      <HomeSearch />

      {/* 3. Discover / Book / Grow */}
      <HomeThreeValues />

      {/* 4. Academies near you (For Students) */}
      <HomeDiscovery />

      {/* 5. For Schools */}
      <MembersAndAcademies />

      {/* 6. Camps & Marketplace */}
      <HomeCamps />

      {/* 7. Partners */}
      <PartnersSection />

      {/* 8. App Download */}
      <AppDownloadBanner />

      {/* 9. Footer */}
      <Footer />

    </div>
  )
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  )
}
