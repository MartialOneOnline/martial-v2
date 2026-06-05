'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { X, UserPlus, Users, Clock, MapPin } from 'lucide-react'

interface Student {
  id: number
  name: string
  avatar: string
  status: 'confirmed' | 'waitlist' | 'pending'
}

interface ClassInfo {
  name: string
  image: string
  time: string
  instructor?: string
  enrolled: number
  cap: number
  location?: string
}

interface Props {
  cls: ClassInfo
  students?: Student[]
  onClose: () => void
}

const DEFAULT_STUDENTS: Student[] = [
  { id: 1,  name: 'Rafael Gonzalez',  avatar: 'https://i.pravatar.cc/32?u=rg',  status: 'confirmed' },
  { id: 2,  name: 'Fernanda Neves',   avatar: 'https://i.pravatar.cc/32?u=fn',  status: 'confirmed' },
  { id: 3,  name: 'Matias Toloza',    avatar: 'https://i.pravatar.cc/32?u=mt',  status: 'confirmed' },
  { id: 4,  name: 'Florian Walter',   avatar: 'https://i.pravatar.cc/32?u=fw',  status: 'confirmed' },
  { id: 5,  name: 'Patricia Mancera', avatar: 'https://i.pravatar.cc/32?u=pm',  status: 'confirmed' },
  { id: 6,  name: 'Alejandro DB',     avatar: 'https://i.pravatar.cc/32?u=ad',  status: 'confirmed' },
  { id: 7,  name: 'Carlos Rivera',    avatar: 'https://i.pravatar.cc/32?u=cr',  status: 'confirmed' },
  { id: 8,  name: 'Ana Martínez',     avatar: 'https://i.pravatar.cc/32?u=am',  status: 'confirmed' },
  { id: 9,  name: 'João Silva',       avatar: 'https://i.pravatar.cc/32?u=js',  status: 'waitlist'  },
  { id: 10, name: 'Emma Wilson',      avatar: 'https://i.pravatar.cc/32?u=ew',  status: 'pending'   },
]

const STATUS_STYLE = {
  confirmed: { label: 'Confirmed', color: '#16A34A', bg: '#F0FDF4' },
  waitlist:  { label: 'Waitlist',  color: '#D97706', bg: '#FFFBEB' },
  pending:   { label: 'Pending',   color: '#6366F1', bg: '#EEF2FF' },
}

export default function ClassCapacityPopup({ cls, students = DEFAULT_STUDENTS, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const pct = cls.enrolled / cls.cap
  const barColor = pct >= 1 ? '#DC2626' : pct > 0.7 ? '#D97706' : '#16A34A'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div ref={ref} className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden" style={{ background: '#fff' }}>

        {/* Class image header */}
        <div className="relative h-24 overflow-hidden">
          <Image src={cls.image} alt={cls.name} fill className="object-cover" />
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} />
          <div className="absolute inset-0 flex items-center justify-between px-4">
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{cls.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Clock size={11} />{cls.time}
                </span>
              </div>
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
          {pct >= 1 && (
            <p style={{ fontSize: 10, color: '#DC2626', fontWeight: 600, marginTop: 4 }}>Class is full — students on waitlist</p>
          )}
        </div>

        {/* Student list */}
        <div style={{ maxHeight: 260, overflowY: 'auto', scrollbarWidth: 'none' }}>
          {students.map((s, i) => {
            const st = STATUS_STYLE[s.status]
            return (
              <div
                key={s.id}
                className="flex items-center gap-3 px-4 py-2.5"
                style={{ borderBottom: i < students.length - 1 ? '1px solid #F9FAFB' : 'none' }}
              >
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.avatar} alt={s.name} width={32} height={32} style={{ width: 32, height: 32, objectFit: 'cover' }} />
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
          <button
            className="w-full py-2 rounded-xl text-sm font-bold text-white cursor-pointer flex items-center justify-center gap-1.5"
            style={{ background: '#0071E3', border: 'none' }}
          >
            <UserPlus size={13} /> Add Student
          </button>
        </div>
      </div>
    </div>
  )
}
