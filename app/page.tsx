import Image from "next/image"
import Link from "next/link"

// Unsplash martial arts images — replace with hosted assets before production
const IMAGES = {
  hero:     "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=900&h=700&fit=crop&q=85",
  school1:  "https://images.unsplash.com/photo-1564089651693-5d58e9c2b8b3?w=600&h=400&fit=crop&q=80",
  school2:  "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=400&fit=crop&q=80",
  school3:  "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=400&fit=crop&q=80",
  athlete:  "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=700&h=900&fit=crop&q=85",
}

/* ─────────────────────────────────────────────
   MARTIAL LANDING PAGE
   Figma: wLZEV2ENEGFDvNQNv2L532 · node 1:27
   Design tokens → globals.css @theme
───────────────────────────────────────────── */

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-[#061229] font-sans">

      {/* ── NAVBAR ─────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/martial-logo.png"
              alt="Martial"
              width={48}
              height={48}
              className="object-contain"
            />
            <span className="font-semibold text-[#061229] text-lg tracking-wide">MARTIAL</span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8 text-sm text-[#333333]">
            <Link href="#" className="hover:text-[#006197] transition-colors">Home</Link>
            <Link href="#features" className="hover:text-[#006197] transition-colors">Features</Link>
            <Link href="#academies" className="hover:text-[#006197] transition-colors">Academies</Link>
            <Link href="#pricing" className="hover:text-[#006197] transition-colors">Pricing</Link>
            <Link href="#contact" className="hover:text-[#006197] transition-colors">Contact</Link>
          </div>

          {/* Auth buttons */}
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-[#006197] font-medium hover:underline px-3 py-2">
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-sm bg-[#006197] text-white font-medium px-5 py-2 rounded-md hover:bg-[#004f7a] transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────── */}
      <section className="relative overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
          {/* Left — copy */}
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#061229] leading-tight">
              Take Your Martial Arts Training to{" "}
              <span className="text-[#006197]">New Heights.</span>
            </h1>
            <p className="text-lg text-[#4f4f4f] leading-relaxed max-w-md">
              Innovative Management Software for Martial Arts Academies and
              Business & Users interaction Worldwide.
            </p>
            {/* App store badges */}
            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href="#"
                className="flex items-center gap-2 bg-black text-white px-5 py-3 rounded-xl hover:bg-gray-900 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <div className="text-left">
                  <div className="text-[9px] uppercase tracking-wide opacity-70">Download on the</div>
                  <div className="text-sm font-semibold">App Store</div>
                </div>
              </a>
              <a
                href="#"
                className="flex items-center gap-2 bg-black text-white px-5 py-3 rounded-xl hover:bg-gray-900 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.18 23.76c.3.17.64.24.99.2l12.5-12.5L13.23 8l-10.05 15.76zM20.71 10.43l-2.47-1.43-3.33 3.33 3.33 3.33 2.5-1.45c.71-.41.71-1.37-.03-1.78zM2.18.24C1.85.45 1.64.82 1.64 1.28v21.44c0 .46.21.83.54 1.04L14.7 12 2.18.24zM16.67 2.81l-3.44 3.44 3.44 3.44 2.5-1.45c.72-.41.72-1.38 0-1.79l-2.5-1.64z"/>
                </svg>
                <div className="text-left">
                  <div className="text-[9px] uppercase tracking-wide opacity-70">Get it on</div>
                  <div className="text-sm font-semibold">Google Play</div>
                </div>
              </a>
            </div>
          </div>

          {/* Right — real hero image */}
          <div className="relative h-80 md:h-[520px] rounded-2xl overflow-hidden shadow-2xl">
            <Image
              src={IMAGES.hero}
              alt="Martial arts competition"
              fill
              className="object-cover"
              priority
            />
            {/* Dark gradient overlay at bottom */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            {/* App screenshot overlay card */}
            <div className="absolute bottom-5 right-5 w-28 h-52 bg-white/15 backdrop-blur-md rounded-2xl border border-white/30 shadow-xl flex items-center justify-center">
              <div className="text-white text-center">
                <Image
                  src="/martial-logo.png"
                  alt="Martial"
                  width={48}
                  height={48}
                  className="object-contain mx-auto"
                />
                <div className="text-[9px] tracking-widest opacity-60 mt-1">MARTIAL</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FREE PLATFORM BAR ──────────────────── */}
      <section className="bg-gray-50 py-10 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm font-semibold text-[#006197] uppercase tracking-widest mb-2">
            100% Free
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-[#061229]">
            A FREE to use Platform for
          </h2>
          <p className="text-xl text-[#333333] mt-1">
            Martial Arts Businesses & Practitioners
          </p>
        </div>
      </section>

      {/* ── DASHBOARD PREVIEW ──────────────────── */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="bg-gray-100 rounded-2xl overflow-hidden shadow-xl border border-gray-200">
            <div className="bg-[#006197] px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-400"/>
                <span className="w-3 h-3 rounded-full bg-yellow-400"/>
                <span className="w-3 h-3 rounded-full bg-green-400"/>
              </div>
              <span className="text-white text-xs opacity-70 ml-2">Martial — School Dashboard</span>
            </div>
            {/* Dashboard mock */}
            <div className="p-6 bg-gray-50 grid grid-cols-3 gap-4">
              {[
                { label: "Total Members", value: "1,284", color: "bg-blue-100 text-blue-700" },
                { label: "Active Classes", value: "32", color: "bg-green-100 text-green-700" },
                { label: "Revenue MTD", value: "£8,450", color: "bg-purple-100 text-purple-700" },
              ].map((stat) => (
                <div key={stat.label} className={`${stat.color} rounded-xl p-4`}>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-xs mt-1 opacity-70">{stat.label}</div>
                </div>
              ))}
              <div className="col-span-3 bg-white rounded-xl p-4 border border-gray-200">
                <div className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Upcoming Classes</div>
                {["BJJ Fundamentals — Mon 09:00", "Muay Thai — Mon 18:30", "Kids Karate — Tue 16:00"].map((c) => (
                  <div key={c} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 text-sm text-[#333]">
                    <span>{c}</span>
                    <span className="text-xs bg-[#e8f7ff] text-[#006197] px-2 py-0.5 rounded-full">Scheduled</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BLUE CTA SECTION ───────────────────── */}
      <section className="bg-[#006197] py-20 text-center text-white">
        <div className="max-w-3xl mx-auto px-6 space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center">
              <Image
                src="/martial-logo.png"
                alt="Martial"
                width={48}
                height={48}
                className="object-contain"
              />
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold leading-snug">
            Your Professional Martial Arts Platform for the World
          </h2>
          <p className="text-white/80 text-lg max-w-xl mx-auto">
            Bringing technology to Martial Arts. Manage your academy, grow your community, and track your progress — all in one place.
          </p>
          <Link
            href="/register"
            className="inline-block bg-white text-[#006197] font-semibold px-8 py-3 rounded-xl hover:bg-gray-100 transition-colors"
          >
            Get Started — It&apos;s Free
          </Link>
        </div>
      </section>

      {/* ── FOR MEMBERS / FOR ACADEMIES ────────── */}
      <section id="features" className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12">
            {/* For Members */}
            <div className="space-y-6">
              <div className="inline-block bg-[#e8f7ff] text-[#006197] text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-widest">
                For Members
              </div>
              <h3 className="text-2xl font-bold text-[#061229]">
                Everything you need as a practitioner
              </h3>
              <ul className="space-y-3">
                {[
                  "Find and join academies near you",
                  "Book classes with one tap",
                  "Track your belt ranking & progress",
                  "View your training schedule",
                  "Access exclusive member offers",
                  "Digital membership card & QR check-in",
                  "Chat with instructors & coaches",
                  "Watch technique videos anytime",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[#4f4f4f]">
                    <svg className="w-5 h-5 text-[#006197] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* For Academies */}
            <div className="space-y-6">
              <div className="inline-block bg-[#e8f7ff] text-[#3d86af] text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-widest">
                For Academies
              </div>
              <h3 className="text-2xl font-bold text-[#061229]">
                Run your academy like a pro
              </h3>
              <ul className="space-y-3">
                {[
                  "Manage members & enrolments",
                  "Create and schedule classes",
                  "Sell memberships & packages",
                  "Accept payments (Stripe, PayPal & more)",
                  "Digital waivers & sign-up forms",
                  "Belt grading & rank tracking",
                  "Analytics & revenue reports",
                  "Branded profile page worldwide",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[#4f4f4f]">
                    <svg className="w-5 h-5 text-[#3d86af] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURED SCHOOLS ───────────────────── */}
      <section id="academies" className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-[#061229]">Our Featured Schools</h2>
            <Link href="#" className="text-sm text-[#006197] font-medium hover:underline flex items-center gap-1">
              View All →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: "Apex Martial Arts Academy", location: "Preston, United Kingdom", disciplines: "BJJ · Muay Thai · Wrestling", rating: 4.9, img: IMAGES.school1 },
              { name: "Dragon Gate MMA", location: "London, United Kingdom", disciplines: "MMA · Boxing · Jiu-Jitsu", rating: 4.8, img: IMAGES.school2 },
              { name: "Elite Karate Centre", location: "Manchester, United Kingdom", disciplines: "Karate · Taekwondo · Yoga", rating: 4.7, img: IMAGES.school3 },
            ].map((school) => (
              <div key={school.name} className="border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow group">
                {/* School photo */}
                <div className="relative h-44 overflow-hidden">
                  <Image
                    src={school.img}
                    alt={school.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="font-semibold text-[#061229] group-hover:text-[#006197] transition-colors">
                    {school.name}
                  </h3>
                  <p className="text-xs text-[#4f4f4f]">{school.location}</p>
                  <p className="text-xs text-[#3d86af]">{school.disciplines}</p>
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className={`w-3 h-3 ${i < Math.floor(school.rating) ? "text-yellow-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                      <span className="text-xs text-[#4f4f4f] ml-1">{school.rating}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-xs bg-[#e8f7ff] text-[#006197] px-2 py-1 rounded-full">Classes</span>
                      <span className="text-xs bg-gray-100 text-[#333] px-2 py-1 rounded-full">Members</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ──────────────────────────────── */}
      <section className="py-16 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold text-[#061229]">
              More Than Just Business Associate,{" "}
              <span className="text-[#006197]">Genuine Community</span> for The Starters
            </h2>
            <p className="text-[#4f4f4f] leading-relaxed">
              Join thousands of martial artists, coaches, and academies already using Martial to grow, train, and connect.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-6 text-center">
            {[
              { value: "25k+", label: "Members" },
              { value: "840", label: "Academies" },
              { value: "35", label: "Countries" },
            ].map((stat) => (
              <div key={stat.label} className="space-y-1">
                <div className="text-3xl md:text-4xl font-bold text-[#006197]">{stat.value}</div>
                <div className="text-sm text-[#4f4f4f]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DISCIPLINES / CATEGORIES ───────────── */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-[#061229]">Explore Categories</h2>
            <p className="text-[#4f4f4f] mt-2">Find academies and classes for every martial art</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { name: "Jiu Jitsu", color: "bg-[#006197]" },
              { name: "Wrestling", color: "bg-[#1f74a3]" },
              { name: "Karate", color: "bg-[#3d86af]" },
              { name: "Yoga", color: "bg-[#4fa0cf]" },
              { name: "Muay Thai", color: "bg-[#006197]" },
              { name: "Boxing", color: "bg-[#1f74a3]" },
              { name: "Taekwondo", color: "bg-[#3d86af]" },
              { name: "MMA", color: "bg-[#4fa0cf]" },
            ].map((cat) => (
              <div key={cat.name} className="flex flex-col items-center gap-2 cursor-pointer group">
                <div className={`${cat.color} w-20 h-20 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm`}>
                  <span className="text-white text-2xl font-bold">{cat.name[0]}</span>
                </div>
                <span className="text-xs font-medium text-[#333333]">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MOBILE APP ─────────────────────────── */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-block bg-[#e8f7ff] text-[#006197] text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-widest">
              Mobile App
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#061229]">
              An All-in-one App
            </h2>
            <p className="text-lg text-[#4f4f4f] leading-relaxed">
              For All Practitioners, Coaches And Academies. Available on iOS and Android — your dojo in your pocket.
            </p>
            <ul className="space-y-3">
              {["Book classes on the go", "Digital rank certificate", "QR check-in", "Live schedule updates"].map((f) => (
                <li key={f} className="flex items-center gap-3 text-[#4f4f4f]">
                  <span className="w-2 h-2 rounded-full bg-[#006197]" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              <a href="#" className="bg-black text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-900 transition-colors">
                App Store
              </a>
              <a href="#" className="bg-black text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-900 transition-colors">
                Google Play
              </a>
            </div>
          </div>
          {/* Athlete image */}
          <div className="relative h-[480px] rounded-2xl overflow-hidden shadow-2xl">
            <Image
              src={IMAGES.athlete}
              alt="Martial arts practitioner"
              fill
              className="object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#006197]/60 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <div className="text-2xl font-bold">All-in-one App</div>
              <div className="text-sm opacity-80 mt-1">Available on iOS & Android</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────── */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-[#061229]">
              What Our Happy Users Think of It!
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Carlos M.", role: "BJJ Blue Belt", text: "Martial completely changed how I manage my training. Finding academies and booking classes is so easy now.", rating: 5 },
              { name: "Sarah K.", role: "Academy Owner", text: "Running our academy has never been simpler. Member management, class scheduling, payments — all in one place.", rating: 5 },
              { name: "Ahmed R.", role: "Muay Thai Instructor", text: "My students love the app. Attendance tracking and rank updates used to take hours. Now it takes minutes.", rating: 5 },
            ].map((t) => (
              <div key={t.name} className="bg-gray-50 rounded-2xl p-6 space-y-4 border border-gray-100">
                <div className="flex gap-1">
                  {[...Array(t.rating)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-[#4f4f4f] text-sm leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                <div>
                  <div className="font-semibold text-[#061229] text-sm">{t.name}</div>
                  <div className="text-xs text-[#3d86af]">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SEARCH CTA ─────────────────────────── */}
      <section className="py-16 bg-[#3d86af] text-white">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">
            Search Academies, Book Classes, Chat with Instructors, Digital Ranking
          </h2>
          <p className="text-white/80 text-lg">
            Everything a martial artist needs — completely free.
          </p>
          <Link
            href="/register"
            className="inline-block bg-white text-[#006197] font-semibold px-8 py-3 rounded-xl hover:bg-gray-100 transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* ── PAYMENT METHODS ────────────────────── */}
      <section className="py-12 bg-white border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
          <h3 className="text-xl font-bold text-[#061229]">Various Payment Methods</h3>
          <div className="flex flex-wrap justify-center items-center gap-6 opacity-60">
            {["PayPal", "Visa", "Mastercard", "Apple Pay", "Google Pay", "Stripe"].map((p) => (
              <span key={p} className="text-sm font-semibold text-[#333333] bg-gray-100 px-4 py-2 rounded-lg">
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── APP DOWNLOAD / FINAL CTA ───────────── */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold text-[#061229]">
              Our platform is available on any app store
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: "25k+", label: "Members" },
                { value: "100+", label: "Countries" },
                { value: "3000", label: "Classes/mo" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-2xl font-bold text-[#006197]">{s.value}</div>
                  <div className="text-xs text-[#4f4f4f]">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <a href="#" className="bg-black text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-gray-900 transition-colors">
                ↗ App Store
              </a>
              <a href="#" className="bg-black text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-gray-900 transition-colors">
                ↗ Google Play
              </a>
            </div>
          </div>
          {/* phone placeholder */}
          <div className="flex justify-center">
            <div className="w-48 h-96 bg-[#061229] rounded-[2.5rem] shadow-xl border-4 border-gray-800 flex items-center justify-center">
              <div className="text-white text-center">
                <Image
                  src="/martial-logo.png"
                  alt="Martial"
                  width={64}
                  height={64}
                  className="object-contain mx-auto"
                />
                <div className="text-[10px] tracking-widest opacity-50 mt-1">MARTIAL</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────── */}
      <footer className="bg-[#061229] text-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Image
                  src="/martial-logo.png"
                  alt="Martial"
                  width={48}
                  height={48}
                  className="object-contain"
                />
                <span className="font-semibold text-lg tracking-wide">MARTIAL</span>
              </div>
              <p className="text-white/50 text-sm leading-relaxed">
                Bringing technology to Martial Arts worldwide.
              </p>
            </div>
            {/* Links */}
            {[
              { title: "Product", links: ["Features", "Pricing", "Academy Portal", "Mobile App"] },
              { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
              { title: "Legal", links: ["Privacy Policy", "Terms of Use", "Cookie Policy"] },
            ].map((col) => (
              <div key={col.title} className="space-y-3">
                <h4 className="font-semibold text-sm uppercase tracking-widest text-white/70">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l}>
                      <Link href="#" className="text-white/50 text-sm hover:text-white transition-colors">
                        {l}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-3">
            <p className="text-white/40 text-xs">© 2026 Martial App. All rights reserved.</p>
            <div className="flex gap-4">
              {["Twitter", "Instagram", "LinkedIn", "YouTube"].map((s) => (
                <Link key={s} href="#" className="text-white/40 text-xs hover:text-white transition-colors">
                  {s}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
