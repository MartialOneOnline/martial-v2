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

          {/* Right — phone mockup */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="relative w-[300px] h-[580px] bg-slate-950 rounded-[40px] border-[8px] border-slate-900 shadow-2xl p-3 flex flex-col overflow-hidden">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-5 bg-slate-950 rounded-b-xl z-20 flex justify-center gap-1.5 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                <span className="w-10 h-1 bg-slate-900 rounded-full" />
                <span className="text-[7.5px] font-bold text-slate-500 font-mono">12:00</span>
              </div>
              <div className="h-6 flex items-center justify-between text-[8px] text-slate-400 px-3 z-10 font-bold font-mono pt-1">
                <span>Signal ••••</span><span>Martial App</span>
              </div>
              <div className="flex-1 bg-slate-900 rounded-[30px] overflow-hidden flex flex-col p-3 relative text-white">
                <div className="flex items-center justify-between pb-3 mt-1 pt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-md bg-[#0092ff] flex items-center justify-center font-black text-[9px] text-white">M</div>
                    <span className="text-[10px] font-extrabold tracking-wider text-slate-200">MARTIAL</span>
                  </div>
                  <Bell className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-2 w-3 h-3 text-slate-500" />
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search academies..."
                    className="w-full bg-slate-800/80 border border-slate-700/50 rounded-lg pl-8 pr-3 py-1 text-[10px] focus:outline-none focus:border-[#0092ff] text-white placeholder-slate-500" />
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3">
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setActiveCategory(cat)}
                      className={`px-2.5 py-1 text-[8px] font-black rounded-full whitespace-nowrap cursor-pointer transition-all ${activeCategory === cat ? 'bg-[#0092ff] text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] font-extrabold text-slate-400 mb-2 uppercase tracking-wider">Explore Near You</p>
                <div className="space-y-1.5 overflow-y-auto max-h-[220px] flex-1">
                  <AnimatePresence mode="popLayout">
                    {filtered.length > 0 ? filtered.map(club => (
                      <motion.div key={club.name} layout initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 5 }} transition={{ duration: 0.15 }}
                        className="p-2 bg-slate-800/50 border border-slate-700/60 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black text-slate-200 leading-tight">{club.name}</p>
                          <span className="text-[8px] text-slate-400 mt-0.5 block">{club.arts}</span>
                          <span className="text-[7.5px] text-[#0092ff] font-medium block mt-0.5">{club.distance}</span>
                        </div>
                        <div className="flex items-center gap-0.5 bg-slate-900 px-1.5 py-0.5 rounded-md shrink-0">
                          <Star className="w-2 h-2 text-amber-400 fill-amber-400" />
                          <span className="text-[8px] font-black">{club.rating}</span>
                        </div>
                      </motion.div>
                    )) : (
                      <p className="text-[9px] text-slate-500 py-6 text-center font-semibold">No active dojos match.</p>
                    )}
                  </AnimatePresence>
                </div>
                <div className="mt-auto border-t border-slate-800 pt-2 flex justify-around text-slate-500 text-[8px] font-black">
                  <div className="flex flex-col items-center gap-0.5 text-[#0092ff] cursor-pointer"><Grid className="w-3.5 h-3.5" /><span>Home</span></div>
                  <div className="flex flex-col items-center gap-0.5 hover:text-slate-200 cursor-pointer"><Map className="w-3.5 h-3.5" /><span>Map</span></div>
                  <div className="flex flex-col items-center gap-0.5 hover:text-slate-200 cursor-pointer"><ListFilter className="w-3.5 h-3.5" /><span>Filter</span></div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
