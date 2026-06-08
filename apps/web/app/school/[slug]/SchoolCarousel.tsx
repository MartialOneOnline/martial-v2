'use client'

import { useState } from 'react'
import Image from 'next/image'

export default function SchoolCarousel({ photos, name }: { photos: string[]; name: string }) {
  const [idx, setIdx] = useState(0)
  const prev = () => setIdx(i => (i - 1 + photos.length) % photos.length)
  const next = () => setIdx(i => (i + 1) % photos.length)

  return (
    <div className="relative h-[320px] sm:h-[420px] bg-slate-800 rounded-3xl overflow-hidden shadow-lg group">
      <Image
        src={photos[idx] ?? photos[0]!}
        alt={`${name} photo ${idx + 1}`}
        fill
        className="w-full h-full object-cover opacity-95 transition-all duration-500"
        unoptimized
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent pointer-events-none" />

      <button onClick={prev} aria-label="Previous photo"
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 border border-white/35 text-white flex items-center justify-center transition-colors">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button onClick={next} aria-label="Next photo"
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 border border-white/35 text-white flex items-center justify-center transition-colors">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {photos.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)}
            className={`h-2 rounded-full transition-all ${i === idx ? 'w-5 bg-white' : 'w-2 bg-white/50'}`}
            aria-label={`Photo ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
