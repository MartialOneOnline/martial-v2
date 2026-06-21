'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import {
  Search, MapPin, Star, Filter, X, ChevronLeft, ChevronRight,
  ArrowRight, Sparkles, Dumbbell, Calendar, ChevronDown, List, Map,
  Navigation,
} from 'lucide-react'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import LoginModal from '../../components/LoginModal'
import RegisterModal from '../../components/RegisterModal'
import { useT } from '../../lib/i18n/LanguageContext'
import ClassBookingModal from '../school/[slug]/ClassBookingModal'

// Leaflet map — dynamic import (no SSR, needs browser APIs)
const ExploreMap = dynamic(() => import('../../components/ExploreMap'), { ssr: false, loading: () => (
  <div className="w-full rounded-2xl bg-[#F3F4F6] animate-pulse" style={{ height: 520 }} />
) })

// ── Theme ─────────────────────────────────────────────────────────────────────
const BLUE = '#0870E2'

// ── Types ─────────────────────────────────────────────────────────────────────

type Plan = { id: string; name: string; price: number; currency: string; billingCycle: string; isPopular: boolean }

type DbSchool = {
  id: string
  slug: string
  name: string
  city: string
  country: string
  address: string | null
  lat: number | null
  lng: number | null
  coverUrl: string | null
  logoUrl: string | null
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
  schedule: ScheduleEntry[] | null
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

// ── City coords fallback (used until geocoding populates lat/lng in DB) ───────
const CITY_COORDS: Record<string, [number, number]> = {
  // Spain
  'Madrid': [40.42, -3.70], 'Barcelona': [41.39, 2.15], 'Valencia': [39.47, -0.38],
  'Sevilla': [37.39, -5.99], 'Málaga': [36.72, -4.42], 'Malaga': [36.72, -4.42],
  'Zaragoza': [41.65, -0.89], 'Murcia': [37.98, -1.13], 'Palma': [39.57, 2.65],
  'Alicante': [38.35, -0.49], 'Bilbao': [43.26, -2.93], 'Córdoba': [37.89, -4.78],
  'Valladolid': [41.65, -4.72], 'Vitoria': [42.85, -2.67], 'Granada': [37.18, -3.60],
  // UK
  'London': [51.51, -0.13], 'Manchester': [53.48, -2.24], 'Birmingham': [52.49, -1.90],
  'Glasgow': [55.86, -4.25], 'Liverpool': [53.41, -2.98], 'Leeds': [53.80, -1.55],
  'Edinburgh': [55.95, -3.19], 'Bristol': [51.45, -2.59], 'Sheffield': [53.38, -1.47],
  'Reading': [51.46, -0.97], 'Coventry': [52.41, -1.51], 'Leicester': [52.64, -1.13],
  'Nottingham': [52.95, -1.14], 'Newcastle': [54.98, -1.61], 'Brighton': [50.83, -0.14],
  'Cardiff': [51.48, -3.18], 'Barnet': [51.65, -0.19], 'Bedford': [52.14, -0.47],
  'Bolton': [53.58, -2.43], 'Salford': [53.49, -2.28], 'Preston': [53.76, -2.70],
  'Chester': [53.19, -2.89], 'Taunton': [51.02, -3.10], 'Darlington': [54.52, -1.55],
  'Watford': [51.66, -0.40],
  // France
  'Paris': [48.85, 2.35], 'Lyon': [45.75, 4.83], 'Marseille': [43.30, 5.37],
  'Toulouse': [43.60, 1.44], 'Nice': [43.71, 7.26], 'Bordeaux': [44.84, -0.58],
  'Nantes': [47.22, -1.55], 'Strasbourg': [48.57, 7.75], 'Rennes': [48.11, -1.68],
  // Germany
  'Berlin': [52.52, 13.40], 'Hamburg': [53.55, 9.99], 'Munich': [48.14, 11.58],
  'Cologne': [50.94, 6.96], 'Frankfurt': [50.11, 8.68], 'Stuttgart': [48.78, 9.18],
  'Düsseldorf': [51.22, 6.77], 'Dortmund': [51.51, 7.47], 'Nuremberg': [49.45, 11.08],
  // Italy
  'Rome': [41.90, 12.50], 'Milan': [45.46, 9.19], 'Naples': [40.85, 14.27],
  'Turin': [45.07, 7.69], 'Palermo': [38.11, 13.35], 'Bologna': [44.50, 11.34],
  'Florence': [43.77, 11.25], 'Venice': [45.44, 12.32], 'Catania': [37.50, 15.09],
  // Portugal
  'Lisbon': [38.72, -9.14], 'Porto': [41.15, -8.61], 'Braga': [41.55, -8.43],
  // Netherlands
  'Amsterdam': [52.37, 4.90], 'Rotterdam': [51.92, 4.48], 'The Hague': [52.08, 4.31],
  // Belgium
  'Brussels': [50.85, 4.35], 'Antwerp': [51.22, 4.40], 'Ghent': [51.05, 3.72],
  // Sweden
  'Stockholm': [59.33, 18.07], 'Gothenburg': [57.71, 11.97], 'Malmö': [55.61, 13.00],
  // Poland
  'Warsaw': [52.23, 21.01], 'Krakow': [50.06, 19.94], 'Wroclaw': [51.11, 17.04],
  // Greece
  'Athens': [37.98, 23.73], 'Thessaloniki': [40.63, 22.95],
  // Ireland
  'Dublin': [53.33, -6.25], 'Cork': [51.90, -8.47],
  // Austria
  'Vienna': [48.21, 16.37], 'Graz': [47.07, 15.44], 'Linz': [48.31, 14.29],
  // Switzerland
  'Zurich': [47.38, 8.54], 'Geneva': [46.20, 6.14], 'Bern': [46.95, 7.44],
  // Croatia
  'Zagreb': [45.81, 15.98], 'Split': [43.51, 16.44],
  // Other
  'Istanbul': [41.01, 28.95], 'Oslo': [59.91, 10.75], 'Copenhagen': [55.68, 12.57],
  'Helsinki': [60.17, 24.94], 'Kiev': [50.45, 30.52], 'Kyiv': [50.45, 30.52],
  'Dubai': [25.20, 55.27], 'Baku': [40.41, 49.87],
}

function getCityCoords(city: string | null): [number, number] | null {
  if (!city) return null
  // Try exact match first, then partial
  const exact = CITY_COORDS[city]
  if (exact) return exact
  const lower = city.toLowerCase()
  for (const [k, v] of Object.entries(CITY_COORDS)) {
    if (lower.includes(k.toLowerCase()) || k.toLowerCase().includes(lower)) return v
  }
  return null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DISCIPLINES = ['All', 'BJJ', 'Grappling', 'MMA', 'Muay Thai', 'Wrestling', 'Judo', 'Karate', 'Boxing']
const SORTS = ['Nearest', 'Rating', 'Price', 'Name'] as const
type SortKey = typeof SORTS[number]

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const LEVEL_STYLES: Record<string, string> = {
  'Beginner':    'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Advanced':    'bg-rose-50 text-rose-700 border-rose-200',
  'Intermediate':'bg-amber-50 text-amber-700 border-amber-200',
  'All levels':  'bg-blue-50 text-blue-700 border-blue-200',
}

const FALLBACK_COVER = null

// ── Helpers ───────────────────────────────────────────────────────────────────

function getNextSlot(schedule: ScheduleEntry[] | null): string | null {
  if (!schedule?.length) return null
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
    <div className="rounded-3xl overflow-hidden animate-pulse bg-[#E5E7EB] h-60" />
  )
}

// ── School Card (Airbnb-style: photo + white info panel) ─────────────────────

function SchoolCard({ school, onClick }: { school: DbSchool; onClick: () => void }) {
  const disciplines = school.disciplines.map(d => d.discipline.name)
  const initials = school.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const [imgError, setImgError] = useState(false)

  // Deterministic gradient per school (based on name)
  const gradients = [
    'from-[#0E3A7A] to-[#0870E2]',
    'from-[#1a1a2e] to-[#16213e]',
    'from-[#0f4c75] to-[#1b262c]',
    'from-[#2d3561] to-[#c05c7e]',
    'from-[#373b44] to-[#4286f4]',
    'from-[#0f2027] to-[#203a43]',
  ]
  const gradientIdx = school.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % gradients.length
  const gradient = gradients[gradientIdx]
  const showGradient = !school.coverUrl || imgError

  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-lg transition-all duration-300 border border-[#E5E7EB]"
    >
      {/* Photo */}
      <div className={`relative w-full h-48 overflow-hidden ${showGradient ? `bg-gradient-to-br ${gradient}` : 'bg-[#E5E7EB]'}`}>
        {school.coverUrl && !imgError && (
          <Image src={school.coverUrl} alt={school.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" onError={() => setImgError(true)} />
        )}
        {showGradient && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-20">
            <Dumbbell className="w-16 h-16 text-white" />
          </div>
        )}

        {/* Rating badge top-right */}
        {school.googleRating && (
          <span className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs font-bold text-[#111827] shadow-sm">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            {school.googleRating.toFixed(1)}
          </span>
        )}

        {/* Free trial badge top-left */}
        {school.hasFreeTrialCls && (
          <span className="absolute top-3 left-3 text-[10px] font-bold bg-emerald-500 text-white px-2.5 py-1 rounded-full uppercase tracking-wide shadow-sm">
            Free Trial
          </span>
        )}

        {/* School logo bottom-left */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-0 translate-y-1/2 flex items-end">
          <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white shadow-md bg-white shrink-0">
            {school.logoUrl ? (
              <Image src={school.logoUrl} alt="" width={48} height={48} className="object-cover w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white" style={{ background: BLUE }}>
                {initials}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info panel */}
      <div className="px-4 pt-8 pb-4">
        {/* Disciplines */}
        <div className="flex flex-wrap gap-1 mb-2">
          {disciplines.slice(0, 3).map(d => (
            <span key={d} className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280]">
              {d}
            </span>
          ))}
          {disciplines.length > 3 && (
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280]">
              +{disciplines.length - 3}
            </span>
          )}
        </div>

        <h3 className="font-bold text-[#111827] text-sm leading-tight line-clamp-1 mb-1">{school.name}</h3>

        <p className="flex items-center gap-1 text-xs text-[#6B7280] mb-2">
          <MapPin className="w-3 h-3 shrink-0 text-[#9CA3AF]" />
          {school.city}, {school.country}
        </p>

        {school.description && (
          <p className="text-xs text-[#6B7280] leading-relaxed line-clamp-2 mb-3">{school.description}</p>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-[#111827]">
            {school.priceFrom ? (
              <><span className="font-normal text-[#6B7280] text-xs">from </span>€{school.priceFrom}<span className="font-normal text-[#6B7280] text-xs">/mo</span></>
            ) : (
              <span className="text-xs font-medium text-[#6B7280]">Contact for pricing</span>
            )}
          </span>
          <span className="text-xs font-semibold text-[#0870E2] flex items-center gap-0.5">
            View <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </button>
  )
}

// ── Class Card (full-bleed photo) ─────────────────────────────────────────────

function ClassCard({ cls, onClick }: { cls: DbClass; onClick: () => void }) {
  const nextSlot = getNextSlot(cls.schedule)
  const hasCover = !!cls.school.coverUrl

  return (
    <button
      onClick={onClick}
      className={`group relative w-full text-left rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 h-56 ${!hasCover ? 'bg-gradient-to-br from-[#0E3A7A] to-[#0870E2]' : ''}`}
    >
      {hasCover && <Image src={cls.school.coverUrl!} alt={cls.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />

      {/* Top */}
      <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
        <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-black/30 backdrop-blur-sm text-white border border-white/15`}>
          {cls.level ?? 'All levels'}
        </span>
        {cls.duration && (
          <span className="text-[10px] font-semibold bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-1 text-white/90">
            {cls.duration} min
          </span>
        )}
      </div>

      {cls.school.hasFreeTrialCls && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2">
          <span className="text-[10px] font-bold bg-emerald-500 text-white px-2.5 py-1 rounded-full uppercase tracking-wide">
            Free Trial
          </span>
        </div>
      )}

      {/* Bottom */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
        <h3 className="text-white font-bold text-base leading-tight mb-1">{cls.name}</h3>
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1 text-white/75 text-xs">
            <MapPin className="w-3 h-3 shrink-0" />
            {cls.school.name} · {cls.school.city}
          </p>
          {nextSlot && (
            <span className="flex items-center gap-1 text-xs font-semibold text-white/90 bg-[#0870E2]/70 backdrop-blur-sm rounded-full px-2.5 py-1">
              <Calendar className="w-3 h-3" />
              {nextSlot}
            </span>
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
  const imgs = school.coverUrl ? [school.coverUrl] : []
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
        <div className="relative w-full h-52 md:h-64 bg-gradient-to-br from-[#0E3A7A] to-[#0870E2] overflow-hidden md:rounded-t-3xl">
          {imgs[idx] && <Image src={imgs[idx]} alt={school.name} fill className="object-cover" />}
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
  const [view, setView]               = useState<'list' | 'map'>('list')
  const [search, setSearch]           = useState('')
  const [location, setLocation]       = useState('')
  const [discipline, setDiscipline]   = useState('All')
  const [sort, setSort]               = useState<SortKey>('Nearest')
  const [quickView, setQuickView]     = useState<DbSchool | null>(null)
  const [showLogin, setShowLogin]     = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [userCoords, setUserCoords]   = useState<{ lat: number; lng: number } | null>(null)
  const [userCountry, setUserCountry] = useState<string | null>(null)
  const [geoLoading, setGeoLoading]   = useState(false)

  // Auto-detect location on load: IP geolocation first (silent), then browser GPS if available
  useEffect(() => {
    // 1. IP-based geolocation — no permission needed, fast
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then((data: any) => {
        if (data.latitude && data.longitude) {
          setUserCoords({ lat: data.latitude, lng: data.longitude })
        }
        if (data.country_code) {
          setUserCountry(data.country_code) // e.g. "ES", "GB", "FR"
        }
      })
      .catch(() => {})

    // 2. Browser GPS upgrade (more precise) — runs in parallel, overwrites if user grants
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}, // silently ignore if denied
        { timeout: 6000 }
      )
    }
  }, [])

  const requestGeo = useCallback(() => {
    if (geoLoading) return
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => { setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setSort('Nearest'); setGeoLoading(false) },
      () => setGeoLoading(false),
      { timeout: 8000 }
    )
  }, [geoLoading])

  // Booking modal — for classes tab + quick view CTA
  const [bookingModal, setBookingModal] = useState<{
    session: { classId: string; className: string; level: string; startTime: string; endTime: string; dayLabel: string; dayOfWeek: number; schedule: { dayOfWeek: number; startTime: string; endTime: string }[] }
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

  // Haversine distance helper
  function distKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

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
        if (sort === 'Nearest' && !userCoords) {
          if (userCountry) {
            const inA = a.country === userCountry
            const inB = b.country === userCountry
            if (inA !== inB) return inA ? -1 : 1
          }
          return (b.googleRating ?? 0) - (a.googleRating ?? 0)
        }
        if (sort === 'Nearest' && userCoords) {
          const coordsA = (a.lat && a.lng) ? [a.lat, a.lng] as [number,number] : getCityCoords(a.city)
          const coordsB = (b.lat && b.lng) ? [b.lat, b.lng] as [number,number] : getCityCoords(b.city)
          // If one has coords and the other doesn't, check country as tiebreaker
          const inCountryA = userCountry ? a.country === userCountry : false
          const inCountryB = userCountry ? b.country === userCountry : false
          if (!coordsA && !coordsB) {
            if (inCountryA !== inCountryB) return inCountryA ? -1 : 1
            return (b.googleRating ?? 0) - (a.googleRating ?? 0)
          }
          const dA = coordsA ? distKm(userCoords.lat, userCoords.lng, coordsA[0], coordsA[1]) : (inCountryA ? 500 : 99999)
          const dB = coordsB ? distKm(userCoords.lat, userCoords.lng, coordsB[0], coordsB[1]) : (inCountryB ? 500 : 99999)
          if (Math.abs(dA - dB) < 30) return (b.googleRating ?? 0) - (a.googleRating ?? 0)
          return dA - dB
        }
        if (sort === 'Rating') return (b.googleRating ?? 0) - (a.googleRating ?? 0)
        if (sort === 'Price') return (a.priceFrom ?? 9999) - (b.priceFrom ?? 9999)
        // Name / fallback: alphabetical
        return a.name.localeCompare(b.name)
      })
  }, [schools, search, location, discipline, sort, userCoords, userCountry])

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
    const next = cls.schedule?.[0]
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
        dayOfWeek: next.dayOfWeek,
        schedule: cls.schedule ?? [],
      },
      schoolSlug: cls.school.slug,
      plans: cls.school.membershipPlans,
    })
  }

  // Open booking modal for a school (picks first class with schedule)
  function openSchoolBooking(school: DbSchool) {
    const cls = classes.find(c => c.school.slug === school.slug && (c.schedule?.length ?? 0) > 0)
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
        <Image src="/explore-hero.jpg" alt="" fill className="object-cover" priority style={{ objectPosition: 'center center' }} />
        <div className="absolute inset-0 bg-[#111827]/30" />
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
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
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

              {/* List / Map view toggle */}
              <div className="inline-flex p-1 rounded-full bg-[#F9FAFB] border border-[#E5E7EB]">
                <button
                  onClick={() => setView('list')}
                  className={`h-9 px-3 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5 ${view === 'list' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#111827]'}`}
                >
                  <List className="w-4 h-4" /> <span className="hidden sm:inline">List</span>
                </button>
                <button
                  onClick={() => setView('map')}
                  className={`h-9 px-3 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5 ${view === 'map' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#111827]'}`}
                >
                  <Map className="w-4 h-4" /> <span className="hidden sm:inline">Map</span>
                </button>
              </div>

              {/* Near me */}
              <button
                onClick={requestGeo}
                className={`h-9 px-3 rounded-full border text-sm font-semibold flex items-center gap-1.5 transition-all ${
                  userCoords ? 'border-[#0870E2] text-[#0870E2] bg-[#EFF6FF]' : 'border-[#E5E7EB] text-[#6B7280] bg-white hover:border-[#9CA3AF]'
                }`}
              >
                <Navigation className={`w-3.5 h-3.5 ${geoLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{userCoords ? 'Near me ✓' : 'Near me'}</span>
              </button>
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

        {/* Map view */}
        {view === 'map' && mode === 'schools' && (
          <div className="mb-6">
            <ExploreMap
              schools={filteredSchools}
              userCoords={userCoords}
              onSchoolClick={s => setQuickView(s as any)}
            />
          </div>
        )}

        {/* List */}
        {view === 'list' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              <>
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </>
            ) : resultCount === 0 ? (
              <div className="col-span-full">
                <EmptyState mode={mode} />
              </div>
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
        )}

        {/* Map + list side by side on wide screens when map active */}
        {view === 'map' && mode === 'schools' && !isLoading && filteredSchools.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <p className="col-span-full text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Schools on map</p>
            {filteredSchools.filter(s => s.lat && s.lng).slice(0, 10).map(school => (
              <SchoolCard
                key={school.id}
                school={school}
                onClick={() => setQuickView(school)}
              />
            ))}
          </div>
        )}

        {/* Coming soon note when few results */}
        {!isLoading && resultCount > 0 && resultCount < 5 && (
          <div className="mt-6 p-4 bg-[#F0F9FF] border border-[#BAE6FD] rounded-2xl flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-[#0870E2] mt-0.5 shrink-0" />
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
