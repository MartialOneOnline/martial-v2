'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell, Menu, Search, Plus, MoreHorizontal,
  Download, TrendingUp, Clock, Users, X,
  ChevronDown, UserCheck, Archive, Shield,
  Mail, Upload, FileText, CheckCircle, AlertCircle,
  SlidersHorizontal, Eye, Send, Trash2,
} from 'lucide-react'
import { useDashboard } from '../../../components/DashboardShell'
import DashboardLanguageSelector from '../../../components/DashboardLanguageSelector'
import { useT } from '../../../lib/i18n/LanguageContext'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { memberStatusColors } from '../../../lib/design/tokens'

// ── Toast ─────────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info'
type Toast = { id: number; message: string; type: ToastType }

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  if (!toasts.length) return null
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderRadius: 10, minWidth: 260, maxWidth: 380,
          background: t.type === 'success' ? '#ECFDF5' : t.type === 'error' ? '#FEF2F2' : '#EFF6FF',
          border: `1px solid ${t.type === 'success' ? '#A7F3D0' : t.type === 'error' ? '#FECACA' : '#BFDBFE'}`,
          boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
          animation: 'slideIn .2s ease',
        }}>
          {t.type === 'success' && <CheckCircle size={16} style={{ color: '#16A34A', flexShrink: 0 }} />}
          {t.type === 'error' && <AlertCircle size={16} style={{ color: '#DC2626', flexShrink: 0 }} />}
          {t.type === 'info' && <Bell size={16} style={{ color: '#2563EB', flexShrink: 0 }} />}
          <span style={{ fontSize: 13, fontWeight: 500, color: '#111827', flex: 1 }}>{t.message}</span>
          <button onClick={() => onRemove(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0 }}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const show = (message: string, type: ToastType = 'success', duration = 3500) => {
    const id = ++counter.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }

  const remove = (id: number) => setToasts(prev => prev.filter(t => t.id !== id))

  return { toasts, show, remove }
}

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


// ── Row actions dropdown ───────────────────────────────────────────────────────
function ActionsMenu({
  student,
  onStatusChange,
  onBeltChange,
  onResendInvite,
  onDelete,
  onDeleteUser,
}: {
  student: Student
  onStatusChange: (id: string, status: string) => void
  onBeltChange: (id: string, belt: string) => void
  onResendInvite: (student: Student) => void
  onDelete: (id: string) => void
  onDeleteUser: (id: string) => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [beltOpen, setBeltOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const closeAll = () => { setOpen(false); setStatusOpen(false); setBeltOpen(false); setConfirmDelete(false) }

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) closeAll()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const currentDisplay = STATUS_DISPLAY[student.status] ?? student.status
  const currentBelt = student.belt ?? 'Blanco'

  const menuItem = (
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
    danger = false,
  ) => (
    <button
      onClick={e => { e.stopPropagation(); onClick() }}
      className="w-full flex items-center gap-2 cursor-pointer"
      style={{ padding: '8px 14px', fontSize: 13, border: 'none', textAlign: 'left',
        color: danger ? '#DC2626' : '#374151', background: 'transparent' }}
      onMouseEnter={e => (e.currentTarget.style.background = danger ? '#FEF2F2' : '#F9FAFB')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      {icon}
      {label}
    </button>
  )

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); setStatusOpen(false); setBeltOpen(false) }}
        className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
        style={{ color: open ? '#111827' : '#9CA3AF', background: open ? '#F3F4F6' : 'transparent', border: 'none', transition: 'all .15s' }}>
        <MoreHorizontal size={15} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 32, zIndex: 50, minWidth: 190,
          background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.10)', padding: '4px 0',
        }}>

          {/* View profile */}
          {menuItem(
            <Eye size={13} style={{ color: '#6B7280', flexShrink: 0 }} />,
            'Ver perfil',
            () => { closeAll(); router.push(`/dashboard/users/${student.id}`) },
          )}

          {/* Resend invite — only for PENDING */}
          {student.status === 'PENDING' && menuItem(
            <Send size={13} style={{ color: '#6B7280', flexShrink: 0 }} />,
            'Reenviar invitación',
            () => { closeAll(); onResendInvite(student) },
          )}

          <div style={{ height: 1, background: '#F3F4F6', margin: '4px 0' }} />

          {/* Change status submenu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={e => { e.stopPropagation(); setStatusOpen(o => !o); setBeltOpen(false) }}
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
                      closeAll()
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

          {/* Change belt submenu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={e => { e.stopPropagation(); setBeltOpen(o => !o); setStatusOpen(false) }}
              className="w-full flex items-center justify-between cursor-pointer"
              style={{ padding: '8px 14px', fontSize: 13, color: '#374151', background: 'transparent', border: 'none', textAlign: 'left' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <span className="flex items-center gap-2">
                <Shield size={13} style={{ color: '#6B7280' }} />
                Cambiar cinturón
              </span>
              <ChevronDown size={12} style={{ color: '#9CA3AF', transform: beltOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
            </button>

            {beltOpen && (
              <div style={{
                position: 'absolute', right: '100%', top: 0, zIndex: 51, minWidth: 140,
                background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.10)', padding: '4px 0', marginRight: 4,
              }}>
                {BELTS.map(b => {
                  const isActive = b === currentBelt
                  const col = BELT_COLORS[b] ?? { dot: '#9CA3AF' }
                  return (
                    <button
                      key={b}
                      onClick={e => {
                        e.stopPropagation()
                        onBeltChange(student.id, b)
                        closeAll()
                      }}
                      className="w-full flex items-center gap-2 cursor-pointer"
                      style={{
                        padding: '8px 14px', fontSize: 13, border: 'none', textAlign: 'left',
                        color: isActive ? '#0071E3' : '#374151',
                        background: isActive ? '#EFF6FF' : 'transparent',
                        fontWeight: isActive ? 600 : 400,
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F9FAFB' }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.dot, flexShrink: 0, display: 'inline-block' }} />
                      {BELT_DISPLAY[b]?.label ?? b}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div style={{ height: 1, background: '#F3F4F6', margin: '4px 0' }} />

          {/* Archive */}
          {menuItem(
            <Archive size={13} style={{ flexShrink: 0 }} />,
            'Archivar',
            () => { closeAll(); onDelete(student.id) },
            true,
          )}

          {/* Delete with confirm */}
          {!confirmDelete ? (
            <button
              onClick={e => { e.stopPropagation(); setConfirmDelete(true) }}
              className="w-full flex items-center gap-2 cursor-pointer"
              style={{ padding: '8px 14px', fontSize: 13, border: 'none', textAlign: 'left', color: '#DC2626', background: 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <Trash2 size={13} style={{ flexShrink: 0 }} />
              Eliminar
            </button>
          ) : (
            <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p style={{ margin: 0, fontSize: 12, color: '#DC2626', fontWeight: 600 }}>¿Eliminar permanentemente?</p>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={e => { e.stopPropagation(); closeAll(); onDeleteUser(student.id) }}
                  style={{ flex: 1, padding: '5px 0', fontSize: 12, fontWeight: 600, background: '#DC2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                  Sí, eliminar
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setConfirmDelete(false) }}
                  style={{ flex: 1, padding: '5px 0', fontSize: 12, background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Filters dropdown ──────────────────────────────────────────────────────────
const BELT_FILTER_OPTIONS = [
  { value: 'Blanco', label: 'Blanco', color: '#D1D5DB' },
  { value: 'Azul',   label: 'Azul',   color: '#2563EB' },
  { value: 'Morado', label: 'Morado', color: '#7C3AED' },
  { value: 'Marron', label: 'Marrón', color: '#92400E' },
  { value: 'Negro',  label: 'Negro',  color: '#111827' },
]

const STATUS_FILTER_OPTIONS = Object.entries(memberStatusColors).map(([value, t]) => ({
  value,
  label: t.label,
  color: t.dot,
}))

const ROLE_FILTER_OPTIONS = [
  { value: 'STUDENT',      label: 'Student'      },
  { value: 'INSTRUCTOR',   label: 'Instructor'   },
  { value: 'SCHOOL_OWNER', label: 'Owner'        },
]

type ActiveFilters = {
  belts: string[]
  statuses: string[]
  roles: string[]
}

function FiltersDropdown({
  filters,
  onChange,
}: {
  filters: ActiveFilters
  onChange: (f: ActiveFilters) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<ActiveFilters>(filters)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => { if (open) setDraft(filters) }, [open])

  const toggle = (key: keyof ActiveFilters, value: string) => {
    setDraft(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(v => v !== value)
        : [...prev[key], value],
    }))
  }

  const apply = () => { onChange(draft); setOpen(false) }
  const clear  = () => { const empty = { belts: [], statuses: [], roles: [] }; setDraft(empty); onChange(empty); setOpen(false) }

  const activeCount = filters.belts.length + filters.statuses.length + filters.roles.length

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
          border: `1px solid ${activeCount > 0 ? '#0071E3' : '#E5E7EB'}`,
          background: activeCount > 0 ? '#EFF6FF' : '#F9FAFB',
          fontSize: 13, fontWeight: 500,
          color: activeCount > 0 ? '#0071E3' : '#374151',
          transition: 'all 0.15s',
        }}
      >
        <SlidersHorizontal size={13} />
        <span className="hidden sm:inline">Filtrar</span>
        {activeCount > 0 && (
          <span style={{
            background: '#0071E3', color: '#fff', fontSize: 10, fontWeight: 700,
            borderRadius: 999, width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 50,
          background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)', width: 280, padding: 16,
        }}>

          {/* Belt section */}
          <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px' }}>
            Cinturón
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
            {BELT_FILTER_OPTIONS.map(opt => (
              <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', background: draft.belts.includes(opt.value) ? '#F0F9FF' : 'transparent', transition: 'background 0.1s' }}>
                <div style={{
                  width: 16, height: 16, borderRadius: 4, border: `2px solid ${draft.belts.includes(opt.value) ? '#0071E3' : '#D1D5DB'}`,
                  background: draft.belts.includes(opt.value) ? '#0071E3' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.1s',
                  cursor: 'pointer',
                }} onClick={() => toggle('belts', opt.value)}>
                  {draft.belts.includes(opt.value) && <CheckCircle size={10} style={{ color: '#fff' }} />}
                </div>
                <div style={{ width: 28, height: 8, borderRadius: 999, background: opt.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#374151' }}>{opt.label}</span>
              </label>
            ))}
          </div>

          {/* Status section */}
          <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 14, marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px' }}>
              Estado
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {STATUS_FILTER_OPTIONS.map(opt => (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', background: draft.statuses.includes(opt.value) ? '#F0F9FF' : 'transparent', transition: 'background 0.1s' }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: 4, border: `2px solid ${draft.statuses.includes(opt.value) ? '#0071E3' : '#D1D5DB'}`,
                    background: draft.statuses.includes(opt.value) ? '#0071E3' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.1s',
                    cursor: 'pointer',
                  }} onClick={() => toggle('statuses', opt.value)}>
                    {draft.statuses.includes(opt.value) && <CheckCircle size={10} style={{ color: '#fff' }} />}
                  </div>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: opt.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#374151' }}>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Role section */}
          <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 14, marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px' }}>
              Rol
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {ROLE_FILTER_OPTIONS.map(opt => (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', background: draft.roles.includes(opt.value) ? '#F0F9FF' : 'transparent', transition: 'background 0.1s' }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: 4, border: `2px solid ${draft.roles.includes(opt.value) ? '#0071E3' : '#D1D5DB'}`,
                    background: draft.roles.includes(opt.value) ? '#0071E3' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.1s',
                    cursor: 'pointer',
                  }} onClick={() => toggle('roles', opt.value)}>
                    {draft.roles.includes(opt.value) && <CheckCircle size={10} style={{ color: '#fff' }} />}
                  </div>
                  <span style={{ fontSize: 13, color: '#374151' }}>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 12, display: 'flex', gap: 8 }}>
            <button onClick={clear} style={{ flex: 1, padding: '8px', fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', borderRadius: 8, background: '#fff', color: '#6B7280', cursor: 'pointer' }}>
              Limpiar
            </button>
            <button onClick={apply} style={{ flex: 2, padding: '8px', fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 8, background: '#0071E3', color: '#fff', cursor: 'pointer' }}>
              Aplicar filtros
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Shared input style ─────────────────────────────────────────────────────────
const fieldInput: React.CSSProperties = {
  width: '100%', padding: '9px 12px', fontSize: 13, borderRadius: 8,
  border: '1px solid #E5E7EB', outline: 'none', background: '#fff',
  boxSizing: 'border-box', color: '#111827', fontFamily: 'inherit',
}

// ── CSV parser (no dependency) ─────────────────────────────────────────────────
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  for (const line of lines) {
    const cols: string[] = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') { inQ = !inQ }
      else if (c === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
      else { cur += c }
    }
    cols.push(cur.trim())
    rows.push(cols)
  }
  return rows
}

function detectColumn(headers: string[], keys: string[]): number {
  return headers.findIndex(h => keys.some(k => h.toLowerCase().includes(k)))
}

// ── Add Student modal ──────────────────────────────────────────────────────────
function AddStudentModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (students: Student[]) => void
}) {
  const [tab, setTab] = useState<'invite' | 'create' | 'import'>('invite')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const TABS = [
    { key: 'invite' as const, label: 'Invitar', icon: Mail },
    { key: 'create' as const, label: 'Crear',   icon: Plus },
    { key: 'import' as const, label: 'Importar CSV', icon: Upload },
  ]

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 500, boxShadow: '0 32px 80px rgba(0,0,0,0.18)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '24px 24px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0 }}>Añadir estudiante</h2>
            <p style={{ fontSize: 13, color: '#9CA3AF', margin: '2px 0 0' }}>Elige cómo quieres añadir el alumno</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4, marginTop: -2 }}>
            <X size={20} />
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, padding: '16px 24px 0', borderBottom: '1px solid #F3F4F6' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', fontSize: 13, fontWeight: tab === t.key ? 600 : 400,
                color: tab === t.key ? '#0071E3' : '#6B7280',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: `2px solid ${tab === t.key ? '#0071E3' : 'transparent'}`,
                marginBottom: -1, transition: 'all 0.15s',
              }}
            >
              <t.icon size={13} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ padding: 24 }}>
          {tab === 'invite' && <InviteTab onClose={onClose} onCreated={onCreated} />}
          {tab === 'create' && <CreateTab onClose={onClose} onCreated={onCreated} />}
          {tab === 'import' && <ImportTab onClose={onClose} onCreated={onCreated} />}
        </div>
      </div>
    </div>
  )
}

// ── Invite tab ─────────────────────────────────────────────────────────────────
function InviteTab({ onClose, onCreated }: { onClose: () => void; onCreated: (s: Student[]) => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim()) { setError('El email es obligatorio'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard/members/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al enviar la invitación'); return }
      onCreated([data.member])
      setSent(true)
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <CheckCircle size={24} style={{ color: '#16A34A' }} />
        </div>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '0 0 6px' }}>¡Invitación enviada!</p>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px' }}>
          {name ? <><strong>{name}</strong> ({email})</> : email} recibirá un email para activar su cuenta.
        </p>
        <button onClick={onClose} style={{ padding: '9px 24px', background: '#0071E3', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Cerrar
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ padding: '14px 16px', background: '#F0F9FF', borderRadius: 10, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Mail size={15} style={{ color: '#0071E3', flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.5 }}>
          El alumno recibirá un email con un enlace para crear su contraseña y acceder a la plataforma. Se añade como <strong>Pendiente</strong> hasta que complete el registro.
        </p>
      </div>

      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Nombre</label>
        <input
          type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder="Ej. Juan García" autoFocus
          style={fieldInput}
          onFocus={e => (e.target.style.borderColor = '#0071E3')}
          onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
        />
      </div>

      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Email *</label>
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="alumno@ejemplo.com"
          style={fieldInput}
          onFocus={e => (e.target.style.borderColor = '#0071E3')}
          onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
        />
      </div>

      {error && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', background: '#FEF2F2', borderRadius: 8 }}>
          <AlertCircle size={14} style={{ color: '#DC2626', flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: 500, borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', cursor: 'pointer' }}>
          Cancelar
        </button>
        <button type="submit" disabled={loading} style={{ flex: 2, padding: '10px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: 'none', background: loading ? '#93C5FD' : '#0071E3', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Enviando...' : 'Enviar invitación'}
        </button>
      </div>
    </form>
  )
}

// ── Create tab ─────────────────────────────────────────────────────────────────
function CreateTab({ onClose, onCreated }: { onClose: () => void; onCreated: (s: Student[]) => void }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', belt: 'Blanco', beltDegree: 0, status: 'ACTIVE' })
  const [sendInvite, setSendInvite] = useState(false)
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

      if (sendInvite && form.email.trim()) {
        await fetch('/api/dashboard/members/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email.trim(), name: form.name.trim() }),
        })
      }

      onCreated([data.member])
      onClose()
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Nombre completo *</label>
        <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej. Juan García" autoFocus
          style={fieldInput} onFocus={e => (e.target.style.borderColor = '#0071E3')} onBlur={e => (e.target.style.borderColor = '#E5E7EB')} />
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Email *</label>
        <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="juan@ejemplo.com"
          style={fieldInput} onFocus={e => (e.target.style.borderColor = '#0071E3')} onBlur={e => (e.target.style.borderColor = '#E5E7EB')} />
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Teléfono</label>
        <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+34 600 000 000"
          style={fieldInput} onFocus={e => (e.target.style.borderColor = '#0071E3')} onBlur={e => (e.target.style.borderColor = '#E5E7EB')} />
      </div>
      <div className="flex gap-3">
        <div style={{ flex: 2 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Cinturón</label>
          <select value={form.belt} onChange={e => setForm(f => ({ ...f, belt: e.target.value }))} style={fieldInput}>
            {BELTS.map(b => <option key={b} value={b}>{BELT_DISPLAY[b]?.label ?? b}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Grados</label>
          <select value={form.beltDegree} onChange={e => setForm(f => ({ ...f, beltDegree: Number(e.target.value) }))} style={fieldInput}>
            {[0,1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Estado</label>
        <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={fieldInput}>
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      {/* Send invite toggle */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '12px 14px', background: sendInvite ? '#F0F9FF' : '#F9FAFB', borderRadius: 10, border: `1px solid ${sendInvite ? '#BFDBFE' : '#E5E7EB'}`, transition: 'all 0.15s' }}>
        <div
          onClick={() => setSendInvite(v => !v)}
          style={{
            width: 36, height: 20, borderRadius: 999, flexShrink: 0,
            background: sendInvite ? '#0071E3' : '#D1D5DB',
            position: 'relative', transition: 'background 0.2s', cursor: 'pointer',
          }}
        >
          <div style={{
            position: 'absolute', top: 2, left: sendInvite ? 18 : 2,
            width: 16, height: 16, borderRadius: '50%', background: '#fff',
            transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', margin: 0 }}>Enviar invitación por email</p>
          <p style={{ fontSize: 12, color: '#6B7280', margin: '1px 0 0' }}>El alumno recibirá un enlace para activar su cuenta</p>
        </div>
      </label>

      {error && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', background: '#FEF2F2', borderRadius: 8 }}>
          <AlertCircle size={14} style={{ color: '#DC2626', flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>{error}</p>
        </div>
      )}
      <div className="flex gap-3" style={{ marginTop: 4 }}>
        <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: 500, borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', cursor: 'pointer' }}>
          Cancelar
        </button>
        <button type="submit" disabled={loading} style={{ flex: 2, padding: '10px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: 'none', background: loading ? '#93C5FD' : '#0071E3', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Creando...' : sendInvite ? 'Crear y enviar invitación' : 'Crear estudiante'}
        </button>
      </div>
    </form>
  )
}

// ── Import tab ─────────────────────────────────────────────────────────────────
type CsvRow = { name: string; email: string; phone: string; belt: string }

function ImportTab({ onClose, onCreated }: { onClose: () => void; onCreated: (s: Student[]) => void }) {
  const [dragging, setDragging] = useState(false)
  const [rows, setRows] = useState<CsvRow[]>([])
  const [fileName, setFileName] = useState('')
  const [colMap, setColMap] = useState({ name: -1, email: -1, phone: -1, belt: -1 })
  const [headers, setHeaders] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback((file: File) => {
    if (!file.name.match(/\.(csv|txt)$/i)) { setError('Solo se aceptan archivos .csv'); return }
    setFileName(file.name)
    setError('')
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)
      if (parsed.length < 2) { setError('El archivo está vacío o no tiene datos'); return }
      const hdrs = (parsed[0] ?? []).map(h => h.replace(/^["']|["']$/g, ''))
      setHeaders(hdrs)
      const map = {
        name:  detectColumn(hdrs, ['name', 'nombre', 'full']),
        email: detectColumn(hdrs, ['email', 'correo', 'mail']),
        phone: detectColumn(hdrs, ['phone', 'telefono', 'tel', 'móvil', 'movil']),
        belt:  detectColumn(hdrs, ['belt', 'cinturon', 'cinturón', 'rank']),
      }
      setColMap(map)
      const dataRows = parsed.slice(1).slice(0, 200)
      setRows(dataRows.map(r => ({
        name:  map.name  >= 0 ? r[map.name]  ?? '' : '',
        email: map.email >= 0 ? r[map.email] ?? '' : '',
        phone: map.phone >= 0 ? r[map.phone] ?? '' : '',
        belt:  map.belt  >= 0 ? r[map.belt]  ?? '' : '',
      })))
    }
    reader.readAsText(file)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleImport = async () => {
    setLoading(true); setError('')
    try {
      const validRows = rows.filter(r => r.email.trim() && r.name.trim())
      const res = await fetch('/api/dashboard/members/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: validRows }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al importar'); return }
      setResult(data)
      if (data.members?.length > 0) onCreated(data.members as Student[])
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <CheckCircle size={24} style={{ color: '#16A34A' }} />
        </div>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Importación completada</p>
        <div className="flex justify-center gap-4" style={{ marginBottom: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#16A34A', margin: 0 }}>{result.created}</p>
            <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>creados</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#9CA3AF', margin: 0 }}>{result.skipped}</p>
            <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>omitidos</p>
          </div>
        </div>
        {result.errors.length > 0 && (
          <div style={{ textAlign: 'left', background: '#FEF2F2', borderRadius: 8, padding: '10px 12px', marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#DC2626', margin: '0 0 4px' }}>Errores ({result.errors.length})</p>
            {result.errors.slice(0, 5).map((e, i) => <p key={i} style={{ fontSize: 12, color: '#DC2626', margin: '2px 0' }}>{e}</p>)}
          </div>
        )}
        <button onClick={onClose} style={{ padding: '9px 24px', background: '#0071E3', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Cerrar
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Drop zone */}
      {rows.length === 0 ? (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? '#0071E3' : '#D1D5DB'}`,
            borderRadius: 12, padding: '32px 20px', textAlign: 'center',
            cursor: 'pointer', background: dragging ? '#EFF6FF' : '#FAFAFA',
            transition: 'all 0.15s',
          }}
        >
          <Upload size={28} style={{ color: dragging ? '#0071E3' : '#9CA3AF', margin: '0 auto 10px', display: 'block' }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>Arrastra tu CSV aquí</p>
          <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 12px' }}>o haz clic para seleccionar</p>
          <span style={{ fontSize: 11, background: '#F3F4F6', color: '#6B7280', padding: '4px 10px', borderRadius: 999 }}>
            .csv · máx. 200 filas
          </span>
          <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }} />
        </div>
      ) : (
        <>
          {/* File info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB' }}>
            <FileText size={16} style={{ color: '#0071E3', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</p>
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>{rows.length} filas detectadas</p>
            </div>
            <button onClick={() => { setRows([]); setFileName(''); setColMap({ name: -1, email: -1, phone: -1, belt: -1 }) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}>
              <X size={16} />
            </button>
          </div>

          {/* Column mapping */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', margin: '0 0 10px' }}>Mapeo de columnas</p>
            <div className="grid grid-cols-2 gap-2">
              {(['name', 'email', 'phone', 'belt'] as const).map(field => (
                <div key={field}>
                  <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4, textTransform: 'capitalize' }}>
                    {field === 'name' ? 'Nombre' : field === 'email' ? 'Email' : field === 'phone' ? 'Teléfono' : 'Cinturón'}
                    {(field === 'name' || field === 'email') && <span style={{ color: '#DC2626' }}> *</span>}
                  </label>
                  <select
                    value={colMap[field]}
                    onChange={e => setColMap(m => ({ ...m, [field]: Number(e.target.value) }))}
                    style={{ ...fieldInput, fontSize: 12, padding: '6px 10px' }}
                  >
                    <option value={-1}>— ignorar —</option>
                    {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #E5E7EB' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  {['Nombre', 'Email', 'Teléfono', 'Cinturón'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '7px 12px', color: r.name ? '#111827' : '#D1D5DB' }}>{r.name || '—'}</td>
                    <td style={{ padding: '7px 12px', color: r.email ? '#111827' : '#D1D5DB' }}>{r.email || '—'}</td>
                    <td style={{ padding: '7px 12px', color: '#6B7280' }}>{r.phone || '—'}</td>
                    <td style={{ padding: '7px 12px', color: '#6B7280' }}>{r.belt || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 5 && (
              <p style={{ fontSize: 11, color: '#9CA3AF', padding: '6px 12px', margin: 0 }}>
                +{rows.length - 5} filas más
              </p>
            )}
          </div>
        </>
      )}

      {error && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', background: '#FEF2F2', borderRadius: 8 }}>
          <AlertCircle size={14} style={{ color: '#DC2626', flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: 500, borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', cursor: 'pointer' }}>
          Cancelar
        </button>
        {rows.length > 0 && (
          <button onClick={handleImport} disabled={loading || colMap.email < 0 || colMap.name < 0}
            style={{ flex: 2, padding: '10px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: 'none', background: (loading || colMap.email < 0 || colMap.name < 0) ? '#93C5FD' : '#0071E3', color: '#fff', cursor: (loading || colMap.email < 0 || colMap.name < 0) ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Importando...' : `Importar ${rows.filter(r => r.name && r.email).length} alumnos`}
          </button>
        )}
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
  const router = useRouter()
  const { toasts, show: showToast, remove: removeToast } = useToast()

  const [students, setStudents] = useState<Student[]>(initialStudents)
  const [showAddModal, setShowAddModal] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterType>('All')
  const [advFilters, setAdvFilters]     = useState<ActiveFilters>({ belts: [], statuses: [], roles: [] })
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
    const matchStatusTab = activeFilter === 'All' || displayStatus === activeFilter
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                        s.email.toLowerCase().includes(search.toLowerCase())
    const matchBelt   = advFilters.belts.length === 0    || advFilters.belts.includes(s.belt)
    const matchStatus = advFilters.statuses.length === 0 || advFilters.statuses.includes(s.status)
    const matchRole   = advFilters.roles.length === 0    || advFilters.roles.includes(s.role)
    return matchStatusTab && matchSearch && matchBelt && matchStatus && matchRole
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

  const handleBeltChange = async (memberId: string, belt: string) => {
    setStudents(prev => prev.map(s => s.id === memberId ? { ...s, belt } : s))
    try {
      await fetch(`/api/dashboard/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ belt }),
      })
    } catch {
      setStudents(initialStudents)
    }
  }

  const handleDeleteUser = async (memberId: string) => {
    setStudents(prev => prev.filter(s => s.id !== memberId))
    await fetch(`/api/dashboard/members/${memberId}`, { method: 'DELETE' })
  }

  const handleResendInvite = async (student: Student) => {
    try {
      const res = await fetch(`/api/dashboard/members/${student.id}/resend-invite`, { method: 'POST' })
      if (res.ok) {
        showToast(`Invitación reenviada a ${student.email}`, 'success')
      } else {
        showToast('Error al reenviar la invitación', 'error')
      }
    } catch {
      showToast('Error al reenviar la invitación', 'error')
    }
  }

  const handleCreated = (newStudents: Student[]) => {
    setStudents(prev => [...newStudents, ...prev])
  }

  return (
    <main style={{ flex: 1, minWidth: 0 }}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

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

        <FiltersDropdown filters={advFilters} onChange={f => { setAdvFilters(f); setCurrentPage(1) }} />

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
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" style={{ WebkitOverflowScrolling: 'touch' }}>
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

        {/* Active filter chips */}
        {(advFilters.belts.length > 0 || advFilters.statuses.length > 0 || advFilters.roles.length > 0) && (
          <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: -8 }}>
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>Filtros activos:</span>
            {advFilters.belts.map(b => {
              const opt = BELT_FILTER_OPTIONS.find(o => o.value === b)
              return (
                <span key={b} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, padding: '3px 8px 3px 6px', borderRadius: 999, background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: opt?.color ?? '#D1D5DB', flexShrink: 0 }} />
                  {opt?.label ?? b}
                  <button onClick={() => setAdvFilters(f => ({ ...f, belts: f.belts.filter(v => v !== b) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#9CA3AF', display: 'flex', alignItems: 'center' }}><X size={11} /></button>
                </span>
              )
            })}
            {advFilters.statuses.map(s => {
              const opt = STATUS_FILTER_OPTIONS.find(o => o.value === s)
              return (
                <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, padding: '3px 8px 3px 6px', borderRadius: 999, background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: opt?.color ?? '#D1D5DB', flexShrink: 0 }} />
                  {opt?.label ?? s}
                  <button onClick={() => setAdvFilters(f => ({ ...f, statuses: f.statuses.filter(v => v !== s) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#9CA3AF', display: 'flex', alignItems: 'center' }}><X size={11} /></button>
                </span>
              )
            })}
            {advFilters.roles.map(r => {
              const opt = ROLE_FILTER_OPTIONS.find(o => o.value === r)
              return (
                <span key={r} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, padding: '3px 8px 3px 6px', borderRadius: 999, background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' }}>
                  {opt?.label ?? r}
                  <button onClick={() => setAdvFilters(f => ({ ...f, roles: f.roles.filter(v => v !== r) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#9CA3AF', display: 'flex', alignItems: 'center' }}><X size={11} /></button>
                </span>
              )
            })}
            <button onClick={() => setAdvFilters({ belts: [], statuses: [], roles: [] })} style={{ fontSize: 12, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Limpiar todo
            </button>
          </div>
        )}

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
                  className="hover:bg-[#FAFAFA] transition-colors cursor-pointer"
                  style={{ borderBottom: idx < paginated.length - 1 ? '1px solid #F9FAFB' : 'none' }}
                  onClick={() => router.push(`/dashboard/users/${student.id}`)}>

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
                    <StatusBadge status={student.status} />
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                    <ActionsMenu
                      student={student}
                      onStatusChange={handleStatusChange}
                      onBeltChange={handleBeltChange}
                      onResendInvite={handleResendInvite}
                      onDelete={handleArchive}
                      onDeleteUser={handleDeleteUser}
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
