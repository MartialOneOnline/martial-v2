'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { X, UserPlus, Users, Clock, Search, Check, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react'

interface Student {
  id: string
  name: string
  avatarUrl: string | null
  status: string
  attendedAt?: string | null
}

interface Member {
  userId: string
  name: string
  email: string
  avatarUrl: string | null
  role: string
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
  date?: string  // YYYY-MM-DD
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

export default function ClassCapacityPopup({ cls, date, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [students, setStudents]             = useState<Student[]>([])
  const [loading,  setLoading]              = useState(true)
  const [addingView, setAddingView]         = useState(false)

  // Add student state
  const [members,         setMembers]         = useState<Member[]>([])
  const [membersLoading,  setMembersLoading]  = useState(false)
  const [search,          setSearch]          = useState('')
  const [addingId,        setAddingId]        = useState<string | null>(null)
  const [addedIds,        setAddedIds]        = useState<Set<string>>(new Set())
  const [addError,        setAddError]        = useState<string | null>(null)

  // Attendance state
  const [markingId, setMarkingId] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  useEffect(() => {
    if (!cls.id) { setLoading(false); return }
    const qs = date ? `?date=${date}` : ''
    fetch(`/api/dashboard/classes/${cls.id}/bookings${qs}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.bookings) setStudents(d.bookings); setLoading(false) })
      .catch(() => setLoading(false))
  }, [cls.id, date])

  // Load members when add view opens
  useEffect(() => {
    if (!addingView || members.length > 0) return
    setMembersLoading(true)
    fetch('/api/dashboard/members')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (Array.isArray(d)) setMembers(d); setMembersLoading(false) })
      .catch(() => setMembersLoading(false))
  }, [addingView])

  const pct = cls.enrolled / cls.cap
  const barColor = pct >= 1 ? '#DC2626' : pct > 0.7 ? '#D97706' : '#16A34A'

  const filteredMembers = search.trim()
    ? members.filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase())
      )
    : members

  async function handleAddBooking(member: Member) {
    setAddingId(member.userId)
    setAddError(null)
    try {
      const res = await fetch(`/api/dashboard/classes/${cls.id}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: member.userId, date }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAddError(data.error === 'Already booked' ? `${member.name} is already booked.` : data.error ?? 'Failed')
      } else {
        setAddedIds(prev => new Set([...prev, member.userId]))
        setStudents(prev => [...prev, data.booking])
      }
    } catch {
      setAddError('Network error')
    } finally {
      setAddingId(null)
    }
  }

  async function markAttended(bookingId: string) {
    setMarkingId(bookingId)
    try {
      const res = await fetch(`/api/dashboard/bookings/${bookingId}/attend`, { method: 'PATCH' })
      if (res.ok) {
        const data = await res.json()
        setStudents(prev => prev.map(s =>
          s.id === bookingId ? { ...s, status: data.status, attendedAt: data.attendedAt } : s
        ))
      }
    } finally {
      setMarkingId(null)
    }
  }

  async function markNoShow(bookingId: string) {
    setMarkingId(bookingId)
    try {
      const res = await fetch(`/api/dashboard/bookings/${bookingId}/no-show`, { method: 'PATCH' })
      if (res.ok) {
        const data = await res.json()
        setStudents(prev => prev.map(s =>
          s.id === bookingId ? { ...s, status: data.status } : s
        ))
      }
    } finally {
      setMarkingId(null)
    }
  }

  const activeStudents = students.filter(s => s.status !== 'CANCELLED')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div ref={ref} className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ background: '#fff', maxHeight: '80vh' }}>

        {/* Class image header */}
        <div className="relative shrink-0" style={{ height: 96 }}>
          <Image src={cls.image ?? '/martial-logo.png'} alt={cls.name} fill className="object-cover" />
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} />
          <div className="absolute inset-0 flex items-center justify-between px-4">
            <div>
              {addingView && (
                <button onClick={() => { setAddingView(false); setAddError(null) }}
                  style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ArrowLeft size={13} />
                  <span style={{ fontSize: 11, opacity: 0.8 }}>Back</span>
                </button>
              )}
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
        <div className="px-4 py-3 shrink-0" style={{ borderBottom: '1px solid #F3F4F6' }}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Users size={13} style={{ color: '#6B7280' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Capacity</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: barColor }}>{activeStudents.length}/{cls.cap}</span>
          </div>
          <div className="w-full h-2 rounded-full" style={{ background: '#F3F4F6' }}>
            <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min((activeStudents.length / cls.cap) * 100, 100)}%`, background: barColor }} />
          </div>
          {activeStudents.length >= cls.cap && <p style={{ fontSize: 10, color: '#DC2626', fontWeight: 600, marginTop: 4 }}>Class is full</p>}
        </div>

        {/* Add student panel */}
        {addingView ? (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="px-4 py-3 shrink-0" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <div className="flex items-center gap-2 px-3 rounded-xl" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                <Search size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search students…"
                  style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: 16, color: '#111827', padding: '8px 0' }}
                />
              </div>
              {addError && <p style={{ fontSize: 11, color: '#DC2626', marginTop: 6 }}>{addError}</p>}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
              {membersLoading ? (
                <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '24px 0' }}>Loading students…</p>
              ) : filteredMembers.length === 0 ? (
                <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '24px 0' }}>No students found</p>
              ) : filteredMembers.map((m, i) => {
                const isAdded  = addedIds.has(m.userId)
                const isAdding = addingId === m.userId
                return (
                  <div key={m.userId} className="flex items-center gap-3 px-4 py-2.5"
                    style={{ borderBottom: i < filteredMembers.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                    <Avatar name={m.name} avatarUrl={m.avatarUrl} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</p>
                      <p style={{ fontSize: 11, color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</p>
                    </div>
                    <button
                      disabled={isAdding || isAdded}
                      onClick={() => handleAddBooking(m)}
                      style={{
                        flexShrink: 0, padding: '5px 12px', borderRadius: 999,
                        fontSize: 11, fontWeight: 600, border: 'none',
                        cursor: isAdded ? 'default' : 'pointer',
                        background: isAdded ? '#F0FDF4' : '#0870E2',
                        color: isAdded ? '#16A34A' : '#fff',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                      {isAdding
                        ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                        : isAdded ? <><Check size={11} /> Added</> : 'Book'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* Student list */
          <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
            {loading ? (
              <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '24px 0' }}>Loading…</p>
            ) : students.length === 0 ? (
              <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '24px 0' }}>No bookings yet</p>
            ) : students.map((s, i) => {
              const st = STATUS_STYLE[s.status] ?? { label: s.status, color: '#6B7280', bg: '#F3F4F6' }
              const isMarking = markingId === s.id
              const isAttended = s.status === 'COMPLETED'
              const isCancelled = s.status === 'CANCELLED'
              return (
                <div key={s.id} className="flex items-center gap-3 px-4 py-2.5"
                  style={{ borderBottom: i < students.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                  <div className="shrink-0"><Avatar name={s.name} avatarUrl={s.avatarUrl} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, color: '#111827' }}>{s.name}</span>
                    <div className="mt-0.5">
                      <span style={{ fontSize: 10, fontWeight: 600, color: st.color, background: st.bg, padding: '2px 7px', borderRadius: 999 }}>
                        {st.label}
                      </span>
                    </div>
                  </div>
                  {isAttended ? (
                    <CheckCircle2 size={18} style={{ color: '#16A34A', flexShrink: 0 }} />
                  ) : isCancelled || s.status === 'NO_SHOW' ? null : (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => markAttended(s.id)}
                        disabled={isMarking}
                        className="px-2.5 py-1.5 rounded-lg"
                        style={{ fontSize: 11, fontWeight: 600, border: '1px solid #0870E2',
                          background: isMarking ? '#F3F4F6' : '#EFF6FF',
                          color: isMarking ? '#9CA3AF' : '#0870E2',
                          cursor: isMarking ? 'not-allowed' : 'pointer' }}>
                        {isMarking ? '…' : 'Attended'}
                      </button>
                      <button
                        onClick={() => markNoShow(s.id)}
                        disabled={isMarking}
                        className="px-2.5 py-1.5 rounded-lg"
                        style={{ fontSize: 11, fontWeight: 600, border: '1px solid #E5E7EB',
                          background: isMarking ? '#F3F4F6' : '#FEF2F2',
                          color: isMarking ? '#9CA3AF' : '#B91C1C',
                          cursor: isMarking ? 'not-allowed' : 'pointer' }}>
                        No-show
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        {!addingView && (
          <div className="px-4 py-3 shrink-0" style={{ borderTop: '1px solid #F3F4F6' }}>
            <button
              onClick={() => { setAddingView(true); setSearch(''); setAddError(null) }}
              className="w-full py-2 rounded-xl text-sm font-bold text-white cursor-pointer flex items-center justify-center gap-1.5"
              style={{ background: '#0071E3', border: 'none' }}>
              <UserPlus size={13} /> Add Student
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
