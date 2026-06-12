'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Star, ArrowRight, ChevronRight } from 'lucide-react'

type School = {
  id: string
  slug: string
  name: string
  city: string
  country: string
  coverUrl: string | null
  googleRating: number | null
  hasFreeTrialCls: boolean
  priceFrom: number | null
  disciplines: { discipline: { name: string } }[]
}

const DISCIPLINES = [
  { label: 'All',        emoji: '🥋' },
  { label: 'BJJ',        emoji: '🟦' },
  { label: 'MMA',        emoji: '🥊' },
  { label: 'Muay Thai',  emoji: '🦶' },
  { label: 'Wrestling',  emoji: '🤼' },
  { label: 'Grappling',  emoji: '🤲' },
  { label: 'Boxing',     emoji: '🥊' },
  { label: 'Judo',       emoji: '🟡' },
  { label: 'Karate',     emoji: '⚡' },
]

const FALLBACK = 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=800&h=500&fit=crop&q=80'

function SchoolCard({ school }: { school: School }) {
  const disciplines = school.disciplines.map(d => d.discipline.name)
  return (
    <Link href={`/school/${school.slug}`} className="group relative block rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 h-60">
      <Image
        src={school.coverUrl ?? FALLBACK}
        alt={school.name}
        fill
        className="object-cover group-hover:scale-105 transition-transform duration-500"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />

      {/* Top badges */}
      <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
        <div className="flex flex-wrap gap-1.5">
          {disciplines.slice(0, 2).map(d => (
            <span key={d} className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-black/30 backdrop-blur-sm text-white border border-white/10">
              {d}
            </span>
          ))}
        </div>
        {school.googleRating && (
          <span className="flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs font-bold text-white">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            {school.googleRating.toFixed(1)}
          </span>
        )}
      </div>

      {school.hasFreeTrialCls && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2">
          <span className="text-[10px] font-bold bg-emerald-500 text-white px-2.5 py-1 rounded-full uppercase tracking-wide whitespace-nowrap">
            Free Trial
          </span>
        </div>
      )}

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
        <p className="text-white font-bold text-base leading-tight line-clamp-1 mb-1">{school.name}</p>
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1 text-white/70 text-xs">
            <MapPin className="w-3 h-3 shrink-0" />
            {school.city}, {school.country}
          </p>
          <span className="text-xs font-semibold text-white/80">
            {school.priceFrom ? `from €${school.priceFrom}/mo` : ''}
          </span>
        </div>
      </div>
    </Link>
  )
}

function CardSkeleton() {
  return <div className="rounded-3xl bg-gray-100 animate-pulse h-60" />
}

export default function HomeDiscovery() {
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [discipline, setDiscipline] = useState('All')

  useEffect(() => {
    fetch('/api/schools')
      .then(r => r.json())
      .then(d => { setSchools(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = discipline === 'All'
    ? schools
    : schools.filter(s =>
        s.disciplines.some(d => d.discipline.name.toLowerCase().includes(discipline.toLowerCase()))
      )

  const display = filtered.slice(0, 6)

  return (
    <section className="bg-[#F8F9FB] py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#006197] mb-1.5">Find Your Academy</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0D1B2A] leading-tight">
              Academies Near You
            </h2>
          </div>
          <Link
            href="/explore"
            className="hidden sm:flex items-center gap-1.5 text-sm font-bold text-[#006197] hover:underline"
          >
            See all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Discipline chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1 pb-4">
          {DISCIPLINES.map(d => {
            const active = discipline === d.label
            return (
              <button
                key={d.label}
                onClick={() => setDiscipline(d.label)}
                className={`shrink-0 flex items-center gap-1.5 h-9 px-4 rounded-full text-sm font-semibold border transition-all ${
                  active
                    ? 'bg-[#006197] text-white border-transparent shadow-sm shadow-[#006197]/25'
                    : 'bg-white text-[#0D1B2A] border-gray-200 hover:border-[#006197]/40'
                }`}
              >
                <span>{d.emoji}</span>
                {d.label}
              </button>
            )
          })}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
          {loading ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : display.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-400 text-sm">
              No academies found for this discipline.
            </div>
          ) : (
            display.map(s => <SchoolCard key={s.id} school={s} />)
          )}
        </div>

        {/* Mobile CTA */}
        <div className="mt-6 sm:hidden text-center">
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#006197] text-white text-sm font-bold hover:bg-[#005580] transition-colors"
          >
            Explore all academies <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
