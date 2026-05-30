"use client"

import { useState, use } from "react"
import Image from "next/image"
import Link from "next/link"

// Demo data — replace with real DB fetch using `slug`
const SCHOOL = {
  name: "Roger Gracie Malaga",
  slug: "roger-gracie-malaga",
  description:
    "Roger Gracie Malaga is a premium martial arts academy situated in Malaga, Spain. Proud official affiliate of the Roger Gracie Academy. It comprises master-grade instruction, safety-audited tatami mat sheets, distinct locker bays, functional zones, and continuous progress certification programs recognized worldwide. Our dojo represents mutual respect, sportsmanship, and tactical development.",
  address: "Calle Polifemo, 3, Málaga, España",
  phone: "+34665988898",
  website: "rogergraciemalaga.com",
  email: "rogergraciemalaga@gmail.com",
  disciplines: ["BJJ", "Grappling", "Kids BJJ"],
  rating: 4.9,
  reviews: 128,
  mapEmbedUrl:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3198.0!2d-4.42!3d36.72!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzbCsDQzJzEyLjAiTiA0wrAyNScxMi4wIlc!5e0!3m2!1sen!2ses!4v1234567890",
  photos: [
    "/images/roger-gracie-1.jpg",
    "/images/roger-gracie-2.jpg",
  ],
  // Fallback Unsplash photos until real ones are uploaded
  photosFallback: [
    "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=800&h=420&fit=crop&q=85",
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=420&fit=crop&q=85",
    "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=420&fit=crop&q=85",
  ],
  schedule: [
    { day: "Monday / Wednesday", time: "19:00 – 20:30", class: "Adult BJJ – All levels" },
    { day: "Tuesday / Thursday", time: "19:00 – 20:00", class: "No-Gi Grappling" },
    { day: "Saturday", time: "10:00 – 11:30", class: "Kids BJJ (6-14 yrs)" },
    { day: "Saturday", time: "11:30 – 13:00", class: "Open Mat" },
  ],
  facilities: ["Tatami mats (200m²)", "Locker rooms", "Shower facilities", "Pro shop", "Video analysis room"],
}

export default function SchoolProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [photoIndex, setPhotoIndex] = useState(0)
  const photos = SCHOOL.photos.length ? SCHOOL.photos : SCHOOL.photosFallback

  const prev = () => setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)
  const next = () => setPhotoIndex((i) => (i + 1) % photos.length)

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa] selection:bg-sky-500 selection:text-white">

      {/* ── NAVBAR ─────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/martial-logo.png" alt="Martial" width={40} height={40} className="object-contain" />
            <span className="font-semibold text-[#061229] text-base tracking-wide">MARTIAL</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-[#333]">
            <Link href="/" className="hover:text-[#006197] transition-colors">Home</Link>
            <Link href="/explore" className="text-[#006197] font-medium">Explore</Link>
            <Link href="/academy" className="hover:text-[#006197] transition-colors">Academy</Link>
            <Link href="/dashboard" className="hover:text-[#006197] transition-colors">Dashboard</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm bg-[#006197] text-white px-4 py-2 rounded-full font-medium hover:bg-[#005080] transition-colors">
              Dashboard
            </Link>
            <Link href="/login" className="text-sm border border-[#006197] text-[#006197] px-4 py-2 rounded-full font-medium hover:bg-[#e8f7ff] transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* ── SUBSECTION BAR ─────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-[#4f4f4f]">
          <Link href="/explore" className="flex items-center gap-1 hover:text-[#006197] transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Explore
          </Link>
        </div>
      </div>

      {/* ── MAIN CONTENT ───────────────────────── */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-10">
        <div className="grid lg:grid-cols-12 gap-8 items-start">

          {/* LEFT COLUMN */}
          <div id="profile-left-lane" className="lg:col-span-8 space-y-8 font-sans">

            {/* Photo carousel */}
            <div
              id="dojo-photo-carousel"
              className="relative h-[320px] sm:h-[420px] bg-slate-800 rounded-3xl overflow-hidden shadow-lg group"
            >
              <Image
                src={photos[photoIndex] ?? ''}
                alt={`${SCHOOL.name} photo ${photoIndex + 1}`}
                fill
                className="w-full h-full object-cover opacity-95 transition-all duration-500"
                unoptimized
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent pointer-events-none" />

              {/* Prev button */}
              <button
                id="carousel-prev"
                onClick={prev}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 border border-white/35 text-white flex items-center justify-center cursor-pointer transition-colors"
                aria-label="Previous photo"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Next button */}
              <button
                id="carousel-next"
                onClick={next}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 border border-white/35 text-white flex items-center justify-center cursor-pointer transition-colors"
                aria-label="Next photo"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Dots */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPhotoIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${i === photoIndex ? "bg-white w-5" : "bg-white/50"}`}
                    aria-label={`Photo ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* School name & description */}
            <div id="profile-headings" className="space-y-4 text-left font-sans">
              <h1 className="text-3xl font-bold text-[#061229] tracking-tight uppercase">
                {SCHOOL.name}
              </h1>
              <p className="text-[#4f4f4f] leading-relaxed">{SCHOOL.description}</p>
            </div>

            {/* Schedule */}
            <div id="schedule-planner" className="border border-slate-100 rounded-2xl bg-slate-50 p-5 space-y-4">
              <h2 className="text-lg font-semibold text-[#061229]">Class Schedule</h2>
              <div className="space-y-2">
                {SCHOOL.schedule.map((s, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2 border-b border-slate-100 last:border-0">
                    <div>
                      <span className="text-sm font-medium text-[#061229]">{s.class}</span>
                      <span className="text-xs text-[#4f4f4f] ml-2">{s.day}</span>
                    </div>
                    <span className="text-xs font-mono text-[#006197] bg-[#e8f7ff] px-3 py-1 rounded-full">{s.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Disciplines */}
            <div id="activities-panel" className="space-y-3">
              <h2 className="text-lg font-semibold text-[#061229]">Disciplines</h2>
              <div className="flex flex-wrap gap-2">
                {SCHOOL.disciplines.map((d) => (
                  <span key={d} className="text-sm bg-[#e8f7ff] text-[#006197] px-4 py-1.5 rounded-full font-medium">
                    {d}
                  </span>
                ))}
              </div>
            </div>

            {/* Facilities */}
            <div id="facilities-panel" className="space-y-3">
              <h2 className="text-lg font-semibold text-[#061229]">Facilities</h2>
              <ul className="grid sm:grid-cols-2 gap-2">
                {SCHOOL.facilities.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-[#4f4f4f]">
                    <svg className="w-4 h-4 text-[#006197] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div id="profile-right-lane" className="lg:col-span-4 space-y-6">

            {/* Dojo locator */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="text-xs font-semibold uppercase tracking-widest text-[#4f4f4f]">Dojo Locator</span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SCHOOL.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#006197] font-medium flex items-center gap-1 hover:underline"
                >
                  Open in Maps
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
              {/* Static map placeholder — swap iframe for real embed */}
              <div className="relative h-44 bg-slate-100">
                <iframe
                  src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY&q=${encodeURIComponent(SCHOOL.address)}`}
                  className="w-full h-full border-0"
                  loading="lazy"
                  title="Dojo location"
                />
              </div>
              <div className="px-4 py-3 text-xs text-[#4f4f4f]">{SCHOOL.address}</div>
            </div>

            {/* Contact info */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm px-4 py-4 space-y-3">
              <ContactRow icon="pin" text={SCHOOL.address} />
              <ContactRow icon="phone" text={SCHOOL.phone} href={`tel:${SCHOOL.phone}`} />
              <ContactRow icon="globe" text={SCHOOL.website} href={`https://${SCHOOL.website}`} />
              <ContactRow icon="mail" text={SCHOOL.email} href={`mailto:${SCHOOL.email}`} />
            </div>

            {/* Rating */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm px-4 py-4 flex items-center gap-4">
              <div className="text-4xl font-bold text-[#006197]">{SCHOOL.rating}</div>
              <div>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className={`w-4 h-4 ${i < Math.floor(SCHOOL.rating) ? "text-yellow-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-xs text-[#4f4f4f] mt-0.5">{SCHOOL.reviews} reviews</p>
              </div>
            </div>

            {/* CTA */}
            <button className="w-full bg-[#006197] hover:bg-[#005080] text-white font-semibold py-3 rounded-2xl transition-colors">
              Book a Trial Class
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

/* ── helpers ─────────────────────────────── */

const ICONS = {
  pin: (
    <svg className="w-4 h-4 flex-shrink-0 text-[#006197]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  phone: (
    <svg className="w-4 h-4 flex-shrink-0 text-[#006197]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
  globe: (
    <svg className="w-4 h-4 flex-shrink-0 text-[#006197]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
    </svg>
  ),
  mail: (
    <svg className="w-4 h-4 flex-shrink-0 text-[#006197]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
}

function ContactRow({ icon, text, href }: { icon: keyof typeof ICONS; text: string; href?: string }) {
  const content = (
    <div className="flex items-center gap-3">
      {ICONS[icon]}
      <span className="text-sm text-[#4f4f4f] truncate">{text}</span>
    </div>
  )
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block hover:text-[#006197] transition-colors">
      {content}
    </a>
  ) : (
    <div>{content}</div>
  )
}
