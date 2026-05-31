'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { Users, Building2, Shield } from 'lucide-react'
import { PARTNER_LOGOS } from '../lib/data'

export default function PartnersSection() {
  return (
    <section className="bg-slate-50 py-20 sm:py-28 relative overflow-hidden border-t border-gray-100" id="learning">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">

          {/* Left */}
          <div className="lg:col-span-7 space-y-8 text-left">
            <div>
              <span className="text-xs font-black text-sky-500 uppercase tracking-widest block mb-2">
                Our Global Ecosystem
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight uppercase">
                More Than Mere Business Associates, <br />
                <span className="text-[#0092ff]">Genuine Companions On This Journey</span>
              </h2>
            </div>

            <p className="text-slate-600 text-[14px] leading-relaxed max-w-xl font-semibold">
              Martial App empowers academy owners with a simple user experience that frees up time for them to teach, retain current memberships, and find new students. Together, we are building a synchronized network of global dojos supporting the evolution of martial arts.
            </p>

            <div className="grid grid-cols-3 gap-4 pt-4 max-w-lg">
              {[
                { value: '+23.6k', label: 'Active Members', icon: <Users className="w-3.5 h-3.5 text-sky-500" /> },
                { value: '340',    label: 'Academies',      icon: <Building2 className="w-3.5 h-3.5 text-sky-500" /> },
                { value: '25',     label: 'Martial Arts',   icon: <Shield className="w-3.5 h-3.5 text-sky-500" /> },
              ].map(s => (
                <div key={s.label} className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-center">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{s.value}</span>
                  <span className="text-[10px] sm:text-xs text-slate-400 font-bold mt-1 inline-flex items-center gap-1">
                    {s.icon}{s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — logos */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="grid grid-cols-3 gap-x-10 gap-y-8 max-w-[420px]">
              {PARTNER_LOGOS.map(item => (
                <motion.div
                  key={item.id}
                  className="w-28 h-28 flex items-center justify-center cursor-pointer"
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 12 }}
                  title={item.name}
                >
                  <Image src={item.img} alt={item.name} width={112} height={112} className="w-full h-full object-contain drop-shadow-sm" />
                </motion.div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
