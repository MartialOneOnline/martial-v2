'use client'

import { motion } from 'framer-motion'
import { Star, Quote } from 'lucide-react'

const TESTIMONIALS = [
  { id: 't-1', name: 'David Jenkins',   role: 'Chief Instructor', school: 'Roger Gracie Malaga',      quote: 'The digital portal completely automated our student memberships, billing procedures, and notifications. We are highly satisfied.' },
  { id: 't-2', name: 'Sarah Kowalski',  role: 'Academy Owner',    school: 'Mathouse BJJ Reading',     quote: 'Perfect online system that completely automated our combat sports business and streamlined class attendance tracking.' },
  { id: 't-3', name: 'Marcus Sterling', role: 'Academy Owner',    school: 'Carlson Gracie Peniche',   quote: 'Excellent features! The messaging system and schedule tracker have been game changers for our student re-enrollment rates.' },
]

export default function Testimonials() {
  return (
    <section className="bg-slate-50 py-20 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-black text-sky-500 uppercase tracking-widest block mb-1">Success Stories</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
            What Our Happy Users Think
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, idx) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.15 }}
              whileHover={{ y: -4 }}
              className="bg-white border border-gray-100 p-6 rounded-2xl shadow-xs hover:shadow-lg flex flex-col justify-between relative overflow-hidden group"
            >
              <div className="absolute right-4 top-4 text-slate-100 group-hover:text-sky-50 transition-colors pointer-events-none">
                <Quote className="w-12 h-12 rotate-180" />
              </div>

              <div className="space-y-4 text-left">
                <div className="flex items-center gap-1.5 bg-sky-50 py-1.5 px-3 rounded-lg w-max">
                  <div className="flex">
                    {[1,2,3,4,5].map(s => <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                  </div>
                  <span className="text-[11px] font-black text-sky-600">4.9 (40+)</span>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed font-semibold italic">&ldquo;{t.quote}&rdquo;</p>
              </div>

              <div className="mt-8 pt-4 border-t border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#0092ff] to-cyan-500 rounded-full flex items-center justify-center text-white font-extrabold text-sm shrink-0">
                  {t.name[0]}
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800 leading-tight">{t.name}</h4>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">
                    {t.role} • {t.school}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
