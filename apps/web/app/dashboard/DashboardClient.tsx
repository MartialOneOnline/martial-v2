'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Bell, Clock, TrendingUp, TrendingDown,
  ChevronRight,
  Filter, Download,
  Sparkles, Send,
  Calendar,
  Menu, UserPlus, QrCode, Pencil,
} from 'lucide-react'
import { useDashboard } from '../../components/DashboardShell'
import { useSchoolContext } from '../../lib/auth/useSchoolContext'
import NotificationsPopup       from '../../components/popups/NotificationsPopup'
import InviteUserModal           from '../../components/popups/InviteUserModal'
import SendModal                 from '../../components/popups/SendModal'
import QRCodeModal               from '../../components/popups/QRCodeModal'
import EditSchoolModal           from '../../components/popups/EditSchoolModal'
import AIMessagesModal           from '../../components/popups/AIMessagesModal'
import ClassCapacityPopup        from '../../components/popups/ClassCapacityPopup'
import { TransactionActionsButton } from '../../components/popups/TransactionActionsPopup'
import { useT }                  from '../../lib/i18n/LanguageContext'
import DashboardLanguageSelector  from '../../components/DashboardLanguageSelector'

// ── Design tokens ──────────────────────────────────────────────────────────────
// bg:       #F9FAFB
// card:     #FFFFFF
// border:   #E5E7EB
// text-1:   #111827  (near-black)
// text-2:   #6B7280  (secondary gray)
// blue:     #0071E3  (Apple blue — primary / active icon)
// green:    #16A34A
// red:      #DC2626
// amber:    #D97706

interface Props {
  userName: string
  userEmail: string
  userRole: string
}

// ── Simulated data ─────────────────────────────────────────────────────────────

// STATS labels/sub are resolved at render via t.*

// Mock transaction dates are computed relative to today (preview only)
function relDate(daysAgo: number) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
const TRANSACTIONS = [
  { id: 1, avatar: 'https://i.pravatar.cc/32?u=fn', name: 'Fernanda Neves',   method: 'Free',   price: '€ 0.00',  date: relDate(0),  status: 'Paid'    },
  { id: 2, avatar: 'https://i.pravatar.cc/32?u=pm', name: 'Patricia Mancera', method: 'Free',   price: '€ 0.00',  date: relDate(3),  status: 'Paid'    },
  { id: 3, avatar: 'https://i.pravatar.cc/32?u=mt', name: 'Matias Toloza',    method: 'Free',   price: '€ 0.00',  date: relDate(4),  status: 'Pending' },
  { id: 4, avatar: 'https://i.pravatar.cc/32?u=fw', name: 'Florian Walter',   method: 'Stripe', price: '€ 65.00', date: relDate(4),  status: 'Paid'    },
  { id: 5, avatar: 'https://i.pravatar.cc/32?u=ad', name: 'Alejandro DB',     method: 'Cash',   price: '€ 65.00', date: relDate(5),  status: 'Failed'  },
  { id: 6, avatar: 'https://i.pravatar.cc/32?u=rg', name: 'Rafael Gonzalez',  method: 'Stripe', price: '€ 65.00', date: relDate(6),  status: 'Paid'    },
]

const CHART_DATA = [
  { month: 'JAN', value: 28 },
  { month: 'FEB', value: 42 },
  { month: 'MAR', value: 35 },
  { month: 'APR', value: 58 },
  { month: 'MAY', value: 72 },
  { month: 'JUN', value: 65 },
]

const TODAY_CLASSES = [
  { id: 1,  name: 'BJJ All Levels',    time: '07:00–08:30', enrolled: 8,  cap: 20, status: 'Open', image: '/roger-gracie-malaga.jpg'     },
  { id: 2,  name: 'NOGI',             time: '08:30–09:30', enrolled: 15, cap: 15, status: 'Full', image: '/mathouse.jpg'                },
  { id: 3,  name: 'Kids BJJ',         time: '09:30–10:30', enrolled: 10, cap: 20, status: 'Open', image: '/five-elements-jiu-jitsu.jpg' },
  { id: 4,  name: 'BJJ Beginners',    time: '10:00–11:30', enrolled: 5,  cap: 25, status: 'Open', image: '/roger-gracie-malaga.jpg'     },
  { id: 5,  name: 'Open Mat',         time: '11:30–13:00', enrolled: 22, cap: 25, status: 'Open', image: '/mathouse.jpg'                },
  { id: 6,  name: 'BJJ Advanced',     time: '12:00–13:30', enrolled: 18, cap: 20, status: 'Open', image: '/five-elements-jiu-jitsu.jpg' },
  { id: 7,  name: 'Wrestling',        time: '17:00–18:00', enrolled: 12, cap: 15, status: 'Open', image: '/roger-gracie-malaga.jpg'     },
  { id: 8,  name: 'NOGI Advanced',    time: '18:00–19:30', enrolled: 14, cap: 15, status: 'Open', image: '/mathouse.jpg'                },
  { id: 9,  name: 'BJJ Competition',  time: '19:00–20:30', enrolled: 15, cap: 15, status: 'Full', image: '/five-elements-jiu-jitsu.jpg' },
  { id: 10, name: 'BJJ Beginners',    time: '19:30–20:30', enrolled: 3,  cap: 25, status: 'Open', image: '/roger-gracie-malaga.jpg'     },
  { id: 11, name: 'Open Mat',         time: '20:00–21:30', enrolled: 20, cap: 25, status: 'Open', image: '/mathouse.jpg'                },
  { id: 12, name: 'BJJ All Levels',   time: '20:30–21:30', enrolled: 1,  cap: 30, status: 'Open', image: '/five-elements-jiu-jitsu.jpg' },
]

const DAY_LABELS = ['MON','TUE','WED','THU','FRI','SAT','SUN']
// Generate 14 days starting from today — computed once at module load time (client-side)
// This is mock data for the preview/demo dashboard only; the real dashboard uses API data.
function buildDays() {
  const today = new Date()
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    return { long: DAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1]!, num: d.getDate() }
  })
}
const DAYS = typeof window !== 'undefined' ? buildDays() : Array.from({ length: 14 }, (_, i) => ({ long: DAY_LABELS[i % 7]!, num: i + 1 }))

const ACADEMY_ACTIONS = [
  { icon: UserPlus, label: 'Invite'   },
  { icon: Send,     label: 'Send'     },
  { icon: QrCode,   label: 'QR code'  },
  { icon: Pencil,   label: 'Edit'     },
]

type Period = 'All time' | '12 months' | '30 days' | '7 days'

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    Paid:    { bg: '#F0FDF4', color: '#16A34A' },
    Pending: { bg: '#FFFBEB', color: '#D97706' },
    Failed:  { bg: '#FEF2F2', color: '#DC2626' },
    Open:    { bg: '#EFF6FF', color: '#2563EB' },
    Full:    { bg: '#FEF2F2', color: '#DC2626' },
  }
  const { bg, color } = map[status] ?? { bg: '#F3F4F6', color: '#6B7280' }
  return (
    <span style={{ background: bg, color, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}>
      {status}
    </span>
  )
}

// ── SVG Area Chart ─────────────────────────────────────────────────────────────

function AreaChart() {
  const W = 560; const H = 160; const PAD = { t: 16, r: 16, b: 32, l: 40 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b
  const max = Math.max(...CHART_DATA.map(d => d.value))
  const points = CHART_DATA.map((d, i) => ({
    x: PAD.l + (i / (CHART_DATA.length - 1)) * innerW,
    y: PAD.t + (1 - d.value / max) * innerH,
  }))

  const linePath = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`
    const prev = points[i - 1]!
    const cpX = (prev.x + p.x) / 2
    return `${acc} C ${cpX} ${prev.y} ${cpX} ${p.y} ${p.x} ${p.y}`
  }, '')

  const lastPt  = points[points.length - 1]!
  const firstPt = points[0]!
  const areaPath = `${linePath} L ${lastPt.x} ${H - PAD.b} L ${firstPt.x} ${H - PAD.b} Z`
  const gridLines = [0.25, 0.5, 0.75].map(t => PAD.t + t * innerH)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0071E3" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#0071E3" stopOpacity="0"   />
        </linearGradient>
      </defs>
      {gridLines.map((y, i) => (
        <line key={i} x1={PAD.l} y1={y} x2={W - PAD.r} y2={y}
          stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4 4" />
      ))}
      <path d={areaPath} fill="url(#areaGrad)" />
      <path d={linePath} fill="none" stroke="#0071E3" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#fff" stroke="#0071E3" strokeWidth="2" />
      ))}
      {CHART_DATA.map((d, i) => (
        <text key={i} x={points[i]!.x} y={H - 8} textAnchor="middle"
          fontSize="10" fontWeight="500" fill="#6B7280"
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif' }}
        >
          {d.month}
        </text>
      ))}
    </svg>
  )
}

// ── Real data types ────────────────────────────────────────────────────────────
type DashStats = {
  members: { value: number; trend: string | null }
  activeClasses: { value: number }
  revenue: { value: number; formatted: string; trend: string | null }
  bookings: { value: number }
  activeMembers: { value: number }
  openLeads: { value: number }
  gradings: { value: number }
  classesToday: { value: number }
}

type TodayClass = {
  id: string | number; name: string; time: string
  enrolled: number; cap: number; status: string
  instructor?: string | null; level?: string | null
  image?: string
}

export default function DashboardClient({ userName, userEmail }: Props) {
  const t = useT()
  const { currentSchool, loading: ctxLoading } = useSchoolContext()

  const [period, setPeriod]         = useState<Period>('12 months')
  const [activeDay, setActiveDay]   = useState(0)
  // Resolved after mount to avoid SSR/client hydration mismatch (#418)
  const [dateLabel, setDateLabel]   = useState('')
  const [longDateLabel, setLongDateLabel] = useState('')
  const [greeting, setGreeting]     = useState(t.dashboard.goodMorning)

  useEffect(() => {
    const now = new Date()
    const todayNum = now.getDate()
    const idx = DAYS.findIndex(d => d.num === todayNum)
    setActiveDay(idx >= 0 ? idx : 0)
    setDateLabel(now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }))
    setLongDateLabel(now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }))
    const hour = now.getHours()
    setGreeting(hour < 12 ? t.dashboard.goodMorning : hour < 18 ? t.dashboard.goodAfternoon : t.dashboard.goodEvening)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const { menuOpen, setMenuOpen } = useDashboard()

  // Real data
  const [stats, setStats]           = useState<DashStats | null>(null)
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([])

  useEffect(() => {
    const sid = currentSchool?.schoolId
    if (!sid) return
    fetch(`/api/dashboard/stats?schoolId=${sid}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setStats(d))
    fetch(`/api/dashboard/classes/today?schoolId=${sid}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d?.classes && setTodayClasses(d.classes))
  }, [currentSchool?.schoolId])
  const [aiInput, setAiInput]       = useState('')
  const [aiMessages, setAiMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([
    { role: 'ai', text: t.dashboard.aiGreeting },
  ])

  // Use real classes if loaded, fall back to mock
  const displayClasses = todayClasses.length > 0
    ? todayClasses
    : TODAY_CLASSES

  // ── Popup state ────────────────────────────────────────────────────────────
  const [showNotifications, setShowNotifications] = useState(false)
  const [showInvite, setShowInvite]               = useState(false)
  const [showSend, setShowSend]                   = useState(false)
  const [showQR, setShowQR]                       = useState(false)
  const [showEditSchool, setShowEditSchool]        = useState(false)
  const [showAIMessages, setShowAIMessages]        = useState(false)
  const [selectedClass, setSelectedClass]         = useState<TodayClass | null>(null)
  const bellRef                                    = useRef<HTMLDivElement>(null)

  const firstName = userName.split(' ')[0] ?? 'there'

  const STATS = [
    {
      label: t.dashboard.students,
      value: stats ? stats.members.value.toLocaleString() : '—',
      trend: stats?.members.trend ?? null,
      trendUp: true,
      sub: t.common.vsLastMonth,
    },
    {
      label: t.dashboard.activeClasses,
      value: stats ? stats.activeClasses.value.toLocaleString() : '—',
      trend: null,
      trendUp: true,
      sub: t.common.thisWeek,
    },
    {
      label: t.dashboard.revenue,
      value: stats ? stats.revenue.formatted : '—',
      trend: stats?.revenue.trend ?? null,
      trendUp: true,
      sub: t.common.vsLastMonth,
    },
    {
      label: t.dashboard.bookings,
      value: stats ? stats.bookings.value.toLocaleString() : '—',
      trend: null,
      trendUp: true,
      sub: t.common.allTime,
    },
  ]
  const AI_INSIGHTS = [
    { insight: t.dashboard.insight1, action: t.dashboard.action1, openAI: true  },
    { insight: t.dashboard.insight2, action: t.dashboard.action2, openAI: false },
    { insight: t.dashboard.insight3, action: t.dashboard.action3, openAI: false },
  ]

  return (
    <>
      <main style={{ flex: 1, minWidth: 0 }}>

        {/* ── Top bar ───────────────────────────────────────────────────────── */}
        <div
          className="flex items-center gap-2 px-4 md:px-8 py-3 sticky top-0 z-20"
          style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}
        >
          {/* Burger — mobile/tablet only */}
          <button
            id="burger-btn"
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Menu size={16} style={{ color: '#374151' }} />
          </button>

          {/* Search — hidden on mobile */}
          <div className="hidden sm:flex flex-1 max-w-xs items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <Filter size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
            <input type="text" placeholder={t.dashboard.searchPlaceholder}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', width: '100%' }} />
          </div>

          {/* Period pills — hidden on mobile */}
          <div className="hidden md:flex items-center gap-1">
            {(['All time', '12 months', '30 days', '7 days'] as Period[]).map(p => {
              const periodLabels: Record<Period, string> = {
                'All time': t.dashboard.periodAllTime, '12 months': t.dashboard.period12Months,
                '30 days': t.dashboard.period30Days, '7 days': t.dashboard.period7Days,
              }
              return (
              <button key={p} onClick={() => setPeriod(p)} style={{
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                color: period === p ? '#111827' : '#6B7280',
                background: period === p ? '#F3F4F6' : 'transparent',
                border: 'none', borderRadius: 8, padding: '5px 10px',
              }}>{periodLabels[p]}</button>
            )})}
          </div>

          <div className="flex-1" />

          {/* Date — hidden on mobile */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}>
            <Clock size={13} style={{ color: '#9CA3AF' }} />
            {dateLabel}
          </div>

          {/* Bell + Notifications popup */}
          <div ref={bellRef} className="relative">
            <button
              onClick={() => setShowNotifications(v => !v)}
              className="relative w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
              style={{ background: showNotifications ? '#EFF6FF' : '#F9FAFB', border: '1px solid #E5E7EB' }}
            >
              <Bell size={15} style={{ color: '#374151' }} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: '#DC2626' }} />
            </button>
            {showNotifications && (
              <NotificationsPopup onClose={() => setShowNotifications(false)} />
            )}
          </div>

          {/* Language */}
          <DashboardLanguageSelector />

          {/* Export */}
          <button className="hidden sm:flex" style={{
            alignItems: 'center', gap: 6,
            fontSize: 13, fontWeight: 500, color: '#374151',
            background: '#fff', border: '1px solid #E5E7EB',
            borderRadius: 8, padding: '7px 14px', cursor: 'pointer',
          }}>
            <Download size={13} style={{ color: '#6B7280' }} />
            {t.common.export}
          </button>
        </div>

        <div className="px-4 md:px-8 py-5 md:py-6 flex flex-col gap-5 md:gap-6 min-h-screen">

          {/* 1. Academy Info — mobile only */}
          <div className="lg:hidden rounded-2xl overflow-hidden" style={{ border: '1px solid #E5E7EB', background: '#fff' }}>
            <div className="relative overflow-visible" style={{ height: 90 }}>
              <div className="absolute inset-0 overflow-hidden rounded-t-2xl">
                <Image src="/roger-gracie-malaga.jpg" alt="Roger Gracie Malaga" fill className="object-cover" />
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 rounded-full overflow-hidden border-[3px] border-white"
                style={{ width: 64, height: 64, bottom: -32, background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.18)', zIndex: 10 }}>
                <Image src="/logo-roger-gracie.png" alt="Roger Gracie" width={64} height={64} className="object-contain" />
              </div>
            </div>
            <div className="pt-10 pb-4 px-4 text-center">
              <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{currentSchool?.schoolName ?? 'Academy'}</p>
              <p style={{ fontSize: 12, color: '#9CA3AF' }}>{t.dashboard.jiuJitsuAcademy}</p>
            </div>
            <div className="px-4 pb-4 flex gap-2" style={{ borderTop: '1px solid #F3F4F6', paddingTop: 12 }}>
              <button onClick={() => setShowInvite(true)} title={t.dashboard.inviteUser} className="flex-1 h-9 flex items-center justify-center rounded-xl cursor-pointer" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}><UserPlus size={15} style={{ color: '#0071E3' }} /></button>
              <button onClick={() => setShowSend(true)} title={t.dashboard.send} className="flex-1 h-9 flex items-center justify-center rounded-xl cursor-pointer" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}><Send size={15} style={{ color: '#0071E3' }} /></button>
              <button onClick={() => setShowQR(true)} title={t.dashboard.qrCode} className="flex-1 h-9 flex items-center justify-center rounded-xl cursor-pointer" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}><QrCode size={15} style={{ color: '#0071E3' }} /></button>
              <button onClick={() => setShowEditSchool(true)} title={t.dashboard.edit} className="flex-1 h-9 flex items-center justify-center rounded-xl cursor-pointer" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}><Pencil size={15} style={{ color: '#0071E3' }} /></button>
            </div>
          </div>

          {/* 2. AI Suggested Actions — mobile only */}
          <div className="lg:hidden rounded-2xl overflow-hidden" style={{ border: '1px solid #E5E7EB', background: '#fff' }}>
            <div className="flex items-center justify-between px-4 pt-4 pb-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)' }}>
                  <Sparkles size={13} style={{ color: '#fff' }} />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>AI Assistant</p>
                  <p style={{ fontSize: 10, color: '#9CA3AF', lineHeight: 1.2 }}>Powered by Martial AI</p>
                </div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#16A34A', background: '#F0FDF4', padding: '2px 8px', borderRadius: 999 }}>
                {t.dashboard.online}
              </span>
            </div>
            <div className="px-4 py-3">
              <p style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                {t.dashboard.suggestedActions}
              </p>
              <div className="space-y-3">
                {AI_INSIGHTS.map((r, i, arr) => (
                  <div key={i} style={{ paddingBottom: i < arr.length - 1 ? 12 : 0, borderBottom: i < arr.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: '#111827', lineHeight: 1.4 }}>{r.insight}</p>
                    <button
                      onClick={() => r.openAI && setShowAIMessages(true)}
                      style={{
                        marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 12, fontWeight: 600, color: '#6366F1',
                        background: '#EEF2FF', border: 'none', borderRadius: 8,
                        padding: '5px 10px', cursor: 'pointer',
                      }}>
                      {r.action} →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STATS.map(stat => (
              <div
                key={stat.label}
                className="rounded-2xl"
                style={{ background: '#fff', border: '1px solid #E5E7EB', padding: '14px 14px 12px' }}
              >
                {/* Label + trend */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.3 }}>{stat.label}</span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 2, flexShrink: 0,
                    fontSize: 11, fontWeight: 600,
                    background: stat.trendUp ? '#F0FDF4' : '#FEF2F2',
                    color: stat.trendUp ? '#16A34A' : '#DC2626',
                    padding: '2px 7px', borderRadius: 999,
                  }}>
                    {stat.trendUp ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                    {stat.trend}
                  </span>
                </div>

                {/* Value */}
                <p className="text-3xl lg:text-4xl" style={{ fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {stat.value}
                </p>

                {/* Sub-text */}
                <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>{stat.sub}</p>
              </div>
            ))}
          </div>

          {/* 4. Upcoming Classes — mobile only */}
          <div className="lg:hidden rounded-2xl" style={{ border: '1px solid #E5E7EB', background: '#fff' }}>
            <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <p style={{ fontSize: 12, color: '#9CA3AF' }}>{t.dashboard.upcomingClasses}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                  {longDateLabel}
                </p>
                <Calendar size={13} style={{ color: '#9CA3AF' }} />
              </div>
            </div>
            <div className="flex gap-1 px-3 py-2" style={{ borderBottom: '1px solid #F3F4F6', overflowX: 'auto', scrollbarWidth: 'none' }}>
              {DAYS.map((d, i) => (
                <button key={i} onClick={() => setActiveDay(i)} className="flex flex-col items-center shrink-0 py-1.5 cursor-pointer" style={{ background: 'none', border: 'none', minWidth: 36 }}>
                  <span style={{ fontSize: 9, fontWeight: 500, color: activeDay === i ? '#0071E3' : '#9CA3AF', letterSpacing: '0.04em' }}>{d.long}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: activeDay === i ? '#0071E3' : '#374151', borderBottom: activeDay === i ? '2px solid #0071E3' : '2px solid transparent', paddingBottom: 1 }}>{d.num}</span>
                </button>
              ))}
            </div>
            <div className="px-4 py-3 space-y-3">
              {displayClasses.slice(0, 5).map((cls, i) => {
                const pct = cls.enrolled / cls.cap
                const capacityColor = pct >= 1 ? '#DC2626' : pct > 0.7 ? '#D97706' : '#16A34A'
                return (
                  <div key={cls.id} className="flex items-center gap-3" style={{ paddingBottom: i < 4 ? 12 : 0, borderBottom: i < 4 ? '1px solid #F9FAFB' : 'none' }}>
                    <div className="shrink-0 rounded-xl overflow-hidden relative" style={{ width: 52, height: 52 }}>
                      <Image src={cls.image ?? '/martial-logo.png'} alt={cls.name} fill className="object-cover" />
                    </div>
                    {/* Name + time */}
                    <div className="flex-1 min-w-0 pl-1">
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cls.name}</p>
                      <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>{cls.time}</p>
                    </div>
                    {/* Capacity + badge stacked, centered */}
                    <div className="shrink-0 flex flex-col items-center gap-1.5">
                      <span style={{ fontSize: 13, fontWeight: 700, color: capacityColor }}>{cls.enrolled}/{cls.cap}</span>
                      <StatusBadge status={cls.status} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 5. Quick Stats — mobile only */}
          <div className="lg:hidden rounded-2xl overflow-hidden" style={{ border: '1px solid #E5E7EB', background: '#fff' }}>
            <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <p style={{ fontSize: 12, color: '#9CA3AF' }}>{t.dashboard.quickStats}</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{t.dashboard.today}</p>
            </div>
            <div className="grid grid-cols-3" style={{ gap: 1, background: '#F3F4F6' }}>
              {[
                { label: t.dashboard.avgAttendance, value: '78%', color: '#0071E3' },
                { label: t.dashboard.openLeads,     value: '4',   color: '#D97706' },
                { label: t.dashboard.gradings,      value: '167', color: '#16A34A' },
                { label: t.dashboard.notifications, value: '35',  color: '#DC2626' },
                { label: t.dashboard.activeMembers, value: '421', color: '#6366F1' },
                { label: t.dashboard.classesToday,  value: '12',  color: '#0071E3' },
              ].map(s => (
                <div key={s.label} className="flex flex-col items-center gap-1.5 px-3 pt-3 pb-5" style={{ background: '#fff' }}>
                  <p style={{ fontSize: 10, color: '#9CA3AF', textAlign: 'center' }}>{s.label}</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: s.color, letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 6. Bookings chart — full width */}
          <div
            className="rounded-2xl"
            style={{ background: '#fff', border: '1px solid #E5E7EB', padding: '22px 26px' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', letterSpacing: '-0.01em' }}>Jan – Jun 2026</p>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#0071E3', background: '#EFF6FF', padding: '2px 8px', borderRadius: 999 }}>
                  +18% vs last period
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#6B7280' }}>{t.dashboard.bookingsOverview}</p>
            </div>
            <AreaChart />
          </div>

          {/* 7. Transactions */}
          <div
            className="rounded-2xl overflow-hidden flex flex-col flex-1"
            style={{ background: '#fff', border: '1px solid #E5E7EB' }}
          >
            <div className="flex items-center justify-between px-7 py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <div className="flex items-center gap-3">
                <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', letterSpacing: '-0.01em' }}>{TRANSACTIONS.length} {t.dashboard.recent}</p>
                <p style={{ fontSize: 12, color: '#6B7280' }}>{t.dashboard.latestTransactions}</p>
              </div>
              <Link href="#" style={{ fontSize: 12, fontWeight: 600, color: '#0071E3' }} className="no-underline flex items-center gap-1">
                {t.dashboard.viewAllLink} <ChevronRight size={12} />
              </Link>
            </div>

            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  {[
                    { label: t.common.member,  cls: '' },
                    { label: t.dashboard.method,  cls: 'hidden sm:table-cell' },
                    { label: t.dashboard.amount,  cls: '' },
                    { label: t.dashboard.date,    cls: 'hidden md:table-cell' },
                    { label: t.dashboard.status,  cls: 'hidden sm:table-cell' },
                    { label: '',        cls: 'hidden sm:table-cell' },
                  ].map(h => (
                    <th key={h.label} className={`px-4 md:px-7 py-3 text-left ${h.cls}`}
                      style={{ fontSize: 12, fontWeight: 500, color: '#9CA3AF' }}>
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TRANSACTIONS.map((tx, idx) => (
                  <tr
                    key={tx.id}
                    style={{ borderBottom: idx < TRANSACTIONS.length - 1 ? '1px solid #F9FAFB' : 'none' }}
                    className="hover:bg-[#FAFAFA] transition-colors"
                  >
                    <td className="px-4 md:px-7 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-[#E5E7EB]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={tx.avatar} alt={tx.name} width={32} height={32} style={{ width: 32, height: 32, objectFit: 'cover' }} />
                        </div>
                        <span style={{ fontSize: 14, color: '#111827', whiteSpace: 'nowrap' }}>{tx.name}</span>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-4 md:px-7 py-4">
                      <span style={{ fontSize: 14, color: '#6B7280' }}>{tx.method}</span>
                    </td>
                    <td className="px-4 md:px-7 py-4" style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{tx.price}</span>
                    </td>
                    <td className="hidden md:table-cell px-4 md:px-7 py-4" style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 13, color: '#6B7280' }}>{tx.date}</span>
                    </td>
                    <td className="hidden sm:table-cell px-4 md:px-7 py-4">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="hidden sm:table-cell px-4 md:px-7 py-4">
                      <TransactionActionsButton transaction={{ id: tx.id, name: tx.name, status: tx.status, price: tx.price }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>


        </div>
      </main>

      {/* ── Right Panel ─────────────────────────────────────────────────────── */}
      <aside
        className="hidden lg:flex shrink-0 flex-col gap-3 p-4 overflow-y-auto"
        style={{
          width: 280,
          borderLeft: '1px solid #E5E7EB',
          background: '#F9FAFB',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        {/* 1. Academy card — full design, fixed height */}
        <div className="shrink-0 rounded-2xl overflow-hidden" style={{ border: '1px solid #E5E7EB', background: '#fff' }}>
          <div className="relative overflow-visible" style={{ height: 80 }}>
            <div className="absolute inset-0 overflow-hidden rounded-t-2xl">
              <Image src="/roger-gracie-malaga.jpg" alt="Roger Gracie Malaga" fill className="object-cover" />
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 rounded-full overflow-hidden border-[3px] border-white"
              style={{ width: 60, height: 60, bottom: -30, background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.2)', zIndex: 10 }}>
              <Image src="/logo-roger-gracie.png" alt="Roger Gracie" width={60} height={60} className="object-contain" />
            </div>
          </div>
          <div className="pt-10 pb-3 px-4 text-center">
            <p style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{currentSchool?.schoolName ?? 'Academy'}</p>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{t.dashboard.jiuJitsuAcademy}</p>
          </div>
          <div className="px-4 pb-4 flex gap-2" style={{ borderTop: '1px solid #F3F4F6', paddingTop: 12 }}>
            {[
              { icon: UserPlus, label: t.dashboard.inviteUser,  action: () => setShowInvite(true)     },
              { icon: Send,     label: t.dashboard.send,         action: () => setShowSend(true)       },
              { icon: QrCode,   label: t.dashboard.qrCode,       action: () => setShowQR(true)         },
              { icon: Pencil,   label: t.dashboard.edit,         action: () => setShowEditSchool(true) },
            ].map(({ icon: Icon, label, action }) => (
              <button key={label} title={label} onClick={action}
                className="flex-1 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-all"
                style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#EFF6FF'; (e.currentTarget as HTMLElement).style.borderColor = '#0071E3' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#F9FAFB'; (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB' }}
              >
                <Icon size={14} style={{ color: '#0071E3' }} />
              </button>
            ))}
          </div>
        </div>

        {/* 2. AI Assistant — full design, fixed height */}
        <div className="shrink-0 rounded-2xl overflow-hidden" style={{ border: '1px solid #E5E7EB', background: '#fff' }}>
          <div className="flex items-center justify-between px-4 pt-4 pb-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)' }}>
                <Sparkles size={13} style={{ color: '#fff' }} />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>{t.dashboard.aiAssistant}</p>
                <p style={{ fontSize: 10, color: '#9CA3AF', lineHeight: 1.2 }}>{t.dashboard.poweredBy}</p>
              </div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#16A34A', background: '#F0FDF4', padding: '2px 8px', borderRadius: 999 }}>
              {t.dashboard.online}
            </span>
          </div>
          <div className="px-4 py-3 space-y-3">
            {AI_INSIGHTS.slice(0, 2).map((r, i, arr) => (
              <div key={i} style={{ paddingBottom: i < arr.length - 1 ? 12 : 0, borderBottom: i < arr.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: '#111827', lineHeight: 1.4 }}>{r.insight}</p>
                <button
                  onClick={() => r.openAI && setShowAIMessages(true)}
                  style={{
                    marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 11, fontWeight: 600, color: '#6366F1',
                    background: '#EEF2FF', border: 'none', borderRadius: 7,
                    padding: '4px 9px', cursor: 'pointer',
                  }}>
                  {r.action} →
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Upcoming Classes — flex: 1, fills all remaining space */}
        <div className="rounded-2xl flex flex-col" style={{ flex: 1, minHeight: 280, border: '1px solid #E5E7EB', background: '#fff' }}>
          <div className="shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
            <p style={{ fontSize: 12, color: '#9CA3AF' }}>{t.dashboard.upcomingClasses}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', letterSpacing: '-0.01em' }}>
                {longDateLabel}
              </p>
              <Calendar size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
            </div>
          </div>
          <div className="shrink-0 flex gap-1 px-3 py-2"
            style={{ borderBottom: '1px solid #F3F4F6', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {DAYS.map((d, i) => (
              <button key={i} onClick={() => setActiveDay(i)}
                className="flex flex-col items-center justify-center py-1.5 cursor-pointer shrink-0 transition-all"
                style={{ background: 'none', border: 'none', minWidth: 32 }}>
                <span style={{ fontSize: 9, fontWeight: 500, color: activeDay === i ? '#0071E3' : '#9CA3AF', letterSpacing: '0.04em' }}>{d.long}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: activeDay === i ? '#0071E3' : '#374151', borderBottom: activeDay === i ? '2px solid #0071E3' : '2px solid transparent', paddingBottom: 1 }}>{d.num}</span>
              </button>
            ))}
          </div>
          {/* Class list — fills all remaining space in the card */}
          <div className="px-4 py-3 space-y-3 overflow-y-auto" style={{ flex: 1, scrollbarWidth: 'none' }}>
            {displayClasses.map((cls, i) => {
              const pct = cls.enrolled / cls.cap
              const capacityColor = pct >= 1 ? '#DC2626' : pct > 0.7 ? '#D97706' : '#16A34A'
              return (
                <div key={cls.id} className="flex items-center gap-3"
                  style={{ paddingBottom: i < displayClasses.length - 1 ? 12 : 0, borderBottom: i < displayClasses.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                  <div className="shrink-0 rounded-xl overflow-hidden relative" style={{ width: 44, height: 44 }}>
                    <Image src={cls.image ?? '/martial-logo.png'} alt={cls.name} fill className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#111827', lineHeight: 1.3, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cls.name}</p>
                      <button
                        onClick={() => setSelectedClass(cls)}
                        style={{ fontSize: 11, fontWeight: 700, color: capacityColor, whiteSpace: 'nowrap', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >{cls.enrolled}/{cls.cap}</button>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p style={{ fontSize: 10, color: '#9CA3AF' }}>{cls.time}</p>
                      <StatusBadge status={cls.status} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 4. Quick Stats — fixed, at bottom */}
        <div className="shrink-0 rounded-2xl overflow-hidden" style={{ border: '1px solid #E5E7EB', background: '#fff' }}>
          <div className="px-4 pt-3 pb-2" style={{ borderBottom: '1px solid #F3F4F6' }}>
            <p style={{ fontSize: 11, color: '#9CA3AF' }}>{t.dashboard.quickStats}</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{t.dashboard.today}</p>
          </div>
          <div className="grid grid-cols-3" style={{ gap: 1, background: '#F3F4F6' }}>
            {[
              { label: t.dashboard.avgAttendance, value: '—',   color: '#0071E3' },
              { label: t.dashboard.openLeads,     value: stats ? String(stats.openLeads.value)    : '—', color: '#D97706' },
              { label: t.dashboard.gradings,      value: stats ? String(stats.gradings.value)     : '—', color: '#16A34A' },
              { label: t.dashboard.notifications, value: '—',   color: '#DC2626' },
              { label: t.dashboard.activeMembers, value: stats ? String(stats.activeMembers.value): '—', color: '#6366F1' },
              { label: t.dashboard.classesToday,  value: stats ? String(stats.classesToday.value) : '—', color: '#0071E3' },
            ].map(s => (
              <div key={s.label} className="flex flex-col gap-1 px-2 py-2.5" style={{ background: '#fff' }}>
                <p style={{ fontSize: 9, color: '#9CA3AF', lineHeight: 1.2 }}>{s.label}</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: s.color, letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

      </aside>

      {/* ── Popups ──────────────────────────────────────────────────────────── */}
      {showInvite     && <InviteUserModal   onClose={() => setShowInvite(false)} />}
      {showSend       && <SendModal         onClose={() => setShowSend(false)} />}
      {showQR         && <QRCodeModal       onClose={() => setShowQR(false)} />}
      {showEditSchool && <EditSchoolModal   onClose={() => setShowEditSchool(false)} />}
      {showAIMessages && <AIMessagesModal   onClose={() => setShowAIMessages(false)} />}
      {selectedClass  && (
        <ClassCapacityPopup
          cls={selectedClass}
          onClose={() => setSelectedClass(null)}
        />
      )}
    </>
  )
}
