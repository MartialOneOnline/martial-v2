import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getBookedCounts } from '@/lib/services/eventCapacity'
import { fmtPrice, formatEventType } from '@/lib/format'
import { ogImageUrl } from '@/lib/og'
import InstagramIcon from '@/components/icons/InstagramIcon'
import EventTicketCTA from '../../EventTicketCTA'
import LeadForm from '../../LeadForm'
import ShareButton from './ShareButton'
import Gallery from './Gallery'
import EventCountdown from './EventCountdown'
import {
  ChevronLeft, Calendar, Clock, MapPin, Ticket, ExternalLink,
  Phone, Globe, Mail, MessageCircle, Users,
} from 'lucide-react'

const FALLBACK = 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=1200&h=600&fit=crop&q=85'

async function getEvent(schoolSlug: string, eventSlug: string) {
  return prisma.event.findFirst({
    where: {
      slug: eventSlug,
      isPublished: true,
      isCancelled: false,
      school: { slug: schoolSlug, status: { notIn: ['SUSPENDED', 'ARCHIVED'] } },
    },
    include: {
      school: {
        select: {
          name: true, slug: true, coverUrl: true, logoUrl: true, address: true, city: true, country: true,
          phone: true, website: true, email: true, instagram: true,
        },
      },
      instructor: { select: { name: true, role: true, belt: true, bio: true, photoUrl: true } },
      tickets: { orderBy: { sortOrder: 'asc' } },
    },
  })
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string; eventSlug: string }> },
): Promise<Metadata> {
  const { slug, eventSlug } = await params
  const event = await getEvent(slug, eventSlug)
  if (!event) return { title: 'Event not found' }

  const dateLabel = event.startAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const title = `${event.title} — ${event.school.name}`
  const description = event.description
    ?? `${dateLabel}${event.location ? ` · ${event.location}` : ''} — hosted by ${event.school.name}.`
  const image = ogImageUrl(event.coverUrl ?? event.school.coverUrl)

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

export default async function EventProfile(
  { params }: { params: Promise<{ slug: string; eventSlug: string }> },
) {
  const { slug, eventSlug } = await params
  const event = await getEvent(slug, eventSlug)
  if (!event) notFound()

  const cover = event.coverUrl ?? event.school.coverUrl ?? FALLBACK
  const { byTicket, byEvent } = await getBookedCounts([event.id])

  const eventForCta = {
    id: event.id,
    title: event.title,
    type: event.type,
    location: event.location,
    startAt: event.startAt.toISOString(),
    coverUrl: event.coverUrl,
    paymentMethods: event.paymentMethods,
    capacity: event.capacity,
    booked: byEvent.get(event.id) ?? 0,
    tickets: event.tickets.map(t => ({
      id: t.id, name: t.name, description: t.description,
      price: t.price, currency: t.currency, capacity: t.capacity,
      booked: byTicket.get(t.id) ?? 0,
    })),
  }

  const minPrice = event.tickets.length > 0 ? Math.min(...event.tickets.map(t => t.price)) : null
  const dateLabel = event.startAt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeLabel = event.startAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const redirectPath = `/school/${slug}/events/${eventSlug}`
  const mapQuery = event.location || event.school.address || event.school.city || ''
  const remaining = event.showCapacity && event.capacity != null ? Math.max(0, event.capacity - eventForCta.booked) : null
  const hasContactInfo = !!(event.school.phone || event.school.website || event.school.email || event.school.instagram)

  return (
    <div className="min-h-screen bg-[#F8F9FB]">

      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="relative h-72 md:h-[440px] bg-[#101828] overflow-hidden">
        <Image src={cover} alt={event.title} fill className="object-cover opacity-80" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/20" />

        <div className="absolute top-4 left-4 z-10">
          <Link
            href={`/school/${slug}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-black/30 backdrop-blur-sm text-white text-xs font-semibold border border-white/15 hover:bg-black/50 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            {event.school.name}
          </Link>
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-4 md:px-8 pb-6 z-10">
          <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-[#0870E2] text-white mb-3">
            {formatEventType(event.type)}
          </span>
          <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight mb-3 text-balance">
            {event.title}
          </h1>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-white/85 text-xs md:text-sm">
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />{dateLabel}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />{timeLabel}</span>
            {event.location && (
              <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />{event.location}</span>
            )}
            {minPrice !== null && (
              <span className="flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
                from {fmtPrice(minPrice, event.tickets[0]!.currency)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 py-6 pb-28 md:pb-6">
        <div className="grid lg:grid-cols-12 gap-6 items-start">

          {/* ── Left column ── */}
          <div className="lg:col-span-8 space-y-6">
            <Gallery images={event.gallery} alt={event.title} />

            {event.description && (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-5">
                <p className="text-sm font-bold text-[#101828] mb-2">About this event</p>
                <p className="text-gray-500 text-sm leading-relaxed whitespace-pre-line">{event.description}</p>
              </div>
            )}

            {event.instructor && (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-5">
                <p className="text-sm font-bold text-[#101828] mb-3">Instructor</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#0870E2]/10 flex items-center justify-center text-[#0870E2] font-bold shrink-0 overflow-hidden">
                    {event.instructor.photoUrl
                      ? <Image src={event.instructor.photoUrl} alt={event.instructor.name} width={48} height={48} className="object-cover w-full h-full" />
                      : event.instructor.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#101828] truncate">{event.instructor.name}</p>
                    <p className="text-xs text-[#0870E2] font-medium">{event.instructor.role}</p>
                    {event.instructor.belt && <p className="text-xs text-gray-400">{event.instructor.belt}</p>}
                  </div>
                </div>
                {event.instructor.bio && <p className="text-sm text-gray-500 leading-relaxed mt-3">{event.instructor.bio}</p>}
              </div>
            )}

            {mapQuery && (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                  <p className="text-sm font-bold text-[#101828]">Location</p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs text-[#0870E2] font-semibold flex items-center gap-1 hover:underline"
                  >
                    Maps <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="px-5 py-4 text-sm text-gray-500 flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#0870E2] shrink-0 mt-0.5" />
                  {mapQuery}
                </div>
                <iframe
                  title="Event location map"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`}
                  className="w-full h-56 border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            )}
          </div>

          {/* ── Right column (sticky) ── */}
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-6">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-5">
              <EventCountdown startAt={event.startAt.toISOString()} className="mb-4" />
              {minPrice !== null && (
                <>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Tickets from</p>
                  <p className="text-3xl font-bold text-[#101828] mb-1">{fmtPrice(minPrice, event.tickets[0]!.currency)}</p>
                </>
              )}
              {remaining !== null && (
                <p className={`text-xs font-semibold mb-4 flex items-center gap-1.5 ${remaining <= 10 ? 'text-amber-600' : 'text-gray-400'}`}>
                  <Users className="w-3.5 h-3.5" />
                  {remaining <= 0 ? 'Sold out' : `${remaining} spot${remaining === 1 ? '' : 's'} left`}
                </p>
              )}
              <div className="flex flex-col gap-2">
                <EventTicketCTA
                  events={[eventForCta]}
                  schoolSlug={slug}
                  redirectPath={redirectPath}
                  className="w-full h-12 rounded-xl bg-[#0870E2] hover:bg-[#005580] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                />
                <ShareButton
                  title={event.title}
                  className="w-full h-12 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                />
              </div>
            </div>

            {/* Hosted by */}
            <Link
              href={`/school/${slug}`}
              className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-4 hover:border-[#0870E2]/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-[#0870E2]/10 flex items-center justify-center text-[#0870E2] font-bold text-sm">
                {event.school.logoUrl
                  ? <Image src={event.school.logoUrl} alt={event.school.name} width={40} height={40} className="object-cover w-full h-full" />
                  : event.school.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Hosted by</p>
                <p className="text-sm font-bold text-[#101828] truncate">{event.school.name}</p>
              </div>
            </Link>

            {/* Contact form */}
            <LeadForm slug={slug} schoolName={event.school.name} disciplines={[]} />

            {/* Contact info */}
            {hasContactInfo && (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-4 py-3 space-y-2.5">
                {event.school.phone && (
                  <a
                    href={`https://wa.me/${event.school.phone.replace(/\D/g, '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 text-xs text-gray-500 hover:text-emerald-600 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    WhatsApp
                  </a>
                )}
                {event.school.phone && (
                  <a href={`tel:${event.school.phone}`} className="flex items-center gap-3 text-xs text-gray-500 hover:text-[#0870E2] transition-colors">
                    <Phone className="w-3.5 h-3.5 text-[#0870E2] shrink-0" />
                    {event.school.phone}
                  </a>
                )}
                {event.school.website && (
                  <a href={event.school.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-xs text-gray-500 hover:text-[#0870E2] transition-colors truncate">
                    <Globe className="w-3.5 h-3.5 text-[#0870E2] shrink-0" />
                    <span className="truncate">{event.school.website.replace(/^https?:\/\//, '')}</span>
                  </a>
                )}
                {event.school.email && (
                  <a href={`mailto:${event.school.email}`} className="flex items-center gap-3 text-xs text-gray-500 hover:text-[#0870E2] transition-colors truncate">
                    <Mail className="w-3.5 h-3.5 text-[#0870E2] shrink-0" />
                    <span className="truncate">{event.school.email}</span>
                  </a>
                )}
                {event.school.instagram && (
                  <a href={`https://instagram.com/${event.school.instagram}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-xs text-gray-500 hover:text-[#0870E2] transition-colors">
                    <InstagramIcon className="w-3.5 h-3.5 text-[#0870E2] shrink-0" />
                    @{event.school.instagram}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile fixed bottom CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur border-t border-gray-100 px-4 py-3 safe-area-pb">
        <div className="flex gap-2">
          <ShareButton
            title={event.title}
            className="flex items-center justify-center gap-2 h-12 px-4 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm transition-colors"
          />
          <EventTicketCTA
            events={[eventForCta]}
            schoolSlug={slug}
            redirectPath={redirectPath}
            className="flex-1 h-12 rounded-xl bg-[#0870E2] hover:bg-[#005580] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
          />
        </div>
      </div>
    </div>
  )
}
