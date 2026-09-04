'use client'

import { useEffect, useRef, useState } from 'react'
import { X, UserPlus, Users, Clock, Search, Check, Loader2, ArrowLeft, User, ShieldCheck, ChevronRight } from 'lucide-react'
import { matchesSearch } from '../../lib/search'

interface Student {
  id: string
  name: string
  avatarUrl: string | null
  status: string
  attendedAt?: string | null
  scheduledAt?: string
  createdAt?: string
  bookedByRole?: 'STUDENT' | 'STAFF'
  bookedByName?: string | null
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
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
  const [loadError, setLoadError] = useState(false)
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (avatarUrl && !loadError) {
    return <img src={avatarUrl} alt={name} width={42} height={42} style={{ width: 42, height: 42, objectFit: 'cover', borderRadius: '50%' }}
      onError={() => setLoadError(true)} />
  }
  return (
    <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#0870E2,#7DE7EC)', color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {initials}
    </div>
  )
}

export default function ClassCapacityPopup({ cls, date, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [students, setStudents]             = useState<Student[]>([])
  const [loading,  setLoading]              = useState(true)
  const [addingView, setAddingView]         = useState(false)
  const [detailId,   setDetailId]           = useState<string | null>(null)

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
    const startTime = cls.time.split('–')[0]
    const qs = date ? `?date=${date}&time=${startTime}` : ''
    fetch(`/api/dashboard/classes/${cls.id}/bookings${qs}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.bookings) setStudents(d.bookings); setLoading(false) })
      .catch(() => setLoading(false))
  }, [cls.id, cls.time, date])

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
    ? members.filter(m => matchesSearch(m.name, search) || matchesSearch(m.email, search))
    : members

  async function handleAddBooking(member: Member) {
    setAddingId(member.userId)
    setAddError(null)
    try {
      const res = await fetch(`/api/dashboard/classes/${cls.id}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: member.userId, date, time: cls.time.split('–')[0] }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAddError(data.error === 'Already booked' ? `${member.name} is already booked.` : data.error ?? 'Failed')
      } else {
        setAddedIds(prev => new Set([...prev, member.userId]))
        setStudents(prev => [...prev, data.booking])
        setSearch('')
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

  async function unmarkAttendance(bookingId: string) {
    setMarkingId(bookingId)
    try {
      const res = await fetch(`/api/dashboard/bookings/${bookingId}/unmark`, { method: 'PATCH' })
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

  const activeStudents = students.filter(s => s.status !== 'CANCELLED')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div ref={ref} className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ background: '#fff', maxHeight: '80vh' }}>

        {/* Class image header */}
        <div className="relative shrink-0" style={{ height: 96, background: 'linear-gradient(135deg,#0870E2,#7DE7EC)' }}>
          {cls.image && (
            <img src={cls.image} alt={cls.name} className="absolute inset-0 w-full h-full object-cover"
              onError={e => { e.currentTarget.style.display = 'none' }} />
          )}
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} />
          <div className="absolute inset-0 flex items-center justify-between px-4">
            <div>
              {(addingView || detailId) && (
                <button onClick={() => { if (detailId) setDetailId(null); else { setAddingView(false); setAddError(null) } }}
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
        {!detailId && (
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
        )}

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
        ) : detailId ? (
          /* Booking detail */
          (() => {
            const s = students.find(x => x.id === detailId)
            if (!s) return null
            const st = STATUS_STYLE[s.status] ?? { label: s.status, color: '#6B7280', bg: '#F3F4F6' }
            const isStaff = s.bookedByRole === 'STAFF'
            return (
              <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
                <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <Avatar name={s.name} avatarUrl={s.avatarUrl} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{s.name}</p>
                    <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>Booking detail</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-4 px-4 py-4">
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 4 }}>Class Name</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{cls.name}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 4 }}>Class Date</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{fmtDate(s.scheduledAt ?? date)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 4 }}>Class Time</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{cls.time}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 4 }}>Booking Time</p>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#4B5565' }}>{fmtDateTime(s.createdAt)}</p>
                  </div>
                  <div className="col-span-2" style={{ height: 1, background: '#F3F4F6' }} />
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 4 }}>Booked By</p>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700,
                      padding: '4px 9px', borderRadius: 999,
                      color: isStaff ? '#0E3A7A' : '#0A7C86',
                      background: isStaff ? '#EEF1F9' : '#E7FBFB',
                    }}>
                      {isStaff ? <ShieldCheck size={12} /> : <User size={12} />}
                      {isStaff ? 'Staff' : 'Student'}
                    </span>
                    {isStaff && s.bookedByName && (
                      <p style={{ fontSize: 10.5, color: '#9CA3AF', marginTop: 4 }}>{s.bookedByName}</p>
                    )}
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 4 }}>Status</p>
                    <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 12, fontWeight: 700, color: st.color, background: st.bg, padding: '4px 9px', borderRadius: 999 }}>
                      {st.label}
                    </span>
                  </div>
                </div>
              </div>
            )
          })()
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
              const isNoShow = s.status === 'NO_SHOW'
              const isCancelled = s.status === 'CANCELLED'
              return (
                <div key={s.id} onClick={() => setDetailId(s.id)} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer"
                  style={{ borderBottom: i < students.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                  <div className="shrink-0"><Avatar name={s.name} avatarUrl={s.avatarUrl} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, color: '#111827' }}>{s.name}</span>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span style={{ fontSize: 10, fontWeight: 600, color: st.color, background: st.bg, padding: '2px 7px', borderRadius: 999 }}>
                        {st.label}
                      </span>
                      {s.bookedByRole === 'STAFF' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: '#0E3A7A', background: '#EEF1F9', padding: '2px 7px', borderRadius: 999 }}>
                          <ShieldCheck size={10} />Staff
                        </span>
                      )}
                    </div>
                  </div>
                  {!isCancelled && (
                    <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => isAttended ? unmarkAttendance(s.id) : markAttended(s.id)}
                        disabled={isMarking}
                        title={isAttended ? 'Unmark attended' : 'Mark attended'}
                        style={{ width: 30, height: 30, borderRadius: '50%',
                          border: isAttended ? 'none' : '1px solid #D1FAE5',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: isMarking ? '#F3F4F6' : isAttended ? '#16A34A' : '#F0FDF4',
                          cursor: isMarking ? 'not-allowed' : 'pointer' }}>
                        <Check size={16} style={{ color: isAttended ? '#fff' : '#16A34A' }} />
                      </button>
                      <button
                        onClick={() => isNoShow ? unmarkAttendance(s.id) : markNoShow(s.id)}
                        disabled={isMarking}
                        title={isNoShow ? 'Unmark no-show' : 'Mark no-show'}
                        style={{ width: 30, height: 30, borderRadius: '50%',
                          border: isNoShow ? 'none' : '1px solid #E5E7EB',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: isMarking ? '#F3F4F6' : isNoShow ? '#DC2626' : '#fff',
                          cursor: isMarking ? 'not-allowed' : 'pointer' }}>
                        <X size={15} style={{ color: isNoShow ? '#fff' : '#9CA3AF' }} />
                      </button>
                    </div>
                  )}
                  <div className="shrink-0" style={{ color: '#D1D5DB' }}><ChevronRight size={15} /></div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        {!addingView && !detailId && (
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
