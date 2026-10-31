'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Building2, MapPin, RefreshCw, Menu, Loader2, Search, ExternalLink,
  Users, CalendarDays, CalendarCheck, Wallet, UserCheck, Eye,
} from 'lucide-react'
import { adminFetch } from '@/lib/api/adminFetch'
import { useAdminShell } from '../../AdminLayoutClient'
import { fmtPrice } from '@/lib/format'
import { matchesSearch } from '@/lib/search'

type Person = { name: string | null; email: string }
type BookingRow = {
  id: string
  scheduledAt: string
  attendedAt: string | null
  status: string
  bookedByRole: string
  user: Person
  class: { name: string }
}
type Overview = {
  school: {
    id: string; name: string; slug: string; status: string; type: string
    city: string | null; country: string | null; email: string | null; phone: string | null
    createdAt: string; claimed: boolean; stripeConnected: boolean; revolutConnected: boolean
    subscriptionStatus: string | null
  }
  stats: {
    students: number
    studentsByStatus: Record<string, number>
    staff: number
    membershipsByStatus: Record<string, number>
    activeClasses: number
    bookings30: number
    bookingsByStatus30: Record<string, number>
    attended30: number
    upcoming14: number
    incomeThisMonth: { currency: string; amount: number }[]
  }
  staff: { id: string; role: string; status: string; name: string | null; email: string }[]
  students: {
    id: string; status: string; belt: string | null; beltDegree: number | null; joinedAt: string
    name: string | null; email: string; phone: string | null; attended: number
    membership: {
      planName: string; price: number; currency: string; paymentMethod: string
      status: string; paymentStatus: string; endDate: string | null
    } | null
  }[]
  classes: {
    id: string; name: string; level: string | null; duration: number | null; capacity: number | null
    isActive: boolean; isPublished: boolean; isTrial: boolean
    schedule: { dayOfWeek: number; startTime: string; endTime?: string }[]
    instructor: string | null; bookings30: number
  }[]
  recentBookings: BookingRow[]
  upcomingBookings: BookingRow[]
  transactions: {
    id: string; type: string; status: string; category: string; paymentMethod: string | null
    amount: number; currency: string; description: string | null; date: string
    user: Person | null
  }[]
}

// Same palette as the dashboard (see project status color system).
const MEMBER_STATUS: Record<string, { label: string; color: string }> = {
  ACTIVE:   { label: 'Active',   color: '#22C55E' },
  PENDING:  { label: 'Pending',  color: '#EAB308' },
  LEAD:     { label: 'Lead',     color: '#F97316' },
  INACTIVE: { label: 'Inactive', color: '#E11D48' },
  FROZEN:   { label: 'Frozen',   color: '#3B82F6' },
  ARCHIVED: { label: 'Archived', color: '#6B7280' },
}
const MEMBERSHIP_STATUS: Record<string, { label: string; color: string }> = {
  ACTIVE:    { label: 'Active',    color: '#22C55E' },
  PENDING:   { label: 'Pending',   color: '#EAB308' },
  PAUSED:    { label: 'Paused',    color: '#3B82F6' },
  CANCELLED: { label: 'Cancelled', color: '#E11D48' },
  EXPIRED:   { label: 'Expired',   color: '#6B7280' },
}
const BOOKING_STATUS: Record<string, { label: string; color: string }> = {
  PENDING:   { label: 'Pending',   color: '#EAB308' },
  CONFIRMED: { label: 'Confirmed', color: '#0870E2' },
  COMPLETED: { label: 'Completed', color: '#22C55E' },
  CANCELLED: { label: 'Cancelled', color: '#6B7280' },
  NO_SHOW:   { label: 'No-show',   color: '#E11D48' },
}
const TX_STATUS: Record<string, { label: string; color: string }> = {
  PAID:      { label: 'Paid',      color: '#22C55E' },
  PENDING:   { label: 'Pending',   color: '#EAB308' },
  FAILED:    { label: 'Failed',    color: '#E11D48' },
  REFUNDED:  { label: 'Refunded',  color: '#6B7280' },
  CANCELLED: { label: 'Cancelled', color: '#6B7280' },
  FLAGGED:   { label: 'Flagged',   color: '#F97316' },
}
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type Tab = 'students' | 'classes' | 'bookings' | 'payments' | 'staff'

function Badge({ map, value }: { map: Record<string, { label: string; color: string }>; value: string }) {
  const s = map[value] ?? { label: value, color: '#6B7280' }
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: `${s.color}14`, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  )
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtDateTime(d: string) {
  return new Date(d).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function StatCard({ icon: Icon, label, value, sub }: { icon: typeof Users; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <p className="mt-2 text-2xl font-bold text-[#101828]">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-gray-400">{sub}</p>}
    </div>
  )
}

const TH = 'text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap'
const TD = 'px-4 py-3 text-xs text-gray-600 whitespace-nowrap'

function Empty({ text }: { text: string }) {
  return <p className="px-6 py-12 text-center text-xs text-gray-400">{text}</p>
}

export default function SchoolOverviewClient({ schoolId }: { schoolId: string }) {
  const { menuOpen, setMenuOpen } = useAdminShell()
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('students')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [bookingView, setBookingView] = useState<'upcoming' | 'recent'>('upcoming')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const res = await adminFetch(`/api/admin/schools/${schoolId}/overview`)
    const json = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) { setError(json.error || 'Failed to load school'); return }
    setData(json)
  }, [schoolId])

  useEffect(() => { load() }, [load])

  const students = useMemo(() => {
    if (!data) return []
    return data.students.filter(s =>
      (!statusFilter || s.status === statusFilter) &&
      (!search || matchesSearch(`${s.name ?? ''} ${s.email} ${s.membership?.planName ?? ''}`, search)),
    )
  }, [data, search, statusFilter])

  if (loading && !data) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
  }
  if (error || !data) {
    return (
      <div className="px-4 md:px-8 py-16 text-center">
        <p className="text-sm text-red-600">{error || 'School not found'}</p>
        <Link href="/admin/schools/all" className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-[#0870E2]">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to All Schools
        </Link>
      </div>
    )
  }

  const { school, stats } = data
  const income = stats.incomeThisMonth.length
    ? stats.incomeThisMonth.map(i => fmtPrice(i.amount, i.currency)).join(' · ')
    : fmtPrice(0)
  const bookings = bookingView === 'upcoming' ? data.upcomingBookings : data.recentBookings

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'students', label: 'Students', count: data.students.length },
    { key: 'classes', label: 'Classes', count: data.classes.length },
    { key: 'bookings', label: 'Bookings', count: data.upcomingBookings.length + data.recentBookings.length },
    { key: 'payments', label: 'Payments', count: data.transactions.length },
    { key: 'staff', label: 'Staff', count: data.staff.length },
  ]

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-4 md:px-8 py-4 flex items-center justify-between gap-3 sticky top-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(!menuOpen)}>
            <Menu size={16} style={{ color: '#374151' }} />
          </button>
          <Link href="/admin/schools/all" className="hidden sm:flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-9 h-9 rounded-xl bg-[#0870E2]/8 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-[#0870E2]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-[#101828] truncate">{school.name}</h1>
            <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 shrink-0" />
              {[school.city, school.country].filter(Boolean).join(', ') || '—'}
              {school.email && <span className="hidden sm:inline"> · {school.email}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden md:inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-amber-50 text-amber-700 text-[11px] font-semibold">
            <Eye className="w-3.5 h-3.5" /> Read-only
          </span>
          <Link href={`/school/${school.slug}`} target="_blank"
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-gray-200 text-xs font-medium text-gray-500 hover:bg-gray-50">
            <ExternalLink className="w-3.5 h-3.5" /><span className="hidden sm:inline">Public profile</span>
          </Link>
          <button onClick={load}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-gray-200 text-xs font-medium text-gray-500 hover:bg-gray-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /><span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard icon={Users} label="Students" value={stats.students}
            sub={`${stats.studentsByStatus.ACTIVE ?? 0} active · ${stats.studentsByStatus.LEAD ?? 0} leads · ${stats.studentsByStatus.PENDING ?? 0} pending`} />
          <StatCard icon={UserCheck} label="Memberships" value={stats.membershipsByStatus.ACTIVE ?? 0}
            sub={`active · ${stats.membershipsByStatus.PENDING ?? 0} pending · ${stats.membershipsByStatus.PAUSED ?? 0} paused`} />
          <StatCard icon={CalendarDays} label="Classes" value={stats.activeClasses} sub="active classes" />
          <StatCard icon={CalendarCheck} label="Bookings (30d)" value={stats.bookings30}
            sub={`${stats.attended30} check-ins · ${stats.upcoming14} upcoming (14d)`} />
          <StatCard icon={Wallet} label="Income this month" value={income}
            sub={[school.stripeConnected && 'Stripe', school.revolutConnected && 'Revolut'].filter(Boolean).join(' · ') || 'No online payments'} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${tab === t.key ? 'border-[#0870E2] text-[#0870E2]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              {t.label} <span className="ml-1 text-[10px] text-gray-400">{t.count}</span>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {tab === 'students' && (
            <>
              <div className="flex flex-col sm:flex-row gap-2 p-4 border-b border-gray-50">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..."
                    className="w-full h-9 pl-9 pr-3 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-[#0870E2]" />
                </div>
                <div className="flex gap-1 overflow-x-auto">
                  {['', 'ACTIVE', 'LEAD', 'PENDING', 'FROZEN', 'INACTIVE', 'ARCHIVED'].map(s => (
                    <button key={s || 'all'} onClick={() => setStatusFilter(s)}
                      className={`h-9 px-3 rounded-xl text-[11px] font-semibold whitespace-nowrap border ${statusFilter === s ? 'border-[#0870E2] bg-[#0870E2]/5 text-[#0870E2]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                      {s ? MEMBER_STATUS[s]?.label ?? s : 'All'}{s && ` ${stats.studentsByStatus[s] ?? 0}`}
                    </button>
                  ))}
                </div>
              </div>
              {students.length === 0 ? <Empty text="No students match." /> : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b border-gray-50">
                      <th className={TH}>Student</th><th className={TH}>Status</th><th className={TH}>Membership</th>
                      <th className={TH}>Payment</th><th className={TH}>Belt</th><th className={TH}>Check-ins (30d)</th><th className={TH}>Joined</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {students.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50/50">
                          <td className={TD}>
                            <p className="font-semibold text-[#101828]">{s.name || '—'}</p>
                            <p className="text-[11px] text-gray-400">{s.email}</p>
                          </td>
                          <td className={TD}><Badge map={MEMBER_STATUS} value={s.status} /></td>
                          <td className={TD}>
                            {s.membership ? (
                              <div>
                                <p className="font-medium text-gray-700">{s.membership.planName}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <Badge map={MEMBERSHIP_STATUS} value={s.membership.status} />
                                  {s.membership.endDate && <span className="text-[10px] text-gray-400">until {fmtDate(s.membership.endDate)}</span>}
                                </div>
                              </div>
                            ) : <span className="text-gray-300">No membership</span>}
                          </td>
                          <td className={TD}>
                            {s.membership ? (
                              <div>
                                <p>{fmtPrice(s.membership.price, s.membership.currency)}</p>
                                <p className="text-[10px] text-gray-400">
                                  {s.membership.paymentMethod.replace('_', ' ').toLowerCase()}
                                  {s.membership.paymentStatus !== 'ACTIVE' && <span className="text-red-500"> · {s.membership.paymentStatus.replace('_', ' ').toLowerCase()}</span>}
                                </p>
                              </div>
                            ) : '—'}
                          </td>
                          <td className={TD}>{s.belt ? `${s.belt}${s.beltDegree ? ` · ${s.beltDegree}` : ''}` : '—'}</td>
                          <td className={TD}>{s.attended}</td>
                          <td className={TD}>{fmtDate(s.joinedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {tab === 'classes' && (data.classes.length === 0 ? <Empty text="This school has no classes yet." /> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-gray-50">
                  <th className={TH}>Class</th><th className={TH}>Schedule</th><th className={TH}>Instructor</th>
                  <th className={TH}>Capacity</th><th className={TH}>Bookings (30d)</th><th className={TH}>Status</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {data.classes.map(c => (
                    <tr key={c.id} className={`hover:bg-gray-50/50 ${c.isActive ? '' : 'opacity-50'}`}>
                      <td className={TD}>
                        <p className="font-semibold text-[#101828]">{c.name}</p>
                        <p className="text-[11px] text-gray-400">{[c.level, c.duration && `${c.duration} min`, c.isTrial && 'Trial'].filter(Boolean).join(' · ') || '—'}</p>
                      </td>
                      <td className={`${TD} whitespace-normal`}>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {c.schedule.length === 0 ? <span className="text-gray-300">No schedule</span> : c.schedule.map((s, i) => (
                            <span key={i} className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600">
                              {DAYS[s.dayOfWeek] ?? '?'} {s.startTime}{s.endTime ? `–${s.endTime}` : ''}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className={TD}>{c.instructor ?? '—'}</td>
                      <td className={TD}>{c.capacity ?? '—'}</td>
                      <td className={TD}>{c.bookings30}</td>
                      <td className={TD}>
                        <span className="text-[10px] font-semibold">
                          {c.isActive ? <span className="text-emerald-600">Active</span> : <span className="text-gray-400">Inactive</span>}
                          {c.isActive && !c.isPublished && <span className="text-gray-400"> · not published</span>}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {tab === 'bookings' && (
            <>
              <div className="flex gap-1 p-4 border-b border-gray-50">
                {([['upcoming', `Upcoming 14 days (${data.upcomingBookings.length})`], ['recent', `Last 30 days (${data.recentBookings.length})`]] as const).map(([k, label]) => (
                  <button key={k} onClick={() => setBookingView(k)}
                    className={`h-9 px-3 rounded-xl text-[11px] font-semibold border ${bookingView === k ? 'border-[#0870E2] bg-[#0870E2]/5 text-[#0870E2]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                    {label}
                  </button>
                ))}
              </div>
              {bookings.length === 0 ? <Empty text={bookingView === 'upcoming' ? 'No upcoming bookings.' : 'No bookings in the last 30 days.'} /> : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b border-gray-50">
                      <th className={TH}>When</th><th className={TH}>Class</th><th className={TH}>Student</th>
                      <th className={TH}>Status</th><th className={TH}>Check-in</th><th className={TH}>Booked by</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {bookings.map(b => (
                        <tr key={b.id} className="hover:bg-gray-50/50">
                          <td className={TD}>{fmtDateTime(b.scheduledAt)}</td>
                          <td className={`${TD} font-medium text-gray-700`}>{b.class.name}</td>
                          <td className={TD}>
                            <p className="text-gray-700">{b.user.name || '—'}</p>
                            <p className="text-[11px] text-gray-400">{b.user.email}</p>
                          </td>
                          <td className={TD}><Badge map={BOOKING_STATUS} value={b.status} /></td>
                          <td className={TD}>{b.attendedAt ? <span className="text-emerald-600 font-medium">✓ {new Date(b.attendedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span> : '—'}</td>
                          <td className={TD}>{b.bookedByRole === 'STAFF' ? 'Staff' : 'Student'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {tab === 'payments' && (data.transactions.length === 0 ? <Empty text="No transactions recorded." /> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-gray-50">
                  <th className={TH}>Date</th><th className={TH}>Description</th><th className={TH}>Student</th>
                  <th className={TH}>Method</th><th className={TH}>Status</th><th className={`${TH} text-right`}>Amount</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {data.transactions.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50/50">
                      <td className={TD}>{fmtDate(t.date)}</td>
                      <td className={TD}>
                        <p className="text-gray-700">{t.description || '—'}</p>
                        <p className="text-[10px] text-gray-400">{t.category.replace('_', ' ').toLowerCase()}</p>
                      </td>
                      <td className={TD}>{t.user ? (t.user.name || t.user.email) : '—'}</td>
                      <td className={TD}>{t.paymentMethod ? t.paymentMethod.replace('_', ' ').toLowerCase() : '—'}</td>
                      <td className={TD}><Badge map={TX_STATUS} value={t.status} /></td>
                      <td className={`${TD} text-right font-semibold ${t.type === 'EXPENSE' ? 'text-red-500' : 'text-[#101828]'}`}>
                        {t.type === 'EXPENSE' ? '−' : ''}{fmtPrice(t.amount, t.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="px-4 py-3 text-[11px] text-gray-400 border-t border-gray-50">Showing the 30 most recent transactions.</p>
            </div>
          ))}

          {tab === 'staff' && (data.staff.length === 0 ? <Empty text="No staff or owner linked to this school." /> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-gray-50">
                  <th className={TH}>Name</th><th className={TH}>Role</th><th className={TH}>Status</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {data.staff.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50/50">
                      <td className={TD}>
                        <p className="font-semibold text-[#101828]">{s.name || '—'}</p>
                        <p className="text-[11px] text-gray-400">{s.email}</p>
                      </td>
                      <td className={TD}>{s.role.replace('_', ' ').toLowerCase()}</td>
                      <td className={TD}><Badge map={MEMBER_STATUS} value={s.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
