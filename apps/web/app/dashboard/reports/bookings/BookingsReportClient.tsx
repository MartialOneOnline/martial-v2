'use client'

import { useDashboard } from '../../../../components/DashboardShell'
import { useState } from 'react'
import {Users, Calendar, CreditCard, BarChart2, Settings, Bell, ChevronRight, ChevronDown, Menu, X, Search, ChevronLeft} from 'lucide-react'
import { useT } from '../../../../lib/i18n/LanguageContext'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const ITEMS_PER_PAGE = 10

function Avatar({ name, avatarUrl, size = 28 }: { name: string; avatarUrl: string | null; size?: number }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (avatarUrl) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatarUrl} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  )
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      background: 'linear-gradient(135deg,#0870E2,#7DE7EC)', color: '#fff', fontSize: size * 0.33, fontWeight: 700 }}>
      {initials}
    </div>
  )
}

function getPaginationPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}

const AREA_DATA: Record<string, { date: string; bookings: number }[]> = {
  '7d': [
    { date: 'Mon', bookings: 18 },
    { date: 'Tue', bookings: 24 },
    { date: 'Wed', bookings: 21 },
    { date: 'Thu', bookings: 30 },
    { date: 'Fri', bookings: 27 },
    { date: 'Sat', bookings: 35 },
    { date: 'Sun', bookings: 12 },
  ],
  '30d': [
    { date: 'May 6',  bookings: 45 }, { date: 'May 9',  bookings: 52 }, { date: 'May 12', bookings: 48 },
    { date: 'May 15', bookings: 61 }, { date: 'May 18', bookings: 57 }, { date: 'May 21', bookings: 70 },
    { date: 'May 24', bookings: 65 }, { date: 'May 27', bookings: 74 }, { date: 'May 30', bookings: 68 },
    { date: 'Jun 2',  bookings: 80 },
  ],
  '90d': [
    { date: 'Mar',    bookings: 210 }, { date: 'Mar 2', bookings: 234 }, { date: 'Apr',    bookings: 260 },
    { date: 'Apr 2',  bookings: 245 }, { date: 'May',   bookings: 290 }, { date: 'May 2',  bookings: 310 },
  ],
  '12m': [
    { date: 'Jun', bookings: 380 }, { date: 'Jul', bookings: 420 }, { date: 'Aug', bookings: 395 },
    { date: 'Sep', bookings: 450 }, { date: 'Oct', bookings: 480 }, { date: 'Nov', bookings: 440 },
    { date: 'Dec', bookings: 390 }, { date: 'Jan', bookings: 510 }, { date: 'Feb', bookings: 490 },
    { date: 'Mar', bookings: 530 }, { date: 'Apr', bookings: 560 }, { date: 'May', bookings: 580 },
  ],
}

const BAR_DATA = [
  { name: 'BJJ',      bookings: 312, fill: '#0071E3' },
  { name: 'NOGI',     bookings: 187, fill: '#6D28D9' },
  { name: 'Wrestling',bookings: 94,  fill: '#C2410C' },
  { name: 'BJJ Kids', bookings: 143, fill: '#15803D' },
  { name: 'Open Mat', bookings: 78,  fill: '#0F766E' },
  { name: 'Yoga',     bookings: 55,  fill: '#B45309' },
]

type BookingStatus = 'Confirmed' | 'Cancelled' | 'No-show'

interface Booking {
  id: number
  avatar: string
  name: string
  classType: string
  date: string
  time: string
  instructor: string
  status: BookingStatus
}

const BOOKINGS: Booking[] = [
  { id:1,  avatar:'https://i.pravatar.cc/32?img=1',  name:'Carlos Mendez',    classType:'BJJ',       date:'Jun 5',  time:'18:00', instructor:'Pablo Cabo',   status:'Confirmed'  },
  { id:2,  avatar:'https://i.pravatar.cc/32?img=2',  name:'Ana García',       classType:'NOGI',      date:'Jun 5',  time:'19:30', instructor:'Rafa Torres',  status:'Confirmed'  },
  { id:3,  avatar:'https://i.pravatar.cc/32?img=3',  name:'Miguel López',     classType:'Wrestling', date:'Jun 4',  time:'10:00', instructor:'Pablo Cabo',   status:'No-show'    },
  { id:4,  avatar:'https://i.pravatar.cc/32?img=4',  name:'Laura Martínez',   classType:'BJJ Kids',  date:'Jun 4',  time:'17:00', instructor:'Maria Ruiz',   status:'Confirmed'  },
  { id:5,  avatar:'https://i.pravatar.cc/32?img=5',  name:'David Sánchez',    classType:'Open Mat',  date:'Jun 3',  time:'12:00', instructor:'Pablo Cabo',   status:'Cancelled'  },
  { id:6,  avatar:'https://i.pravatar.cc/32?img=6',  name:'Sofía Fernández',  classType:'BJJ',       date:'Jun 3',  time:'18:00', instructor:'Rafa Torres',  status:'Confirmed'  },
  { id:7,  avatar:'https://i.pravatar.cc/32?img=7',  name:'Javier Romero',    classType:'NOGI',      date:'Jun 2',  time:'19:30', instructor:'Pablo Cabo',   status:'Confirmed'  },
  { id:8,  avatar:'https://i.pravatar.cc/32?img=8',  name:'Elena Díaz',       classType:'Yoga',      date:'Jun 2',  time:'09:00', instructor:'Maria Ruiz',   status:'No-show'    },
  { id:9,  avatar:'https://i.pravatar.cc/32?img=9',  name:'Pedro Jiménez',    classType:'BJJ',       date:'Jun 1',  time:'18:00', instructor:'Pablo Cabo',   status:'Confirmed'  },
  { id:10, avatar:'https://i.pravatar.cc/32?img=10', name:'Isabel Moreno',    classType:'BJJ Kids',  date:'Jun 1',  time:'17:00', instructor:'Maria Ruiz',   status:'Cancelled'  },
  { id:11, avatar:'https://i.pravatar.cc/32?img=11', name:'Antonio Ruiz',     classType:'Wrestling', date:'May 31', time:'10:00', instructor:'Rafa Torres',  status:'Confirmed'  },
  { id:12, avatar:'https://i.pravatar.cc/32?img=12', name:'Carmen Álvarez',   classType:'BJJ',       date:'May 31', time:'18:00', instructor:'Pablo Cabo',   status:'Confirmed'  },
  { id:13, avatar:'https://i.pravatar.cc/32?img=13', name:'Francisco Torres', classType:'Open Mat',  date:'May 30', time:'12:00', instructor:'Pablo Cabo',   status:'No-show'    },
  { id:14, avatar:'https://i.pravatar.cc/32?img=14', name:'Beatriz González', classType:'NOGI',      date:'May 30', time:'19:30', instructor:'Rafa Torres',  status:'Confirmed'  },
  { id:15, avatar:'https://i.pravatar.cc/32?img=15', name:'Roberto Herrera',  classType:'BJJ',       date:'May 29', time:'18:00', instructor:'Pablo Cabo',   status:'Cancelled'  },
]

const STATUS_COLORS: Record<BookingStatus, { bg: string; color: string; border: string }> = {
  'Confirmed': { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
  'Cancelled': { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  'No-show':   { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
}

const CLASS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  'BJJ':       { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  'NOGI':      { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
  'Wrestling': { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  'BJJ Kids':  { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  'Open Mat':  { bg: '#F9FAFB', color: '#374151', border: '#E5E7EB' },
  'Yoga':      { bg: '#F0FDFA', color: '#0F766E', border: '#99F6E4' },
}

export default function BookingsReportClient() {
  const { setMenuOpen } = useDashboard()
  const t = useT()
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '12m'>('30d')
  const [filterTab, setFilterTab] = useState<'All' | BookingStatus>('All')
  const [page, setPage] = useState(1)

  const filtered = filterTab === 'All' ? BOOKINGS : BOOKINGS.filter(b => b.status === filterTab)
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)
  const pages = getPaginationPages(safePage, totalPages)

  const areaData = AREA_DATA[period] ?? []
  const totalBookings = areaData.reduce((s, d) => s + d.bookings, 0)
  const avgPerDay = areaData.length ? Math.round(totalBookings / areaData.length) : 0
  const cancellations = BOOKINGS.filter(b => b.status === 'Cancelled').length
  const confirmed = BOOKINGS.filter(b => b.status === 'Confirmed').length
  const attendanceRate = Math.round((confirmed / BOOKINGS.length) * 100)

  const STATS = [
    { label: t.reports.totalBookings,   value: String(totalBookings), sub: t.common.thisMonth,     color: '#0071E3', bg: '#EFF6FF' },
    { label: 'Avg per Day',             value: String(avgPerDay),     sub: 'daily average',        color: '#6D28D9', bg: '#F5F3FF' },
    { label: t.common.cancelled,        value: String(cancellations), sub: t.common.thisMonth,     color: '#DC2626', bg: '#FEF2F2' },
    { label: t.reports.attendanceRate,  value: attendanceRate + '%',  sub: 'of bookings',          color: '#16A34A', bg: '#F0FDF4' },
  ]

  return (

        <main style={{ flex: 1, minWidth: 0, width: "100%", overflow: "auto" }}>
          <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20"
            style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
            <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(true)}>
              <Menu size={16} style={{ color: '#374151' }} />
            </button>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 max-w-xs"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <Search size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
              <input type="text" placeholder="Search bookings…"
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', width: '100%' }} />
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: '#F3F4F6' }}>
              {(['7d', '30d', '90d', '12m'] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className="cursor-pointer"
                  style={{ fontSize: 12, fontWeight: period === p ? 600 : 400, padding: '5px 12px',
                    borderRadius: 8, border: 'none',
                    background: period === p ? '#fff' : 'transparent',
                    color: period === p ? '#111827' : '#6B7280',
                    boxShadow: period === p ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
            <button className="relative w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <Bell size={15} style={{ color: '#374151' }} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: '#DC2626' }} />
            </button>
          </div>

          <div className="px-4 md:px-8 py-6 flex flex-col gap-6">
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>{t.reports.bookingsTitle}</h1>
              <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>{t.reports.bookingsSubtitle}</p>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {STATS.map(stat => (
                <div key={stat.label} className="rounded-2xl" style={{ background: '#fff', border: '1px solid #E5E7EB', padding: '18px 20px' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: stat.color }} />
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>{stat.sub}</span>
                  </div>
                  <p style={{ fontSize: 28, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 4 }}>{stat.value}</p>
                  <p style={{ fontSize: 12, fontWeight: 500, color: '#6B7280' }}>{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Bookings Over Time</p>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={areaData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12 }} />
                    <Area type="monotone" dataKey="bookings" stroke="#0071E3" fill="#0071E3" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Bookings by Class Type</p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={BAR_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12 }} />
                    <Bar dataKey="bookings" radius={[4, 4, 0, 0]}>
                      {BAR_DATA.map((entry, index) => (
                        <rect key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1 mb-4 flex-wrap">
                {(['All', 'Confirmed', 'Cancelled', 'No-show'] as const).map(tab => {
                  const count = tab === 'All' ? BOOKINGS.length : BOOKINGS.filter(b => b.status === tab).length
                  const isOn = filterTab === tab
                  return (
                    <button key={tab} onClick={() => { setFilterTab(tab); setPage(1) }}
                      className="cursor-pointer"
                      style={{ fontSize: 12, fontWeight: isOn ? 600 : 400, padding: '5px 14px', borderRadius: 8,
                        background: isOn ? '#111827' : '#fff',
                        color: isOn ? '#fff' : '#6B7280',
                        border: isOn ? '1.5px solid #111827' : '1.5px solid #E5E7EB' }}>
                      {tab} <span style={{ opacity: 0.7, marginLeft: 2 }}>{count}</span>
                    </button>
                  )
                })}
              </div>

              <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                      {['Member', 'Class', 'Date & Time', 'Instructor', 'Status'].map(h => (
                        <th key={h} className="px-5 py-3 text-left"
                          style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((b, idx) => {
                      const sc = STATUS_COLORS[b.status]
                      const cc = CLASS_COLORS[b.classType] ?? { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' }
                      return (
                        <tr key={b.id} className="hover:bg-[#FAFAFA] transition-colors"
                          style={{ borderBottom: idx < paginated.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={b.name} avatarUrl={b.avatar} size={28} />
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{b.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
                              background: cc.bg, color: cc.color, border: '1px solid ' + cc.border }}>
                              {b.classType}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <p style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{b.date}</p>
                            <p style={{ fontSize: 11, color: '#9CA3AF' }}>{b.time}</p>
                          </td>
                          <td className="px-5 py-3">
                            <span style={{ fontSize: 13, color: '#6B7280' }}>{b.instructor}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
                              background: sc.bg, color: sc.color, border: '1px solid ' + sc.border }}>
                              {b.status}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
                    <p style={{ fontSize: 13, color: '#6B7280' }}>
                      Showing <span style={{ fontWeight: 600, color: '#111827' }}>{(safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)}</span> of <span style={{ fontWeight: 600, color: '#111827' }}>{filtered.length}</span>
                    </p>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                        style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff',
                          color: safePage === 1 ? '#D1D5DB' : '#374151', cursor: safePage === 1 ? 'not-allowed' : 'pointer', borderRadius: 8, padding: '6px 12px' }}>
                        <ChevronLeft size={14} />
                      </button>
                      {pages.map((p, i) =>
                        p === '...' ? <span key={'e' + i} style={{ fontSize: 13, color: '#9CA3AF', padding: '0 4px' }}>…</span> : (
                          <button key={p} onClick={() => setPage(p as number)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer"
                            style={{ fontSize: 13, fontWeight: p === safePage ? 600 : 400, border: 'none',
                              background: p === safePage ? '#F3F4F6' : 'transparent',
                              color: p === safePage ? '#111827' : '#6B7280' }}>{p}</button>
                        )
                      )}
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                        style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff',
                          color: safePage === totalPages ? '#D1D5DB' : '#374151', cursor: safePage === totalPages ? 'not-allowed' : 'pointer', borderRadius: 8, padding: '6px 12px' }}>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
  )
}
