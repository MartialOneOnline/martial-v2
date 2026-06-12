'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ChevronRight, Star, Tag, MapPin } from 'lucide-react'

// ── Types ───────────────────────────────────────────────────────────────────

type FeaturedPlan = {
  id: string
  name: string
  price: number
  currency: string
  billingCycle: string
  description: string | null
  school: {
    name: string
    city: string
    slug: string
    coverUrl: string | null
    googleRating: number | null
  }
}

// ── Discipline categories ────────────────────────────────────────────────────

const CATEGORIES = [
  { label: 'Jiu Jitsu',  slug: 'BJJ',        icon: '🥋', color: '#1e3a5f' },
  { label: 'Wrestling',  slug: 'Wrestling',   icon: '🤼', color: '#1a1a2e' },
  { label: 'Karate',     slug: 'Karate',      icon: '⚡', color: '#4c1d95' },
  { label: 'MMA',        slug: 'MMA',         icon: '🥊', color: '#7f1d1d' },
  { label: 'Muay Thai',  slug: 'Muay Thai',   icon: '🦶', color: '#14532d' },
  { label: 'Boxing',     slug: 'Boxing',      icon: '👊', color: '#1c1917' },
  { label: 'Grappling',  slug: 'Grappling',   icon: '🤲', color: '#0c4a6e' },
  { label: 'Judo',       slug: 'Judo',        icon: '🟡', color: '#1e1b4b' },
]

const FALLBACK = 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=800&h=500&fit=crop&q=80'

// ── Try Something New ────────────────────────────────────────────────────────

export function TrySomethingNew() {
  const [plan, setPlan] = useState<FeaturedPlan | null>(null)

  useEffect(() => {
    fetch('/api/schools')
      .then(r => r.json())
      .then((schools: any[]) => {
        // Pick first school with a price and cover
        const s = schools.find(x => x.priceFrom && x.coverUrl) ?? schools[0]
        if (!s) return
        setPlan({
          id: s.id,
          name: s.membershipPlans?.[0]?.name ?? 'Starter Membership',
          price: s.priceFrom ?? 65,
          currency: '€',
          billingCycle: 'Monthly',
          description: s.tagline ?? s.description ?? null,
          school: {
            name: s.name,
            city: s.city,
            slug: s.slug,
            coverUrl: s.coverUrl,
            googleRating: s.googleRating,
          },
        })
      })
      .catch(() => {})
  }, [])

  if (!plan) return null

  return (
    <section className="bg-white py-10 sm:py-14 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0D1B2A]">Try Something New</h2>
          <Link href="/explore" className="text-sm font-bold text-[#006197] flex items-center gap-1 hover:underline">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <Link
          href={`/school/${plan.school.slug}`}
          className="group flex flex-col sm:flex-row gap-4 bg-[#F8F9FB] rounded-2xl overflow-hidden border border-gray-100 hover:border-[#006197]/30 hover:shadow-md transition-all"
        >
          {/* Photo */}
          <div className="relative w-full sm:w-56 h-48 sm:h-auto shrink-0 overflow-hidden">
            <Image
              src={plan.school.coverUrl ?? FALLBACK}
              alt={plan.school.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>

          {/* Info */}
          <div className="flex flex-col justify-center px-5 py-5 sm:py-6 flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-[#006197] text-white">
                <Tag className="w-3 h-3" /> Best Deal
              </span>
              {plan.school.googleRating && (
                <span className="flex items-center gap-1 text-xs font-semibold text-gray-500">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {plan.school.googleRating.toFixed(1)}
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-extrabold text-[#006197]">
                {plan.currency}{plan.price}
              </span>
              <span className="text-sm text-gray-400 font-medium">{plan.billingCycle}</span>
            </div>

            <p className="text-base font-bold text-[#0D1B2A] leading-snug mb-1">{plan.name}</p>

            {plan.description && (
              <p className="text-sm text-gray-400 line-clamp-2 mb-3">{plan.description}</p>
            )}

            <p className="flex items-center gap-1 text-xs text-gray-400">
              <MapPin className="w-3 h-3 text-[#006197] shrink-0" />
              {plan.school.name} · {plan.school.city}
            </p>
          </div>

          {/* CTA arrow */}
          <div className="hidden sm:flex items-center pr-6">
            <div className="w-10 h-10 rounded-full bg-[#006197]/8 flex items-center justify-center group-hover:bg-[#006197] transition-colors">
              <ArrowRight className="w-5 h-5 text-[#006197] group-hover:text-white transition-colors" />
            </div>
          </div>
        </Link>
      </div>
    </section>
  )
}

// ── Explore Categories ───────────────────────────────────────────────────────

export function ExploreCategories() {
  return (
    <section className="bg-white py-10 sm:py-12 border-t border-gray-100">
      <div className="max-w-7xl mx-auto">

        <div className="flex items-center justify-between mb-5 px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0D1B2A]">Explore Categories</h2>
          <Link href="/explore" className="text-sm font-bold text-[#006197] flex items-center gap-1 hover:underline shrink-0">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Horizontal scroll — full bleed on mobile, padded on desktop */}
        <div className="flex gap-3 overflow-x-auto px-4 sm:px-6 lg:px-8 pb-2 scrollbar-hide snap-x snap-mandatory">
          {CATEGORIES.map(cat => (
            <Link
              key={cat.slug}
              href={`/explore?discipline=${encodeURIComponent(cat.slug)}`}
              className="group flex items-center gap-2.5 shrink-0 snap-start px-4 py-3 rounded-full text-white font-semibold text-sm transition-all hover:opacity-90 hover:scale-[1.03] active:scale-95"
              style={{ background: cat.color }}
            >
              <span className="text-base leading-none">{cat.icon}</span>
              <span className="leading-none">{cat.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
