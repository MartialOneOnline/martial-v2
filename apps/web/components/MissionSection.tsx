'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

export default function MissionSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-[#0092ff] to-cyan-500 text-white py-16 sm:py-24">
      <div className="absolute top-0 left-0 opacity-10 pointer-events-none">
        <svg className="w-80 h-80 text-white" fill="currentColor" viewBox="0 0 100 100"><circle cx="20" cy="20" r="40" /></svg>
      </div>
      <div className="absolute bottom-0 right-0 opacity-15 pointer-events-none">
        <svg className="w-[450px] h-[450px] text-white" fill="currentColor" viewBox="0 0 100 100"><circle cx="80" cy="80" r="50" /></svg>
      </div>

      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <div className="flex justify-center mb-8">
          <Image src="/martial-logo.png" alt="Martial App" width={64} height={64} className="object-contain" />
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight mb-8">
          Our Mission is to Bring Technology Solutions to the Martial Arts and Combat Sports Industry
        </h2>
        <a href="#technology" className="inline-flex items-center gap-2 group text-white font-extrabold text-[15px] border-b-2 border-white pb-1.5 hover:text-sky-100 hover:border-sky-100 transition-colors">
          <span>More About Us</span>
          <motion.span animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}>
            <ArrowRight className="w-4 h-4" />
          </motion.span>
        </a>
      </div>
    </section>
  )
}
