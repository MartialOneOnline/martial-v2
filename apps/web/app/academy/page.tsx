'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Search, Users, Star, PlayCircle, Clock,
  Sparkles, CheckCircle, ChevronRight, Monitor, Lock, Award, X,
} from 'lucide-react'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import LoginModal from '../../components/LoginModal'
import RegisterModal from '../../components/RegisterModal'

// ── Types & Data ──────────────────────────────────────────────────────────────

interface Course {
  id: string
  title: string
  instructor: { name: string; avatar: string; role: string }
  category: string
  description: string
  price: number
  isSubscriptionOnly: boolean
  image: string
  rating: number
  enrollCount: number
  lessonsCount: number
  durationHours: number
}

interface PatreonTier {
  id: string
  name: string
  priceMonthly: number
  badgeColor: string
  benefits: string[]
  description: string
}

const COURSES: Course[] = [
  {
    id: 'course-1',
    title: 'ROGER GRACIE MASTERCLASS: CLOSED GUARD CONTROL',
    instructor: { name: 'Michael Bisping', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200', role: 'MMA Legend & Head Coach' },
    category: 'MMA',
    description: 'Learn the exact details of Roger Gracie\'s legendary closed guard system. Includes position dominance, defense recovery and transitions.',
    price: 49.00,
    isSubscriptionOnly: false,
    image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=600',
    rating: 4.9, enrollCount: 420, lessonsCount: 16, durationHours: 12.5,
  },
  {
    id: 'course-2',
    title: 'DYNAMIC SWEEPS & SUBMISSION FRAMEWORKS',
    instructor: { name: 'Roger Gracie', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200', role: '10x BJJ World Champion' },
    category: 'BJJ',
    description: 'Unlock high-level sweeps from half-guard, spider-guard, and de la riva. Engineered strictly for modern competitive athletes.',
    price: 29.99,
    isSubscriptionOnly: true,
    image: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&q=80&w=600',
    rating: 5.0, enrollCount: 1280, lessonsCount: 45, durationHours: 35.0,
  },
  {
    id: 'course-3',
    title: 'CHAMPIONSHIP SPARRING: ELITE STRIKING COMBOS',
    instructor: { name: 'John Danaher', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200', role: 'Master Mind Educator' },
    category: 'BJJ',
    description: 'Refine your fight IQ with pro kicking setups, defensive cover-ups, and custom sparring combos from certified trainers.',
    price: 89.00,
    isSubscriptionOnly: false,
    image: 'https://images.unsplash.com/photo-1583473848882-f9a5bb7ff2ee?auto=format&fit=crop&q=80&w=600',
    rating: 4.8, enrollCount: 890, lessonsCount: 22, durationHours: 18.0,
  },
  {
    id: 'course-4',
    title: 'MUAY THAI HEAVY BAG WORKOUTS',
    instructor: { name: 'Kru Buakaw', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200', role: 'Stadium Champion' },
    category: 'Striking',
    description: 'Elite technical heavy bag flows, kicking power building drills, and defensive setups for high impact sparring preparations.',
    price: 19.99,
    isSubscriptionOnly: false,
    image: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&q=80&w=600',
    rating: 4.7, enrollCount: 310, lessonsCount: 12, durationHours: 8.5,
  },
  {
    id: 'course-5',
    title: 'KETTLEBELL STRENGTH FOR GRAPPLERS',
    instructor: { name: 'Jessica Wray', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200', role: 'Certified Strength Specialist' },
    category: 'Fitness',
    description: 'Functional isometric strength conditioning using nothing but your kettlebell to build neck, core, grip, and hip drive stability.',
    price: 34.00,
    isSubscriptionOnly: false,
    image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=600',
    rating: 4.6, enrollCount: 215, lessonsCount: 10, durationHours: 6.0,
  },
]

const PATREON_TIERS: PatreonTier[] = [
  {
    id: 'tier-white',
    name: 'White Belt Supporter',
    priceMonthly: 5.00,
    badgeColor: 'border-slate-300 text-slate-700 bg-slate-50',
    benefits: ['Sponsor Badge inside group chat', 'Direct contact with instructors', 'Weekly sparring breakdown videos'],
    description: 'Support the channel and get standard community forum access.',
  },
  {
    id: 'tier-purple',
    name: 'Purple Belt Scholar',
    priceMonthly: 15.00,
    badgeColor: 'border-purple-300 text-purple-700 bg-purple-50',
    benefits: ['All White Belt sponsor benefits', 'Access to premium subscription tutorials', 'Monthly private Q&A live broadcast', '15% discount on all standalone masterclasses'],
    description: 'Perfect for intermediate scholars looking to step up their technical understanding.',
  },
  {
    id: 'tier-black',
    name: 'Black Belt Inner Circle',
    priceMonthly: 39.00,
    badgeColor: 'border-amber-300 text-amber-700 bg-amber-50',
    benefits: ['Access to ALL video lessons library', 'Direct video feedback critique from coach', 'Instant check-in notifications priority', 'Exclusive brand apparel after 3 months', 'Free pass to all upcoming live webinars'],
    description: 'The ultimate mentorship ecosystem for dedicated martial artists making hyper leaps.',
  },
]

const CATEGORIES = ['All', 'BJJ', 'Striking', 'MMA', 'Fitness']

// ── Component ─────────────────────────────────────────────────────────────────

export default function AcademyPage() {
  const [category, setCategory]         = useState('All')
  const [searchQuery, setSearchQuery]   = useState('')
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [purchasedIds, setPurchasedIds] = useState<string[]>([])
  const [subscribedTier, setSubscribedTier] = useState<string | null>(null)
  const [tierModal, setTierModal]       = useState<PatreonTier | null>(null)
  const [walletBalance]                 = useState(250.00)
  const [showLogin, setShowLogin]       = useState(false)
  const [showRegister, setShowRegister] = useState(false)

  const filteredCourses = useMemo(() => COURSES.filter(c => {
    const matchCat = category === 'All' || c.category === category
    const matchQ = !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.instructor.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchCat && matchQ
  }), [category, searchQuery])

  const handleGetCourse = (course: Course) => {
    if (!purchasedIds.includes(course.id)) {
      setPurchasedIds(p => [...p, course.id])
    }
    setSelectedCourse(null)
  }

  const hasAccess = (course: Course) => {
    if (purchasedIds.includes(course.id)) return true
    if (course.isSubscriptionOnly && (subscribedTier === 'tier-purple' || subscribedTier === 'tier-black')) return true
    return false
  }

  return (
    <div className="bg-[#f8fafc] text-slate-800 min-h-screen font-sans">

      {showLogin    && <LoginModal    onClose={() => setShowLogin(false)}    onOpenRegister={() => { setShowLogin(false); setShowRegister(true) }} />}
      {showRegister && <RegisterModal onClose={() => setShowRegister(false)} onOpenLogin={() => { setShowRegister(false); setShowLogin(true) }} />}

      <Header onOpenLoginModal={() => setShowLogin(true)} />

      {/* ── Academy Sub-header Ribbon ─────────────────────────────────────── */}
      <div className="bg-slate-900 text-white border-b border-sky-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6 overflow-x-auto [&::-webkit-scrollbar]:hidden py-1">
            <span className="font-black text-xs uppercase tracking-widest text-[#0092ff] whitespace-nowrap">
              Martial Online Academy
            </span>
            <div className="h-4 w-px bg-slate-700 shrink-0" />
            {['Categories', 'All Courses', 'Instructors Portal', 'Creator Patreon System'].map(item => (
              <button
                key={item}
                onClick={() => item === 'Creator Patreon System' && document.getElementById('patreon-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-slate-300 hover:text-white text-xs font-bold transition-all whitespace-nowrap cursor-pointer hover:underline"
              >
                {item}
              </button>
            ))}
          </div>
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            <span className="text-xs font-bold text-slate-400">Your Wallet:</span>
            <span className="bg-sky-500/10 text-[#0092ff] border border-sky-400/20 px-2.5 py-1 rounded-md text-xs font-black">
              ${walletBalance.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white py-14 sm:py-20 px-4">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-1/3 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-5">
          <span className="bg-sky-500/10 text-sky-400 border border-sky-500/30 font-black text-[11px] tracking-widest uppercase px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Next-Gen Online Academy &amp; Monetization
          </span>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight uppercase max-w-4xl mx-auto">
            The Way of Learning &amp;{' '}
            <span className="text-sky-400">Teaching</span>
          </h1>

          <p className="mt-5 text-sm sm:text-base text-slate-300 max-w-3xl mx-auto font-medium leading-relaxed">
            Martial Online is an educational platform that empowers instructors to create, manage, and sell video courses and live classes with worldwide students. Instructors generate active passive monthly subscription income just like Patreon!
          </p>

          <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
            <button
              onClick={() => setShowRegister(true)}
              className="w-full sm:w-auto bg-[#0092ff] hover:bg-[#007cd7] text-white font-extrabold text-sm py-4 px-8 rounded-xl shadow-lg shadow-sky-500/20 hover:scale-105 transition-all flex items-center justify-center gap-2 cursor-pointer group"
            >
              Launch Creator Hub (Instructor Mode)
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => document.getElementById('patreon-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 text-white font-extrabold text-sm py-4 px-8 rounded-xl hover:scale-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              Explore Patreon Subscription Tiers
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20 pb-16">

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white rounded-2xl p-5 border border-slate-100 shadow-xl">
          {[
            { value: '10',   label: 'Skillful Instructors', icon: Users,   color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
            { value: '10k+', label: 'Happy Students',       icon: Award,   color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
            { value: '9',    label: 'Live Classes',         icon: Monitor, color: 'text-rose-600 bg-rose-50 border-rose-100' },
            { value: '8',    label: 'Video Courses',        icon: BookOpen,color: 'text-sky-600 bg-sky-50 border-sky-100' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-4 p-3 border-r border-slate-100 last:border-0">
              <div className={`p-3 rounded-xl border ${item.color}`}>
                <item.icon className="w-5 h-5 flex-shrink-0" />
              </div>
              <div className="text-left">
                <p className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">{item.value}</p>
                <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">{item.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Categories & Search */}
        <div className="mt-12 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200">
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-black tracking-wider uppercase transition-all whitespace-nowrap cursor-pointer ${
                  category === cat
                    ? 'bg-[#0092ff] text-white shadow-md shadow-sky-500/10'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80 flex items-center">
            <Search className="w-5 h-5 absolute left-3.5 text-slate-400 pointer-events-none" />
            <input
              suppressHydrationWarning
              type="text"
              placeholder="Search courses or instructors..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white text-slate-800 text-sm pl-11 pr-20 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 tracking-tight transition-all shadow-xs"
            />
            <span className="absolute right-3.5 bg-slate-100 text-slate-500 text-[10px] font-black tracking-wide px-2 py-0.5 rounded-md border border-slate-200 uppercase">
              Ctrl+K
            </span>
          </div>
        </div>

        {/* Course grid */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-8">
            <div className="text-left">
              <h2 className="text-xs font-black tracking-widest text-[#0092ff] uppercase flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 fill-[#0092ff]" /> Recently Published
              </h2>
              <p className="text-xl sm:text-2xl font-black text-slate-800">Newest Martial Online Courses</p>
            </div>
            <span className="text-slate-400 text-xs font-bold">Showing {filteredCourses.length} results</span>
          </div>

          {filteredCourses.length === 0 ? (
            <div className="bg-white rounded-2xl py-12 px-6 text-center border border-slate-100 shadow-xs max-w-xl mx-auto">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-md font-extrabold text-slate-700">No courses match your parameters</h3>
              <button onClick={() => { setCategory('All'); setSearchQuery('') }} className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-extrabold rounded-lg text-xs cursor-pointer">
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map(course => (
                <div
                  key={course.id}
                  className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-lg hover:shadow-xl transition-shadow flex flex-col"
                >
                  {/* Cover image */}
                  <div className="relative h-44 w-full bg-slate-100 overflow-hidden group">
                    <img
                      src={course.image}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-black tracking-widest px-2.5 py-1 rounded-md uppercase border border-white/10">
                      {course.category}
                    </div>
                    {course.isSubscriptionOnly && (
                      <div className="absolute top-3 right-3 bg-indigo-600/90 backdrop-blur-sm text-white text-[9px] font-black tracking-widest px-2.5 py-1 rounded-md flex items-center gap-1 uppercase">
                        <Lock className="w-2.5 h-2.5" /> Patreon Exclusive
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <div className="flex gap-2 text-white bg-slate-900/60 backdrop-blur-sm text-[10px] font-extrabold px-2 py-0.5 rounded-sm">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-sky-400" /> {course.durationHours}h
                        </span>
                        <span className="flex items-center gap-1 border-l border-white/20 pl-2">
                          <BookOpen className="w-3 h-3 text-sky-400" /> {course.lessonsCount} lessons
                        </span>
                      </div>
                      <div className="bg-yellow-400 text-slate-900 px-1.5 py-0.5 rounded flex items-center gap-0.5 text-[10px] font-black">
                        <Star className="w-3 h-3 fill-slate-900" /> {course.rating.toFixed(1)}
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-5 flex-1 flex flex-col text-left">
                    <div className="flex items-center gap-2.5 mb-3">
                      <img src={course.instructor.avatar} alt={course.instructor.name} className="w-7 h-7 rounded-full object-cover border border-slate-200" />
                      <div className="leading-tight">
                        <p className="text-[11px] font-black text-slate-800">{course.instructor.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{course.instructor.role}</p>
                      </div>
                    </div>

                    <h3 className="text-sm font-black text-slate-900 leading-snug uppercase min-h-10 flex items-start">
                      {course.title}
                    </h3>

                    <p className="text-xs font-semibold text-slate-500 mt-2 line-clamp-2 leading-relaxed flex-1">
                      {course.description}
                    </p>

                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 tracking-wider">PRICING</span>
                        <span className="text-lg font-black text-slate-900">
                          {course.isSubscriptionOnly ? 'Sub Access' : `$${course.price.toFixed(2)}`}
                        </span>
                      </div>

                      {hasAccess(course) ? (
                        <button
                          onClick={() => setSelectedCourse(course)}
                          className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-xs py-2 px-4 rounded-xl flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle className="w-4 h-4 text-emerald-600" /> Unlocked / Start
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedCourse(course)}
                          className="bg-[#0092ff] hover:bg-[#007cd7] text-white font-extrabold text-xs py-2 px-4 rounded-xl hover:scale-105 transition-all cursor-pointer shadow-sm"
                        >
                          Get Course
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Patreon Tiers ──────────────────────────────────────────────── */}
        <div className="mt-20 border-t border-slate-200 pt-16 text-center" id="patreon-section">
          <span className="text-[#ff424d] font-black text-xs tracking-widest uppercase bg-[#ff424d]/10 px-3 py-1.5 rounded-full inline-flex items-center gap-1 shadow-sm">
            ❤️ Patreon — Support Your Instructors
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-4 leading-tight uppercase">
            Become a Sponsor &amp; Unlock Exclusive Content
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Support your favourite martial arts instructor directly. Unlock premium content, get exclusive access to live Q&amp;A sessions, and receive personalised coaching feedback.
          </p>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {PATREON_TIERS.map(tier => {
              const isSubscribed = subscribedTier === tier.id
              return (
                <div
                  key={tier.id}
                  className={`bg-white rounded-2xl border p-6 flex flex-col relative overflow-hidden transition-all duration-300 ${
                    isSubscribed ? 'border-[#ff424d] ring-2 ring-[#ff424d]/30 shadow-xl' : 'border-slate-200 shadow-md hover:border-slate-300'
                  }`}
                >
                  {isSubscribed && (
                    <div className="absolute top-0 right-0 bg-[#ff424d] text-white text-[9px] font-black tracking-widest uppercase px-4 py-1 rounded-bl-lg">
                      My Subscription
                    </div>
                  )}

                  <span className={`border text-[9px] font-black tracking-widest uppercase py-1 px-2.5 rounded-md self-start ${tier.badgeColor}`}>
                    {tier.name}
                  </span>

                  <h3 className="text-xl font-black text-slate-900 mt-4">
                    ${tier.priceMonthly.toFixed(2)}
                    <span className="text-slate-400 font-semibold text-xs lowercase"> / m</span>
                  </h3>

                  <p className="text-xs text-slate-500 mt-2 font-medium">{tier.description}</p>

                  <div className="my-5 h-px bg-slate-100" />

                  <ul className="space-y-2.5 flex-1 text-xs text-slate-600 font-semibold">
                    {tier.benefits.map((benefit, i) => (
                      <li key={i} className="flex gap-2 text-left">
                        <CheckCircle className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => {
                      if (!isSubscribed) setTierModal(tier)
                    }}
                    className={`w-full py-3 rounded-xl font-extrabold text-xs tracking-wider transition-all cursor-pointer mt-6 flex items-center justify-center gap-1.5 ${
                      isSubscribed
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                        : 'bg-slate-900 hover:bg-slate-800 text-white shadow-md'
                    }`}
                  >
                    {isSubscribed ? <><CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Active Membership</> : 'Become a Sponsor'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Creator CTA Banner ─────────────────────────────────────────── */}
        <div className="mt-20 bg-slate-900 text-white rounded-3xl p-6 sm:p-12 relative overflow-hidden border border-slate-800">
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-2xl text-left relative z-10">
            <h3 className="text-lg sm:text-2xl font-black uppercase tracking-tight mb-3">
              Are You an Instructor? Start Monetizing Your Knowledge Today.
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-semibold">
              Create your own Patreon-style subscription tiers, publish HD video courses, schedule live classes, and generate passive income from your martial arts expertise.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <button
                onClick={() => setShowRegister(true)}
                className="bg-[#0092ff] hover:bg-[#007cd7] text-white text-xs font-extrabold py-3 px-6 rounded-lg transition-all hover:scale-105 cursor-pointer shadow-md"
              >
                Launch Creator Dashboard
              </button>
              <Link
                href="/explore"
                className="bg-transparent hover:bg-white/10 text-white border border-slate-700 text-xs font-extrabold py-3 px-6 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                Explore Schools &amp; Academies <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

      </div>

      <Footer />

      {/* ── Course Detail Modal ───────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedCourse && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-2xl border border-slate-100 overflow-hidden shadow-2xl relative"
            >
              <div className="p-6">
                <div className="relative h-60 w-full rounded-2xl overflow-hidden bg-slate-100">
                  <img src={selectedCourse.image} alt={selectedCourse.title} className="w-full h-full object-cover" />
                  <button
                    onClick={() => setSelectedCourse(null)}
                    className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-slate-900/80 text-white rounded-full hover:bg-slate-900 cursor-pointer z-30"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-transparent flex items-end p-5 text-left">
                    <div>
                      <span className="bg-sky-500 text-white text-[9px] font-black tracking-widest px-2 py-0.5 rounded-sm uppercase">
                        {selectedCourse.category}
                      </span>
                      <h3 className="text-xl font-black text-white mt-2 leading-tight uppercase">
                        {selectedCourse.title}
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="mt-6 text-left grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-4">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 tracking-widest uppercase">About This Course</h4>
                      <p className="text-xs text-slate-600 mt-2 font-medium leading-relaxed">{selectedCourse.description}</p>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-3 rounded-xl">
                      <img src={selectedCourse.instructor.avatar} alt={selectedCourse.instructor.name} className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <p className="text-xs font-black text-slate-800">{selectedCourse.instructor.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{selectedCourse.instructor.role}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between">
                    <div className="space-y-2.5 text-[11px]">
                      <div className="flex justify-between"><span className="text-slate-400 font-bold">Lessons:</span><span className="text-slate-700 font-black">{selectedCourse.lessonsCount} chapters</span></div>
                      <div className="flex justify-between"><span className="text-slate-400 font-bold">Duration:</span><span className="text-slate-700 font-black">{selectedCourse.durationHours} hrs</span></div>
                      <div className="flex justify-between"><span className="text-slate-400 font-bold">Price:</span><span className="text-slate-700 font-black">{selectedCourse.isSubscriptionOnly ? 'Sub Access' : `$${selectedCourse.price.toFixed(2)}`}</span></div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-200 space-y-2">
                      {hasAccess(selectedCourse) ? (
                        <button onClick={() => setSelectedCourse(null)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3 px-4 rounded-xl cursor-pointer flex items-center justify-center gap-1.5">
                          <PlayCircle className="w-4 h-4" /> Play Lesson
                        </button>
                      ) : (
                        <>
                          {!selectedCourse.isSubscriptionOnly && (
                            <button onClick={() => handleGetCourse(selectedCourse)} className="w-full bg-[#0092ff] hover:bg-[#007cd7] text-white font-extrabold text-xs py-3 px-4 rounded-xl cursor-pointer flex items-center justify-center gap-1 shadow-sm">
                              Buy (${selectedCourse.price.toFixed(2)})
                            </button>
                          )}
                          <button
                            onClick={() => { setSelectedCourse(null); document.getElementById('patreon-section')?.scrollIntoView({ behavior: 'smooth' }) }}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-3 px-4 rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Lock className="w-3.5 h-3.5" /> Unlock via Subscription
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Tier Subscribe Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {tierModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-md border border-slate-100 shadow-2xl p-6 text-left"
            >
              <h3 className="text-xl font-black text-slate-900 leading-tight uppercase">Become a Sponsor</h3>
              <p className="text-xs text-slate-500 mt-2 font-medium">Support your instructor and unlock exclusive content.</p>

              <div className="mt-4 bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-2">
                <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Selected Tier</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-black text-indigo-700">{tierModal.name}</span>
                  <span className="text-md font-black text-slate-800">${tierModal.priceMonthly.toFixed(2)}/mo</span>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <div className="flex justify-between text-xs"><span className="text-slate-400 font-bold">Your Balance:</span><span className="font-black">${walletBalance.toFixed(2)}</span></div>
                <div className="flex justify-between text-xs"><span className="text-slate-400 font-bold">Cost:</span><span className="text-rose-500 font-black">-${tierModal.priceMonthly.toFixed(2)}</span></div>
                <div className="h-px bg-slate-100" />
                <div className="flex justify-between text-xs font-black"><span>Remaining:</span><span className="text-emerald-600">${(walletBalance - tierModal.priceMonthly).toFixed(2)}</span></div>
              </div>

              <div className="mt-6 flex gap-3">
                <button onClick={() => setTierModal(null)} className="w-1/2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer">
                  Cancel
                </button>
                <button
                  onClick={() => { setSubscribedTier(tierModal.id); setTierModal(null) }}
                  className="w-1/2 py-3 bg-[#ff424d] hover:bg-[#e03a44] text-white font-extrabold text-xs rounded-xl cursor-pointer shadow-md"
                >
                  Confirm (${tierModal.priceMonthly.toFixed(2)})
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
