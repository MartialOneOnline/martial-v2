'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

export default function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [openAt, setOpenAt] = useState<number | null>(null)

  useEffect(() => {
    if (openAt === null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenAt(null)
      if (e.key === 'ArrowRight') setOpenAt(i => (i === null ? i : (i + 1) % images.length))
      if (e.key === 'ArrowLeft') setOpenAt(i => (i === null ? i : (i - 1 + images.length) % images.length))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openAt, images.length])

  if (images.length === 0) return null

  return (
    <>
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-5">
        <p className="text-sm font-bold text-[#101828] mb-3">Gallery</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {images.map((url, i) => (
            <button
              key={url + i}
              onClick={() => setOpenAt(i)}
              className="relative aspect-square rounded-xl overflow-hidden border border-gray-100 hover:opacity-90 transition-opacity"
            >
              <Image src={url} alt={`${alt} ${i + 1}`} fill className="object-cover" sizes="150px" />
            </button>
          ))}
        </div>
      </div>

      {openAt !== null && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90" onClick={() => setOpenAt(null)}>
          <button
            onClick={() => setOpenAt(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <X className="w-5 h-5" />
          </button>

          {images.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); setOpenAt(i => (i === null ? i : (i - 1 + images.length) % images.length)) }}
                className="absolute left-2 md:left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); setOpenAt(i => (i === null ? i : (i + 1) % images.length)) }}
                className="absolute right-2 md:right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          <div className="relative w-full h-full max-w-4xl max-h-[80vh] m-4" onClick={e => e.stopPropagation()}>
            <Image src={images[openAt]!} alt={`${alt} ${openAt + 1}`} fill className="object-contain" sizes="100vw" />
          </div>
        </div>
      )}
    </>
  )
}
