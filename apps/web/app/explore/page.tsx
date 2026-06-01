'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { AnimatePresence } from 'framer-motion'
import {
  Search, MapPin, Star, ListFilter, Compass, Sparkles,
  Building2, Eye, Clock,
} from 'lucide-react'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import LoginModal from '../../components/LoginModal'
import RegisterModal from '../../components/RegisterModal'

// ── Data ─────────────────────────────────────────────────────────────────────

interface Academy {
  id: string
  name: string
  location: string
  coordinates: { x: number; y: number }
  rating: number
  tags: string[]
  description: string
  image: string
}

interface ExploreClass {
  id: string
  className: string
  schoolId: string
  schoolName: string
  discipline: string
  level: string
  instructor: string
  time: string
  days: string
  location: string
  coordinates: { x: number; y: number }
  image: string
  rating: number
}

const ACADEMIES: Academy[] = [
  { id: 'roger-gracie-malaga', name: 'Roger Gracie Malaga', location: 'Calle Polifemo, 3, Málaga, España', coordinates: { x: 44.5, y: 76.5 }, rating: 4.9, tags: ['JIU JITSU', 'GRAPPLING'], description: 'Roger Gracie Malaga es una escuela de Jiu Jitsu situada en Málaga. Ofrecemos clases para todos los niveles. Filial de la prestigiosa Roger Gracie Academy.', image: '/roger-gracie-malaga.jpg' },
  { id: 'rafael-pousada', name: 'Rafael Pousada Jiu Jitsu', location: 'Calle Esla 13, 11405, Jerez de la Frontera, España', coordinates: { x: 40.2, y: 77.8 }, rating: 4.8, tags: ['MMA', 'JUDO', 'GRAPPLING'], description: 'Equipo de Jiu Jitsu Brasileño. Defensa Personal y Entrenamiento personal. Profesor Rafael Pousada.', image: '/rafael-pousada-jiu-jitsu.jpg' },
  { id: 'mathouse-bjj', name: 'Mathouse - Brazilian Jiu Jitsu Academy Reading', location: 'Cholsey House Moulsford Mews, RG30 1AP, Reading, Reino Unido', coordinates: { x: 38.5, y: 22.0 }, rating: 4.9, tags: ['JIU JITSU', 'JUDO', 'WRESTLING'], description: 'Mathouse is a Brazilian Jiu-Jitsu Academy in Reading. We offer Adults and Kids Brazilian Jiu Jitsu Classes and Adults NO-GI Classes.', image: '/mathouse.jpg' },
  { id: 'carlson-gracie-peniche', name: 'Carlson Gracie Jiu Jitsu Peniche', location: 'Rua Luís de Camões Peniche, 2525-351, Atouguia da Baleia, Portugal', coordinates: { x: 26.5, y: 71.0 }, rating: 4.8, tags: ['JIU JITSU', 'JUDO', 'WRESTLING'], description: 'Escola de Jiu Jitsu em Peniche, Portugal. Carlson Gracie Jiu Jitsu Peniche. Adultos, mulheres e crianças. Professor Alex Pereira.', image: '/carlson-peniche.png' },
  { id: 'five-elements', name: 'Five Elements Jiu Jitsu Huelva', location: 'Calle Teide 6 Spain, 21002, Huelva, España', coordinates: { x: 36.8, y: 75.4 }, rating: 4.7, tags: ['MMA', 'JIU JITSU', 'JUDO'], description: 'Descubre las artes marciales más emocionantes en un ambiente acogedor y profesional. En Five Elements creemos en el compañerismo.', image: '/five-elements-jiu-jitsu.jpg' },
  { id: 'bjj-sanlucar', name: 'Jiu-Jitsu Brasileño Sanlucar De Barrameda', location: 'C. Huerta de la Balsa 2, 11540, Sanlúcar de Barrameda, España', coordinates: { x: 38.3, y: 79.2 }, rating: 4.6, tags: ['JIU JITSU', 'GRAPPLING'], description: 'Clases diarias de BJJ Gi y No-Gi en Sanlúcar de Barrameda. Profesorado cualificado y ambiente óptimo de entrenamiento.', image: '/sanlucar-jiu-jitsu.jpg' },
  { id: 'roger-gracie-dubai', name: 'Roger Gracie Dubai Academy', location: 'The Forge Gym DXB, Dubai, Emiratos Árabes Unidos', coordinates: { x: 80.5, y: 65.0 }, rating: 4.9, tags: ['MMA', 'JIU JITSU', 'FITNESS'], description: 'World Class Boutique Martial Arts MMA training including Roger Gracie Jiu Jitsu at The Forge Gym DXB.', image: '/roger-gracie-dubai.jpg' },
  { id: 'karate-mangualde', name: 'Centro De Karaté De Mangualde', location: '3530, Mangualde, Portugal', coordinates: { x: 28.5, y: 64.2 }, rating: 4.7, tags: ['JIU JITSU', 'KARATE'], description: 'Centro Bujutsu de Mangualde - Artes Marciais para todos desde os 4 anos de idade. Karate e Jiu-Jitsu.', image: '/centro-karate-mangualde.jpg' },
]

const CLASSES: ExploreClass[] = [
  { id: 'rg-bjj-beginners', className: 'BJJ Beginners (Gi)', schoolId: 'roger-gracie-malaga', schoolName: 'Roger Gracie Malaga', discipline: 'JIU JITSU', level: 'Beginner', instructor: 'RGM Coach Team', time: '18:00 - 19:15', days: 'Mon, Wed, Fri', location: 'Calle Polifemo, 3, Málaga, España', coordinates: { x: 44.5, y: 76.5 }, image: '/roger-gracie-malaga.jpg', rating: 4.9 },
  { id: 'rg-grappling-advanced', className: 'No-Gi Grappling (Pro)', schoolId: 'roger-gracie-malaga', schoolName: 'Roger Gracie Malaga', discipline: 'GRAPPLING', level: 'Advanced', instructor: 'Black Belt Head Coach', time: '19:30 - 21:00', days: 'Tue, Thu', location: 'Calle Polifemo, 3, Málaga, España', coordinates: { x: 44.5, y: 76.5 }, image: '/roger-gracie-malaga.jpg', rating: 4.8 },
  { id: 'rp-bjj-self-defense', className: 'Brazilian Jiu Jitsu & Self-Defense', schoolId: 'rafael-pousada', schoolName: 'Rafael Pousada Jiu Jitsu', discipline: 'JIU JITSU', level: 'All Levels', instructor: 'Rafael Pousada', time: '10:00 - 11:30', days: 'Mon, Wed', location: 'Calle Esla 13, 11405, Jerez de la Frontera', coordinates: { x: 40.2, y: 77.8 }, image: '/rafael-pousada-jiu-jitsu.jpg', rating: 4.9 },
  { id: 'mh-bjj-kids', className: 'Kids Jiu Jitsu BJJ Class', schoolId: 'mathouse-bjj', schoolName: 'Mathouse BJJ Reading', discipline: 'JIU JITSU', level: 'Kids', instructor: 'Coach Mathouse Team', time: '16:30 - 17:30', days: 'Mon, Wed, Fri', location: 'Cholsey House Moulsford Mews, RG30 1AP, Reading', coordinates: { x: 38.5, y: 22.0 }, image: '/mathouse.jpg', rating: 4.9 },
  { id: 'cg-bjj-adults', className: 'Adults Carlson Gracie BJJ', schoolId: 'carlson-gracie-peniche', schoolName: 'Carlson Gracie Jiu Jitsu Peniche', discipline: 'JIU JITSU', level: 'All Levels', instructor: 'Alex Pereira', time: '19:00 - 20:30', days: 'Mon–Fri', location: 'Rua Luís de Camões Peniche, Portugal', coordinates: { x: 26.5, y: 71.0 }, image: '/carlson-peniche.png', rating: 4.8 },
  { id: 'fe-mma-striking', className: 'MMA Striking & Stand-up', schoolId: 'five-elements', schoolName: 'Five Elements Jiu Jitsu Huelva', discipline: 'MMA', level: 'All Levels', instructor: 'Five Elements Staff', time: '19:00 - 20:15', days: 'Tue, Thu', location: 'Calle Teide 6, 21002, Huelva', coordinates: { x: 36.8, y: 75.4 }, image: '/five-elements-jiu-jitsu.jpg', rating: 4.7 },
  { id: 'rgd-muay-thai', className: 'Muay Thai Kickboxing Advanced', schoolId: 'roger-gracie-dubai', schoolName: 'Roger Gracie Dubai Academy', discipline: 'MUAY THAI', level: 'Advanced', instructor: 'Kru Pro Team', time: '18:35 - 19:45', days: 'Mon, Wed, Fri', location: 'The Forge Gym DXB, Dubai', coordinates: { x: 80.5, y: 65.0 }, image: '/roger-gracie-dubai.jpg', rating: 4.9 },
  { id: 'km-judo', className: 'Traditional Judo Practice', schoolId: 'karate-mangualde', schoolName: 'Centro De Karaté De Mangualde', discipline: 'JUDO', level: 'All Levels', instructor: 'Bujutsu Sensei', time: '17:00 - 18:30', days: 'Tue, Fri', location: '3530, Mangualde, Portugal', coordinates: { x: 28.5, y: 64.2 }, image: '/centro-karate-mangualde.jpg', rating: 4.7 },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExplorePage() {
  const [mode, setMode]                 = useState<'schools' | 'classes'>('schools')
  const [search, setSearch]             = useState('')
  const [location, setLocation]         = useState('')
  const [showFilters, setShowFilters]   = useState(false)
  const [hovered, setHovered]           = useState<string | null>(null)
  const [selected, setSelected]         = useState<string | null>(null)
  const [showLogin, setShowLogin]       = useState(false)
  const [showRegister, setShowRegister] = useState(false)

  const filteredSchools = useMemo(() => ACADEMIES.filter(s => {
    const q = search.toLowerCase()
    const l = location.toLowerCase()
    return (!q || s.name.toLowerCase().includes(q) || s.tags.some(t => t.toLowerCase().includes(q)) || s.description.toLowerCase().includes(q))
        && (!l || s.location.toLowerCase().includes(l))
  }), [search, location])

  const filteredClasses = useMemo(() => CLASSES.filter(c => {
    const q = search.toLowerCase()
    const l = location.toLowerCase()
    return (!q || c.className.toLowerCase().includes(q) || c.discipline.toLowerCase().includes(q) || c.schoolName.toLowerCase().includes(q))
        && (!l || c.location.toLowerCase().includes(l))
  }), [search, location])

  const mapItems = mode === 'schools'
    ? filteredSchools
    : ACADEMIES.filter(s => filteredClasses.some(c => c.schoolId === s.id))

  return (
    <div className="bg-slate-50 min-h-screen font-sans text-[#061229]">

      {showLogin    && <LoginModal    onClose={() => setShowLogin(false)}    onOpenRegister={() => { setShowLogin(false); setShowRegister(true) }} />}
      {showRegister && <RegisterModal onClose={() => setShowRegister(false)} onOpenLogin={() => { setShowRegister(false); setShowLogin(true) }} />}

      <Header onOpenLoginModal={() => setShowLogin(true)} />

      {/* ── Hero Banner ──────────────────────────────────────────────────── */}
      <div className="relative h-[250px] sm:h-[300px] bg-slate-950 flex flex-col items-center justify-center text-center px-4 overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/mathouse.jpg" alt="" fill className="object-cover opacity-20 grayscale" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/60 to-slate-950" />
        </div>
        <div className="relative z-10 space-y-4 max-w-4xl">
          <span className="text-[10px] uppercase font-black text-[#0092ff] tracking-[0.2em] inline-flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-sky-400" />
            Global Combat Network
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight uppercase tracking-wider">
            Discover a World{' '}
            <span className="text-slate-400">Of Martial Arts Experiences</span>
          </h1>
        </div>
      </div>

      {/* ── Floating Search Card ─────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 -mt-10 sm:-mt-12 relative z-20">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 sm:p-5 max-w-5xl mx-auto space-y-4">

          {/* Search row */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Filters toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center p-3.5 border rounded-xl cursor-pointer transition-all gap-2 text-xs font-black uppercase tracking-wider shrink-0 ${
                showFilters
                  ? 'bg-sky-50 text-[#0092ff] border-sky-300 ring-1 ring-sky-200'
                  : 'bg-slate-50 text-slate-500 border-gray-200 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <ListFilter className="w-5 h-5" />
              <span className="hidden sm:inline">Filters</span>
            </button>

            {/* What? */}
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#0092ff] uppercase tracking-widest pointer-events-none">What?</span>
              <input
                suppressHydrationWarning
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Jiu Jitsu, Gracie, MMA..."
                className="w-full pl-16 pr-4 py-3 bg-slate-50 border border-gray-100 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#0092ff] focus:ring-2 focus:ring-sky-100 transition-all"
              />
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px h-8 bg-slate-200 shrink-0" />

            {/* Where? */}
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#0092ff] uppercase tracking-widest pointer-events-none">Where?</span>
              <input
                suppressHydrationWarning
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Málaga, Reading, Dubai..."
                className="w-full pl-16 pr-4 py-3 bg-slate-50 border border-gray-100 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#0092ff] focus:ring-2 focus:ring-sky-100 transition-all"
              />
            </div>

            <button className="w-full md:w-auto px-8 py-3.5 bg-[#0092ff] text-white hover:bg-[#007cd7] text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-sky-500/20 transition-all cursor-pointer shrink-0">
              Search
            </button>
          </div>

          {/* Collapsible filters */}
          {showFilters && (
            <div className="overflow-hidden border-t border-slate-100 pt-4 space-y-4">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#0092ff] uppercase tracking-widest pointer-events-none">Where?</span>
                  <input
                    suppressHydrationWarning
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="Filter by city, zipcode, or country (e.g., Malaga, Reading)..."
                    className="w-full pl-20 pr-4 py-3 bg-slate-50 border border-gray-100 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#0092ff] focus:ring-2 focus:ring-sky-100 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Popular Disciplines:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {['JIU JITSU', 'MMA', 'GRAPPLING', 'MUAY THAI', 'KARATE', 'JUDO'].map(d => (
                        <button
                          key={d}
                          onClick={() => setSearch(search.toUpperCase() === d ? '' : d)}
                          className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer border ${
                            search.toUpperCase() === d
                              ? 'bg-sky-50 text-[#0092ff] border-sky-300 ring-1 ring-sky-200'
                              : 'bg-slate-50 text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-700'
                          }`}
                        >{d}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Popular Locations:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {['Málaga', 'Reading', 'Peniche', 'Huelva', 'Dubai'].map(loc => (
                        <button
                          key={loc}
                          onClick={() => setLocation(location.toLowerCase() === loc.toLowerCase() ? '' : loc)}
                          className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer border ${
                            location.toLowerCase() === loc.toLowerCase()
                              ? 'bg-sky-50 text-[#0092ff] border-sky-300 ring-1 ring-sky-200'
                              : 'bg-slate-50 text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-700'
                          }`}
                        >{loc}</button>
                      ))}
                    </div>
                  </div>
                </div>
            </div>
          )}

          {/* Schools / Classes toggle */}
          <div className="flex justify-center">
            <div className="bg-slate-100/80 p-1 rounded-xl flex items-center shadow-inner gap-1">
              {(['schools', 'classes'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-8 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {m === 'schools' ? 'Schools' : 'Classes'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Split View ───────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-12 gap-8 items-start">

          {/* Left: listing */}
          <div className="lg:col-span-7 space-y-4">

            {/* Meta bar */}
            <div className="flex flex-wrap items-center justify-between px-2 mb-2 gap-2">
              <div className="flex items-center flex-wrap gap-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {mode === 'schools'
                    ? `Showing ${filteredSchools.length} academies found`
                    : `Showing ${filteredClasses.length} classes found`
                  }
                </p>
                {(search || location) && (
                  <button
                    onClick={() => { setSearch(''); setLocation('') }}
                    className="text-[10px] font-black text-rose-500 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-md cursor-pointer"
                  >
                    Clear Filters ×
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-600 cursor-pointer hover:underline">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Show nearest dojos</span>
              </div>
            </div>

            {/* Schools list */}
            {mode === 'schools' ? (
              <>
                {filteredSchools.length === 0 ? (
                  <div className="p-12 text-center bg-white border border-slate-100 rounded-3xl">
                    <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-base font-black text-slate-800">No Academies Found</h3>
                    <p className="text-xs text-slate-500 font-semibold max-w-sm mx-auto mt-1">Try different tags or location.</p>
                  </div>
                ) : filteredSchools.map(school => (
                  <div
                    key={school.id}
                    onMouseEnter={() => setHovered(school.id)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => setSelected(school.id)}
                    className={`cursor-pointer border text-left p-4 sm:p-5 rounded-2xl bg-white flex flex-col sm:flex-row gap-5 transition-all relative overflow-hidden group ${
                      selected === school.id || hovered === school.id
                        ? 'border-[#0092ff] shadow-md shadow-sky-500/5'
                        : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    {/* Image */}
                    <div className="w-full sm:w-44 h-32 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 relative">
                      <Image src={school.image} alt={school.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                      {school.rating >= 4.8 && (
                        <span className="absolute top-2 left-2 bg-slate-950/85 backdrop-blur-sm text-[8px] font-black tracking-widest text-[#0092ff] px-2 py-0.5 rounded-md uppercase">
                          Elite Class
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                          {school.tags.map(tag => (
                            <span key={tag} className="text-[9px] font-black bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full border border-slate-100 tracking-wider">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div>
                          <h3 className="text-base font-black text-slate-800 leading-snug group-hover:text-[#0092ff] transition-colors">
                            {school.name}
                          </h3>
                          <p className="text-[11px] font-bold text-slate-400 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#0092ff] flex-shrink-0" />
                            <span className="truncate max-w-[280px]">{school.location}</span>
                          </p>
                        </div>
                        <p className="text-slate-600 text-[11.5px] leading-relaxed font-semibold line-clamp-2">
                          {school.description}
                        </p>
                      </div>
                      <div className="pt-3 border-t border-slate-50 mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center bg-amber-50 px-2 py-0.5 rounded-md">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span className="text-[10px] font-black text-amber-700 ml-1">{school.rating}</span>
                          </div>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Verificado</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-black text-[#0092ff] uppercase group-hover:translate-x-1 transition-transform">
                          <span>View Public Page</span>
                          <Eye className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
                {filteredClasses.length === 0 ? (
                  <div className="p-12 text-center bg-white border border-slate-100 rounded-3xl">
                    <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-base font-black text-slate-800">No Classes Found</h3>
                  </div>
                ) : filteredClasses.map(cls => (
                  <div
                    key={cls.id}
                    onMouseEnter={() => setHovered(cls.schoolId)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => setSelected(cls.schoolId)}
                    className={`cursor-pointer border text-left p-4 sm:p-5 rounded-2xl bg-white flex flex-col sm:flex-row gap-5 transition-all relative overflow-hidden group ${
                      selected === cls.schoolId || hovered === cls.schoolId
                        ? 'border-[#0092ff] shadow-md shadow-sky-500/5'
                        : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="w-full sm:w-44 h-32 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 relative">
                      <Image src={cls.image} alt={cls.className} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                      <span className="absolute top-2 left-2 bg-slate-950/85 backdrop-blur-sm text-[8px] font-black tracking-widest text-[#0092ff] px-2 py-0.5 rounded-md uppercase">
                        {cls.discipline}
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                          <span className="text-[9px] font-black bg-[#0092ff]/10 text-[#0092ff] px-2 py-0.5 rounded-full border border-sky-200/40 tracking-wider">{cls.discipline}</span>
                          <span className="text-[9px] font-black bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full border border-slate-100 tracking-wider">{cls.level}</span>
                        </div>
                        <div>
                          <h3 className="text-base font-black text-slate-800 leading-snug group-hover:text-[#0092ff] transition-colors">{cls.className}</h3>
                          <p className="text-xs font-bold text-slate-500 mt-1">Offered by: <span className="text-slate-700 font-extrabold">{cls.schoolName}</span></p>
                          <p className="text-[11px] font-bold text-slate-400 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#0092ff] flex-shrink-0" />
                            <span className="truncate max-w-[280px]">{cls.location}</span>
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-[11px] font-semibold text-slate-600">
                          <div>
                            <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] block">Instructor</span>
                            <span className="font-extrabold text-slate-700">{cls.instructor}</span>
                          </div>
                          <div className="hidden sm:block w-px h-6 bg-slate-100" />
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-sky-500 mr-0.5" />
                            <div>
                              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] block">Schedule</span>
                              <span className="font-extrabold text-[#0092ff]">{cls.days} • {cls.time}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-slate-50 mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center bg-amber-50 px-2 py-0.5 rounded-md">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span className="text-[10px] font-black text-amber-700 ml-1">{cls.rating}</span>
                          </div>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{cls.level} Class</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-black text-[#0092ff] uppercase group-hover:translate-x-1 transition-transform">
                          <span>Book Class & Info</span>
                          <Eye className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Right: sticky map */}
          <div className="lg:col-span-5 h-[400px] lg:h-[650px] sticky top-28 rounded-3xl overflow-hidden border border-slate-200/60 shadow-xl bg-slate-900 flex flex-col">

            {/* Map header */}
            <div className="bg-slate-950 text-white p-4 flex items-center justify-between border-b border-slate-800 z-30">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-black tracking-wider uppercase">Live Coverage Terminal</span>
              </div>
              <span className="text-[9px] font-bold text-slate-500 font-mono tracking-wider">MÁLAGA · LONDON · DUBAI</span>
            </div>

            {/* Map canvas */}
            <div className="flex-1 relative overflow-hidden">
              {/* Ocean blue background */}
              <div className="absolute inset-0 bg-[#c4ebf6]">
                <Image
                  src="/hero-2.jpg"
                  alt=""
                  fill
                  className="object-cover opacity-15"
                  style={{ filter: 'invert(1) saturate(1.5)' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0e2942]/90 via-[#1e4860]/45 to-[#0b2839]/80 mix-blend-color" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/30 to-transparent" />
              </div>

              {/* Map pins */}
              {mapItems.map(school => {
                const isActive = hovered === school.id || selected === school.id
                return (
                  <div
                    key={school.id}
                    className="absolute cursor-pointer z-10 hover:scale-110 transition-transform"
                    style={{ left: `${school.coordinates.x}%`, top: `${school.coordinates.y}%` }}
                    onClick={() => { setSelected(school.id); setHovered(school.id) }}
                  >
                    {isActive && (
                      <span className="absolute -inset-3 rounded-full animate-ping opacity-40 bg-rose-500 pointer-events-none" />
                    )}
                    <div className="relative group/pin">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform border-2 border-white ${
                        isActive ? 'bg-rose-500 scale-110' : 'bg-[#0092ff]'
                      }`}>
                        <span className="text-[11px] font-black text-white font-mono">M</span>
                      </div>
                      {/* Tooltip */}
                      <div className={`absolute bottom-10 left-1/2 -translate-x-1/2 bg-slate-950/95 backdrop-blur-sm text-white border border-slate-800 rounded-xl p-2.5 w-44 shadow-2xl transition-all pointer-events-none ${
                        isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                      }`}>
                        <p className="text-[10px] font-black truncate">{school.name}</p>
                        <p className="text-[8px] text-[#0092ff] font-bold mt-0.5 truncate">{school.location}</p>
                        <div className="flex items-center gap-1 mt-1 text-[8px] text-amber-400">
                          <Star className="w-2 h-2 fill-current" />
                          <span className="font-mono">{school.rating} Verified</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Ocean labels */}
              <div className="absolute left-1/3 bottom-12 text-white/25 select-none pointer-events-none font-black tracking-widest text-[14px] uppercase font-mono">
                Atlántico Norte
              </div>
            </div>

            {/* Status bar */}
            <div className="bg-slate-950 p-3.5 border-t border-slate-800 text-[10px] text-slate-400 font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                Synchronizing node markers...
              </span>
              <span>UTC · ONLINE</span>
            </div>
          </div>

        </div>
      </div>

      <Footer />
    </div>
  )
}
