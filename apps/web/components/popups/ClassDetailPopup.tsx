'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import {
  X, UserPlus, Users, Clock, QrCode,
  XCircle, ChevronRight, CheckCircle, CheckCircle2, Loader2,
  Search, ArrowLeft, Check,
} from 'lucide-react'

interface Booking {
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
  status: string
}

interface Props {
  cls: ClassInfo
  date?: string  // YYYY-MM-DD
  onClose: () => void
}

const BOOKING_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  CONFIRMED: { label: 'Confirmed', color: '#16A34A', bg: '#F0FDF4' },
  PENDING:   { label: 'Pending',   color: '#6366F1', bg: '#EEF2FF' },
  CANCELLED: { label: 'Cancelled', color: '#DC2626', bg: '#FEF2F2' },
  COMPLETED: { label: 'Attended',  color: '#6B7280', bg: '#F3F4F6' },
  NO_SHOW:   { label: 'No-show',   color: '#D97706', bg: '#FFFBEB' },
}

function Avatar({ name, avatarUrl, size = 32 }: { name: string; avatarUrl: string | null; size?: number }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} width={size} height={size}
      style={{ width: size, height: size, objectFit: 'cover', borderRadius: '50%', flexShrink: 0 }} />
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg,#0870E2,#7DE7EC)', color: '#fff',
      fontSize: size * 0.34, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {initials}
    </div>
  )
}

type Tab = 'bookings' | 'actions'
type SubPanel = 'add-booking' | 'qr' | null

export default function ClassDetailPopup({ cls, date, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [tab,        setTab]        = useState<Tab>('bookings')
  const [subPanel,   setSubPanel]   = useState<SubPanel>(null)
  const [bookings,   setBookings]   = useState<Booking[]>([])
  const [loading,    setLoading]    = useState(true)

  // Add booking state
  const [members,       setMembers]       = useState<Member[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [search,        setSearch]        = useState('')
  const [addingId,      setAddingId]      = useState<string | null>(null)
  const [addedIds,      setAddedIds]      = useState<Set<string>>(new Set())
  const [addError,      setAddError]      = useState<string | null>(null)

  // Mark all attended state
  const [markingAttended,  setMarkingAttended]  = useState(false)
  const [markedAttended,   setMarkedAttended]   = useState(false)

  // Per-student attendance state
  const [markingId, setMarkingId] = useState<string | null>(null)

  // Cancel state
  const [cancelling, setCancelling] = useState(false)
  const [cancelled,  setCancelled]  = useState(false)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  // Load bookings
  useEffect(() => {
    if (!cls.id) { setLoading(false); return }
    const qs = date ? `?date=${date}` : ''
    fetch(`/api/dashboard/classes/${cls.id}/bookings${qs}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.bookings) setBookings(d.bookings); setLoading(false) })
      .catch(() => setLoading(false))
  }, [cls.id, date])

  // Load members when add-booking panel opens
  useEffect(() => {
    if (subPanel !== 'add-booking' || members.length > 0) return
    setMembersLoading(true)
    fetch('/api/dashboard/members')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (Array.isArray(d)) setMembers(d); setMembersLoading(false) })
      .catch(() => setMembersLoading(false))
  }, [subPanel])

  const pct = cls.enrolled / cls.cap
  const barColor = pct >= 1 ? '#DC2626' : pct > 0.7 ? '#D97706' : '#16A34A'
  const isFull = pct >= 1

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
        setBookings(prev => [...prev, data.booking])
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
        setBookings(prev => prev.map(b =>
          b.id === bookingId ? { ...b, status: data.status, attendedAt: data.attendedAt } : b
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
        setBookings(prev => prev.map(b =>
          b.id === bookingId ? { ...b, status: data.status } : b
        ))
      }
    } finally {
      setMarkingId(null)
    }
  }

  async function handleMarkAttended() {
    if (!confirm('Mark all confirmed students as attended?')) return
    setMarkingAttended(true)
    try {
      await fetch(`/api/dashboard/classes/${cls.id}/mark-attended`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      })
      setMarkedAttended(true)
      setBookings(prev => prev.map(b => b.status === 'CONFIRMED' ? { ...b, status: 'COMPLETED' } : b))
    } finally {
      setMarkingAttended(false)
    }
  }

  async function handleCancelClass() {
    if (!confirm(`Cancel "${cls.name}"? All booked students will be notified.`)) return
    setCancelling(true)
    try {
      await fetch(`/api/dashboard/classes/${cls.id}/cancel-occurrence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      })
      setCancelled(true)
      setBookings(prev => prev.map(b => ({ ...b, status: 'CANCELLED' })))
    } finally {
      setCancelling(false)
    }
  }

  const qrUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/checkin/${cls.id}${date ? `?date=${date}` : ''}`
    : `/checkin/${cls.id}`

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div ref={ref}
        className="w-full md:max-w-md rounded-t-3xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ background: '#fff', maxHeight: '92vh' }}>

        {/* Header image */}
        <div className="relative shrink-0" style={{ height: 110 }}>
          <Image src={cls.image ?? '/martial-logo.png'} alt={cls.name} fill className="object-cover" />
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} />
          <div className="absolute inset-0 flex items-end justify-between px-4 pb-3">
            <div>
              {subPanel && (
                <button onClick={() => { setSubPanel(null); setAddError(null) }}
                  style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ArrowLeft size={13} />
                  <span style={{ fontSize: 11, opacity: 0.8 }}>Back</span>
                </button>
              )}
              <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{cls.name}</p>
              <div className="flex items-center gap-3 mt-1">
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Clock size={10} />{cls.time}
                </span>
                {cls.instructor && (
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>· {cls.instructor}</span>
                )}
              </div>
            </div>
            <button onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 10, padding: 7, cursor: 'pointer', color: '#fff', flexShrink: 0 }}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Capacity bar */}
        <div className="shrink-0 px-4 py-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Users size={13} style={{ color: '#6B7280' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                {bookings.filter(b => b.status !== 'CANCELLED').length} booked · {cls.cap - bookings.filter(b => b.status !== 'CANCELLED').length} spots left
              </span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: barColor }}>
              {bookings.filter(b => b.status !== 'CANCELLED').length}/{cls.cap}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full" style={{ background: '#F3F4F6' }}>
            <div style={{ width: `${Math.min((bookings.filter(b => b.status !== 'CANCELLED').length / cls.cap) * 100, 100)}%`, height: '100%', borderRadius: 9999, background: barColor, transition: 'width 0.4s' }} />
          </div>
          {isFull && <p style={{ fontSize: 10, color: '#DC2626', fontWeight: 600, marginTop: 3 }}>Class is full</p>}
        </div>

        {/* Tabs — hide when sub-panel is open */}
        {!subPanel && (
          <div className="shrink-0 flex" style={{ borderBottom: '1px solid #F3F4F6' }}>
            {(['bookings', 'actions'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ flex: 1, padding: '10px 0', fontSize: 12, fontWeight: tab === t ? 700 : 500,
                  color: tab === t ? '#0870E2' : '#6B7280', background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: tab === t ? '2px solid #0870E2' : '2px solid transparent', textTransform: 'capitalize' }}>
                {t === 'bookings' ? `Bookings (${bookings.filter(b => b.status !== 'CANCELLED').length})` : 'Actions'}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>

          {/* ── QR Sub-panel ── */}
          {subPanel === 'qr' && (
            <div className="flex flex-col items-center gap-5 p-6">
              <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', textAlign: 'center' }}>QR Check-in</p>
              <p style={{ fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: -12 }}>
                Students scan this to check themselves in for {cls.name}
              </p>
              <div className="p-4 rounded-2xl" style={{ background: '#fff', boxShadow: '0 0 0 1px #E5E7EB, 0 4px 24px rgba(0,0,0,0.08)' }}>
                <QRCodeSVG value={qrUrl} size={200} level="H" />
              </div>
              <p style={{ fontSize: 10, color: '#9CA3AF', textAlign: 'center', wordBreak: 'break-all', maxWidth: 260 }}>{qrUrl}</p>
            </div>
          )}

          {/* ── Add Booking Sub-panel ── */}
          {subPanel === 'add-booking' && (
            <div className="flex flex-col" style={{ height: '100%' }}>
              {/* Search */}
              <div className="px-4 py-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
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
                {addError && (
                  <p style={{ fontSize: 11, color: '#DC2626', marginTop: 6 }}>{addError}</p>
                )}
              </div>

              {/* Members list */}
              <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
                {membersLoading ? (
                  <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '32px 0' }}>Loading students…</p>
                ) : filteredMembers.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '32px 0' }}>No students found</p>
                ) : filteredMembers.map((m, i) => {
                  const isAdded  = addedIds.has(m.userId)
                  const isAdding = addingId === m.userId
                  return (
                    <div key={m.userId}
                      className="flex items-center gap-3 px-4 py-2.5"
                      style={{ borderBottom: i < filteredMembers.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                      <Avatar name={m.name} avatarUrl={m.avatarUrl} size={34} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</p>
                        <p style={{ fontSize: 11, color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</p>
                      </div>
                      <button
                        disabled={isAdding || isAdded}
                        onClick={() => handleAddBooking(m)}
                        style={{
                          flexShrink: 0,
                          padding: '5px 12px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 600,
                          border: 'none',
                          cursor: isAdded ? 'default' : 'pointer',
                          background: isAdded ? '#F0FDF4' : '#0870E2',
                          color: isAdded ? '#16A34A' : '#fff',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                        {isAdding
                          ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                          : isAdded
                            ? <><Check size={11} /> Added</>
                            : 'Book'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Bookings tab ── */}
          {!subPanel && tab === 'bookings' && (
            <>
              {loading ? (
                <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '32px 0' }}>Loading…</p>
              ) : bookings.length === 0 ? (
                <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '32px 0' }}>No bookings yet</p>
              ) : bookings.map((b, i) => {
                const st = BOOKING_STATUS[b.status] ?? { label: b.status, color: '#6B7280', bg: '#F3F4F6' }
                const isMarking = markingId === b.id
                const isAttended = b.status === 'COMPLETED'
                const isCancelled = b.status === 'CANCELLED'
                return (
                  <div key={b.id} className="flex items-center gap-3 px-4 py-2.5"
                    style={{ borderBottom: i < bookings.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                    <Avatar name={b.name} avatarUrl={b.avatarUrl} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 13, color: '#111827' }}>{b.name}</span>
                      <div className="mt-0.5">
                        <span style={{ fontSize: 10, fontWeight: 600, color: st.color, background: st.bg, padding: '2px 8px', borderRadius: 999 }}>
                          {st.label}
                        </span>
                      </div>
                    </div>
                    {isAttended ? (
                      <CheckCircle2 size={18} style={{ color: '#16A34A', flexShrink: 0 }} />
                    ) : isCancelled || b.status === 'NO_SHOW' ? null : (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => markAttended(b.id)}
                          disabled={isMarking}
                          className="px-2.5 py-1.5 rounded-lg"
                          style={{ fontSize: 11, fontWeight: 600, border: '1px solid #0870E2',
                            background: isMarking ? '#F3F4F6' : '#EFF6FF',
                            color: isMarking ? '#9CA3AF' : '#0870E2',
                            cursor: isMarking ? 'not-allowed' : 'pointer' }}>
                          {isMarking ? '…' : 'Attended'}
                        </button>
                        <button
                          onClick={() => markNoShow(b.id)}
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
            </>
          )}

          {/* ── Actions tab ── */}
          {!subPanel && tab === 'actions' && (
            <div className="p-4 flex flex-col gap-3">

              {/* Add booking */}
              <button onClick={() => { setSubPanel('add-booking'); setSearch(''); setAddError(null) }}
                className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl cursor-pointer text-left"
                style={{ background: '#EFF6FF', border: '1px solid #DBEAFE' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#0870E2' }}>
                  <UserPlus size={16} style={{ color: '#fff' }} />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1D4ED8' }}>Add Booking</p>
                  <p style={{ fontSize: 11, color: '#3B82F6' }}>Manually add a student to this class</p>
                </div>
                <ChevronRight size={14} style={{ color: '#3B82F6', marginLeft: 'auto', flexShrink: 0 }} />
              </button>

              {/* QR Check-in scanner */}
              <Link
                href={`/checkin/${cls.id}${date ? `?date=${date}` : ''}`}
                className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl text-left"
                style={{ background: '#F5F3FF', border: '1px solid #EDE9FE', textDecoration: 'none' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#7C3AED' }}>
                  <QrCode size={16} style={{ color: '#fff' }} />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#6D28D9' }}>QR Check-in</p>
                  <p style={{ fontSize: 11, color: '#7C3AED' }}>Scan student QR codes to check in</p>
                </div>
                <ChevronRight size={14} style={{ color: '#7C3AED', marginLeft: 'auto', flexShrink: 0 }} />
              </Link>

              {/* Mark all attended */}
              {markedAttended ? (
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  <CheckCircle size={15} style={{ color: '#16A34A' }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#15803D' }}>All marked as attended</p>
                </div>
              ) : (
                <button onClick={handleMarkAttended} disabled={markingAttended}
                  className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl cursor-pointer text-left"
                  style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', opacity: markingAttended ? 0.7 : 1 }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#16A34A' }}>
                    {markingAttended
                      ? <Loader2 size={16} style={{ color: '#fff', animation: 'spin 1s linear infinite' }} />
                      : <CheckCircle size={16} style={{ color: '#fff' }} />}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#15803D' }}>Mark All Attended</p>
                    <p style={{ fontSize: 11, color: '#16A34A' }}>Set all confirmed bookings as completed</p>
                  </div>
                  <ChevronRight size={14} style={{ color: '#16A34A', marginLeft: 'auto', flexShrink: 0 }} />
                </button>
              )}

              {/* View full class page */}
              <Link href={`/dashboard/classes/${cls.id}`}
                className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl text-left"
                style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', textDecoration: 'none' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#374151' }}>
                  <ChevronRight size={16} style={{ color: '#fff' }} />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>View Class Page</p>
                  <p style={{ fontSize: 11, color: '#6B7280' }}>Full details, schedule & settings</p>
                </div>
                <ChevronRight size={14} style={{ color: '#9CA3AF', marginLeft: 'auto', flexShrink: 0 }} />
              </Link>

              {/* Cancel class — destructive */}
              {cancelled ? (
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                  <XCircle size={15} style={{ color: '#DC2626' }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#DC2626' }}>Class cancelled</p>
                </div>
              ) : (
                <button onClick={handleCancelClass} disabled={cancelling}
                  className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl cursor-pointer text-left"
                  style={{ background: '#FEF2F2', border: '1px solid #FECACA', opacity: cancelling ? 0.7 : 1 }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#DC2626' }}>
                    {cancelling
                      ? <Loader2 size={16} style={{ color: '#fff', animation: 'spin 1s linear infinite' }} />
                      : <XCircle size={16} style={{ color: '#fff' }} />}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#DC2626' }}>Cancel Class</p>
                    <p style={{ fontSize: 11, color: '#EF4444' }}>Notify all booked students</p>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
