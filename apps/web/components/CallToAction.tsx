import Image from 'next/image'
import { Search, Compass } from 'lucide-react'

export default function CallToAction() {
  return (
    <section className="bg-slate-900 py-20 sm:py-28 relative overflow-hidden">
      <div className="absolute right-0 top-0 bottom-0 w-full lg:w-1/2 -z-0">
        <Image src="/hero-1.jpg" alt="Martial arts training" fill className="object-cover opacity-35 lg:opacity-75" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/90 lg:via-slate-900/40 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
        <div className="lg:w-7/12 space-y-8 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0092ff]/20 border border-[#0092ff]/30 text-[#0092ff] text-xs font-black uppercase tracking-wider">
            <Compass className="w-4 h-4 text-sky-400 animate-pulse" />
            <span>Join the Global Martial Movement</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight uppercase">
            READY TO TAKE CONTROL OF YOUR MARTIAL JOURNEY?
          </h2>

          <p className="text-slate-300 text-sm font-semibold leading-relaxed max-w-xl">
            Connecting sports enthusiasts worldwide, enhancing the training experience, making it enjoyable, and easily shareable. Sync your progression metrics and join the absolute standard in martial software.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <a href="#schools"
              className="inline-flex items-center gap-2.5 px-8 py-4 bg-[#0092ff] text-white hover:bg-[#007cd7] text-sm font-extrabold rounded-xl shadow-lg transition-all cursor-pointer active:scale-95">
              <Search className="w-4 h-4" />
              <span>Explore All Academies</span>
            </a>
            <a href="#app-promo"
              className="inline-flex items-center gap-2.5 px-8 py-4 bg-white/10 border border-white/20 text-white hover:bg-white/20 text-sm font-extrabold rounded-xl transition-all cursor-pointer active:scale-95">
              <span>Learn More About Us</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
