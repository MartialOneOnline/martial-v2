/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Play, Star, MapPin, Calendar, Award, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

const HERO_SLIDES = [
  {
    image: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&q=80&w=1200',
    title: 'Apex Martial Arts',
    location: 'Hutton, United Kingdom',
    bookings: 230,
    students: 135,
    classes: 452,
    payments: '£2,343',
    rating: 4.8,
  },
  {
    image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=1200',
    title: 'Shogun Dojo London',
    location: 'London, United Kingdom',
    bookings: 384,
    students: 210,
    classes: 580,
    payments: '£4,912',
    rating: 4.9,
  },
  {
    image: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&q=80&w=1200',
    title: 'Valor Combat Centre',
    location: 'Manchester, United',
    bookings: 195,
    students: 98,
    classes: 320,
    payments: '£1,850',
    rating: 4.6,
  }
];

export default function HeroSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const { t, language } = useLanguage();

  const labels: Record<string, Record<string, string>> = {
    bookings: { en: 'Bookings', es: 'Reservas', pt: 'Reservas', fr: 'Réservations' },
    students: { en: 'Students', es: 'Alumnos', pt: 'Alunos', fr: 'Élèves' },
    classes: { en: 'Classes', es: 'Clases', pt: 'Aulas', fr: 'Cours' },
    payments: { en: 'Payments', es: 'Pagos', pt: 'Pagos', fr: 'Paiements' },
    verified: { en: 'Verified Club', es: 'Club Verificado', pt: 'Club Verificado', fr: 'Club Certifié' },
    available: { en: 'Available on', es: 'Disponible en', pt: 'Disponível em', fr: 'Disponible sur' },
    get_started: { en: 'Get Started for FREE', es: 'Comenzar Gratis', pt: 'Começar Grátis', fr: 'Commencer Gratuitement' }
  };

  const prevSlide = () => {
    setActiveIndex((prev) => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setActiveIndex((prev) => (prev === HERO_SLIDES.length - 1 ? 0 : prev + 1));
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-sky-50/70 via-white to-white py-16 lg:py-24" id="hero-section">
      {/* Background Decorative Blobs */}
      <div className="absolute top-0 right-0 -z-10 w-[600px] h-[600px] bg-sky-200/20 rounded-full blur-3xl" />
      <div className="absolute bottom-10 left-10 -z-10 w-[400px] h-[400px] bg-indigo-100/30 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center" id="hero-grid">
          
          {/* Left Column: Headline and Badges */}
          <div className="lg:col-span-6 flex flex-col space-y-8" id="hero-text-container">
            {/* Tiny accent bar / badge */}
            <div className="flex flex-col gap-2.5">
              <div className="flex gap-2.5 items-center">
                <span className="w-10 h-1 bg-sky-400 rounded-full" />
                <span className="w-4 h-1 bg-sky-400/50 rounded-full" />
                <span className="w-2.5 h-1 bg-sky-400/30 rounded-full" />
              </div>
              <span className="text-xs font-extrabold tracking-wider text-sky-600 uppercase mt-1">
                {t('hero.badge')}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
              {t('hero.title_part1')} <br />
              <span className="text-[#0092ff] font-extrabold">{t('hero.title_part2')}</span>
            </h1>

            <p className="text-lg text-slate-600 font-normal leading-relaxed max-w-xl">
              {t('hero.desc')}
            </p>

            {/* CTA Button */}
            <div className="flex flex-wrap gap-4 items-center">
              <a
                href="#schools"
                className="px-8 py-4 bg-[#0092ff] text-white font-extrabold text-[15px] rounded-xl hover:bg-[#007cd7] shadow-lg shadow-sky-500/20 active:scale-95 transition-all text-center flex items-center justify-center gap-2 group cursor-pointer"
                id="hero-main-cta"
              >
                {labels.get_started[language] || labels.get_started['en']}
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                  className="font-black"
                >
                  →
                </motion.span>
              </a>
            </div>

            {/* App Badges */}
            <div className="pt-6 border-t border-gray-100" id="app-badge-section">
              <p className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-4" id="badge-title">
                {labels.available[language] || labels.available['en']}:
              </p>
              <div className="flex flex-wrap items-center gap-4">
                {/* Play Store Badge */}
                <a
                  href="#play-store"
                  className="flex items-center gap-3 bg-slate-900 text-white px-5 py-2.5 rounded-lg border border-slate-800 hover:bg-slate-950 transition-colors shadow-sm cursor-pointer"
                  id="google-play-badge"
                >
                  {/* Google Play Minimal SVG */}
                  <svg className="w-6 h-6 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 5.27v13.46l11.1-6.73L3 5.27zm11.9 6.73L17 14l-2.1-2zm1.6-4.6l-2.6 1.6L11.1 12l2.8 3.2 2.6 1.6c.4-.3.7-.7.7-1.3V8.7c0-.6-.3-1-.7-1.3z" className="hidden" />
                    <path d="M5.01 3.518c.214-2.023 1.954-1.954 1.954-1.954s2.808.571 8.243 4.414c3.488 2.473 3.791 4.545 3.791 4.545s-.167 1.094-1.282 2.012c-1.464 1.205-5.918 4.795-8.91 7.234-1.294 1.054-2.52.885-3.033.407l1.092-2.176 1.348-1.543c.123.011 2.871-1.611 4.954-2.893 2.154-1.312 2.311-2.122 2.311-2.122s-.1-1.123-2.112-2.234C11.1 5.912 6.943 3.912 5.01 3.518" className="hidden" />
                    <path d="M3.25 2.1c-.13 0-.25.04-.36.12l10.95 10.95 3.32-3.32L3.6 2.2c-.1-.08-.22-.1-.35-.1zM2.5 3v18c0 .24.1.48.28.66l10.33-10.33L2.78 2.34C2.6 2.52 2.5 2.76 2.5 3zm11.23 9.66l3.33 3.33 3.54-2.03c.5-.28.8-.8.8-1.38s-.3-1.1-.8-1.38l-3.54-2.03-3.33 3.33l-.03.11v.05zm-.87-.87l-10.3 10.3c.11.08.23.1.36.1l13.56-7.78-3.62-3.62z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider leading-none">GET IT ON</p>
                    <p className="text-sm font-semibold tracking-wide leading-tight">Google Play</p>
                  </div>
                </a>

                {/* App Store Badge */}
                <a
                  href="#app-store"
                  className="flex items-center gap-3 bg-slate-900 text-white px-5 py-2.5 rounded-lg border border-slate-800 hover:bg-slate-950 transition-colors shadow-sm cursor-pointer"
                  id="apple-store-badge"
                >
                  {/* Apple App Store SVG */}
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.02-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.58 2.95-1.39z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider leading-none">Download on the</p>
                    <p className="text-sm font-semibold tracking-wide leading-tight">App Store</p>
                  </div>
                </a>
              </div>
            </div>

          </div>

          {/* Right Column: Hero Slider with Overlay Cards */}
          <div className="lg:col-span-6 relative flex flex-col items-center" id="hero-slider-panel">
            
            {/* Main Interactive Stage Container */}
            <div className="relative w-full max-w-lg aspect-square rounded-3xl overflow-hidden bg-slate-900 border-4 border-white shadow-2xl" id="slider-frame">
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeIndex}
                  src={HERO_SLIDES[activeIndex].image}
                  alt={HERO_SLIDES[activeIndex].title}
                  className="w-full h-full object-cover opacity-80"
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                  referrerPolicy="no-referrer"
                />
              </AnimatePresence>

              {/* Top Banner on Slider */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                <span className="bg-sky-500/90 text-white font-extrabold text-xs tracking-wider uppercase px-4 py-1.5 rounded-full shadow-md backdrop-blur-xs">
                  🏆 {labels.verified[language] || labels.verified['en']}
                </span>
                
                {/* Floating link graphic indicator */}
                <span className="w-10 h-10 bg-[#0092ff] text-white flex items-center justify-center rounded-full shadow-lg">
                  <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </span>
              </div>

              {/* Apex Martial Arts Profile Card (Figma overlay element left-bottom) */}
              <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-4 pointer-events-auto">
                
                {/* Header card info */}
                <motion.div
                  key={`card-info-${activeIndex}`}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl flex items-center gap-4 border border-white/20"
                >
                  <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Award className="w-6 h-6 text-[#0092ff]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm leading-tight">
                      {HERO_SLIDES[activeIndex].title}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 font-semibold">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {HERO_SLIDES[activeIndex].location}
                    </p>
                  </div>
                  <div className="ml-auto bg-amber-50 px-2 py-1 rounded-md text-amber-500 flex items-center gap-1 flex-shrink-0">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-black">{HERO_SLIDES[activeIndex].rating}</span>
                  </div>
                </motion.div>

                {/* Grid stats overlay card (Figma stats panel: Bookings/Students/Classes/Payments) */}
                <motion.div
                  key={`stats-info-${activeIndex}`}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="grid grid-cols-2 gap-2 bg-[#0284c7]/95 text-white p-4 rounded-2xl shadow-2xl backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3 p-2 bg-white/10 rounded-xl">
                    <div className="p-1.5 bg-white/10 rounded-lg text-sky-200">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-sky-200">
                        {labels.bookings[language] || labels.bookings['en']}
                      </p>
                      <p className="font-black text-sm">{HERO_SLIDES[activeIndex].bookings}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-2 bg-white/10 rounded-xl">
                    <div className="p-1.5 bg-white/10 rounded-lg text-sky-200">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-sky-200">
                        {labels.students[language] || labels.students['en']}
                      </p>
                      <p className="font-black text-sm">{HERO_SLIDES[activeIndex].students}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-2 bg-white/10 rounded-xl">
                    <div className="p-1.5 bg-white/10 rounded-lg text-sky-200">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-sky-200">
                        {labels.classes[language] || labels.classes['en']}
                      </p>
                      <p className="font-black text-sm">{HERO_SLIDES[activeIndex].classes}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-2 bg-white/10 rounded-xl">
                    <div className="p-1.5 bg-white/10 rounded-lg text-sky-200">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-sky-200">
                        {labels.payments[language] || labels.payments['en']}
                      </p>
                      <p className="font-black text-sm">{HERO_SLIDES[activeIndex].payments}</p>
                    </div>
                  </div>
                </motion.div>

              </div>
            </div>

            {/* Slider Navigation Arrows */}
            <div className="flex items-center gap-3 mt-6" id="slider-arrow-controls">
              <button
                onClick={prevSlide}
                className="w-12 h-12 rounded-full border border-gray-200 bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-600 flex items-center justify-center shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-all"
                aria-label="Previous Slide"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <span className="text-sm font-bold text-slate-500 font-mono">
                {activeIndex + 1} / {HERO_SLIDES.length}
              </span>
              <button
                onClick={nextSlide}
                className="w-12 h-12 rounded-full border border-gray-200 bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-600 flex items-center justify-center shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-all"
                aria-label="Next Slide"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
