'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Bell, Menu, Search, Plus, MoreHorizontal,
  Download, TrendingUp, Clock, Users, X,
  ChevronDown, UserCheck, UserX, Archive, Trash2,
} from 'lucide-react'
import { useDashboard } from '../../../components/DashboardShell'
import DashboardLanguageSelector from '../../../components/DashboardLanguageSelector'
import { useT } from '../../../lib/i18n/LanguageContext'

// ── Types ──────────────────────────────────────────────────────────────────────
type Student = {
  id: string
  name: string
  email: string
  belt: string
  beltDegree: number
  status: string
  role: string
  joinedAt: string | null
  avatarUrl: string | null
}

const BELT_DISPLAY: Record<string, { label: string; colorKey: string }> = {
  Blanco:  { label: 'Blanco', colorKey: 'White'  },
  Azul:    { label: 'Azul',   colorKey: 'Blue'   },
  Morado:  { label: 'Morado', colorKey: 'Purple' },
  Marron:  { label: 'Marrón', colorKey: 'Brown'  },
  Negro:   { label: 'Negro',  colorKey: 'Black'  },
  White:   { label: 'Blanco', colorKey: 'White'  },
  Blue:    { label: 'Azul',   colorKey: 'Blue'   },
  Purple:  { label: 'Morado', colorKey: 'Purple' },
  Brown:   { label: 'Marrón', colorKey: 'Brown'  },
  Black:   { label: 'Negro',  colorKey: 'Black'  },
}

const STATUS_DISPLAY: Record<string, string> = {
  ACTIVE:   'Active',
  INACTIVE: 'Inactive',
  PENDING:  'Pending',
  ARCHIVED: 'Archived',
  LEAD:     'Lead',
}

const BELT_COLORS: Record<string, { bg: string; color: string; dot: string }> = {
  White:  { bg: '#F9FAFB', color: '#374151', dot: '#9CA3AF' },
  Blue:   { bg: '#EFF6FF', color: '#2563EB', dot: '#2563EB' },
  Purple: { bg: '#F5F3FF', color: '#7C3AED', dot: '#7C3AED' },
  Brown:  { bg: '#FEF3C7', color: '#92400E', dot: '#92400E' },
  Black:  { bg: '#F3F4F6', color: '#111827', dot: '#111827' },
}

const STATUS_MAP: Record<string, { bg: string; color: string }> = {
  Active:   { bg: '#F0FDF4', color: '#16A34A' },
  Inactive: { bg: '#F3F4F6', color: '#6B7280' },
  Pending:  { bg: '#FFFBEB', color: '#D97706' },
  Lead:     { bg: '#EEF2FF', color: '#6366F1' },
  Archived: { bg: '#FEF2F2', color: '#9CA3AF' },
}

const BELTS = ['Blanco', 'Azul', 'Morado', 'Marron', 'Negro']
const STATUSES: Array<{ value: string; label: string }> = [
  { value: 'ACTIVE',   label: 'Active'   },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'PENDING',  label: 'Pending'  },
  { value: 'LEAD',     label: 'Lead'     },
  { value: 'ARCHIVED', label: 'Archived' },
]

function BeltBadge({ belt, stripes }: { belt: string; stripes: number }) {
  const display = BELT_DISPLAY[belt] ?? { label: belt, colorKey: 'White' }
  const c = BELT_COLORS[display.colorKey] ?? BELT_COLORS['White']!
  return (
    <span className="inline-flex items-center gap-1.5" style={{
      background: c.bg, color: c.color, fontSize: 11, fontWeight: 600,
      padding: '3px 8px', borderRadius: 999,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, display: 'inline-block', flexShrink: 0 }} />
      {display.label}
      {stripes > 0 && (
        <span style={{ display: 'inline-flex', gap: 1 }}>
          {Array.from({ length: stripes }).map((_, i) => (
            <span key={i} style={{ width: 3, height: 8, borderRadius: 1, background: c.dot, opacity: 0.6 }} />
          ))}
        </span>
      )}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const { bg, color } = STATUS_MAP[status] ?? { bg: '#F3F4F6', color: '#6B7280' }
  return (
    <span style={{ background: bg, color, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>
      {status}
    </span>
  )
}

// ── Row actions dropdown ───────────────────────────────────────────────────────
function ActionsMenu({
  student,
  onStatusChange,
  onDelete,
}: {
  student: Student
  onStatusChange: (id: string, status: string) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false); setStatusOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const currentDisplay = STATUS_DISPLAY[student.status] ?? student.status

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); setStatusOpen(false) }}
        className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
        style={{ color: open ? '#111827' : '#9CA3AF', background: open ? '#F3F4F6' : 'transparent', border: 'none', transition: 'all .15s' }}>
        <MoreHorizontal size={15} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 32, zIndex: 50, minWidth: 180,
          background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.10)', padding: '4px 0',
        }}>
          {/* Change status submenu trigger */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={e => { e.stopPropagation(); setStatusOpen(o => !o) }}
              className="w-full flex items-center justify-between cursor-pointer"
              style={{ padding: '8px 14px', fontSize: 13, color: '#374151', background: 'transparent', border: 'none', textAlign: 'left' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <span className="flex items-center gap-2">
                <UserCheck size={13} style={{ color: '#6B7280' }} />
                Cambiar estado
              </span>
              <ChevronDown size={12} style={{ color: '#9CA3AF', transform: statusOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
            </button>

            {statusOpen && (
              <div style={{
                position: 'absolute', right: '100%', top: 0, zIndex: 51, minWidth: 150,
                background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.10)', padding: '4px 0', marginRight: 4,
              }}>
                {STATUSES.map(s => (
                  <button
                    key={s.value}
                    onClick={e => {
                      e.stopPropagation()
                      onStatusChange(student.id, s.value)
                      setOpen(false); setStatusOpen(false)
                    }}
                    className="w-full flex items-center gap-2 cursor-pointer"
                    style={{
                      padding: '8px 14px', fontSize: 13, border: 'none', textAlign: 'left',
                      color: s.label === currentDisplay ? '#0071E3' : '#374151',
                      background: s.label === currentDisplay ? '#EFF6FF' : 'transparent',
                      fontWeight: s.label === currentDisplay ? 600 : 400,
                    }}
                    onMouseEnter={e => { if (s.label !== currentDisplay) e.currentTarget.style.background = '#F9FAFB' }}
                    onMouseLeave={e => { if (s.label !== currentDisplay) e.currentTarget.style.background = 'transparent' }}>
                    <StatusBadge status={s.label} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ height: 1, background: '#F3F4F6', margin: '4px 0' }} />

          <button
            onClick={e => { e.stopPropagation(); onDelete(student.id); setOpen(false) }}
            className="w-full flex items-center gap-2 cursor-pointer"
            style={{ padding: '8px 14px', fontSize: 13, color: '#DC2626', background: 'transparent', border: 'none', textAlign: 'left' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Archive size={13} />
            Archivar
          </button>
        </div>
      )}
    </div>
  )
}

// ── Add Student modal ──────────────────────────────────────────────────────────
function AddStudentModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (student: Student) => void
}) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', belt: 'Blanco', beltDegree: 0, status: 'ACTIVE' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || !form.email.trim()) { setError('Nombre y email son obligatorios'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al crear el estudiante'); return }
      onCreated(data.member)
      onClose()
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460,
        boxShadow: '0 24px 64px rgba(0,0,0,0.15)', padding: 28,
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>Añadir estudiante</h2>
            <p style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>Crea un nuevo miembro en tu escuela</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Name */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              Nombre completo *
            </label>
            <input
              type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ej. Juan García"
              style={{ width: '100%', padding: '9px 12px', fontSize: 14, borderRadius: 8, border: '1px solid #E5E7EB', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => (e.target.style.borderColor = '#0071E3')}
              onBlur={e => (e.target.style.borderColor = '#E5E7EB')} />
          </div>

          {/* Email */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              Email *
            </label>
            <input
              type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="juan@ejemplo.com"
              style={{ width: '100%', padding: '9px 12px', fontSize: 14, borderRadius: 8, border: '1px solid #E5E7EB', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => (e.target.style.borderColor = '#0071E3')}
              onBlur={e => (e.target.style.borderColor = '#E5E7EB')} />
          </div>

          {/* Phone */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              Teléfono
            </label>
            <input
              type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+34 600 000 000"
              style={{ width: '100%', padding: '9px 12px', fontSize: 14, borderRadius: 8, border: '1px solid #E5E7EB', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => (e.target.style.borderColor = '#0071E3')}
              onBlur={e => (e.target.style.borderColor = '#E5E7EB')} />
          </div>

          {/* Belt + Degree */}
          <div className="flex gap-3">
            <div style={{ flex: 2 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Cinturón</label>
              <select value={form.belt} onChange={e => setForm(f => ({ ...f, belt: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', fontSize: 14, borderRadius: 8, border: '1px solid #E5E7EB', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                {BELTS.map(b => <option key={b} value={b}>{BELT_DISPLAY[b]?.label ?? b}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Grados</label>
              <select value={form.beltDegree} onChange={e => setForm(f => ({ ...f, beltDegree: Number(e.target.value) }))}
                style={{ width: '100%', padding: '9px 12px', fontSize: 14, borderRadius: 8, border: '1px solid #E5E7EB', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                {[0,1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          {/* Status */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Estado</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              style={{ width: '100%', padding: '9px 12px', fontSize: 14, borderRadius: 8, border: '1px solid #E5E7EB', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {error && (
            <p style={{ fontSize: 13, color: '#DC2626', background: '#FEF2F2', padding: '8px 12px', borderRadius: 8, margin: 0 }}>
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3" style={{ marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '10px', fontSize: 14, fontWeight: 500, borderRadius: 8,
              border: '1px solid #E5E7EB', background: '#fff', color: '#374151', cursor: 'pointer',
            }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} style={{
              flex: 2, padding: '10px', fontSize: 14, fontWeight: 600, borderRadius: 8,
              border: 'none', background: loading ? '#93C5FD' : '#0071E3', color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}>
              {loading ? 'Creando...' : 'Añadir estudiante'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Pagination ─────────────────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 8

function getPaginationPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}

type FilterType = 'All' | 'Active' | 'Inactive' | 'Pending' | 'Lead' | 'Archived'

// ── Main component ─────────────────────────────────────────────────────────────
export default function UsersClient({ students: initialStudents }: { students: Student[] }) {
  const { menuOpen, setMenuOpen } = useDashboard()
  const t = useT()

  const [students, setStudents] = useState<Student[]>(initialStudents)
  const [showAddModal, setShowAddModal] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterType>('All')
  const [search, setSearch]             = useState('')
  const [currentPage, setCurrentPage]   = useState(1)

  const activeCount = students.filter(s => s.status === 'ACTIVE').length
  const STATS = [
    { label: t.users.totalStudents, value: String(students.length), trend: '', trendUp: true, sub: t.common.vsLastMonth },
    { label: t.users.activeMembers, value: String(activeCount),     trend: '', trendUp: true, sub: t.common.thisMonth   },
    { label: t.users.newThisMonth,  value: '—',                     trend: '', trendUp: true, sub: t.common.vsLastMonth },
    { label: t.users.avgAttendance, value: '—',                     trend: '', trendUp: true, sub: t.common.thisWeek    },
  ]

  const filtered = students.filter(s => {
    const displayStatus = STATUS_DISPLAY[s.status] ?? s.status
    const matchFilter = activeFilter === 'All' || displayStatus === activeFilter
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                        s.email.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage   = Math.min(currentPage, totalPages)
  const paginated  = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)
  const pages      = getPaginationPages(safePage, totalPages)

  const handleFilter = (f: FilterType) => { setActiveFilter(f); setCurrentPage(1) }
  const handleSearch = (v: string) => { setSearch(v); setCurrentPage(1) }

  const handleStatusChange = async (memberId: string, newStatus: string) => {
    // Optimistic update
    setStudents(prev => prev.map(s => s.id === memberId ? { ...s, status: newStatus } : s))
    try {
      await fetch(`/api/dashboard/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
    } catch {
      // Revert on error
      setStudents(initialStudents)
    }
  }

  const handleArchive = (memberId: string) => handleStatusChange(memberId, 'ARCHIVED')

  const handleCreated = (newStudent: Student) => {
    setStudents(prev => [newStudent, ...prev])
  }

  return (
    <main style={{ flex: 1, minWidth: 0 }}>

      {showAddModal && (
        <AddStudentModal onClose={() => setShowAddModal(false)} onCreated={handleCreated} />
      )}

      {/* Topbar */}
      <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20"
        style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
        <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(!menuOpen)}>
          <Menu size={16} style={{ color: '#374151' }} />
        </button>

        <div className="flex flex-1 max-w-sm items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
          <Search size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
          <input type="text" placeholder={t.users.searchPlaceholder} value={search}
            onChange={e => handleSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', width: '100%' }} />
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

        <DashboardLanguageSelector />

        <button
          onClick={() => setShowAddModal(true)}
          className="hidden sm:flex items-center gap-2 cursor-pointer"
          style={{ fontSize: 13, fontWeight: 600, color: '#fff', background: '#0071E3',
            border: 'none', borderRadius: 8, padding: '7px 14px' }}>
          <Plus size={14} />
          {t.users.addStudent}
        </button>
      </div>

      <div className="px-4 md:px-8 py-6 flex flex-col gap-6">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>
              {t.users.title}
            </h1>
            <p style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
              {filtered.length} {t.common.of} {students.length} {t.users.ofMembers}
            </p>
          </div>
          <button className="hidden sm:flex items-center gap-2 cursor-pointer"
            style={{ fontSize: 13, fontWeight: 500, color: '#374151', background: '#fff',
              border: '1px solid #E5E7EB', borderRadius: 8, padding: '7px 14px' }}>
            <Download size={13} style={{ color: '#6B7280' }} />
            {t.common.export}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map(stat => (
            <div key={stat.label} className="rounded-2xl"
              style={{ background: '#fff', border: '1px solid #E5E7EB', padding: '14px 16px' }}>
              <div className="flex items-start justify-between mb-3">
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>{stat.label}</span>
                {stat.trend && <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 2,
                  fontSize: 11, fontWeight: 600,
                  background: stat.trendUp ? '#F0FDF4' : '#FEF2F2',
                  color: stat.trendUp ? '#16A34A' : '#DC2626',
                  padding: '2px 7px', borderRadius: 999, flexShrink: 0,
                }}>
                  <TrendingUp size={9} />{stat.trend}
                </span>}
              </div>
              <p style={{ fontSize: 28, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1 }}>
                {stat.value}
              </p>
              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {(['All', 'Active', 'Pending', 'Lead', 'Inactive', 'Archived'] as FilterType[]).map(f => {
            const filterLabels: Record<FilterType, string> = {
              All: t.common.all, Active: t.common.active, Pending: t.common.pending,
              Lead: t.common.lead, Inactive: t.common.inactive, Archived: t.common.archived,
            }
            return (
              <button key={f} onClick={() => handleFilter(f)}
                className="cursor-pointer transition-all"
                style={{
                  fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 8, padding: '6px 14px',
                  color: activeFilter === f ? '#111827' : '#6B7280',
                  background: activeFilter === f ? '#fff' : 'transparent',
                  boxShadow: activeFilter === f ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}>
                {filterLabels[f]}
                <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600, color: activeFilter === f ? '#0071E3' : '#9CA3AF' }}>
                  {f === 'All' ? students.length
                    : students.filter(s => (STATUS_DISPLAY[s.status] ?? s.status) === f).length}
                </span>
              </button>
            )
          })}
        </div>

        {/* Table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                {[
                  { label: t.common.member,     cls: '' },
                  { label: t.users.belt,        cls: 'hidden md:table-cell' },
                  { label: t.users.membership,  cls: 'hidden lg:table-cell' },
                  { label: t.common.classes,    cls: 'hidden lg:table-cell' },
                  { label: t.users.lastSeen,    cls: 'hidden md:table-cell' },
                  { label: t.common.status,     cls: '' },
                  { label: '',                  cls: '' },
                ].map((h, i) => (
                  <th key={i} className={`px-6 py-3 text-left ${h.cls}`}
                    style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((student, idx) => (
                <tr key={student.id}
                  className="hover:bg-[#FAFAFA] transition-colors"
                  style={{ borderBottom: idx < paginated.length - 1 ? '1px solid #F9FAFB' : 'none' }}>

                  {/* Member */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {student.avatarUrl ? (
                        <img src={student.avatarUrl} alt={student.name}
                          className="w-9 h-9 rounded-full shrink-0 border border-[#E5E7EB] object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border border-[#E5E7EB]"
                          style={{ background: '#F3F4F6', fontSize: 13, fontWeight: 700, color: '#374151' }}>
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{student.name}</p>
                        <p style={{ fontSize: 12, color: '#9CA3AF' }}>{student.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Belt */}
                  <td className="hidden md:table-cell px-6 py-4">
                    <BeltBadge belt={student.belt} stripes={student.beltDegree} />
                  </td>

                  {/* Membership */}
                  <td className="hidden lg:table-cell px-6 py-4">
                    <span style={{ fontSize: 13, color: '#9CA3AF' }}>—</span>
                  </td>

                  {/* Classes */}
                  <td className="hidden lg:table-cell px-6 py-4">
                    <span style={{ fontSize: 13, color: '#9CA3AF' }}>—</span>
                  </td>

                  {/* Joined */}
                  <td className="hidden md:table-cell px-6 py-4">
                    <span style={{ fontSize: 13, color: '#9CA3AF' }}>
                      {student.joinedAt
                        ? new Date(student.joinedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <StatusBadge status={STATUS_DISPLAY[student.status] ?? student.status} />
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <ActionsMenu
                      student={student}
                      onStatusChange={handleStatusChange}
                      onDelete={handleArchive}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {paginated.length === 0 && (
            <div className="py-16 text-center">
              <Users size={32} style={{ color: '#E5E7EB', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 14, color: '#9CA3AF' }}>{t.users.noStudents}</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid #F3F4F6' }}>
              <p style={{ fontSize: 13, color: '#6B7280' }}>
                {t.common.showing}{' '}
                <span style={{ fontWeight: 600, color: '#111827' }}>{(safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)}</span>
                {' '}{t.common.of}{' '}
                <span style={{ fontWeight: 600, color: '#111827' }}>{filtered.length}</span>
                {' '}{t.users.students}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer transition-colors"
                  style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', color: safePage === 1 ? '#D1D5DB' : '#374151', background: '#fff', cursor: safePage === 1 ? 'not-allowed' : 'pointer' }}>
                  ← {t.common.previous}
                </button>
                <div className="flex items-center gap-1 mx-1">
                  {pages.map((p, i) =>
                    p === '...'
                      ? <span key={`e-${i}`} style={{ fontSize: 13, color: '#9CA3AF', padding: '0 4px' }}>…</span>
                      : (
                        <button key={p} onClick={() => setCurrentPage(p as number)}
                          className="w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer transition-colors"
                          style={{ fontSize: 13, fontWeight: p === safePage ? 600 : 400, border: 'none', background: p === safePage ? '#F3F4F6' : 'transparent', color: p === safePage ? '#111827' : '#6B7280' }}>
                          {p}
                        </button>
                      )
                  )}
                </div>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer transition-colors"
                  style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', color: safePage === totalPages ? '#D1D5DB' : '#374151', background: '#fff', cursor: safePage === totalPages ? 'not-allowed' : 'pointer' }}>
                  {t.common.next} →
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </main>
  )
}
