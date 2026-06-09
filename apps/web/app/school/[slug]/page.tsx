import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import SchoolCarousel from './SchoolCarousel'
import WeeklyTimetable from './WeeklyTimetable'
import MembershipSection from './MembershipSection'

export default async function SchoolProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const school = await prisma.school.findUnique({
    where: { slug },
    include: {
      affiliation:    { select: { id: true, name: true, slug: true, logoUrl: true } },
      disciplines:    { include: { discipline: true } },
      instructors:    { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      classes:        { where: { isActive: true }, orderBy: { name: 'asc' } },
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

  const disciplines = school.disciplines.map(d => d.discipline.name)

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa]">

      {/* ── NAVBAR ─────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-[#061229] text-lg tracking-wide">MARTIAL</Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-[#333]">
            <Link href="/" className="hover:text-[#006197] transition-colors">Home</Link>
            <Link href="/explore" className="text-[#006197] font-medium">Explore</Link>
            <Link href="/dashboard" className="hover:text-[#006197] transition-colors">Dashboard</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm bg-[#006197] text-white px-4 py-2 rounded-full font-medium hover:bg-[#005080] transition-colors">Dashboard</Link>
            <Link href="/login" className="text-sm border border-[#006197] text-[#006197] px-4 py-2 rounded-full font-medium hover:bg-[#e8f7ff] transition-colors">Sign In</Link>
          </div>
        </div>
      </header>

      {/* ── BREADCRUMB ─────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-4 py-2">
        <div className="max-w-7xl mx-auto text-sm text-[#4f4f4f]">
          <Link href="/explore" className="flex items-center gap-1 w-fit hover:text-[#006197] transition-colors">
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
          <div className="lg:col-span-8 space-y-10">

            {/* Carousel */}
            <SchoolCarousel photos={photos} name={school.name} />

            {/* Name + description */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-[#061229] tracking-tight uppercase">{school.name}</h1>
                {school.affiliation && (
                  <span className="text-xs font-semibold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full">
                    {school.affiliation.name}
                  </span>
                )}
              </div>
              {school.tagline && <p className="text-[#006197] font-medium">{school.tagline}</p>}
              <p className="text-[#4f4f4f] leading-relaxed">{school.description}</p>
            </div>

            {/* ── WEEKLY TIMETABLE ───────────────── */}
            {school.classes.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-[#061229] mb-4">Class Schedule</h2>
                <WeeklyTimetable
                  classes={school.classes.map(c => ({
                    id: c.id,
                    name: c.name,
                    level: c.level,
                    duration: c.duration,
                    schedule: c.schedule as any,
                  }))}
                  schoolSlug={slug}
                  plans={school.membershipPlans.map(p => ({
                    id: p.id,
                    name: p.name,
                    price: p.price,
                    currency: p.currency,
                    billingCycle: p.billingCycle,
                    isPopular: p.isPopular,
                  }))}
                />
              </section>
            )}

            {/* ── MEMBERSHIPS ───────────────────── */}
            {school.membershipPlans.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-[#061229] mb-4">Memberships & Pricing</h2>
                <MembershipSection plans={school.membershipPlans.map(p => ({
                  id: p.id,
                  name: p.name,
                  description: p.description,
                  price: p.price,
                  currency: p.currency,
                  billingCycle: p.billingCycle,
                  features: p.features,
                  isPopular: p.isPopular,
                }))} />
              </section>
            )}

            {/* Instructors */}
            {school.instructors.length > 0 && (
              <section className="space-y-4">
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
              </section>
            )}

            {/* Disciplines + Facilities */}
            <div className="grid sm:grid-cols-2 gap-8">
              {disciplines.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-lg font-semibold text-[#061229]">Disciplines</h2>
                  <div className="flex flex-wrap gap-2">
                    {disciplines.map(d => (
                      <span key={d} className="text-sm bg-[#e8f7ff] text-[#006197] px-4 py-1.5 rounded-full font-medium">{d}</span>
                    ))}
                  </div>
                </section>
              )}
              {school.facilities.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-lg font-semibold text-[#061229]">Facilities</h2>
                  <ul className="space-y-1.5">
                    {school.facilities.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-[#4f4f4f]">
                        <svg className="w-4 h-4 text-[#006197] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-24">

            {/* Location */}
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
              {school.phone && <ContactRow icon="phone" text={school.phone} href={`tel:${school.phone}`} />}
              {school.website && <ContactRow icon="globe" text={school.website} href={school.website} />}
              {school.email && <ContactRow icon="mail" text={school.email} href={`mailto:${school.email}`} />}
              {school.instagram && <ContactRow icon="instagram" text={`@${school.instagram}`} href={`https://instagram.com/${school.instagram}`} />}
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

            {/* CTAs */}
            <div className="space-y-3">
              <a href={`mailto:${school.email}`}
                className="w-full bg-[#006197] hover:bg-[#005080] text-white font-semibold py-3 rounded-2xl transition-colors flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Book a Trial Class
              </a>
              <a href={`mailto:${school.email}?subject=Enquiry — ${school.name}`}
                className="w-full border border-[#006197] text-[#006197] hover:bg-[#e8f7ff] font-semibold py-3 rounded-2xl transition-colors flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Get in Touch
              </a>
              {school.phone && (
                <a href={`https://wa.me/${school.phone.replace(/\D/g, '')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-full border border-emerald-500 text-emerald-700 hover:bg-emerald-50 font-semibold py-3 rounded-2xl transition-colors flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

/* ── helpers ─────────────────────────────── */
const ICONS = {
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
  return href
    ? <a href={href} target="_blank" rel="noopener noreferrer" className="block hover:text-[#006197] transition-colors">{content}</a>
    : <div>{content}</div>
}
