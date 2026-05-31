'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, MapPin, ChevronRight, X, Phone, Mail, Clock, ShieldCheck, Dumbbell } from 'lucide-react'
import { FEATURED_SCHOOLS, School } from '../lib/data'

const SCHOOL_DETAILS: Record<string, { phone: string; email: string; schedule: string; courses: string[] }> = {
  'school-1': { phone: '+34 951 234 567', email: 'info@rogergraciemalaga.com',  schedule: 'Mon–Sat: 08:00–21:30', courses: ['Brazilian Jiu-Jitsu', 'Kids BJJ', 'No-Gi Grappling'] },
  'school-2': { phone: '+34 956 123 456', email: 'info@rafaelpousada.com',      schedule: 'Mon–Fri: 09:00–21:00', courses: ['Brazilian Jiu-Jitsu', 'Judo', 'Self Defence'] },
  'school-3': { phone: '+351 262 789 123', email: 'info@carlsonpeniche.pt',     schedule: 'Mon–Sun: 09:00–22:00', courses: ['Brazilian Jiu-Jitsu', 'Grappling', 'Kids Classes'] },
  'school-4': { phone: '+44 118 960 1234', email: 'info@mathouse.co.uk',        schedule: 'Mon–Sun: 07:00–22:00', courses: ['Brazilian Jiu-Jitsu', 'No-Gi BJJ', 'Wrestling'] },
}

export default function FeaturedSchools() {
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null)
  const [bookingSuccess, setBookingSuccess] = useState(false)

  return (
    <section className="bg-white py-20 border-b border-gray-100" id="schools">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-12">
          <div>
            <span className="text-xs font-black text-sky-500 uppercase tracking-widest block mb-2">
              Find a Dojo Near You
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
              Our Featured Schools
            </h2>
          </div>
          <button
            onClick={() => setSelectedSchool(FEATURED_SCHOOLS[0] ?? null)}
            className="px-6 py-3 border-2 border-slate-200 hover:border-[#0092ff] text-slate-700 hover:text-[#0092ff] text-[14px] font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2"
          >
            Explore all <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURED_SCHOOLS.map((school, idx) => (
            <motion.div
              key={school.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -6 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-xs hover:shadow-xl overflow-hidden flex flex-col h-full group"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                <Image src={school.image} alt={school.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-800 shadow-sm flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>{school.rating} ({school.reviewCount}+)</span>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-[#0092ff] uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="w-3 h-3" />{school.location}
                  </p>
                  <h3 className="font-extrabold text-slate-800 text-[15px] group-hover:text-[#0092ff] transition-colors leading-snug">
                    {school.name}
                  </h3>
                  <p className="text-[12px] text-slate-500 leading-relaxed line-clamp-3 font-semibold">
                    {school.description}
                  </p>
                </div>
                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(s => <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                  </div>
                  <button
                    onClick={() => setSelectedSchool(school)}
                    className="text-[#0092ff] hover:text-[#007cd7] text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                  >
                    Learn More <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedSchool && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative overflow-y-auto max-h-[90vh]"
            >
              <button
                onClick={() => { setSelectedSchool(null); setBookingSuccess(false) }}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 p-2 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="relative aspect-[3/1] w-full rounded-2xl overflow-hidden bg-slate-100 mb-6">
                <Image src={selectedSchool.image} alt={selectedSchool.name} fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                  <span className="text-white text-xs font-black tracking-widest uppercase bg-[#0092ff]/90 px-3 py-1 rounded-md">
                    Featured Academy
                  </span>
                </div>
              </div>

              {bookingSuccess ? (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-950">Trial Session Booked!</h3>
                  <p className="text-sm text-slate-600 max-w-md mx-auto font-semibold">
                    Confirmation email sent for <span className="text-[#0092ff]">{selectedSchool.name}</span>.
                  </p>
                  <button
                    onClick={() => { setSelectedSchool(null); setBookingSuccess(false) }}
                    className="px-8 py-3 bg-[#0092ff] text-white text-sm font-black rounded-lg shadow-md hover:bg-[#007cd7] transition-all cursor-pointer"
                  >
                    Return to Schools
                  </button>
                </div>
              ) : (
                <div className="grid md:grid-cols-12 gap-6 items-start">
                  <div className="md:col-span-8 space-y-4">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900">{selectedSchool.name}</h3>
                      <p className="text-sm font-bold text-sky-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-4 h-4" />{selectedSchool.location}
                      </p>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed font-semibold">{selectedSchool.description}</p>
                    <div className="space-y-2.5 pt-2">
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 uppercase tracking-wider">
                        <Dumbbell className="w-4 h-4 text-sky-500" /> Disciplines
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {SCHOOL_DETAILS[selectedSchool.id]?.courses.map((c, i) => (
                          <span key={i} className="bg-sky-50 border border-sky-100 text-sky-600 font-bold text-xs px-3 py-1 rounded-full">{c}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-4 bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-4">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-black text-slate-800">{selectedSchool.rating}</span>
                      <span className="text-xs text-slate-400 font-semibold">({selectedSchool.reviewCount}+ reviews)</span>
                    </div>
                    <div className="space-y-2.5 text-xs text-slate-500 border-t border-slate-200 pt-3">
                      <div className="flex items-start gap-2"><Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" /><span className="font-semibold">{SCHOOL_DETAILS[selectedSchool.id]?.phone}</span></div>
                      <div className="flex items-start gap-2"><Mail className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" /><span className="font-semibold truncate">{SCHOOL_DETAILS[selectedSchool.id]?.email}</span></div>
                      <div className="flex items-start gap-2"><Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" /><span className="font-semibold">{SCHOOL_DETAILS[selectedSchool.id]?.schedule}</span></div>
                    </div>
                    <button
                      onClick={() => setBookingSuccess(true)}
                      className="w-full py-2.5 bg-[#0092ff] text-white text-xs font-black rounded-xl hover:bg-[#007cd7] transition-all cursor-pointer shadow-sm"
                    >
                      Book Free Trial Slot
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  )
}
