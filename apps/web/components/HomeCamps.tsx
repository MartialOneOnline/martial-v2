import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function HomeCamps() {
  return (
    <section className="bg-[#0E3A7A] py-20 sm:py-24" id="camps">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Text */}
          <div className="space-y-6">
            <span className="text-xs font-extrabold tracking-widest text-[#7DE7EC] uppercase">
              Camps & Marketplace
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
              More than training.<br />Be part of something bigger.
            </h2>
            <p className="text-white/70 text-lg leading-relaxed">
              Join exclusive camps with elite athletes and discover products from trusted martial arts brands. Schools can earn commission from marketplace sales.
            </p>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#7DE7EC] text-[#0E3A7A] font-extrabold text-sm uppercase tracking-wider rounded-xl hover:bg-white transition-colors"
            >
              Explore Camps & Marketplace
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Cards preview */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { emoji: '🏕️', label: 'Elite Camps',       desc: 'Train with world champions' },
              { emoji: '🛒', label: 'Marketplace',        desc: 'Gear, apparel & nutrition' },
              { emoji: '💰', label: 'School Commission',  desc: 'Earn from every sale' },
              { emoji: '🌍', label: 'Global Community',   desc: 'Connect worldwide' },
            ].map(card => (
              <div key={card.label} className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/10 hover:bg-white/15 transition-colors">
                <div className="text-3xl mb-3">{card.emoji}</div>
                <p className="text-white font-bold text-sm">{card.label}</p>
                <p className="text-white/50 text-xs mt-1">{card.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}
