'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'

const TICKS = [
  'Manage and control their business in the cloud.',
  'Receive payments, Upload content.',
  'A great experience of the user\'s martial arts journey.',
  'Connect with students on a deeper level.',
  'Multilingual solution.',
]

const STUDENTS = [
  { name: 'Adam Smith',    rank: 'Blue Belt',   attendance: '92%', lastSeen: 'Today' },
  { name: 'Chloe Vance',  rank: 'Green Belt',  attendance: '88%', lastSeen: '2 days ago' },
  { name: 'Daniel Craig',  rank: 'Black Belt',  attendance: '98%', lastSeen: 'Today' },
  { name: 'Beatrix Kiddo', rank: 'Yellow Belt', attendance: '100%',lastSeen: '1 hour ago' },
]

const PAYMENTS = [
  { id: '#1025', name: 'Adam Smith',    amount: '£45.00',  status: 'Succeeded', date: 'May 28' },
  { id: '#1024', name: 'Chloe Vance',  amount: '£45.00',  status: 'Succeeded', date: 'May 27' },
  { id: '#1023', name: 'Beatrix Kiddo',amount: '£60.00',  status: 'Pending',   date: 'May 28' },
  { id: '#1022', name: 'Marcus Aurel', amount: '£120.00', status: 'Succeeded', date: 'May 25' },
]

const SCHEDULE = [
  { time: '09:00 AM', name: 'Kids Taekwondo Basic',  instructor: 'Master Ahn',    attendees: 14 },
  { time: '11:00 AM', name: 'Adults BJJ Sparring',   instructor: 'Prof. Silva',   attendees: 22 },
  { time: '05:30 PM', name: 'Muay Thai Kickboxing',  instructor: 'Kru Jenkins',   attendees: 19 },
]

const PHOTOS = [
  { src: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=400&h=300&fit=crop&q=80', rotate: '-rotate-6', z: 'z-10', top: 'top-0', right: 'right-16' },
  { src: 'https://images.unsplash.com/photo-1517438476312-10d79c077509?w=400&h=300&fit=crop&q=80', rotate: 'rotate-3',  z: 'z-20', top: 'top-16', right: 'right-0' },
  { src: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&h=300&fit=crop&q=80', rotate: '-rotate-2', z: 'z-30', top: 'top-36', right: 'right-20' },
]

export default function FeaturesCloud() {
  const [activeTab, setActiveTab] = useState<'students' | 'payments' | 'schedule'>('students')

  return (
    <section className="bg-[#EEF5FB] py-20 sm:py-28" id="technology">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">

        {/* Top heading */}
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#101828] leading-snug">
            A FREE to user Platform for
          </h2>
          <p className="text-3xl sm:text-4xl font-bold text-[#0870E2] mt-1">
            Martial Arts Businesses &amp; Practitioners
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left — label + iPad mockup */}
          <div className="flex flex-col items-start gap-8">
            <p className="text-base font-semibold text-gray-500 border-l-2 border-[#0870E2] pl-4 max-w-xs leading-snug">
              Martial is an Off-the-shelf Business Management Solution
            </p>

            {/* iPad frame */}
            <div className="w-full max-w-lg mx-auto">
              <div className="relative bg-gray-200 rounded-[2.5rem] p-3 shadow-2xl border border-gray-300">
                {/* iPad top bar */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-gray-400 rounded-full" />
                {/* Screen */}
                <div className="rounded-[1.8rem] overflow-hidden bg-white border border-gray-100">
                  {/* App header */}
                  <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-[#0870E2] flex items-center justify-center">
                        <span className="text-white text-[10px] font-black">M</span>
                      </div>
                      <span className="text-xs font-bold text-gray-700">MARTIAL</span>
                      <span className="text-[9px] text-gray-400 font-medium">TAKE CONTROL</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#0870E2]/10 flex items-center justify-center overflow-hidden">
                        <span className="text-[9px] font-bold text-[#0870E2]">AQ</span>
                      </div>
                      <span className="text-[10px] font-semibold text-gray-600">Adnan Quieshi</span>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="bg-gray-50 border-b border-gray-100 px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center bg-white p-0.5 rounded-lg border border-gray-200 gap-0.5">
                      {(['students', 'payments', 'schedule'] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer capitalize ${activeTab === tab ? 'bg-[#0870E2] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                          {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                      ))}
                    </div>
                    <span className="text-[9px] text-gray-400 font-mono">Mon, Sep 11 — Thu Sep 21</span>
                  </div>

                  {/* Content */}
                  <div className="p-3 min-h-[260px] bg-white">
                    <AnimatePresence mode="wait">
                      {activeTab === 'students' && (
                        <motion.div key="students" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-2">
                          <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Active Members</span>
                            <span className="bg-[#0870E2]/10 text-[#0870E2] text-[8px] font-bold px-2 py-0.5 rounded-md">4 Active Now</span>
                          </div>
                          {STUDENTS.map((s, i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-[#0870E2]/10 flex items-center justify-center text-[9px] font-bold text-[#0870E2]">{s.name[0]}</div>
                                <div><p className="text-[10px] font-bold text-gray-800">{s.name}</p><p className="text-[8px] text-gray-400">{s.rank}</p></div>
                              </div>
                              <div className="text-right"><p className="text-[10px] font-bold text-gray-700">{s.attendance}</p><p className="text-[8px] text-emerald-500">{s.lastSeen}</p></div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                      {activeTab === 'payments' && (
                        <motion.div key="payments" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-2">
                          <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Recent Transactions</span>
                            <span className="bg-emerald-50 text-emerald-600 text-[8px] font-bold px-2 py-0.5 rounded-md border border-emerald-100">Stripe Active</span>
                          </div>
                          {PAYMENTS.map((p, i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                              <div><p className="text-[10px] font-bold text-gray-800">{p.name}</p><p className="text-[8px] text-gray-400 font-mono">{p.id} · {p.date}</p></div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-gray-800">{p.amount}</span>
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${p.status === 'Succeeded' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{p.status}</span>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                      {activeTab === 'schedule' && (
                        <motion.div key="schedule" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-2">
                          <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Today Classes</span>
                            <span className="text-[8px] text-gray-400 font-mono">28 May 2026</span>
                          </div>
                          {SCHEDULE.map((s, i) => (
                            <div key={i} className="p-2 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between">
                              <div><p className="text-[10px] font-bold text-gray-800">{s.name}</p><p className="text-[8px] text-gray-400 mt-0.5">{s.instructor}</p></div>
                              <div className="text-right"><span className="text-[8px] font-bold bg-[#0870E2]/10 text-[#0870E2] px-1.5 py-0.5 rounded-md">{s.time}</span><p className="text-[8px] text-gray-400 mt-1">{s.attendees} attendees</p></div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* iPad bottom bar */}
                  <div className="bg-gray-50 border-t border-gray-100 px-4 py-1.5 flex items-center justify-between text-gray-400 text-[8px]">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />All Systems Operational</span>
                    <span className="font-mono">VER. 2.14.0</span>
                  </div>
                </div>
                {/* iPad home indicator */}
                <div className="mt-2 flex justify-center">
                  <div className="w-20 h-1 bg-gray-400 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Right — stacked photos + checkmarks */}
          <div className="flex flex-col gap-10">
            {/* Stacked photos */}
            <div className="relative h-64 hidden lg:block">
              <img
                src="https://images.unsplash.com/photo-1555597673-b21d5c935865?w=320&h=220&fit=crop&q=80"
                alt="BJJ training"
                className="absolute top-0 left-12 w-48 h-36 object-cover rounded-2xl shadow-lg -rotate-6 z-10 border-4 border-white"
              />
              <img
                src="https://images.unsplash.com/photo-1517438476312-10d79c077509?w=320&h=220&fit=crop&q=80"
                alt="Martial arts"
                className="absolute top-4 left-44 w-52 h-40 object-cover rounded-2xl shadow-xl rotate-3 z-20 border-4 border-white"
              />
              <img
                src="https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=320&h=220&fit=crop&q=80"
                alt="Boxing training"
                className="absolute top-20 left-24 w-56 h-44 object-cover rounded-2xl shadow-2xl -rotate-1 z-30 border-4 border-white"
              />
            </div>

            {/* Checkmarks */}
            <div className="space-y-5">
              {TICKS.map((tick, i) => (
                <div key={i} className="flex gap-3 items-start group">
                  <CheckCircle2 className="w-5 h-5 text-[#0870E2] shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <p className="text-gray-600 text-sm font-semibold leading-relaxed">{tick}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* CTA */}
        <div className="text-center mt-14">
          <a href="#register"
            className="inline-flex items-center justify-center px-10 py-4 bg-[#0870E2] text-white font-extrabold text-[15px] rounded-xl hover:bg-[#004d79] shadow-md transition-all cursor-pointer active:scale-95">
            Start a FREE Account
          </a>
        </div>

      </div>
    </section>
  )
}
