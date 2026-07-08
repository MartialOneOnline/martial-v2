import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import WeeklyTimetable from './WeeklyTimetable'
import EventsScrollHandler from './EventsScrollHandler'
import MembershipSection from './MembershipSection'
import TrialBookingCTA from './TrialBookingCTA'
import EventTicketCTA from './EventTicketCTA'
import LeadForm from './LeadForm'
import { getBookedCounts } from '@/lib/services/eventCapacity'
import { fmtPrice } from '@/lib/format'
import {
  MapPin, Star, Phone, Globe, Mail, ChevronLeft,
  CheckCircle, MessageCircle, ExternalLink, UserPlus, Calendar,
} from 'lucide-react'

const FALLBACK_OG = 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=1200&h=630&fit=crop&q=85'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const school = await prisma.school.findUnique({
    where: { slug },
    select: { name: true, tagline: true, description: true, city: true, country: true, coverUrl: true, logoUrl: true },
  })
  if (!school) return { title: 'School not found' }

  const title = `${school.name}${school.city ? ` — ${school.city}` : ''}`
  const description = school.tagline ?? school.description ?? `Join ${school.name} and start your martial arts journey.`
  const image = school.coverUrl ?? FALLBACK_OG

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: image, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

const FALLBACK = 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=1200&h=600&fit=crop&q=85'

function formatEventType(type: string) {
  return type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, ' ')
}

export default async function SchoolProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const school = await prisma.school.findUnique({
    where: { slug },
    include: {
      affiliation:     { select: { id: true, name: true, slug: true, logoUrl: true } },
      disciplines:     { include: { discipline: true } },
      instructors:     { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      classes:         { where: { isActive: true, isPublished: true }, orderBy: { name: 'asc' } },
      membershipPlans: {
        // Public profile — never expose plans the school marked non-public.
        where: { isActive: true, isPublic: true },
        orderBy: [{ isPopular: 'desc' }, { price: 'asc' }],
      },
      events: {
        where: { isPublished: true, isCancelled: false, startAt: { gte: new Date() } },
        orderBy: { startAt: 'asc' },
        include: {
          instructor: { select: { name: true, photoUrl: true } },
          tickets: { orderBy: { sortOrder: 'asc' } },
        },
      },
    },
  })

  // ARCHIVED/SUSPENDED schools keep their data (soft-deleted / paused) but must
  // not be reachable by direct slug — same cutoff as the public /api/schools listing.
  if (!school || ['SUSPENDED', 'ARCHIVED'].includes(school.status)) notFound()

  const cover = school.coverUrl ?? FALLBACK
  const disciplines = school.disciplines.map(d => d.discipline.name)

  const plans = school.membershipPlans.map(p => ({
    id: p.id, name: p.name, description: p.description,
    price: p.price, currency: p.currency, billingCycle: p.billingCycle,
    isPopular: p.isPopular,
  }))

  const classesMapped = school.classes.map(c => ({
    id: c.id, name: c.name, level: c.level,
    duration: c.duration, schedule: c.schedule as unknown as { dayOfWeek: number; startTime: string; endTime: string }[],
  }))

  const plansMapped = school.membershipPlans.map(p => ({
    id: p.id, name: p.name, price: p.price,
    currency: p.currency, billingCycle: p.billingCycle, isPopular: p.isPopular,
  }))

  // Trial classes: active + published + isTrial flag (all guaranteed by the query above)
  const trialClasses = school.classes
    .filter(c => c.isTrial)
    .map(c => ({
      id: c.id,
      name: c.name,
      level: c.level,
      schedule: (c.schedule as unknown as import('@/lib/scheduling').ScheduleSlot[]) ?? [],
    }))

  const { byTicket, byEvent } = await getBookedCounts(school.events.map(e => e.id))
  const eventsMapped = school.events.map(e => ({
    id: e.id,
    title: e.title,
    type: e.type,
    location: e.location,
    startAt: e.startAt.toISOString(),
    coverUrl: e.coverUrl,
    paymentMethods: e.paymentMethods,
    capacity: e.capacity,
    booked: byEvent.get(e.id) ?? 0,
    tickets: e.tickets.map(t => ({
      id: t.id, name: t.name, description: t.description,
      price: t.price, currency: t.currency, capacity: t.capacity,
      booked: byTicket.get(t.id) ?? 0,
    })),
  }))

  // Public CTA policy, based on what's actually bookable — not on School.type:
  // a normal school that also hosts a one-off seminar keeps all its usual CTAs.
  const hasClasses = classesMapped.length > 0
  const hasPlans = plans.length > 0
  const hasEvents = eventsMapped.length > 0
  const showTrialCta = hasClasses
  const showJoinCta = hasPlans || hasClasses
  // Event-only profile: nothing to trial or join, so ticket purchase becomes the primary action.
  const eventCtaIsPrimary = hasEvents && !hasClasses && !hasPlans

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <EventsScrollHandler />

      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="relative h-72 md:h-[420px] bg-[#101828] overflow-hidden">
        <Image src={cover} alt={school.name} fill className="object-cover opacity-80" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/20" />

        {/* Back button */}
        <div className="absolute top-4 left-4 z-10">
          <Link
            href="/explore"
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-black/30 backdrop-blur-sm text-white text-xs font-semibold border border-white/15 hover:bg-black/50 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Explore
          </Link>
        </div>

        {/* Free trial badge */}
        {school.hasFreeTrialCls && (
          <div className="absolute top-4 right-4 z-10">
            <span className="text-[10px] font-bold bg-emerald-500 text-white px-3 py-1.5 rounded-full uppercase tracking-wide">
              Free Trial
            </span>
          </div>
        )}

        {/* Hero content */}
        <div className="absolute bottom-0 left-0 right-0 px-4 md:px-8 pb-6 z-10">
          {/* Disciplines */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {disciplines.map(d => (
              <span key={d} className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-black/30 backdrop-blur-sm text-white border border-white/15">
                {d}
              </span>
            ))}
            {school.affiliation && (
              <span className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-amber-500/80 text-white border border-amber-400/30">
                {school.affiliation.name}
              </span>
            )}
          </div>

          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">{school.name}</h1>
              <div className="flex items-center gap-3 mt-1.5">
                <p className="flex items-center gap-1 text-white/75 text-sm">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {school.address || [school.city, school.country].filter(Boolean).join(', ') || 'Location coming soon'}
                </p>
              </div>
            </div>
            {school.googleRating && (
              <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-2xl px-3 py-2 shrink-0">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="text-white font-bold text-sm">{school.googleRating.toFixed(1)}</span>
                {school.googleReviews && (
                  <span className="text-white/60 text-xs">({school.googleReviews})</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-6 pb-28 md:pb-6">
        <div className="grid lg:grid-cols-12 gap-6 items-start">

          {/* ── Left column ── */}
          <div className="lg:col-span-8 space-y-6">

            {/* About */}
            {(school.description || school.tagline) && (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-5">
                {school.tagline && (
                  <p className="text-[#0870E2] font-semibold text-sm mb-2">{school.tagline}</p>
                )}
                {school.description && (
                  <p className="text-gray-500 text-sm leading-relaxed">{school.description}</p>
                )}
              </div>
            )}

            {/* Timetable */}
            {classesMapped.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <p className="text-sm font-bold text-[#101828]">Class Schedule</p>
                  <p className="text-xs text-gray-400 mt-0.5">{classesMapped.length} active classes</p>
                </div>
                <div className="px-4 py-4">
                  <WeeklyTimetable
                    classes={classesMapped}
                    schoolSlug={slug}
                    plans={plansMapped}
                  />
                </div>
              </div>
            )}

            {/* Memberships */}
            {plans.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <p className="text-sm font-bold text-[#101828]">Memberships & Pricing</p>
                </div>
                <div className="px-4 py-4">
                  <MembershipSection plans={plans} />
                </div>
              </div>
            )}

            {/* Upcoming Events */}
            {eventsMapped.length > 0 && (
              <div data-events-anchor className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden scroll-mt-6">
                <div className="px-5 py-4 border-b border-gray-50">
                  <p className="text-sm font-bold text-[#101828]">Upcoming Events</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {eventsMapped.map(ev => {
                    const minPrice = ev.tickets.length > 0 ? Math.min(...ev.tickets.map(t => t.price)) : null
                    const dateLabel = new Date(ev.startAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    return (
                      <div key={ev.id} className="flex items-center gap-3 px-5 py-4">
                        <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-[#0E3A7A] flex items-center justify-center">
                          {ev.coverUrl ? (
                            <Image src={ev.coverUrl} alt={ev.title} width={56} height={56} className="object-cover w-full h-full" />
                          ) : (
                            <Calendar className="w-6 h-6 text-white/60" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-[#101828] truncate">{ev.title}</p>
                            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#0870E2]/8 text-[#0870E2] shrink-0">
                              {formatEventType(ev.type)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{dateLabel}</span>
                            {ev.location && <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" />{ev.location}</span>}
                          </div>
                        </div>
                        {minPrice !== null && (
                          <p className="text-sm font-bold text-[#0870E2] shrink-0">
                            <span className="font-normal text-gray-400 text-xs">from </span>{fmtPrice(minPrice, ev.tickets[0]!.currency)}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Instructors */}
            {school.instructors.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <p className="text-sm font-bold text-[#101828]">Instructors</p>
                </div>
                <div className="px-4 py-4 grid sm:grid-cols-2 gap-3">
                  {school.instructors.map(inst => (
                    <div key={inst.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#F8F9FB] border border-gray-100">
                      <div className="w-10 h-10 rounded-full bg-[#0870E2]/10 flex items-center justify-center text-[#0870E2] font-bold text-sm shrink-0">
                        {inst.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#101828] truncate">{inst.name}</p>
                        <p className="text-xs text-[#0870E2] font-medium">{inst.role}</p>
                        {inst.belt && <p className="text-xs text-gray-400">{inst.belt}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Disciplines + Facilities */}
            {(disciplines.length > 0 || school.facilities.length > 0) && (
              <div className="grid sm:grid-cols-2 gap-4">
                {disciplines.length > 0 && (
                  <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-4">
                    <p className="text-sm font-bold text-[#101828] mb-3">Disciplines</p>
                    <div className="flex flex-wrap gap-2">
                      {disciplines.map(d => (
                        <span key={d} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#0870E2]/8 text-[#0870E2]">{d}</span>
                      ))}
                    </div>
                  </div>
                )}
                {school.facilities.length > 0 && (
                  <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-4">
                    <p className="text-sm font-bold text-[#101828] mb-3">Facilities</p>
                    <ul className="space-y-1.5">
                      {school.facilities.map(f => (
                        <li key={f} className="flex items-center gap-2 text-xs text-gray-500">
                          <CheckCircle className="w-3.5 h-3.5 text-[#0870E2] shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right column (sticky) ── */}
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-6">

            {/* Pricing card */}
            {(school.priceFrom || school.hasFreeTrialCls) && (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-5 text-center">
                {school.priceFrom && (
                  <>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Membership from</p>
                    <p className="text-4xl font-bold text-[#101828]">
                      €{school.priceFrom}
                      <span className="text-base font-normal text-gray-400">/mo</span>
                    </p>
                  </>
                )}
                {school.hasFreeTrialCls && (
                  <span className="inline-block mt-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                    Free trial available
                  </span>
                )}
              </div>
            )}

            {/* CTAs */}
            <div className="hidden md:flex flex-col gap-2">
              {showTrialCta && (
                <TrialBookingCTA
                  trialClasses={trialClasses}
                  schoolSlug={slug}
                  schoolEmail={school.email}
                  schoolPhone={school.phone}
                  plans={plansMapped}
                  hasFreeTrialCls={school.hasFreeTrialCls}
                  label={school.hasFreeTrialCls ? 'Reservar prueba gratis' : 'Reservar clase'}
                  className="w-full h-12 rounded-xl bg-[#0870E2] hover:bg-[#005580] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                />
              )}
              {hasEvents && (
                <EventTicketCTA
                  events={eventsMapped}
                  schoolSlug={slug}
                  className={eventCtaIsPrimary
                    ? 'w-full h-12 rounded-xl bg-[#0870E2] hover:bg-[#005580] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors'
                    : 'w-full h-12 rounded-xl border border-[#0870E2] text-[#0870E2] hover:bg-blue-50 font-semibold text-sm flex items-center justify-center gap-2 transition-colors'}
                />
              )}
              {school.phone && (
                <a
                  href={`https://wa.me/${school.phone.replace(/\D/g, '')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-full h-12 rounded-xl border border-emerald-500 text-emerald-700 hover:bg-emerald-50 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </a>
              )}
              {showJoinCta && (
                <Link
                  href={`/join/${slug}`}
                  className="w-full h-12 rounded-xl border border-[#0870E2] text-[#0870E2] hover:bg-blue-50 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Solicitar unirme
                </Link>
              )}
              <a
                href={`mailto:${school.email}?subject=Enquiry — ${school.name}`}
                className="w-full h-12 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Mail className="w-4 h-4" />
                Get in Touch
              </a>
            </div>

            {/* Contact form */}
            <div id="contact">
              <LeadForm slug={slug} schoolName={school.name} disciplines={disciplines} />
            </div>

            {/* Location */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                <p className="text-xs font-bold text-[#101828] uppercase tracking-widest">Location</p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(school.address ?? school.city ?? '')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-[#0870E2] font-semibold flex items-center gap-1 hover:underline"
                >
                  Maps <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="px-4 py-3 text-xs text-gray-500 flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#0870E2] shrink-0 mt-0.5" />
                {school.address || [school.city, school.country].filter(Boolean).join(', ') || 'Location coming soon'}
              </div>
            </div>

            {/* Contact */}
            {(school.phone || school.website || school.email || school.instagram) && (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-4 py-3 space-y-2.5">
                {school.phone && (
                  <a href={`tel:${school.phone}`} className="flex items-center gap-3 text-xs text-gray-500 hover:text-[#0870E2] transition-colors">
                    <Phone className="w-3.5 h-3.5 text-[#0870E2] shrink-0" />
                    {school.phone}
                  </a>
                )}
                {school.website && (
                  <a href={school.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-xs text-gray-500 hover:text-[#0870E2] transition-colors truncate">
                    <Globe className="w-3.5 h-3.5 text-[#0870E2] shrink-0" />
                    <span className="truncate">{school.website.replace(/^https?:\/\//, '')}</span>
                  </a>
                )}
                {school.email && (
                  <a href={`mailto:${school.email}`} className="flex items-center gap-3 text-xs text-gray-500 hover:text-[#0870E2] transition-colors truncate">
                    <Mail className="w-3.5 h-3.5 text-[#0870E2] shrink-0" />
                    <span className="truncate">{school.email}</span>
                  </a>
                )}
                {school.instagram && (
                  <a href={`https://instagram.com/${school.instagram}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-xs text-gray-500 hover:text-[#0870E2] transition-colors">
                    <InstagramIcon className="w-3.5 h-3.5 text-[#0870E2] shrink-0" />
                    @{school.instagram}
                  </a>
                )}
              </div>
            )}

            {/* Rating */}
            {school.googleRating && (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-4 flex items-center gap-4">
                <p className="text-4xl font-bold text-[#0870E2]">{school.googleRating}</p>
                <div>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < Math.floor(school.googleRating!) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`} />
                    ))}
                  </div>
                  {school.googleReviews && (
                    <p className="text-xs text-gray-400 mt-0.5">{school.googleReviews} reviews</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile fixed bottom CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur border-t border-gray-100 px-4 py-3 safe-area-pb">
        <div className="flex gap-2">
          {school.phone && (
            <a
              href={`https://wa.me/${school.phone.replace(/\D/g, '')}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 h-12 px-4 rounded-xl border border-emerald-500 text-emerald-700 font-semibold text-sm transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
          )}
          {hasEvents && (
            <EventTicketCTA
              events={eventsMapped}
              schoolSlug={slug}
              className={eventCtaIsPrimary
                ? 'flex-1 h-12 rounded-xl bg-[#0870E2] hover:bg-[#005580] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors'
                : 'flex items-center justify-center gap-2 h-12 px-4 rounded-xl border border-[#0870E2] text-[#0870E2] font-semibold text-sm transition-colors'}
              iconOnly={!eventCtaIsPrimary}
            />
          )}
          {showTrialCta && (
            <TrialBookingCTA
              trialClasses={trialClasses}
              schoolSlug={slug}
              schoolEmail={school.email}
              schoolPhone={school.phone}
              plans={plansMapped}
              hasFreeTrialCls={school.hasFreeTrialCls}
              label={school.hasFreeTrialCls ? 'Reservar prueba gratis' : 'Reservar clase'}
              className="flex-1 h-12 rounded-xl bg-[#0870E2] hover:bg-[#005580] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
            />
          )}
        </div>
      </div>
    </div>
  )
}
