'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Laptop, Sparkles } from 'lucide-react'

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

export default function FeaturesCloud() {
  const [activeTab, setActiveTab] = useState<'students' | 'payments' | 'schedule'>('students')

  return (
    <section className="bg-slate-50 py-20 sm:py-28 border-y border-gray-100" id="technology">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">

        <div className="grid lg:grid-cols-12 gap-12 items-start">

          {/* Left sidebar */}
          <div className="lg:col-span-3 border-l-2 border-sky-400 pl-6 py-2 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 leading-snug">
              Martial is an Off-the-shelf Business Management Solution
            </h3>
            <p className="text-sm text-slate-500">
              Empowering combat gym owners with modern billing APIs, interactive class scheduling dashboards, and custom progress tracking.
            </p>
          </div>

          {/* Dashboard mockup */}
          <div className="lg:col-span-6">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              {/* Browser bar */}
              <div className="bg-slate-950 px-4 py-3 border-b border-slate-900 flex items-center justify-between">
                <div className="flex gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500 block" />
                  <span className="w-3 h-3 rounded-full bg-amber-400 block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-400 block" />
                </div>
                <div className="text-slate-400 text-[10px] font-mono bg-slate-900/60 px-4 py-1 rounded-md border border-slate-800/40 w-1/2 text-center truncate">
                  martialapp.com/dashboard/apex-martial-arts
                </div>
                <Laptop className="w-3.5 h-3.5 text-slate-500" />
              </div>

              <div className="flex flex-col min-h-[380px] bg-slate-900 text-slate-200">
                {/* Header bar */}
                <div className="bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-slate-300">Apex Portal</span>
                  </div>
                  <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
                    {(['students', 'payments', 'schedule'] as const).map(tab => (
                      <button key={tab} onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer capitalize ${activeTab === tab ? 'bg-[#0092ff] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 flex-1">
                  <AnimatePresence mode="wait">
                    {activeTab === 'students' && (
                      <motion.div key="students" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Members List</span>
                          <span className="bg-sky-500/10 text-sky-400 text-[10px] font-bold px-2 py-0.5 rounded-md">4 Active Now</span>
                        </div>
                        {STUDENTS.map((s, i) => (
                          <div key={i} className="flex items-center justify-between p-2.5 bg-slate-950/50 rounded-xl border border-slate-800/60 hover:bg-slate-950 transition-colors">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-sky-400">{s.name[0]}</div>
                              <div><p className="text-xs font-extrabold text-slate-200">{s.name}</p><p className="text-[10px] text-slate-500">{s.rank}</p></div>
                            </div>
                            <div className="text-right"><p className="text-xs font-bold text-slate-300">{s.attendance}</p><p className="text-[9px] text-emerald-400">{s.lastSeen}</p></div>
                          </div>
                        ))}
                      </motion.div>
                    )}

                    {activeTab === 'payments' && (
                      <motion.div key="payments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Recent Transactions</span>
                          <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-md">Stripe Active</span>
                        </div>
                        {PAYMENTS.map((p, i) => (
                          <div key={i} className="flex items-center justify-between p-2.5 bg-slate-950/50 rounded-xl border border-slate-800/60 hover:bg-slate-950 transition-all">
                            <div><p className="text-xs font-extrabold text-slate-200">{p.name}</p><p className="text-[9px] text-slate-500 font-mono">{p.id} / {p.date}</p></div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-black text-slate-200">{p.amount}</span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${p.status === 'Succeeded' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{p.status}</span>
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}

                    {activeTab === 'schedule' && (
                      <motion.div key="schedule" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Today Classes</span>
                          <span className="text-slate-400 text-[10px] font-bold font-mono">28 May 2026</span>
                        </div>
                        {SCHEDULE.map((s, i) => (
                          <div key={i} className="p-2.5 bg-slate-950/50 rounded-xl border border-slate-800/60 flex items-center justify-between hover:bg-slate-950 transition-all">
                            <div><p className="text-xs font-extrabold text-slate-200">{s.name}</p><p className="text-[10px] text-slate-500 mt-0.5">Teacher: {s.instructor}</p></div>
                            <div className="text-right"><span className="text-[10px] font-bold bg-[#0092ff]/20 text-sky-400 px-2 py-0.5 rounded-md">{s.time}</span><p className="text-[9px] text-slate-400 mt-1">{s.attendees} Check-ins</p></div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="bg-slate-950 p-3 border-t border-slate-800 flex items-center justify-between text-slate-500 text-[10px]">
                  <span className="font-semibold flex items-center gap-1"><Sparkles className="w-3 h-3 text-cyan-400 animate-spin" />All Systems Operational</span>
                  <span className="font-mono">VER. 2.14.0</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right ticks */}
          <div className="lg:col-span-3 space-y-6">
            {TICKS.map((tick, i) => (
              <div key={i} className="flex gap-3 items-start group">
                <CheckCircle2 className="w-5 h-5 text-sky-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <p className="text-slate-600 text-sm font-semibold leading-relaxed">{tick}</p>
              </div>
            ))}
          </div>

        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <a href="#register"
            className="inline-flex items-center justify-center px-10 py-4 bg-[#0092ff] text-white font-extrabold text-[15px] rounded-xl hover:bg-[#007cd7] shadow-md transition-all cursor-pointer active:scale-95">
            Start a FREE Account
          </a>
        </div>

      </div>
    </section>
  )
}
