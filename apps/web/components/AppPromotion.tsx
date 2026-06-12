'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Search, Bell, Map, ListFilter, Star, Grid } from 'lucide-react'

const BULLETS = [
  'Track student progress to see who is up for stripe promotion.',
  "Find students who haven't come to train recently.",
  'Set class schedules and events.',
  'Organize teams for tournaments.',
  'Resolve any billing issues.',
  'Bill membership fees.',
]

const CLUBS = [
  { name: 'Apex Combat London',    arts: 'Jiu-Jitsu / Boxing',  distance: '1.2 miles away', rating: '4.8' },
  { name: 'Red Dragon Kickboxing', arts: 'Muay Thai / TKD',     distance: '2.4 miles away', rating: '4.7' },
  { name: 'Satori Arts Centre',    arts: 'Aikido / Karate',     distance: '3.1 miles away', rating: '4.9' },
]

const CATEGORIES = ['All', 'Jiu-Jitsu', 'Karate', 'Boxing', 'Muay Thai']

export default function AppPromotion() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')

  const filtered = CLUBS.filter(c => {
    const match = c.name.toLowerCase().includes(search.toLowerCase()) || c.arts.toLowerCase().includes(search.toLowerCase())
    if (activeCategory === 'All') return match
    return match && c.arts.toLowerCase().includes(activeCategory.toLowerCase())
  })

  return (
    <section className="bg-white py-20 sm:py-28 border-t border-gray-100" id="app-promo">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">

          {/* Left — text + bullets */}
          <div className="lg:col-span-6 space-y-8">
            <div>
              <span className="text-xs font-black text-[#0092ff] uppercase tracking-widest block mb-2">
                Sync Your Operations Anywhere
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
                An All-in-one App <br />
                <span className="text-sky-500">For Academy Owners</span>
              </h2>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed font-semibold">
              Martial App empowers academy owners with a simple user experience that frees up time for them to teach, retain current memberships, and find new students. Your pocket administrator is always synced with our real-time cloud database.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {BULLETS.map((b, i) => (
                <div key={i} className="flex gap-3 items-start group">
                  <CheckCircle2 className="w-5 h-5 text-sky-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <p className="text-slate-600 text-xs font-bold leading-relaxed">{b}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — iPhone 17 mockup */}
          <div className="lg:col-span-6 flex justify-center">
            {/* iPhone 17 — titanium frame, thin bezels, Dynamic Island */}
            <div className="relative w-[300px] h-[620px] rounded-[52px] shadow-2xl"
              style={{ background: 'linear-gradient(145deg, #d4d4d4 0%, #a8a8a8 40%, #c8c8c8 100%)', padding: '3px' }}>
              {/* Outer frame highlight */}
              <div className="absolute inset-0 rounded-[52px] pointer-events-none"
                style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6), inset 0 -1px 1px rgba(0,0,0,0.2)' }} />
              {/* Side buttons */}
              <div className="absolute -left-[3px] top-[120px] w-[3px] h-8 bg-[#b0b0b0] rounded-l-sm" />
              <div className="absolute -left-[3px] top-[165px] w-[3px] h-12 bg-[#b0b0b0] rounded-l-sm" />
              <div className="absolute -left-[3px] top-[225px] w-[3px] h-12 bg-[#b0b0b0] rounded-l-sm" />
              <div className="absolute -right-[3px] top-[165px] w-[3px] h-16 bg-[#b0b0b0] rounded-r-sm" />

              {/* Inner screen */}
              <div className="w-full h-full bg-white rounded-[50px] overflow-hidden flex flex-col">
                {/* Status bar */}
                <div className="flex items-center justify-between px-6 pt-3 pb-1 bg-white">
                  <span className="text-[10px] font-bold text-gray-800 font-mono">9:41</span>
                  {/* Dynamic Island */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-800 border border-gray-700" />
                    <span className="w-1 h-1 rounded-full bg-gray-700" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-800">●●●●</span>
                    <span className="text-[10px] text-gray-800">WiFi</span>
                    <span className="text-[10px] font-bold text-gray-800">100%</span>
                  </div>
                </div>

                {/* App content — white background */}
                <div className="flex-1 bg-white flex flex-col px-4 pt-2 pb-3 overflow-hidden">
                  {/* App header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-lg bg-[#006197] flex items-center justify-center font-black text-[10px] text-white">M</div>
                      <span className="text-[11px] font-extrabold tracking-wider text-gray-900">MARTIAL</span>
                    </div>
                    <Bell className="w-4 h-4 text-gray-400" />
                  </div>

                  {/* Search */}
                  <div className="relative mb-3">
                    <Search className="absolute left-2.5 top-2 w-3 h-3 text-gray-400" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search academies..."
                      className="w-full bg-gray-100 border border-gray-200 rounded-xl pl-8 pr-3 py-1.5 text-[10px] focus:outline-none focus:border-[#006197] text-gray-700 placeholder-gray-400" />
                  </div>

                  {/* Category chips */}
                  <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-hide">
                    {CATEGORIES.map(cat => (
                      <button key={cat} onClick={() => setActiveCategory(cat)}
                        className={`px-2.5 py-1 text-[8px] font-black rounded-full whitespace-nowrap cursor-pointer transition-all ${activeCategory === cat ? 'bg-[#006197] text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700'}`}>
                        {cat}
                      </button>
                    ))}
                  </div>

                  <p className="text-[9px] font-extrabold text-gray-400 mb-2 uppercase tracking-wider">Explore Near You</p>

                  {/* Club list */}
                  <div className="space-y-2 overflow-y-auto flex-1">
                    <AnimatePresence mode="popLayout">
                      {filtered.length > 0 ? filtered.map(club => (
                        <motion.div key={club.name} layout initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 5 }} transition={{ duration: 0.15 }}
                          className="p-2.5 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-black text-gray-800 leading-tight">{club.name}</p>
                            <span className="text-[8px] text-gray-400 mt-0.5 block">{club.arts}</span>
                            <span className="text-[7.5px] text-[#006197] font-semibold block mt-0.5">{club.distance}</span>
                          </div>
                          <div className="flex items-center gap-0.5 bg-white border border-gray-200 px-1.5 py-0.5 rounded-lg shrink-0 shadow-sm">
                            <Star className="w-2 h-2 text-amber-400 fill-amber-400" />
                            <span className="text-[8px] font-black text-gray-700">{club.rating}</span>
                          </div>
                        </motion.div>
                      )) : (
                        <p className="text-[9px] text-gray-400 py-6 text-center font-semibold">No active dojos match.</p>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Bottom tab bar */}
                  <div className="mt-2 border-t border-gray-100 pt-2 flex justify-around text-gray-400 text-[8px] font-black">
                    <div className="flex flex-col items-center gap-0.5 text-[#006197] cursor-pointer"><Grid className="w-4 h-4" /><span>Home</span></div>
                    <div className="flex flex-col items-center gap-0.5 hover:text-gray-600 cursor-pointer"><Map className="w-4 h-4" /><span>Map</span></div>
                    <div className="flex flex-col items-center gap-0.5 hover:text-gray-600 cursor-pointer"><ListFilter className="w-4 h-4" /><span>Filter</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
