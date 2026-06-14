'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { X, UserPlus, Users, Clock } from 'lucide-react'

interface Student {
  id: string
  name: string
  avatarUrl: string | null
  status: string
}

interface ClassInfo {
  id: string | number
  name: string
  image?: string
  time: string
  instructor?: string | null
  enrolled: number
  cap: number
}

interface Props {
  cls: ClassInfo
  onClose: () => void
}

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  CONFIRMED: { label: 'Confirmed', color: '#16A34A', bg: '#F0FDF4' },
  PENDING:   { label: 'Pending',   color: '#6366F1', bg: '#EEF2FF' },
  CANCELLED: { label: 'Cancelled', color: '#DC2626', bg: '#FEF2F2' },
  COMPLETED: { label: 'Completed', color: '#6B7280', bg: '#F3F4F6' },
  NO_SHOW:   { label: 'No-show',   color: '#D97706', bg: '#FFFBEB' },
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (avatarUrl) return <img src={avatarUrl} alt={name} width={32} height={32} style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: '50%' }} />
  return (
    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#0870E2,#7DE7EC)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {initials}
    </div>
  )
}

export default function ClassCapacityPopup({ cls, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  useEffect(() => {
    if (!cls.id) { setLoading(false); return }
    fetch(`/api/dashboard/classes/${cls.id}/bookings`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.bookings) setStudents(d.bookings)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [cls.id])

  const pct = cls.enrolled / cls.cap
  const barColor = pct >= 1 ? '#DC2626' : pct > 0.7 ? '#D97706' : '#16A34A'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div ref={ref} className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden" style={{ background: '#fff' }}>

        {/* Class image header */}
        <div className="relative h-24 overflow-hidden">
          <Image src={cls.image ?? '/martial-logo.png'} alt={cls.name} fill className="object-cover" />
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} />
          <div className="absolute inset-0 flex items-center justify-between px-4">
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{cls.name}</p>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 3, marginTop: 4 }}>
                <Clock size={11} />{cls.time}
              </span>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#fff' }}>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Capacity bar */}
        <div className="px-4 py-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Users size={13} style={{ color: '#6B7280' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Capacity</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: barColor }}>{cls.enrolled}/{cls.cap}</span>
          </div>
          <div className="w-full h-2 rounded-full" style={{ background: '#F3F4F6' }}>
            <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(pct * 100, 100)}%`, background: barColor }} />
          </div>
          {pct >= 1 && <p style={{ fontSize: 10, color: '#DC2626', fontWeight: 600, marginTop: 4 }}>Class is full</p>}
        </div>

        {/* Student list */}
        <div style={{ maxHeight: 280, overflowY: 'auto', scrollbarWidth: 'none' }}>
          {loading ? (
            <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '24px 0' }}>Loading…</p>
          ) : students.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '24px 0' }}>No bookings yet</p>
          ) : students.map((s, i) => {
            const st = STATUS_STYLE[s.status] ?? { label: s.status, color: '#6B7280', bg: '#F3F4F6' }
            return (
              <div key={s.id} className="flex items-center gap-3 px-4 py-2.5"
                style={{ borderBottom: i < students.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                <div className="shrink-0">
                  <Avatar name={s.name} avatarUrl={s.avatarUrl} />
                </div>
                <span style={{ fontSize: 13, color: '#111827', flex: 1 }}>{s.name}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: st.color, background: st.bg, padding: '2px 7px', borderRadius: 999 }}>
                  {st.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
          <button className="w-full py-2 rounded-xl text-sm font-bold text-white cursor-pointer flex items-center justify-center gap-1.5"
            style={{ background: '#0071E3', border: 'none' }}>
            <UserPlus size={13} /> Add Student
          </button>
        </div>
      </div>
    </div>
  )
}
