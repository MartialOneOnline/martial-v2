'use client'

import { useState, useMemo, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Search, MapPin, Star, Filter, X, ChevronLeft, ChevronRight,
  ArrowRight, Clock, Sparkles, Dumbbell, Calendar, ChevronDown,
} from 'lucide-react'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import LoginModal from '../../components/LoginModal'
import RegisterModal from '../../components/RegisterModal'
import { useT } from '../../lib/i18n/LanguageContext'
import ClassBookingModal from '../school/[slug]/ClassBookingModal'

// ── Theme ─────────────────────────────────────────────────────────────────────
const BLUE = '#006197'

// ── Types ─────────────────────────────────────────────────────────────────────

type Plan = { id: string; name: string; price: number; currency: string; billingCycle: string; isPopular: boolean }

type DbSchool = {
  id: string
  slug: string
  name: string
  city: string
  country: string
  address: string | null
  coverUrl: string | null
  googleRating: number | null
  googleReviews: number | null
  description: string | null
  priceFrom: number | null
  hasFreeTrialCls: boolean
  facilities: string[]
  disciplines: { discipline: { name: string; slug: string } }[]
  instructors: { name: string; belt: string | null; isHead: boolean }[]
}

type ScheduleEntry = { dayOfWeek: number; startTime: string; endTime: string }

type DbClass = {
  id: string
  name: string
  level: string | null
  duration: number | null
  schedule: ScheduleEntry[]
  school: {
    id: string
    slug: string
    name: string
    city: string
    country: string
    coverUrl: string | null
    hasFreeTrialCls: boolean
    googleRating: number | null
    membershipPlans: Plan[]
  }
  instructor: { name: string; belt: string | null; role: string } | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DISCIPLINES = ['All', 'BJJ', 'Grappling', 'MMA', 'Muay Thai', 'Wrestling', 'Judo', 'Karate', 'Boxing']
const SORTS = ['Rating', 'Price'] as const
type SortKey = typeof SORTS[number]

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const LEVEL_STYLES: Record<string, string> = {
  'Beginner':    'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Advanced':    'bg-rose-50 text-rose-700 border-rose-200',
  'Intermediate':'bg-amber-50 text-amber-700 border-amber-200',
  'All levels':  'bg-blue-50 text-blue-700 border-blue-200',
}

const FALLBACK_COVER = 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=800&h=420&fit=crop&q=85'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getNextSlot(schedule: ScheduleEntry[]): string | null {
  if (!schedule.length) return null
  const now = new Date()
  const todayIdx = now.getDay()
  const nowMin = now.getHours() * 60 + now.getMinutes()

  // Look up to 7 days ahead
  for (let offset = 0; offset < 7; offset++) {
    const dayIdx = (todayIdx + offset) % 7
    const slots = schedule.filter(s => s.dayOfWeek === dayIdx)
    for (const slot of slots.sort((a, b) => a.startTime.localeCompare(b.startTime))) {
      const [h, m] = slot.startTime.split(':').map(Number)
      const slotMin = (h ?? 0) * 60 + (m ?? 0)
      if (offset > 0 || slotMin > nowMin) {
        const dayLabel = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : DAY_NAMES[dayIdx] ?? ''
        return `${dayLabel} · ${slot.startTime}`
      }
    }
  }
  return null
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 flex gap-4 animate-pulse">
      <div className="w-28 h-28 rounded-xl bg-[#F3F4F6] shrink-0" />
      <div className="flex-1 space-y-2.5 py-1">
        <div className="h-3 bg-[#F3F4F6] rounded-full w-3/4" />
        <div className="h-3 bg-[#F3F4F6] rounded-full w-1/2" />
        <div className="h-3 bg-[#F3F4F6] rounded-full w-2/3" />
      </div>
    </div>
  )
}

// ── School Card ───────────────────────────────────────────────────────────────

function SchoolCard({
  school,
  onClick,
}: {
  school: DbSchool
  onClick: () => void
}) {
  const disciplines = school.disciplines.map(d => d.discipline.name.toUpperCase())
  const headInstructor = school.instructors.find(i => i.isHead)
  const cover = school.coverUrl ?? FALLBACK_COVER

  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-2xl bg-white border border-[#E5E7EB] hover:border-[#006197] hover:shadow-md p-3 md:p-4 transition-all flex flex-col md:flex-row gap-3 md:gap-4"
    >
      {/* Image */}
      <div className="relative w-full md:w-28 h-40 md:h-28 rounded-xl overflow-hidden shrink-0 bg-[#F3F4F6]">
        <Image src={cover} alt={school.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
        {school.hasFreeTrialCls && (
          <span className="absolute top-2 left-2 text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wide">
            Free Trial
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-[#111827] text-sm leading-snug group-hover:text-[#006197] transition-colors line-clamp-2">
            {school.name}
          </h3>
          {school.googleRating && (
            <span className="flex items-center gap-0.5 shrink-0 text-sm font-bold text-[#111827]">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              {school.googleRating.toFixed(1)}
            </span>
          )}
        </div>

        <p className="flex items-center gap-1 mt-1.5 text-xs text-[#6B7280]">
          <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: BLUE }} />
          {school.city}, {school.country}
        </p>

        {headInstructor && (
          <p className="mt-1 text-xs text-[#6B7280]">
            <span className="font-medium">{headInstructor.name}</span>
            {headInstructor.belt && <span className="text-[#9CA3AF]"> · {headInstructor.belt}</span>}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {disciplines.slice(0, 3).map(d => (
            <span key={d} className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]">{d}</span>
          ))}
        </div>

        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-[#6B7280]">
            {school.priceFrom ? `from €${school.priceFrom}/mo` : 'Contact for pricing'}
          </span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" style={{ color: BLUE }} />
        </div>
      </div>
    </button>
  )
}

// ── Class Card ────────────────────────────────────────────────────────────────

function ClassCard({
  cls,
  onClick,
}: {
  cls: DbClass
  onClick: () => void
}) {
  const cover = cls.school.coverUrl ?? FALLBACK_COVER
  const nextSlot = getNextSlot(cls.schedule)
  const levelStyle = LEVEL_STYLES[cls.level ?? ''] ?? LEVEL_STYLES['All levels']

  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-2xl bg-white border border-[#E5E7EB] hover:border-[#006197] hover:shadow-md p-3 md:p-4 transition-all flex flex-col md:flex-row gap-3 md:gap-4"
    >
      {/* Image */}
      <div className="relative w-full md:w-28 h-36 md:h-28 rounded-xl overflow-hidden shrink-0 bg-[#F3F4F6]">
        <Image src={cover} alt={cls.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
        {cls.school.hasFreeTrialCls && (
          <span className="absolute top-2 left-2 text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wide">
            Free Trial
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-[#111827] text-sm leading-snug group-hover:text-[#006197] transition-colors">
            {cls.name}
          </h3>
          <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${levelStyle}`}>
            {cls.level ?? 'All levels'}
          </span>
        </div>

        <p className="flex items-center gap-1 mt-1.5 text-xs text-[#6B7280]">
          <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: BLUE }} />
          {cls.school.name} · {cls.school.city}
        </p>

        {cls.instructor && (
          <p className="mt-1 text-xs text-[#6B7280]">
            <span className="font-medium">{cls.instructor.name}</span>
            {cls.instructor.belt && <span className="text-[#9CA3AF]"> · {cls.instructor.belt}</span>}
          </p>
        )}

        <div className="flex items-center justify-between mt-3">
          {nextSlot ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-[#006197]">
              <Calendar className="w-3.5 h-3.5" />
              {nextSlot}
            </span>
          ) : (
            <span className="text-xs text-[#9CA3AF]">Check schedule</span>
          )}
          {cls.duration && (
            <span className="text-xs text-[#9CA3AF]">{cls.duration} min</span>
          )}
        </div>
      </div>
    </button>
  )
}

// ── School Quick View ─────────────────────────────────────────────────────────

function SchoolQuickView({
  school,
  onClose,
  onBookClass,
}: {
  school: DbSchool
  onClose: () => void
  onBookClass: () => void
}) {
  const [idx, setIdx] = useState(0)
  const imgs = school.coverUrl ? [school.coverUrl] : [FALLBACK_COVER]
  const disciplines = school.disciplines.map(d => d.discipline.name.toUpperCase())
  const headInstructor = school.instructors.find(i => i.isHead)

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[#111827]/50 backdrop-blur-sm" />

      <div
        onClick={e => e.stopPropagation()}
        className="relative w-full md:w-[680px] md:max-w-[92vw] bg-white rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[88vh] md:max-h-[90vh] overflow-y-auto"
        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" }}
      >
        {/* Drag handle (mobile) */}
        <div className="md:hidden sticky top-0 z-20 flex justify-center pt-3 pb-1 bg-white rounded-t-3xl">
          <div className="w-10 h-1.5 rounded-full bg-[#E5E7EB]" />
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center text-[#111827]"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cover */}
        <div className="relative w-full h-52 md:h-64 bg-[#111827] overflow-hidden md:rounded-t-3xl">
          <Image src={imgs[idx] ?? FALLBACK_COVER} alt={school.name} fill className="object-cover" />
          {imgs.length > 1 && (
            <>
              <button onClick={() => setIdx(i => (i - 1 + imgs.length) % imgs.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow flex items-center justify-center">
                <ChevronLeft className="w-5 h-5 text-[#111827]" />
              </button>
              <button onClick={() => setIdx(i => (i + 1) % imgs.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow flex items-center justify-center">
                <ChevronRight className="w-5 h-5 text-[#111827]" />
              </button>
            </>
          )}
          {/* Rating badge */}
          {school.googleRating && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur rounded-full px-2.5 py-1 text-sm font-bold text-[#111827]">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              {school.googleRating.toFixed(1)}
              {school.googleReviews && <span className="text-[#6B7280] font-normal text-xs"> · {school.googleReviews} reviews</span>}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-5 md:p-6">
          {/* Title + location */}
          <h2 className="text-xl md:text-2xl font-bold text-[#111827] leading-tight">{school.name}</h2>
          <p className="flex items-center gap-1 mt-1.5 text-sm text-[#6B7280]">
            <MapPin className="w-4 h-4 shrink-0" style={{ color: BLUE }} />
            {school.address ?? `${school.city}, ${school.country}`}
          </p>

          {/* Disciplines */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {disciplines.map(d => (
              <span key={d} className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-[#F9FAFB] text-[#6B7280] border border-[#E5E7EB]">{d}</span>
            ))}
            {school.hasFreeTrialCls && (
              <span className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Free Trial</span>
            )}
          </div>

          {/* Instructor */}
          {headInstructor && (
            <div className="mt-4 flex items-center gap-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: BLUE }}>
                {headInstructor.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#111827]">{headInstructor.name}</p>
                {headInstructor.belt && <p className="text-xs text-[#6B7280]">{headInstructor.belt}</p>}
              </div>
            </div>
          )}

          {/* Description */}
          {school.description && (
            <p className="mt-4 text-sm text-[#6B7280] leading-relaxed line-clamp-3">{school.description}</p>
          )}

          <div className="h-px bg-[#E5E7EB] my-5" />

          {/* Pricing */}
          {school.priceFrom && (
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-[#6B7280]">Starting from</span>
              <span className="text-lg font-bold text-[#111827]">€{school.priceFrom}<span className="text-sm font-normal text-[#6B7280]">/mo</span></span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <Link
              href={`/school/${school.slug}`}
              className="flex-1 h-12 rounded-xl border border-[#E5E7EB] text-[#111827] font-semibold text-sm flex items-center justify-center hover:bg-[#F9FAFB] transition-colors"
            >
              View Full Profile
            </Link>
            <button
              onClick={onBookClass}
              className="flex-1 h-12 rounded-xl text-white font-semibold text-sm flex items-center justify-center hover:opacity-90 transition-opacity gap-2"
              style={{ background: BLUE }}
            >
              <Dumbbell className="w-4 h-4" />
              {school.hasFreeTrialCls ? 'Book Free Trial' : 'Book a Class'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ mode }: { mode: 'schools' | 'classes' }) {
  return (
    <div className="p-12 text-center bg-white border border-[#E5E7EB] rounded-2xl">
      <Sparkles className="w-10 h-10 text-[#E5E7EB] mx-auto mb-3" />
      <h3 className="font-bold text-[#111827]">
        {mode === 'schools' ? 'No schools found' : 'No classes found'}
      </h3>
      <p className="text-sm text-[#6B7280] mt-1">Try a different discipline or location.</p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ExplorePage() {
  const t = useT()

  // Data
  const [schools, setSchools]   = useState<DbSchool[]>([])
  const [classes, setClasses]   = useState<DbClass[]>([])
  const [loadingSchools, setLoadingSchools] = useState(true)
  const [loadingClasses, setLoadingClasses] = useState(true)

  // UI state
  const [mode, setMode]               = useState<'schools' | 'classes'>('schools')
  const [search, setSearch]           = useState('')
  const [location, setLocation]       = useState('')
  const [discipline, setDiscipline]   = useState('All')
  const [sort, setSort]               = useState<SortKey>('Rating')
  const [quickView, setQuickView]     = useState<DbSchool | null>(null)
  const [showLogin, setShowLogin]     = useState(false)
  const [showRegister, setShowRegister] = useState(false)

  // Booking modal — for classes tab + quick view CTA
  const [bookingModal, setBookingModal] = useState<{
    session: { classId: string; className: string; level: string; startTime: string; endTime: string; dayLabel: string }
    schoolSlug: string
    plans: Plan[]
  } | null>(null)

  // Fetch schools
  useEffect(() => {
    setLoadingSchools(true)
    fetch('/api/schools')
      .then(r => r.json())
      .then((data: DbSchool[]) => setSchools(data))
      .catch(() => setSchools([]))
      .finally(() => setLoadingSchools(false))
  }, [])

  // Fetch classes
  useEffect(() => {
    setLoadingClasses(true)
    fetch('/api/classes')
      .then(r => r.json())
      .then((data: DbClass[]) => setClasses(data))
      .catch(() => setClasses([]))
      .finally(() => setLoadingClasses(false))
  }, [])

  // Filter + sort schools
  const filteredSchools = useMemo(() => {
    const q = search.toLowerCase()
    const l = location.toLowerCase()
    return schools
      .filter(s => {
        const tags = s.disciplines.map(d => d.discipline.name.toLowerCase())
        const matchDiscipline = discipline === 'All' || tags.some(tag => tag.includes(discipline.toLowerCase()))
        const matchSearch = !q || s.name.toLowerCase().includes(q) || tags.some(t => t.includes(q)) || (s.description ?? '').toLowerCase().includes(q)
        const matchLocation = !l || (s.city ?? '').toLowerCase().includes(l) || (s.address ?? '').toLowerCase().includes(l)
        return matchDiscipline && matchSearch && matchLocation
      })
      .sort((a, b) => {
        if (sort === 'Rating') return (b.googleRating ?? 0) - (a.googleRating ?? 0)
        return (a.priceFrom ?? 9999) - (b.priceFrom ?? 9999)
      })
  }, [schools, search, location, discipline, sort])

  // Filter classes
  const filteredClasses = useMemo(() => {
    const q = search.toLowerCase()
    const l = location.toLowerCase()
    return classes.filter(c => {
      const matchDiscipline = discipline === 'All' || c.name.toLowerCase().includes(discipline.toLowerCase()) || c.school.name.toLowerCase().includes(discipline.toLowerCase())
      const matchSearch = !q || c.name.toLowerCase().includes(q) || c.school.name.toLowerCase().includes(q)
      const matchLocation = !l || c.school.city.toLowerCase().includes(l)
      return matchDiscipline && matchSearch && matchLocation
    })
  }, [classes, search, location, discipline])

  // Open booking modal for a class
  function openClassBooking(cls: DbClass) {
    const next = cls.schedule[0]
    if (!next) return
    const dayLabel = DAY_NAMES[next.dayOfWeek] ?? 'Next'
    setBookingModal({
      session: {
        classId: cls.id,
        className: cls.name,
        level: cls.level ?? 'All levels',
        startTime: next.startTime,
        endTime: next.endTime,
        dayLabel,
      },
      schoolSlug: cls.school.slug,
      plans: cls.school.membershipPlans,
    })
  }

  // Open booking modal for a school (picks first class with schedule)
  function openSchoolBooking(school: DbSchool) {
    const cls = classes.find(c => c.school.slug === school.slug && c.schedule.length > 0)
    if (!cls) {
      // No classes yet, go to school page
      window.location.href = `/school/${school.slug}`
      return
    }
    openClassBooking(cls)
    setQuickView(null)
  }

  const isLoading = mode === 'schools' ? loadingSchools : loadingClasses
  const resultCount = mode === 'schools' ? filteredSchools.length : filteredClasses.length
  const hasSearch = search || location || discipline !== 'All'

  return (
    <div className="min-h-screen" style={{ background: '#F9FAFB', fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif", color: '#111827' }}>

      {showLogin && (
        <LoginModal onClose={() => setShowLogin(false)} onOpenRegister={() => { setShowLogin(false); setShowRegister(true) }} />
      )}
      {showRegister && (
        <RegisterModal onClose={() => setShowRegister(false)} onOpenLogin={() => { setShowRegister(false); setShowLogin(true) }} />
      )}
      {bookingModal && (
        <ClassBookingModal
          session={bookingModal.session}
          schoolSlug={bookingModal.schoolSlug}
          plans={bookingModal.plans}
          onClose={() => setBookingModal(null)}
        />
      )}
      {quickView && (
        <SchoolQuickView
          school={quickView}
          onClose={() => setQuickView(null)}
          onBookClass={() => openSchoolBooking(quickView)}
        />
      )}

      <Header onOpenLoginModal={() => setShowLogin(true)} />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative bg-[#111827] overflow-hidden">
        <Image src="/hero-2.jpg" alt="" fill className="object-cover opacity-30" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-[#111827]/70 via-[#111827]/60 to-[#111827]/85" />
        <div className="relative z-10 max-w-5xl mx-auto px-4 py-12 md:py-16 text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">Find Your Academy</h1>
          <p className="mt-2 text-sm md:text-lg text-white/75">Discover martial arts schools and classes near you</p>

          {/* Search bar */}
          <div className="mt-7 mx-auto max-w-3xl bg-white rounded-2xl shadow-2xl p-2 flex flex-col md:flex-row gap-2 md:items-center">
            <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#F9FAFB] md:bg-white">
              <Search className="w-5 h-5 shrink-0 text-[#6B7280]" />
              <div className="flex-1 text-left">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">What</label>
                <input
                  suppressHydrationWarning
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="BJJ, MMA, Muay Thai…"
                  className="w-full bg-transparent text-sm font-medium text-[#111827] placeholder-[#9CA3AF] focus:outline-none"
                />
              </div>
            </div>
            <div className="hidden md:block w-px h-9 bg-[#E5E7EB]" />
            <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#F9FAFB] md:bg-white">
              <MapPin className="w-5 h-5 shrink-0" style={{ color: BLUE }} />
              <div className="flex-1 text-left">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Where</label>
                <input
                  suppressHydrationWarning
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="Málaga, Reading, Dubai…"
                  className="w-full bg-transparent text-sm font-medium text-[#111827] placeholder-[#9CA3AF] focus:outline-none"
                />
              </div>
            </div>
            <button
              className="h-12 md:h-auto md:self-stretch px-7 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              style={{ background: BLUE }}
            >
              <Search className="w-4 h-4" />
              Search
            </button>
          </div>
        </div>
      </section>

      {/* ── Filter Bar ───────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-3">
          {/* Disciplines */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
            {DISCIPLINES.map(d => {
              const active = discipline === d
              return (
                <button
                  key={d}
                  onClick={() => setDiscipline(d)}
                  className={`shrink-0 h-9 px-4 rounded-full text-sm font-semibold border transition-all ${
                    active ? 'text-white border-transparent' : 'bg-white text-[#111827] border-[#E5E7EB] hover:border-[#9CA3AF]'
                  }`}
                  style={active ? { background: BLUE } : undefined}
                >
                  {d}
                </button>
              )
            })}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between gap-3">
            {/* Mode toggle */}
            <div className="inline-flex p-1 rounded-full bg-[#F9FAFB] border border-[#E5E7EB]">
              {(['schools', 'classes'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`h-9 px-4 md:px-5 rounded-full text-sm font-semibold transition-all capitalize ${
                    mode === m ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#111827]'
                  }`}
                >
                  {m === 'schools' ? (t?.explore?.schools ?? 'Schools') : (t?.explore?.classes ?? 'Classes')}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#6B7280] hidden sm:block" />
              <div className="relative">
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value as SortKey)}
                  className="h-9 pl-3 pr-8 rounded-full border border-[#E5E7EB] bg-white text-sm font-semibold text-[#111827] appearance-none focus:outline-none focus:border-[#9CA3AF] cursor-pointer"
                >
                  {SORTS.map(s => <option key={s} value={s}>Sort: {s}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-[#6B7280] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Result count + clear */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-[#6B7280]">
            {isLoading ? 'Loading…' : `${resultCount} ${mode === 'schools' ? 'schools' : 'classes'} found`}
          </p>
          {hasSearch && (
            <button
              onClick={() => { setSearch(''); setLocation(''); setDiscipline('All') }}
              className="text-sm font-semibold flex items-center gap-1 hover:underline"
              style={{ color: BLUE }}
            >
              Clear all <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* List */}
        <div className="space-y-4 max-w-3xl">
          {isLoading ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : resultCount === 0 ? (
            <EmptyState mode={mode} />
          ) : mode === 'schools' ? (
            filteredSchools.map(school => (
              <SchoolCard
                key={school.id}
                school={school}
                onClick={() => setQuickView(school)}
              />
            ))
          ) : (
            filteredClasses.map(cls => (
              <ClassCard
                key={cls.id}
                cls={cls}
                onClick={() => openClassBooking(cls)}
              />
            ))
          )}
        </div>

        {/* Coming soon note when few results */}
        {!isLoading && resultCount > 0 && resultCount < 5 && (
          <div className="max-w-3xl mt-6 p-4 bg-[#F0F9FF] border border-[#BAE6FD] rounded-2xl flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-[#006197] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#0369A1]">More schools coming soon</p>
              <p className="text-xs text-[#0369A1]/70 mt-0.5">
                We're onboarding academies every week. <Link href="/explore" className="underline">Get notified</Link> when a school near you joins.
              </p>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
