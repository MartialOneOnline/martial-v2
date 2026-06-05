'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Bell, Calendar,
  Menu, X, Plus, MoreHorizontal, Search,
  ChevronLeft, ChevronRight, TrendingUp, Check, Upload,
  Clock,
} from 'lucide-react'
import { useDashboard } from '../../../components/DashboardShell'

// ── Mock data ──────────────────────────────────────────────────────────────────

const CLASSES = [
  { id: 1,  image: '/roger-gracie-malaga.jpg',     title: 'BJJ All Levels',    activity: 'BJJ',         instructor: 'Carlos Silva',  startDate: '01 Sep 2026', endDate: '30 Nov 2026', fees: '€65',  status: 'Active'   },
  { id: 2,  image: '/mathouse.jpg',                title: 'NOGI',              activity: 'NOGI',        instructor: 'Monti',         startDate: '01 Sep 2026', endDate: '30 Nov 2026', fees: '€65',  status: 'Full'     },
  { id: 3,  image: '/five-elements-jiu-jitsu.jpg', title: 'Kids BJJ',          activity: 'BJJ Kids',    instructor: 'Ana Torres',    startDate: '08 Sep 2026', endDate: '30 Nov 2026', fees: '€55',  status: 'Active'   },
  { id: 4,  image: '/roger-gracie-malaga.jpg',     title: 'BJJ Beginners',     activity: 'BJJ',         instructor: 'Carlos Silva',  startDate: '08 Sep 2026', endDate: '15 Dec 2026', fees: '€65',  status: 'Active'   },
  { id: 5,  image: '/mathouse.jpg',                title: 'Open Mat',          activity: 'Open Mat',    instructor: '—',             startDate: '13 Sep 2026', endDate: '31 Dec 2026', fees: 'Free', status: 'Active'   },
  { id: 6,  image: '/five-elements-jiu-jitsu.jpg', title: 'BJJ Advanced',      activity: 'BJJ',         instructor: 'Jorge Sanchez', startDate: '01 Sep 2026', endDate: '30 Nov 2026', fees: '€75',  status: 'Active'   },
  { id: 7,  image: '/roger-gracie-malaga.jpg',     title: 'Wrestling',         activity: 'Wrestling',   instructor: 'Monti',         startDate: '15 Sep 2026', endDate: '15 Dec 2026', fees: '€65',  status: 'Active'   },
  { id: 8,  image: '/mathouse.jpg',                title: 'NOGI Advanced',     activity: 'NOGI',        instructor: 'Jorge Sanchez', startDate: '01 Sep 2026', endDate: '30 Nov 2026', fees: '€75',  status: 'Active'   },
  { id: 9,  image: '/five-elements-jiu-jitsu.jpg', title: 'BJJ Competition',   activity: 'BJJ Comp',    instructor: 'Carlos Silva',  startDate: '01 Sep 2026', endDate: '20 Nov 2026', fees: '€85',  status: 'Full'     },
  { id: 10, image: '/roger-gracie-malaga.jpg',     title: 'BJJ Iniciación',    activity: 'BJJ',         instructor: 'Ana Torres',    startDate: '08 Sep 2026', endDate: '08 Dec 2026', fees: '€65',  status: 'Active'   },
  { id: 11, image: '/mathouse.jpg',                title: 'Yoga & Stretching', activity: 'Yoga',        instructor: 'Laura M.',      startDate: '10 Sep 2026', endDate: '10 Dec 2026', fees: '€45',  status: 'Active'   },
  { id: 12, image: '/five-elements-jiu-jitsu.jpg', title: 'Self Defence',      activity: 'Self Defence', instructor: 'Jorge Sanchez', startDate: '20 Sep 2026', endDate: '20 Nov 2026', fees: '€55',  status: 'Inactive' },
]

const STATS = [
  { label: 'Total Classes',   value: '12',  trend: '+3',   trendUp: true,  sub: 'this month'    },
  { label: 'Active Classes',  value: '10',  trend: '+2',   trendUp: true,  sub: 'right now'     },
  { label: 'Full Classes',    value: '2',   trend: '+1',   trendUp: false, sub: 'vs last week'  },
  { label: 'Avg Capacity',    value: '74%', trend: '+6%',  trendUp: true,  sub: 'vs last month' },
]

const STATUS_MAP: Record<string, { bg: string; color: string }> = {
  Active:   { bg: '#F0FDF4', color: '#16A34A' },
  Full:     { bg: '#FEF2F2', color: '#DC2626' },
  Inactive: { bg: '#F3F4F6', color: '#6B7280' },
}

const INSTRUCTORS = ['Carlos Silva', 'Monti', 'Ana Torres', 'Jorge Sanchez', 'Laura M.']
const ACTIVITIES  = ['BJJ', 'NOGI', 'Wrestling', 'Yoga', 'Kids BJJ', 'Open Mat', 'Self Defence', 'BJJ Competition']

const ITEMS_PER_PAGE = 8

function getPaginationPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}

type Filter = 'All' | 'Active' | 'Full' | 'Inactive'

function StatusBadge({ status }: { status: string }) {
  const { bg, color } = STATUS_MAP[status] ?? { bg: '#F3F4F6', color: '#6B7280' }
  return (
    <span style={{ background: bg, color, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>
      {status}
    </span>
  )
}

// ── Date range navigator ────────────────────────────────────────────────────────

const RANGE_WEEKS = [
  { label: 'Mon Sep 8 – Sun Sep 14' },
  { label: 'Mon Sep 15 – Sun Sep 21' },
  { label: 'Mon Sep 22 – Sun Sep 28' },
  { label: 'Mon Sep 29 – Sun Oct 5' },
]

function DateRangePicker({ idx, onChange }: { idx: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(Math.max(0, idx - 1))}
        className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer transition-colors"
        style={{ border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}
      >
        <ChevronLeft size={13} />
      </button>
      <div className="px-3 py-1.5 rounded-lg text-center select-none"
        style={{ border: '1px solid #E5E7EB', background: '#fff', fontSize: 12, fontWeight: 500,
          color: '#374151', minWidth: 200, whiteSpace: 'nowrap' }}>
        {RANGE_WEEKS[idx]?.label ?? RANGE_WEEKS[0]!.label}
      </div>
      <button onClick={() => onChange(Math.min(RANGE_WEEKS.length - 1, idx + 1))}
        className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer transition-colors"
        style={{ border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}
      >
        <ChevronRight size={13} />
      </button>
      <button onClick={() => onChange(0)}
        className="px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
        style={{ border: '1px solid #E5E7EB', background: '#fff', fontSize: 12, fontWeight: 500, color: '#374151' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}
      >
        Today
      </button>
    </div>
  )
}

// ── Create Class drawer ─────────────────────────────────────────────────────────

interface CreateClassDrawerProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

function CreateClassDrawer({ open, onClose, onSuccess }: CreateClassDrawerProps) {
  const [bannerDrag, setBannerDrag] = useState(false)
  const [legalChecked, setLegalChecked] = useState({ terms: false, privacy: false })

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1px solid #E5E7EB', borderRadius: 10, padding: '9px 12px',
    fontSize: 13, color: '#111827', background: '#fff', outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5,
  }

  function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div>
        <label style={labelStyle}>{label}</label>
        {children}
      </div>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.35)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-hidden"
        style={{
          width: 'min(900px, 96vw)',
          background: '#F9FAFB',
          boxShadow: '-4px 0 32px rgba(0,0,0,0.12)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}>

        {/* Drawer header */}
        <div className="flex items-center justify-between px-8 py-5"
          style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
              Create Class
            </h2>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Fill in the details to create a new class</p>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <X size={15} style={{ color: '#6B7280' }} />
          </button>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="flex gap-8" style={{ alignItems: 'flex-start' }}>

            {/* Left — Form */}
            <div className="flex-1 min-w-0 flex flex-col gap-5">

              <Field label="Class Title">
                <input type="text" placeholder="e.g. BJJ All Levels" style={inputStyle} />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Start Date">
                  <input type="date" style={inputStyle} />
                </Field>
                <Field label="End Date">
                  <input type="date" style={inputStyle} />
                </Field>
              </div>

              <Field label="Instructors">
                <select style={inputStyle}>
                  <option value="">Select instructor…</option>
                  {INSTRUCTORS.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Class Fees (€)">
                  <input type="number" placeholder="0" style={inputStyle} />
                </Field>
                <Field label="Activity">
                  <select style={inputStyle}>
                    <option value="">Select activity…</option>
                    {ACTIVITIES.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Capacity">
                  <input type="number" placeholder="20" style={inputStyle} />
                </Field>
                <Field label="Min Students">
                  <input type="number" placeholder="1" style={inputStyle} />
                </Field>
              </div>

              <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 14 }}>QR Attendance</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="QR Start Time">
                    <input type="time" style={inputStyle} />
                  </Field>
                  <Field label="QR End Time">
                    <input type="time" style={inputStyle} />
                  </Field>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 14 }}>Booking Window</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Booking Opens">
                    <input type="datetime-local" style={inputStyle} />
                  </Field>
                  <Field label="Booking Closes">
                    <input type="datetime-local" style={inputStyle} />
                  </Field>
                </div>
              </div>

              <Field label="Cancellation Policy">
                <select style={inputStyle}>
                  <option>24h notice required</option>
                  <option>48h notice required</option>
                  <option>No cancellations</option>
                  <option>Free cancellation</option>
                </select>
              </Field>

              <Field label="Description">
                <textarea rows={3} placeholder="Describe this class…"
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
              </Field>
            </div>

            {/* Right — Banner upload */}
            <div style={{ width: 260, flexShrink: 0 }}>
              <label style={labelStyle}>Class Banner</label>
              <div
                onDragEnter={() => setBannerDrag(true)}
                onDragLeave={() => setBannerDrag(false)}
                onDrop={() => setBannerDrag(false)}
                className="flex flex-col items-center justify-center gap-3 rounded-2xl cursor-pointer transition-colors"
                style={{
                  height: 200, border: `2px dashed ${bannerDrag ? '#0071E3' : '#D1D5DB'}`,
                  background: bannerDrag ? '#EFF6FF' : '#fff',
                }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: '#F3F4F6' }}>
                  <Upload size={18} style={{ color: '#9CA3AF' }} />
                </div>
                <div className="text-center">
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Drop image here</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>PNG, JPG up to 5MB</p>
                </div>
                <label className="px-3 py-1.5 rounded-lg cursor-pointer"
                  style={{ fontSize: 12, fontWeight: 500, border: '1px solid #E5E7EB',
                    background: '#fff', color: '#374151' }}>
                  Browse
                  <input type="file" accept="image/*" className="hidden" />
                </label>
              </div>

              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>
                Recommended: 1200 × 600px
              </p>
            </div>
          </div>
        </div>

        {/* Drawer footer */}
        <div className="px-8 py-5 flex flex-col gap-4" style={{ background: '#fff', borderTop: '1px solid #E5E7EB', flexShrink: 0 }}>
          {/* Legal checkboxes */}
          <div className="flex flex-col gap-2">
            {([
              { key: 'terms',   label: 'I agree to the Terms & Conditions' },
              { key: 'privacy', label: 'I have read the Privacy Policy' },
            ] as const).map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setLegalChecked(p => ({ ...p, [key]: !p[key] }))}
                  className="flex items-center justify-center rounded-md flex-shrink-0"
                  style={{ width: 16, height: 16, border: `1.5px solid ${legalChecked[key] ? '#0071E3' : '#D1D5DB'}`,
                    background: legalChecked[key] ? '#0071E3' : '#fff', cursor: 'pointer' }}>
                  {legalChecked[key] && <Check size={10} style={{ color: '#fff' }} strokeWidth={3} />}
                </div>
                <span style={{ fontSize: 12, color: '#6B7280' }}>{label}</span>
              </label>
            ))}
          </div>

          <div className="flex items-center gap-3 justify-end">
            <button onClick={onClose}
              className="px-5 py-2.5 rounded-xl cursor-pointer"
              style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB',
                background: '#fff', color: '#374151' }}>
              Cancel
            </button>
            <button
              onClick={onSuccess}
              disabled={!legalChecked.terms || !legalChecked.privacy}
              className="px-6 py-2.5 rounded-xl cursor-pointer transition-opacity"
              style={{ fontSize: 13, fontWeight: 600, border: 'none',
                background: legalChecked.terms && legalChecked.privacy ? '#0071E3' : '#93C5FD',
                color: '#fff', cursor: legalChecked.terms && legalChecked.privacy ? 'pointer' : 'not-allowed' }}>
              Create Class
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Success modal ───────────────────────────────────────────────────────────────

function SuccessModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div className="rounded-2xl p-8 flex flex-col items-center text-center gap-4"
        style={{ background: '#fff', width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
        onClick={e => e.stopPropagation()}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: '#F0FDF4' }}>
          <Check size={32} style={{ color: '#16A34A' }} strokeWidth={2.5} />
        </div>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
            Class Created Successfully!
          </h3>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>
            Your new class has been added and is now visible to students.
          </p>
        </div>
        <button onClick={onClose}
          className="w-full py-2.5 rounded-xl cursor-pointer"
          style={{ fontSize: 13, fontWeight: 600, border: 'none', background: '#0071E3', color: '#fff' }}>
          Done
        </button>
      </div>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────────

export default function ClassesClient() {
  const { menuOpen, setMenuOpen } = useDashboard()
  const [activeFilter, setActiveFilter] = useState<Filter>('All')
  const [search, setSearch]             = useState('')
  const [currentPage, setCurrentPage]   = useState(1)
  const [drawerOpen, setDrawerOpen]     = useState(false)
  const [successOpen, setSuccessOpen]   = useState(false)
  const [weekIdx, setWeekIdx]           = useState(0)
  const [openMenuId, setOpenMenuId]     = useState<number | null>(null)

  const filtered = CLASSES.filter(c => {
    const matchFilter = activeFilter === 'All' || c.status === activeFilter
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
                        c.instructor.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage   = Math.min(currentPage, totalPages)
  const paginated  = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)
  const pages      = getPaginationPages(safePage, totalPages)

  const handleFilter = (f: Filter) => { setActiveFilter(f); setCurrentPage(1) }
  const handleSearch = (v: string)  => { setSearch(v); setCurrentPage(1) }

  function handleSuccess() {
    setDrawerOpen(false)
    setSuccessOpen(true)
  }

  return (
    <>
      <main style={{ flex: 1, minWidth: 0 }}>

          {/* Topbar */}
          <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20 flex-wrap"
            style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
            <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(!menuOpen)}>
              <Menu size={16} style={{ color: '#374151' }} />
            </button>

            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', minWidth: 180 }}>
              <Search size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
              <input type="text" placeholder="Search classes…" value={search}
                onChange={e => handleSearch(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', width: 140 }} />
            </div>

            {/* Date range picker */}
            <div className="hidden sm:block">
              <DateRangePicker idx={weekIdx} onChange={setWeekIdx} />
            </div>

            <div className="flex-1" />

            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}>
              <Clock size={13} style={{ color: '#9CA3AF' }} />
              {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>

            <button className="relative w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <Bell size={15} style={{ color: '#374151' }} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: '#DC2626' }} />
            </button>

            <button className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer text-base"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>🇬🇧</button>

            <button onClick={() => setDrawerOpen(true)}
              className="flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer"
              style={{ background: '#0071E3', border: 'none', color: '#fff' }}>
              <Plus size={16} />
            </button>
          </div>

          <div className="px-4 md:px-8 py-4 flex flex-col gap-4">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 style={{ fontSize: 18, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>
                  Classes
                </h1>
                <p style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>
                  {filtered.length} of {CLASSES.length} classes
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {STATS.map(stat => (
                <div key={stat.label} className="rounded-2xl"
                  style={{ background: '#fff', border: '1px solid #E5E7EB', padding: '10px 14px' }}>
                  <div className="flex items-start justify-between mb-2">
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>{stat.label}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 600,
                      background: stat.trendUp ? '#F0FDF4' : '#FEF2F2',
                      color: stat.trendUp ? '#16A34A' : '#DC2626',
                      padding: '2px 7px', borderRadius: 999, flexShrink: 0 }}>
                      <TrendingUp size={9} />
                      {stat.trend}
                    </span>
                  </div>
                  <p style={{ fontSize: 24, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {stat.value}
                  </p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{stat.sub}</p>
                </div>
              ))}
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-2">
              {(['All', 'Active', 'Full', 'Inactive'] as Filter[]).map(f => (
                <button key={f} onClick={() => handleFilter(f)}
                  className="cursor-pointer transition-all"
                  style={{
                    fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 8, padding: '6px 14px',
                    color: activeFilter === f ? '#111827' : '#6B7280',
                    background: activeFilter === f ? '#fff' : 'transparent',
                    boxShadow: activeFilter === f ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  }}>
                  {f}
                  <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600,
                    color: activeFilter === f ? '#0071E3' : '#9CA3AF' }}>
                    {f === 'All' ? CLASSES.length : CLASSES.filter(c => c.status === f).length}
                  </span>
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                    {[
                      { label: 'Class',        cls: '' },
                      { label: 'Instructor',   cls: 'hidden md:table-cell' },
                      { label: 'Start Date',   cls: 'hidden lg:table-cell' },
                      { label: 'End Date',     cls: 'hidden lg:table-cell' },
                      { label: 'Status',       cls: '' },
                      { label: 'Actions',      cls: '' },
                    ].map(h => (
                      <th key={h.label} className={`px-5 py-3 text-left ${h.cls}`}
                        style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((cls, idx) => (
                    <tr key={cls.id}
                      className="hover:bg-[#FAFAFA] transition-colors cursor-pointer"
                      style={{ borderBottom: idx < paginated.length - 1 ? '1px solid #F9FAFB' : 'none' }}>

                      {/* Class */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="shrink-0 rounded-lg overflow-hidden relative" style={{ width: 36, height: 36 }}>
                            <Image src={cls.image} alt={cls.title} fill className="object-cover" />
                          </div>
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{cls.title}</p>
                            <p style={{ fontSize: 12, color: '#9CA3AF' }}>{cls.activity}</p>
                          </div>
                        </div>
                      </td>

                      {/* Instructor */}
                      <td className="hidden md:table-cell px-5 py-3">
                        <span style={{ fontSize: 13, color: '#374151' }}>{cls.instructor}</span>
                      </td>

                      {/* Start Date */}
                      <td className="hidden lg:table-cell px-5 py-3">
                        <span style={{ fontSize: 12, color: '#6B7280' }}>{cls.startDate}</span>
                      </td>

                      {/* End Date */}
                      <td className="hidden lg:table-cell px-5 py-3">
                        <span style={{ fontSize: 12, color: '#6B7280' }}>{cls.endDate}</span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3">
                        <StatusBadge status={cls.status} />
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 relative">
                        <button
                          onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === cls.id ? null : cls.id) }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                          style={{ color: '#9CA3AF', background: 'transparent', border: 'none' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F9FAFB' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                          <MoreHorizontal size={15} />
                        </button>
                        {openMenuId === cls.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                            <div className="absolute right-6 mt-1 rounded-xl z-20 py-1 overflow-hidden"
                              style={{ background: '#fff', border: '1px solid #E5E7EB',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 140, top: '100%' }}>
                              {['Edit', 'Duplicate', 'View Students', 'Delete'].map(action => (
                                <button key={action} onClick={() => setOpenMenuId(null)}
                                  className="w-full text-left px-4 py-2 transition-colors cursor-pointer"
                                  style={{ fontSize: 13, color: action === 'Delete' ? '#DC2626' : '#374151',
                                    background: 'transparent', border: 'none' }}
                                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                                >
                                  {action}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {paginated.length === 0 && (
                <div className="py-16 text-center">
                  <Calendar size={32} style={{ color: '#E5E7EB', margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 14, color: '#9CA3AF' }}>No classes found</p>
                </div>
              )}
              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
                <p style={{ fontSize: 13, color: '#6B7280' }}>
                  Showing{' '}
                  <span style={{ fontWeight: 600, color: '#111827' }}>
                    {(safePage - 1) * ITEMS_PER_PAGE + 1}{' – '}{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)}
                  </span>{' '}
                  of <span style={{ fontWeight: 600, color: '#111827' }}>{filtered.length}</span> classes
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                    style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff',
                      color: safePage === 1 ? '#D1D5DB' : '#374151', cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                      borderRadius: 8, padding: '6px 12px' }}>
                    Prev
                  </button>
                  <div className="flex items-center gap-1 mx-1">
                    {pages.map((p, i) =>
                      p === '...'
                        ? <span key={`e-${i}`} style={{ fontSize: 13, color: '#9CA3AF', padding: '0 4px' }}>…</span>
                        : (
                          <button key={p} onClick={() => setCurrentPage(p as number)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer"
                            style={{ fontSize: 13, fontWeight: p === safePage ? 600 : 400, border: 'none',
                              background: p === safePage ? '#F3F4F6' : 'transparent',
                              color: p === safePage ? '#111827' : '#6B7280' }}>
                            {p}
                          </button>
                        )
                    )}
                  </div>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                    style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff',
                      color: safePage === totalPages ? '#D1D5DB' : '#374151', cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                      borderRadius: 8, padding: '6px 12px' }}>
                    Next
                  </button>
                </div>
              </div>
            </div>

          </div>
      </main>

      <CreateClassDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={handleSuccess}
      />

      <SuccessModal open={successOpen} onClose={() => setSuccessOpen(false)} />
    </>
  )
}
