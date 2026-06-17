'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, MapPin, Dumbbell, ChevronDown } from 'lucide-react'

const DISCIPLINES = ['BJJ', 'Muay Thai', 'Boxing', 'MMA', 'Karate', 'Judo', 'Wrestling', 'Grappling']
const LEVELS      = ['All levels', 'Beginner', 'Kids', 'Intermediate', 'Advanced']
const POPULAR     = ['Brazilian Jiu-Jitsu', 'Muay Thai', 'Boxing', 'MMA', 'Karate', 'Judo', 'Wrestling']

export default function HomeSearch() {
  const router = useRouter()
  const [location,   setLocation]   = useState('')
  const [discipline, setDiscipline] = useState('')
  const [level,      setLevel]      = useState('')

  const search = () => {
    const params = new URLSearchParams()
    if (location)   params.set('location',   location)
    if (discipline) params.set('discipline', discipline)
    if (level && level !== 'All levels') params.set('level', level)
    router.push(`/explore?${params.toString()}`)
  }

  const quickSearch = (tag: string) => {
    router.push(`/explore?discipline=${encodeURIComponent(tag)}`)
  }

  return (
    <section className="relative z-10 -mt-8 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl shadow-slate-900/10 border border-gray-100 p-6 sm:p-8">

          <h2 className="text-xl sm:text-2xl font-extrabold text-[#101828] mb-6 text-center">
            Find martial arts near you
          </h2>

          {/* Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">

            {/* Location */}
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0870E2] pointer-events-none" />
              <input
                type="text"
                placeholder="City or postcode"
                value={location}
                onChange={e => setLocation(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
                className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 text-sm font-medium text-[#101828] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0870E2]/20 focus:border-[#0870E2] transition-all"
              />
            </div>

            {/* Discipline */}
            <div className="relative">
              <Dumbbell className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0870E2] pointer-events-none" />
              <select
                value={discipline}
                onChange={e => setDiscipline(e.target.value)}
                className="w-full h-12 pl-10 pr-8 rounded-xl border border-gray-200 text-sm font-medium text-[#101828] bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#0870E2]/20 focus:border-[#0870E2] transition-all cursor-pointer"
              >
                <option value="">All disciplines</option>
                {DISCIPLINES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Level */}
            <div className="relative">
              <select
                value={level}
                onChange={e => setLevel(e.target.value)}
                className="w-full h-12 px-4 pr-8 rounded-xl border border-gray-200 text-sm font-medium text-[#101828] bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#0870E2]/20 focus:border-[#0870E2] transition-all cursor-pointer"
              >
                <option value="">All levels</option>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Search button */}
          <button
            onClick={search}
            className="w-full h-12 bg-[#0870E2] hover:bg-[#005fd4] text-white font-extrabold text-sm uppercase tracking-wider rounded-xl flex items-center justify-center gap-2.5 transition-all active:scale-[0.99] shadow-lg shadow-[#0870E2]/25 cursor-pointer"
          >
            <Search className="w-4 h-4" />
            Search Schools
          </button>

          {/* Popular tags */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0">Popular:</span>
            {POPULAR.map(tag => (
              <button
                key={tag}
                onClick={() => quickSearch(tag)}
                className="text-xs font-semibold text-[#0870E2] bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
