'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Search, MapPin, Star, Filter, X, ChevronLeft, ChevronRight,
  Map, List, ArrowRight, Clock, User, Award, Sparkles,
} from 'lucide-react'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import LoginModal from '../../components/LoginModal'
import RegisterModal from '../../components/RegisterModal'
import { useT } from '../../lib/i18n/LanguageContext'

// ── Theme tokens ──────────────────────────────────────────────────────────────
const BLUE = '#0071E3'

// ── Data ────────────────────────────────────────────────────────────────────--

interface Academy {
  id: string
  slug: string
  name: string
  location: string
  city: string
  coordinates: { x: number; y: number }
  rating: number
  reviewCount: number
  priceFrom: string
  tags: string[]
  features: string[]
  description: string
  image: string
  images: string[]
  nextClass: string
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

const FALLBACK_IMAGES = ['/roger-gracie-malaga.jpg', '/mathouse.jpg', '/five-elements-jiu-jitsu.jpg']

const ACADEMIES: Academy[] = [
  { id: 'roger-gracie-malaga', slug: 'roger-gracie-malaga', name: 'Roger Gracie Malaga', location: 'Calle Polifemo, 3, Málaga, España', city: 'Málaga, Spain', coordinates: { x: 44.5, y: 76.5 }, rating: 4.9, reviewCount: 128, priceFrom: 'from €65/mo', tags: ['BJJ', 'GRAPPLING'], features: ['Beginner friendly', 'Competition team', 'Kids classes'], description: 'Roger Gracie Malaga es una escuela de Jiu Jitsu situada en Málaga. Ofrecemos clases para todos los niveles. Filial de la prestigiosa Roger Gracie Academy.', image: '/roger-gracie-malaga.jpg', images: ['/roger-gracie-malaga.jpg', '/mathouse.jpg', '/five-elements-jiu-jitsu.jpg'], nextClass: 'Mon Jun 9 · BJJ All Levels · 19:00' },
  { id: 'rafael-pousada', slug: 'rafael-pousada', name: 'Rafael Pousada Jiu Jitsu', location: 'Calle Esla 13, 11405, Jerez de la Frontera, España', city: 'Jerez, Spain', coordinates: { x: 40.2, y: 77.8 }, rating: 4.8, reviewCount: 96, priceFrom: 'from €55/mo', tags: ['MMA', 'JUDO', 'GRAPPLING'], features: ['Self defense', 'Personal training', 'All levels'], description: 'Equipo de Jiu Jitsu Brasileño. Defensa Personal y Entrenamiento personal. Profesor Rafael Pousada.', image: '/rafael-pousada-jiu-jitsu.jpg', images: ['/rafael-pousada-jiu-jitsu.jpg', '/mathouse.jpg', '/roger-gracie-malaga.jpg'], nextClass: 'Mon Jun 9 · BJJ & Self-Defense · 10:00' },
  { id: 'mathouse-bjj', slug: 'mathouse-bjj', name: 'Mathouse - Brazilian Jiu Jitsu Academy Reading', location: 'Cholsey House Moulsford Mews, RG30 1AP, Reading, Reino Unido', city: 'Reading, UK', coordinates: { x: 38.5, y: 22.0 }, rating: 4.9, reviewCount: 211, priceFrom: 'Free trial', tags: ['BJJ', 'JUDO', 'WRESTLING'], features: ['Kids classes', 'No-Gi', 'Beginner friendly'], description: 'Mathouse is a Brazilian Jiu-Jitsu Academy in Reading. We offer Adults and Kids Brazilian Jiu Jitsu Classes and Adults NO-GI Classes.', image: '/mathouse.jpg', images: ['/mathouse.jpg', '/roger-gracie-malaga.jpg', '/five-elements-jiu-jitsu.jpg'], nextClass: 'Mon Jun 9 · Kids BJJ · 16:30' },
  { id: 'carlson-gracie-peniche', slug: 'carlson-gracie-peniche', name: 'Carlson Gracie Jiu Jitsu Peniche', location: 'Rua Luís de Camões Peniche, 2525-351, Atouguia da Baleia, Portugal', city: 'Peniche, Portugal', coordinates: { x: 26.5, y: 71.0 }, rating: 4.8, reviewCount: 74, priceFrom: 'from €60/mo', tags: ['BJJ', 'JUDO', 'WRESTLING'], features: ['Adults', 'Women only', 'Kids classes'], description: 'Escola de Jiu Jitsu em Peniche, Portugal. Carlson Gracie Jiu Jitsu Peniche. Adultos, mulheres e crianças. Professor Alex Pereira.', image: '/carlson-peniche.png', images: ['/carlson-peniche.png', '/mathouse.jpg', '/roger-gracie-malaga.jpg'], nextClass: 'Mon Jun 9 · Adults BJJ · 19:00' },
  { id: 'five-elements', slug: 'five-elements', name: 'Five Elements Jiu Jitsu Huelva', location: 'Calle Teide 6 Spain, 21002, Huelva, España', city: 'Huelva, Spain', coordinates: { x: 36.8, y: 75.4 }, rating: 4.7, reviewCount: 58, priceFrom: 'from €50/mo', tags: ['MMA', 'BJJ', 'JUDO'], features: ['Friendly community', 'Striking', 'All levels'], description: 'Descubre las artes marciales más emocionantes en un ambiente acogedor y profesional. En Five Elements creemos en el compañerismo.', image: '/five-elements-jiu-jitsu.jpg', images: ['/five-elements-jiu-jitsu.jpg', '/roger-gracie-malaga.jpg', '/mathouse.jpg'], nextClass: 'Tue Jun 10 · MMA Striking · 19:00' },
  { id: 'bjj-sanlucar', slug: 'bjj-sanlucar', name: 'Jiu-Jitsu Brasileño Sanlucar De Barrameda', location: 'C. Huerta de la Balsa 2, 11540, Sanlúcar de Barrameda, España', city: 'Sanlúcar, Spain', coordinates: { x: 38.3, y: 79.2 }, rating: 4.6, reviewCount: 48, priceFrom: 'from €45/mo', tags: ['BJJ', 'GRAPPLING'], features: ['Daily classes', 'Gi & No-Gi', 'Qualified staff'], description: 'Clases diarias de BJJ Gi y No-Gi en Sanlúcar de Barrameda. Profesorado cualificado y ambiente óptimo de entrenamiento.', image: '/sanlucar-jiu-jitsu.jpg', images: ['/sanlucar-jiu-jitsu.jpg', '/mathouse.jpg', '/five-elements-jiu-jitsu.jpg'], nextClass: 'Mon Jun 9 · BJJ Gi · 20:00' },
  { id: 'roger-gracie-dubai', slug: 'roger-gracie-dubai', name: 'Roger Gracie Dubai Academy', location: 'The Forge Gym DXB, Dubai, Emiratos Árabes Unidos', city: 'Dubai, UAE', coordinates: { x: 80.5, y: 65.0 }, rating: 4.9, reviewCount: 256, priceFrom: 'from €90/mo', tags: ['MMA', 'BJJ', 'MUAY THAI'], features: ['World class', 'Boutique', 'Competition team'], description: 'World Class Boutique Martial Arts MMA training including Roger Gracie Jiu Jitsu at The Forge Gym DXB.', image: '/roger-gracie-dubai.jpg', images: ['/roger-gracie-dubai.jpg', '/roger-gracie-malaga.jpg', '/mathouse.jpg'], nextClass: 'Mon Jun 9 · Muay Thai · 18:35' },
  { id: 'karate-mangualde', slug: 'karate-mangualde', name: 'Centro De Karaté De Mangualde', location: '3530, Mangualde, Portugal', city: 'Mangualde, Portugal', coordinates: { x: 28.5, y: 64.2 }, rating: 4.7, reviewCount: 63, priceFrom: 'from €40/mo', tags: ['KARATE', 'BJJ', 'JUDO'], features: ['Kids from 4yo', 'Traditional', 'Family friendly'], description: 'Centro Bujutsu de Mangualde - Artes Marciais para todos desde os 4 anos de idade. Karate e Jiu-Jitsu.', image: '/centro-karate-mangualde.jpg', images: ['/centro-karate-mangualde.jpg', '/mathouse.jpg', '/five-elements-jiu-jitsu.jpg'], nextClass: 'Tue Jun 10 · Judo Practice · 17:00' },
]

const CLASSES: ExploreClass[] = [
  { id: 'rg-bjj-beginners', className: 'BJJ Beginners (Gi)', schoolId: 'roger-gracie-malaga', schoolName: 'Roger Gracie Malaga', discipline: 'BJJ', level: 'Beginner', instructor: 'RGM Coach Team', time: '18:00', days: 'Mon / Wed / Fri', location: 'Calle Polifemo, 3, Málaga, España', coordinates: { x: 44.5, y: 76.5 }, image: '/roger-gracie-malaga.jpg', rating: 4.9 },
  { id: 'rg-grappling-advanced', className: 'No-Gi Grappling (Pro)', schoolId: 'roger-gracie-malaga', schoolName: 'Roger Gracie Malaga', discipline: 'GRAPPLING', level: 'Advanced', instructor: 'Black Belt Head Coach', time: '19:30', days: 'Tue / Thu', location: 'Calle Polifemo, 3, Málaga, España', coordinates: { x: 44.5, y: 76.5 }, image: '/roger-gracie-malaga.jpg', rating: 4.8 },
  { id: 'rp-bjj-self-defense', className: 'Brazilian Jiu Jitsu & Self-Defense', schoolId: 'rafael-pousada', schoolName: 'Rafael Pousada Jiu Jitsu', discipline: 'BJJ', level: 'Intermediate', instructor: 'Rafael Pousada', time: '10:00', days: 'Mon / Wed', location: 'Calle Esla 13, 11405, Jerez de la Frontera', coordinates: { x: 40.2, y: 77.8 }, image: '/rafael-pousada-jiu-jitsu.jpg', rating: 4.9 },
  { id: 'mh-bjj-kids', className: 'Kids Jiu Jitsu BJJ Class', schoolId: 'mathouse-bjj', schoolName: 'Mathouse BJJ Reading', discipline: 'BJJ', level: 'Beginner', instructor: 'Coach Mathouse Team', time: '16:30', days: 'Mon / Wed / Fri', location: 'Cholsey House Moulsford Mews, RG30 1AP, Reading', coordinates: { x: 38.5, y: 22.0 }, image: '/mathouse.jpg', rating: 4.9 },
  { id: 'cg-bjj-adults', className: 'Adults Carlson Gracie BJJ', schoolId: 'carlson-gracie-peniche', schoolName: 'Carlson Gracie Jiu Jitsu Peniche', discipline: 'BJJ', level: 'Intermediate', instructor: 'Alex Pereira', time: '19:00', days: 'Mon – Fri', location: 'Rua Luís de Camões Peniche, Portugal', coordinates: { x: 26.5, y: 71.0 }, image: '/carlson-peniche.png', rating: 4.8 },
  { id: 'fe-mma-striking', className: 'MMA Striking & Stand-up', schoolId: 'five-elements', schoolName: 'Five Elements Jiu Jitsu Huelva', discipline: 'MMA', level: 'Intermediate', instructor: 'Five Elements Staff', time: '19:00', days: 'Tue / Thu', location: 'Calle Teide 6, 21002, Huelva', coordinates: { x: 36.8, y: 75.4 }, image: '/five-elements-jiu-jitsu.jpg', rating: 4.7 },
  { id: 'rgd-muay-thai', className: 'Muay Thai Kickboxing Advanced', schoolId: 'roger-gracie-dubai', schoolName: 'Roger Gracie Dubai Academy', discipline: 'MUAY THAI', level: 'Advanced', instructor: 'Kru Pro Team', time: '18:35', days: 'Mon / Wed / Fri', location: 'The Forge Gym DXB, Dubai', coordinates: { x: 80.5, y: 65.0 }, image: '/roger-gracie-dubai.jpg', rating: 4.9 },
  { id: 'km-judo', className: 'Traditional Judo Practice', schoolId: 'karate-mangualde', schoolName: 'Centro De Karaté De Mangualde', discipline: 'JUDO', level: 'Beginner', instructor: 'Bujutsu Sensei', time: '17:00', days: 'Tue / Fri', location: '3530, Mangualde, Portugal', coordinates: { x: 28.5, y: 64.2 }, image: '/centro-karate-mangualde.jpg', rating: 4.7 },
]

const DISCIPLINES = ['BJJ', 'MMA', 'Muay Thai', 'Wrestling', 'Judo', 'Karate', 'Boxing', 'Kickboxing', 'Yoga', 'All']
const SORTS = ['Rating', 'Distance', 'Price'] as const
type SortKey = typeof SORTS[number]

const LEVEL_COLORS: Record<string, string> = {
  Beginner: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Intermediate: 'bg-amber-50 text-amber-700 border-amber-200',
  Advanced: 'bg-rose-50 text-rose-700 border-rose-200',
}

// ── Quick View Popup ────────────────────────────────────────────────────────--

function SchoolQuickView({ school, onClose }: { school: Academy; onClose: () => void }) {
  const [idx, setIdx] = useState(0)
  const imgs = school.images.length ? school.images : FALLBACK_IMAGES
  const prev = () => setIdx(i => (i - 1 + imgs.length) % imgs.length)
  const next = () => setIdx(i => (i + 1) % imgs.length)

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#111827]/50 backdrop-blur-sm animate-[fadeIn_.2s_ease]" />

      {/* Sheet / Modal */}
      <div
        onClick={e => e.stopPropagation()}
        className="relative w-full md:w-[680px] md:max-w-[92vw] bg-white rounded-t-3xl md:rounded-3xl shadow-2xl
                   max-h-[85vh] md:max-h-[90vh] overflow-y-auto
                   animate-[slideUp_.28s_cubic-bezier(.22,1,.36,1)] md:animate-[scaleIn_.2s_ease]"
        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" }}
      >
        {/* Drag handle (mobile) */}
        <div className="md:hidden sticky top-0 z-20 flex justify-center pt-3 pb-1 bg-white rounded-t-3xl">
          <div className="w-10 h-1.5 rounded-full bg-[#E5E7EB]" />
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center text-[#111827]"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Carousel */}
        <div className="relative w-full h-56 md:h-72 bg-[#111827] overflow-hidden md:rounded-t-3xl">
          <Image src={imgs[idx] ?? '/roger-gracie-malaga.jpg'} alt={school.name} fill className="object-cover" />
          {imgs.length > 1 && (
            <>
              <button onClick={prev} aria-label="Previous" className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center">
                <ChevronLeft className="w-5 h-5 text-[#111827]" />
              </button>
              <button onClick={next} aria-label="Next" className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center">
                <ChevronRight className="w-5 h-5 text-[#111827]" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {imgs.map((_, i) => (
                  <span key={i} className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Body */}
        <div className="p-5 md:p-6">
          <h2 className="text-xl md:text-2xl font-bold text-[#111827] leading-tight">{school.name}</h2>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {school.tags.map(tag => (
              <span key={tag} className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-[#F9FAFB] text-[#6B7280] border border-[#E5E7EB]">{tag}</span>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-sm text-[#6B7280]">
            <span className="flex items-center gap-1 font-semibold text-[#111827]">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              {school.rating} · {school.reviewCount} reviews
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" style={{ color: BLUE }} />
              {school.city}
            </span>
          </div>

          <p className="mt-4 text-sm text-[#6B7280] leading-relaxed line-clamp-3">{school.description}</p>

          {/* Next class */}
          <div className="mt-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Next available class</span>
              <div className="flex-1 h-px bg-[#E5E7EB]" />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: BLUE }}>
                  <Clock className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#111827] truncate">{school.nextClass}</p>
                  <p className="text-xs text-[#6B7280] flex items-center gap-1 mt-0.5">
                    <User className="w-3 h-3" /> Carlos Silva
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 shrink-0" style={{ color: BLUE }} />
            </div>
          </div>

          <div className="h-px bg-[#E5E7EB] my-5" />

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <Link
              href={'/school/' + school.id}
              className="flex-1 h-12 rounded-xl border border-[#E5E7EB] text-[#111827] font-semibold text-sm flex items-center justify-center hover:bg-[#F9FAFB] transition-colors"
            >
              View Full Profile
            </Link>
            <button
              className="flex-1 h-12 rounded-xl text-white font-semibold text-sm flex items-center justify-center hover:opacity-90 transition-opacity"
              style={{ background: BLUE }}
            >
              Book Free Trial
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes scaleIn { from { transform: scale(.95); opacity: 0 } to { transform: scale(1); opacity: 1 } }
      `}</style>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────--

export default function ExplorePage() {
  const t = useT()
  const [mode, setMode]                 = useState<'schools' | 'classes'>('schools')
  const [search, setSearch]             = useState('')
  const [location, setLocation]         = useState('')
  const [discipline, setDiscipline]     = useState('All')
  const [sort, setSort]                 = useState<SortKey>('Rating')
  const [hovered, setHovered]           = useState<string | null>(null)
  const [selected, setSelected]         = useState<string | null>(null)
  const [quickView, setQuickView]       = useState<Academy | null>(null)
  const [mobileMap, setMobileMap]       = useState(false)
  const [showLogin, setShowLogin]       = useState(false)
  const [showRegister, setShowRegister] = useState(false)

  const sortFn = (a: Academy, b: Academy) => {
    if (sort === 'Rating') return b.rating - a.rating
    if (sort === 'Distance') return a.coordinates.y - b.coordinates.y
    // Price: schools with a numeric "from €X" first, ascending; free trials last-ish
    const price = (s: Academy) => {
      const m = s.priceFrom.match(/(\d+)/)
      return m && m[1] ? parseInt(m[1], 10) : 0
    }
    return price(a) - price(b)
  }

  const filteredSchools = useMemo(() => ACADEMIES.filter(s => {
    const q = search.toLowerCase()
    const l = location.toLowerCase()
    const d = discipline === 'All' || s.tags.some(tag => tag.toLowerCase() === discipline.toLowerCase())
    return d
        && (!q || s.name.toLowerCase().includes(q) || s.tags.some(tag => tag.toLowerCase().includes(q)) || s.description.toLowerCase().includes(q))
        && (!l || s.location.toLowerCase().includes(l))
  }).sort(sortFn), [search, location, discipline, sort])

  const filteredClasses = useMemo(() => CLASSES.filter(c => {
    const q = search.toLowerCase()
    const l = location.toLowerCase()
    const d = discipline === 'All' || c.discipline.toLowerCase() === discipline.toLowerCase()
    return d
        && (!q || c.className.toLowerCase().includes(q) || c.discipline.toLowerCase().includes(q) || c.schoolName.toLowerCase().includes(q))
        && (!l || c.location.toLowerCase().includes(l))
  }), [search, location, discipline])

  const mapItems = mode === 'schools'
    ? filteredSchools
    : ACADEMIES.filter(s => filteredClasses.some(c => c.schoolId === s.id))

  const academyById = (id: string) => ACADEMIES.find(s => s.id === id)
  const openQuickView = (id: string) => {
    const a = academyById(id)
    if (a) { setSelected(id); setQuickView(a) }
  }

  const resultCount = mode === 'schools' ? filteredSchools.length : filteredClasses.length

  return (
    <div className="min-h-screen" style={{ background: '#F9FAFB', fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif", color: '#111827' }}>

      {showLogin    && <LoginModal    onClose={() => setShowLogin(false)}    onOpenRegister={() => { setShowLogin(false); setShowRegister(true) }} />}
      {showRegister && <RegisterModal onClose={() => setShowRegister(false)} onOpenLogin={() => { setShowRegister(false); setShowLogin(true) }} />}

      <Header onOpenLoginModal={() => setShowLogin(true)} />

      {/* ── Hero Search ──────────────────────────────────────────────────── */}
      <section className="relative bg-[#111827] overflow-hidden">
        <Image src="/hero-2.jpg" alt="" fill className="object-cover opacity-30" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-[#111827]/70 via-[#111827]/60 to-[#111827]/85" />
        <div className="relative z-10 max-w-5xl mx-auto px-4 py-12 md:py-16 text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">Find Your Academy</h1>
          <p className="mt-2 text-sm md:text-lg text-white/75">Discover martial arts schools near you</p>

          {/* Search bar */}
          <div className="mt-7 mx-auto max-w-3xl bg-white rounded-2xl shadow-2xl p-2 flex flex-col md:flex-row gap-2 md:items-center">
            <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl md:rounded-l-xl md:rounded-r-none bg-[#F9FAFB] md:bg-white">
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
              <Search className="w-4 h-4 md:hidden" />
              Search
            </button>
          </div>
        </div>
      </section>

      {/* ── Filter Bar ───────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-3">
          {/* Disciplines */}
          <div className="flex items-center gap-3">
            <div className="flex-1 flex gap-2 overflow-x-auto md:flex-wrap no-scrollbar -mx-1 px-1">
              {DISCIPLINES.map(d => {
                const active = discipline === d
                return (
                  <button
                    key={d}
                    onClick={() => setDiscipline(d)}
                    className={`shrink-0 h-9 px-4 rounded-full text-sm font-semibold border transition-all ${
                      active
                        ? 'text-white border-transparent'
                        : 'bg-white text-[#111827] border-[#E5E7EB] hover:border-[#9CA3AF]'
                    }`}
                    style={active ? { background: BLUE } : undefined}
                  >
                    {d}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between gap-3">
            {/* Mode toggle */}
            <div className="inline-flex p-1 rounded-full bg-[#F9FAFB] border border-[#E5E7EB]">
              {(['schools', 'classes'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`h-9 px-4 md:px-5 rounded-full text-sm font-semibold transition-all ${
                    mode === m ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280]'
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
                <ChevronRight className="w-4 h-4 text-[#6B7280] absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-[#6B7280]">
            {resultCount} {mode === 'schools' ? 'schools' : 'classes'} found
          </p>
          {(search || location || discipline !== 'All') && (
            <button
              onClick={() => { setSearch(''); setLocation(''); setDiscipline('All') }}
              className="text-sm font-semibold flex items-center gap-1 hover:underline"
              style={{ color: BLUE }}
            >
              Clear all <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex gap-6">
          {/* List */}
          <div className="w-full lg:w-[55%] space-y-4">
            {resultCount === 0 && (
              <div className="p-12 text-center bg-white border border-[#E5E7EB] rounded-2xl">
                <Sparkles className="w-10 h-10 text-[#E5E7EB] mx-auto mb-3" />
                <h3 className="font-bold text-[#111827]">Nothing found</h3>
                <p className="text-sm text-[#6B7280] mt-1">Try a different discipline or location.</p>
              </div>
            )}

            {mode === 'schools' && filteredSchools.map(school => {
              const isActive = selected === school.id || hovered === school.id
              return (
                <button
                  key={school.id}
                  onMouseEnter={() => setHovered(school.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => openQuickView(school.id)}
                  className={`group w-full text-left rounded-2xl bg-white border p-3 md:p-4 transition-all flex flex-col md:flex-row gap-3 md:gap-4 ${
                    isActive ? 'border-[#0071E3] shadow-lg bg-[#0071E3]/[0.03]' : 'border-[#E5E7EB] hover:border-[#0071E3] hover:shadow-md'
                  }`}
                >
                  {/* Image */}
                  <div className="relative w-full h-[200px] md:w-[180px] md:h-[130px] shrink-0 rounded-xl overflow-hidden bg-[#111827]">
                    <Image src={school.image} alt={school.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex flex-wrap gap-1.5">
                      {school.tags.map(tag => (
                        <span key={tag} className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#F9FAFB] text-[#6B7280] border border-[#E5E7EB]">{tag}</span>
                      ))}
                    </div>
                    <h3 className="mt-1.5 text-lg font-bold text-[#111827] leading-snug group-hover:text-[#0071E3] transition-colors line-clamp-1">{school.name}</h3>
                    <p className="mt-0.5 text-sm text-[#6B7280] flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: BLUE }} /> {school.city}
                    </p>
                    <p className="mt-1.5 text-sm text-[#6B7280] leading-relaxed line-clamp-2">{school.description}</p>

                    <div className="mt-auto pt-3 border-t border-[#E5E7EB] flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-semibold text-[#111827] flex items-center gap-1">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        {school.rating} <span className="text-[#6B7280] font-normal">· {school.reviewCount} reviews</span>
                      </span>
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        {school.priceFrom.toLowerCase().includes('free') ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wide">Free trial</span>
                        ) : (
                          <>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wide">Free trial</span>
                            <span className="text-[#6B7280] normal-case font-semibold">{school.priceFrom}</span>
                          </>
                        )}
                      </span>
                    </div>
                    <span className="mt-2 text-sm font-bold flex items-center justify-end gap-1 group-hover:gap-2 transition-all" style={{ color: BLUE }}>
                      View profile <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </button>
              )
            })}

            {mode === 'classes' && filteredClasses.map(cls => {
              const isActive = selected === cls.schoolId || hovered === cls.schoolId
              return (
                <button
                  key={cls.id}
                  onMouseEnter={() => setHovered(cls.schoolId)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => openQuickView(cls.schoolId)}
                  className={`group w-full text-left rounded-2xl bg-white border p-3 md:p-4 transition-all flex flex-col md:flex-row gap-3 md:gap-4 ${
                    isActive ? 'border-[#0071E3] shadow-lg bg-[#0071E3]/[0.03]' : 'border-[#E5E7EB] hover:border-[#0071E3] hover:shadow-md'
                  }`}
                >
                  {/* Image with badge */}
                  <div className="relative w-full h-[200px] md:w-[180px] md:h-[130px] shrink-0 rounded-xl overflow-hidden bg-[#111827]">
                    <Image src={cls.image} alt={cls.className} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                    <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full text-white" style={{ background: BLUE }}>{cls.discipline}</span>
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${LEVEL_COLORS[cls.level] ?? 'bg-[#F9FAFB] text-[#6B7280] border-[#E5E7EB]'}`}>{cls.level}</span>
                    </div>
                    <h3 className="mt-1.5 text-lg font-bold text-[#111827] leading-snug group-hover:text-[#0071E3] transition-colors line-clamp-1">{cls.className}</h3>
                    <p className="mt-0.5 text-sm text-[#6B7280]">{cls.schoolName}</p>
                    <p className="mt-1.5 text-sm text-[#6B7280] flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 shrink-0" style={{ color: BLUE }} /> {cls.instructor}
                    </p>
                    <p className="mt-1 text-sm text-[#111827] font-semibold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: BLUE }} /> {cls.days} · {cls.time}
                    </p>

                    <div className="mt-auto pt-3 border-t border-[#E5E7EB] flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#111827] flex items-center gap-1">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> {cls.rating}
                      </span>
                      <span className="text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all" style={{ color: BLUE }}>
                        Book class <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Map (desktop) */}
          <div className="hidden lg:block lg:w-[45%]">
            <div className="sticky top-[140px] h-[calc(100vh-180px)]">
              <MapPanel
                items={mapItems}
                hovered={hovered}
                selected={selected}
                onHover={setHovered}
                onSelect={openQuickView}
                count={mapItems.length}
              />
            </div>
          </div>
        </div>
      </main>

      {/* ── Mobile map toggle (floating) ─────────────────────────────────── */}
      <button
        onClick={() => setMobileMap(true)}
        className="lg:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-40 h-12 px-5 rounded-full text-white font-semibold text-sm shadow-xl flex items-center gap-2"
        style={{ background: '#111827' }}
      >
        <Map className="w-4 h-4" /> Map
      </button>

      {/* ── Mobile full-screen map ───────────────────────────────────────── */}
      {mobileMap && (
        <div className="lg:hidden fixed inset-0 z-50 bg-[#0F172A]">
          <button
            onClick={() => setMobileMap(false)}
            className="absolute top-4 left-4 z-50 h-10 px-4 rounded-full bg-white text-[#111827] font-semibold text-sm shadow-lg flex items-center gap-1.5"
          >
            <List className="w-4 h-4" /> List
          </button>
          <MapPanel
            items={mapItems}
            hovered={hovered}
            selected={selected}
            onHover={setHovered}
            onSelect={openQuickView}
            count={mapItems.length}
          />
        </div>
      )}

      {/* ── Quick View ───────────────────────────────────────────────────── */}
      {quickView && <SchoolQuickView school={quickView} onClose={() => setQuickView(null)} />}

      <Footer />

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}

// ── Map Panel ───────────────────────────────────────────────────────────────--

function MapPanel({
  items, hovered, selected, onHover, onSelect, count,
}: {
  items: Academy[]
  hovered: string | null
  selected: string | null
  onHover: (id: string | null) => void
  onSelect: (id: string) => void
  count: number
}) {
  return (
    <div className="h-full w-full rounded-none lg:rounded-3xl overflow-hidden border-0 lg:border lg:border-[#E5E7EB] shadow-xl bg-[#0F172A] flex flex-col">
      {/* Header */}
      <div className="bg-[#0B1220] text-white px-4 py-3 flex items-center justify-between border-b border-white/10 z-20">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Live
        </span>
        <span className="text-[10px] font-semibold text-white/40 tracking-wider">MÁLAGA · LONDON · DUBAI</span>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <Image src="/hero-2.jpg" alt="" fill className="object-cover opacity-[0.08] grayscale" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_30%,#1e293b,#0f172a)]" />
        {/* grid */}
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        {items.map(school => {
          const isActive = hovered === school.id || selected === school.id
          return (
            <div
              key={school.id}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${school.coordinates.x}%`, top: `${school.coordinates.y}%` }}
              onMouseEnter={() => onHover(school.id)}
              onMouseLeave={() => onHover(null)}
            >
              {isActive && <span className="absolute -inset-3 rounded-full animate-ping bg-rose-500/40 pointer-events-none" />}
              <button
                onClick={() => onSelect(school.id)}
                aria-label={school.name}
                className={`relative rounded-full flex items-center justify-center border-2 border-white shadow-lg transition-all ${
                  isActive ? 'w-10 h-10 bg-rose-500 scale-110' : 'w-9 h-9 hover:scale-110'
                }`}
                style={!isActive ? { background: BLUE } : undefined}
              >
                <span className="text-sm font-bold text-white">{school.name.charAt(0)}</span>
              </button>
              {/* Tooltip */}
              <div className={`absolute bottom-12 left-1/2 -translate-x-1/2 w-44 rounded-xl bg-[#0B1220]/95 backdrop-blur border border-white/10 p-2.5 shadow-2xl transition-all pointer-events-none ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                <p className="text-[11px] font-bold text-white truncate">{school.name}</p>
                <p className="text-[10px] text-white/50 truncate mt-0.5">{school.city}</p>
                <span className="flex items-center gap-1 mt-1 text-[10px] text-amber-400">
                  <Star className="w-2.5 h-2.5 fill-current" /> {school.rating}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Stats */}
      <div className="bg-[#0B1220] px-4 py-3 border-t border-white/10 text-[11px] font-semibold text-white/60 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Award className="w-3.5 h-3.5" style={{ color: BLUE }} />
          {count} schools found · Málaga area
        </span>
        <span className="text-white/30">UTC · ONLINE</span>
      </div>
    </div>
  )
}
