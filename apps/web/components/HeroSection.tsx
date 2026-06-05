'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Star, MapPin, Calendar, Award } from 'lucide-react'
import { useT } from '../lib/i18n/LanguageContext'

const HERO_SLIDES = [
  { image: '/hero-1.jpg',              title: 'Apex Martial Arts',    location: 'Hutton, United Kingdom', bookings: 230, students: 135, classes: 452, payments: '£2,343', rating: 4.8 },
  { image: '/hero-2.jpg',              title: 'Shogun Dojo London',   location: 'London, United Kingdom', bookings: 384, students: 210, classes: 580, payments: '£4,912', rating: 4.9 },
  { image: '/roger-gracie-dubai.jpg',  title: 'Roger Gracie Dubai',   location: 'Dubai, UAE',             bookings: 310, students: 172, classes: 490, payments: '€3,640', rating: 5.0 },
]

interface HeroSectionProps {
  onOpenLoginModal?: () => void
}

export default function HeroSection({ onOpenLoginModal }: HeroSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const t = useT()

  const prevSlide = () => setActiveIndex(i => (i === 0 ? HERO_SLIDES.length - 1 : i - 1))
  const nextSlide = () => setActiveIndex(i => (i === HERO_SLIDES.length - 1 ? 0 : i + 1))
  const slide = HERO_SLIDES[activeIndex]!

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-sky-50/70 via-white to-white py-20 lg:py-28">
      <div className="absolute top-0 right-0 -z-10 w-[600px] h-[600px] bg-sky-200/20 rounded-full blur-3xl" />
      <div className="absolute bottom-10 left-10 -z-10 w-[400px] h-[400px] bg-indigo-100/30 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">

          {/* Left — Text */}
          <div className="lg:col-span-6 flex flex-col space-y-8">
            <div className="flex flex-col gap-2.5">
              <div className="flex gap-2.5 items-center">
                <span className="w-10 h-1 bg-sky-400 rounded-full" />
                <span className="w-4 h-1 bg-sky-400/50 rounded-full" />
                <span className="w-2.5 h-1 bg-sky-400/30 rounded-full" />
              </div>
              <span className="text-xs font-extrabold tracking-wider text-sky-600 uppercase mt-1">
                {t.hero.badge}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
              {t.hero.title} <br />
              <span className="text-[#0092ff]">{t.hero.titleSub}</span>
            </h1>

            <p className="text-lg text-slate-600 leading-relaxed max-w-xl">
              {t.hero.subtitle}
            </p>

            <div className="flex flex-wrap gap-4 items-center">
              <button
                onClick={() => onOpenLoginModal?.()}
                className="px-8 py-4 bg-[#0092ff] text-white font-extrabold text-[15px] rounded-xl hover:bg-[#007cd7] shadow-lg shadow-sky-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                {t.hero.cta}
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                  className="font-black"
                >→</motion.span>
              </button>
            </div>

            {/* App badges */}
            <div className="pt-6 border-t border-gray-100">
              <p className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-4">{t.hero.availableOn}</p>
              <div className="flex flex-wrap items-center gap-4">
                <a href="#" className="flex items-center gap-3 bg-slate-900 text-white px-5 py-2.5 rounded-lg border border-slate-800 hover:bg-slate-950 transition-colors shadow-sm">
                  <svg className="w-6 h-6 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3.25 2.1c-.13 0-.25.04-.36.12l10.95 10.95 3.32-3.32L3.6 2.2c-.1-.08-.22-.1-.35-.1zM2.5 3v18c0 .24.1.48.28.66l10.33-10.33L2.78 2.34C2.6 2.52 2.5 2.76 2.5 3zm11.23 9.66l3.33 3.33 3.54-2.03c.5-.28.8-.8.8-1.38s-.3-1.1-.8-1.38l-3.54-2.03-3.33 3.33-.03.11v.05zm-.87-.87l-10.3 10.3c.11.08.23.1.36.1l13.56-7.78-3.62-3.62z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider leading-none">{t.hero.getItOn}</p>
                    <p className="text-sm font-semibold tracking-wide leading-tight">{t.hero.googlePlay}</p>
                  </div>
                </a>
                <a href="#" className="flex items-center gap-3 bg-slate-900 text-white px-5 py-2.5 rounded-lg border border-slate-800 hover:bg-slate-950 transition-colors shadow-sm">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.02-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.58 2.95-1.39z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider leading-none">{t.hero.downloadOn}</p>
                    <p className="text-sm font-semibold tracking-wide leading-tight">{t.hero.appStore}</p>
                  </div>
                </a>
              </div>
            </div>
          </div>

          {/* Right — Slider */}
          <div className="lg:col-span-6 relative flex flex-col items-center">
            <div className="relative w-full max-w-lg aspect-square rounded-3xl overflow-hidden bg-slate-900 border-4 border-white shadow-2xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIndex}
                  className="absolute inset-0"
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                >
                  <Image src={slide.image} alt={slide.title} fill className="object-cover opacity-80" />
                </motion.div>
              </AnimatePresence>

              {/* Top banner */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
                <span className="bg-sky-500/90 text-white font-extrabold text-xs tracking-wider uppercase px-4 py-1.5 rounded-full shadow-md backdrop-blur-sm">
                  🏆 Verified Club
                </span>
                <span className="w-10 h-10 bg-[#0092ff] text-white flex items-center justify-center rounded-full shadow-lg">
                  <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </span>
              </div>

              {/* Overlay cards */}
              <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-4 z-10">
                <motion.div
                  key={`info-${activeIndex}`}
                  initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
                  className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl flex items-center gap-4 border border-white/20"
                >
                  <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Award className="w-6 h-6 text-[#0092ff]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm leading-tight">{slide.title}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 font-semibold">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />{slide.location}
                    </p>
                  </div>
                  <div className="ml-auto bg-amber-50 px-2 py-1 rounded-md text-amber-500 flex items-center gap-1 flex-shrink-0">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-black">{slide.rating}</span>
                  </div>
                </motion.div>

                <motion.div
                  key={`stats-${activeIndex}`}
                  initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                  className="grid grid-cols-2 gap-2 bg-[#0284c7]/95 text-white p-4 rounded-2xl shadow-2xl backdrop-blur-sm"
                >
                  {[
                    { icon: <Calendar className="w-4 h-4" />, label: t.hero.stats.bookings, value: slide.bookings },
                    { icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>, label: t.hero.stats.students, value: slide.students },
                    { icon: <Award className="w-4 h-4" />,    label: t.hero.stats.classes,  value: slide.classes  },
                    { icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, label: t.hero.stats.payments, value: slide.payments },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-3 p-2 bg-white/10 rounded-xl">
                      <div className="p-1.5 bg-white/10 rounded-lg text-sky-200">{s.icon}</div>
                      <div>
                        <p className="text-[10px] uppercase font-bold tracking-wider text-sky-200">{s.label}</p>
                        <p className="font-black text-sm">{s.value}</p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              </div>
            </div>

            {/* Arrows */}
            <div className="flex items-center gap-3 mt-6">
              <button onClick={prevSlide} className="w-12 h-12 rounded-full border border-gray-200 bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-600 flex items-center justify-center shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-all" aria-label="Previous">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <span className="text-sm font-bold text-slate-500 font-mono">{activeIndex + 1} / {HERO_SLIDES.length}</span>
              <button onClick={nextSlide} className="w-12 h-12 rounded-full border border-gray-200 bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-600 flex items-center justify-center shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-all" aria-label="Next">
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
