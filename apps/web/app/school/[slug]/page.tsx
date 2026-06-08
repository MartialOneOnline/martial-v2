import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '../../../lib/db'
import SchoolCarousel from './SchoolCarousel'

// Day of week labels
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

type ScheduleEntry = { dayOfWeek: number; startTime: string; endTime: string }

function buildScheduleRows(classes: { name: string; level: string | null; schedule: any }[]) {
  const rows: { className: string; level: string; days: string; time: string }[] = []

  for (const cls of classes) {
    if (!cls.schedule || !Array.isArray(cls.schedule) || cls.schedule.length === 0) continue

    // Group entries by time slot — same start+end across multiple days = one row
    const byTime: Record<string, number[]> = {}
    for (const entry of cls.schedule as ScheduleEntry[]) {
      const key = `${entry.startTime}–${entry.endTime}`
      if (!byTime[key]) byTime[key] = []
      byTime[key].push(entry.dayOfWeek)
    }

    for (const [time, days] of Object.entries(byTime)) {
      const sorted = [...new Set(days)].sort((a, b) => a - b)
      rows.push({
        className: cls.name,
        level: cls.level ?? 'All levels',
        days: sorted.map(d => DAYS[d]).join(' / '),
        time,
      })
    }
  }

  // Sort by start time
  return rows.sort((a, b) => a.time.localeCompare(b.time))
}

export default async function SchoolProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const school = await prisma.school.findUnique({
    where: { slug },
    include: {
      disciplines: { include: { discipline: true } },
      instructors: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      classes: { where: { isActive: true }, orderBy: { name: 'asc' } },
      membershipPlans: {
        where: { isActive: true },
        orderBy: [{ isPopular: 'desc' }, { price: 'asc' }],
      },
    },
  })

  if (!school) notFound()

  const photos = school.photos?.length
    ? school.photos
    : school.coverUrl
    ? [school.coverUrl]
    : [
        'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=800&h=420&fit=crop&q=85',
        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=420&fit=crop&q=85',
      ]

  const scheduleRows = buildScheduleRows(school.classes)
  const disciplines = school.disciplines.map(d => d.discipline.name)
  const publicPlans = school.membershipPlans

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa]">

      {/* ── NAVBAR ─────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-bold text-[#061229] text-lg tracking-wide">MARTIAL</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-[#333]">
            <Link href="/" className="hover:text-[#006197] transition-colors">Home</Link>
            <Link href="/explore" className="text-[#006197] font-medium">Explore</Link>
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

      {/* ── BREADCRUMB ─────────────────────────── */}
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

      {/* ── MAIN ───────────────────────────────── */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-10">
        <div className="grid lg:grid-cols-12 gap-8 items-start">

          {/* LEFT COLUMN */}
          <div className="lg:col-span-8 space-y-8">

            {/* Carousel */}
            <SchoolCarousel photos={photos} name={school.name} />

            {/* Name + description */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-[#061229] tracking-tight uppercase">{school.name}</h1>
                {school.affiliationName && (
                  <span className="text-xs font-semibold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full">
                    {school.affiliationName}
                  </span>
                )}
              </div>
              {school.tagline && (
                <p className="text-[#006197] font-medium">{school.tagline}</p>
              )}
              <p className="text-[#4f4f4f] leading-relaxed">{school.description}</p>
            </div>

            {/* Class Schedule */}
            {scheduleRows.length > 0 && (
              <div className="border border-slate-100 rounded-2xl bg-slate-50 p-5 space-y-4">
                <h2 className="text-lg font-semibold text-[#061229]">Class Schedule</h2>
                <div className="space-y-2">
                  {scheduleRows.map((s, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2 border-b border-slate-100 last:border-0">
                      <div>
                        <span className="text-sm font-medium text-[#061229]">{s.className}</span>
                        <span className="text-xs text-[#4f4f4f] ml-2">{s.level}</span>
                        <span className="text-xs text-[#4f4f4f] ml-2">· {s.days}</span>
                      </div>
                      <span className="text-xs font-mono text-[#006197] bg-[#e8f7ff] px-3 py-1 rounded-full whitespace-nowrap">{s.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructors */}
            {school.instructors.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-[#061229]">Instructors</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {school.instructors.map(inst => (
                    <div key={inst.id} className="flex items-center gap-4 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                      <div className="w-12 h-12 rounded-full bg-[#e8f7ff] flex items-center justify-center text-[#006197] font-bold text-lg flex-shrink-0">
                        {inst.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-[#061229] text-sm">{inst.name}</div>
                        <div className="text-xs text-[#006197]">{inst.role}</div>
                        {inst.belt && <div className="text-xs text-[#4f4f4f]">{inst.belt}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Membership Plans */}
            {publicPlans.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-[#061229]">Membership Plans</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {publicPlans.map(plan => (
                    <div key={plan.id} className={`relative bg-white border rounded-2xl p-5 shadow-sm space-y-3 ${plan.isPopular ? 'border-[#006197] ring-1 ring-[#006197]' : 'border-slate-100'}`}>
                      {plan.isPopular && (
                        <span className="absolute -top-3 left-4 text-xs font-bold uppercase tracking-wide bg-[#006197] text-white px-3 py-1 rounded-full">
                          Most popular
                        </span>
                      )}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-[#061229]">{plan.name}</div>
                          <div className="text-xs text-[#4f4f4f] mt-0.5">{plan.description}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-2xl font-bold text-[#006197]">
                            {plan.price === 0 ? 'Free' : `€${plan.price}`}
                          </span>
                          {plan.price > 0 && plan.billingCycle !== 'one-off' && (
                            <div className="text-xs text-[#4f4f4f]">/{plan.billingCycle === 'monthly' ? 'mo' : plan.billingCycle === 'quarterly' ? 'qtr' : 'yr'}</div>
                          )}
                        </div>
                      </div>
                      {plan.features.length > 0 && (
                        <ul className="space-y-1">
                          {plan.features.map((f, i) => (
                            <li key={i} className="flex items-center gap-2 text-xs text-[#4f4f4f]">
                              <svg className="w-3.5 h-3.5 text-[#006197] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              {f}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Disciplines */}
            {disciplines.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-[#061229]">Disciplines</h2>
                <div className="flex flex-wrap gap-2">
                  {disciplines.map(d => (
                    <span key={d} className="text-sm bg-[#e8f7ff] text-[#006197] px-4 py-1.5 rounded-full font-medium">{d}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Facilities */}
            {school.facilities.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-[#061229]">Facilities</h2>
                <ul className="grid sm:grid-cols-2 gap-2">
                  {school.facilities.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-[#4f4f4f]">
                      <svg className="w-4 h-4 text-[#006197] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-4 space-y-6">

            {/* Map */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="text-xs font-semibold uppercase tracking-widest text-[#4f4f4f]">Location</span>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(school.address ?? school.city ?? '')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-[#006197] font-medium flex items-center gap-1 hover:underline">
                  Open in Maps
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
              <div className="px-4 py-3 text-xs text-[#4f4f4f]">{school.address}</div>
            </div>

            {/* Contact */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm px-4 py-4 space-y-3">
              {school.address && <ContactRow icon="pin" text={school.address} />}
              {school.phone && <ContactRow icon="phone" text={school.phone} href={`tel:${school.phone}`} />}
              {school.website && <ContactRow icon="globe" text={school.website} href={school.website} />}
              {school.email && <ContactRow icon="mail" text={school.email} href={`mailto:${school.email}`} />}
              {school.instagram && (
                <ContactRow icon="instagram" text={`@${school.instagram}`} href={`https://instagram.com/${school.instagram}`} />
              )}
            </div>

            {/* Rating */}
            {school.googleRating && (
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm px-4 py-4 flex items-center gap-4">
                <div className="text-4xl font-bold text-[#006197]">{school.googleRating}</div>
                <div>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className={`w-4 h-4 ${i < Math.floor(school.googleRating!) ? 'text-yellow-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-xs text-[#4f4f4f] mt-0.5">{school.googleReviews} reviews</p>
                </div>
              </div>
            )}

            {/* Price from */}
            {school.priceFrom && (
              <div className="bg-[#f0f9ff] border border-[#bae6fd] rounded-2xl px-4 py-4 text-center">
                <div className="text-xs text-[#4f4f4f] uppercase tracking-wide font-semibold">Membership from</div>
                <div className="text-3xl font-bold text-[#006197] mt-1">€{school.priceFrom}<span className="text-sm font-normal">/mo</span></div>
                {school.hasFreeTrialCls && (
                  <div className="mt-2 text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 inline-block">
                    Free trial available
                  </div>
                )}
              </div>
            )}

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
  pin: <svg className="w-4 h-4 flex-shrink-0 text-[#006197]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  phone: <svg className="w-4 h-4 flex-shrink-0 text-[#006197]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>,
  globe: <svg className="w-4 h-4 flex-shrink-0 text-[#006197]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" /></svg>,
  mail: <svg className="w-4 h-4 flex-shrink-0 text-[#006197]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  instagram: <svg className="w-4 h-4 flex-shrink-0 text-[#006197]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>,
}

function ContactRow({ icon, text, href }: { icon: keyof typeof ICONS; text: string; href?: string }) {
  const content = (
    <div className="flex items-center gap-3">
      {ICONS[icon]}
      <span className="text-sm text-[#4f4f4f] truncate">{text}</span>
    </div>
  )
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block hover:text-[#006197] transition-colors">{content}</a>
  ) : <div>{content}</div>
}
