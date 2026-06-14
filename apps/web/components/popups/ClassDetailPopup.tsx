'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  X, UserPlus, Users, Clock, QrCode,
  XCircle, ChevronRight, CheckCircle, Loader2,
} from 'lucide-react'

interface Booking {
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
  status: string
}

interface Props {
  cls: ClassInfo
  onClose: () => void
}

const BOOKING_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  CONFIRMED: { label: 'Confirmed', color: '#16A34A', bg: '#F0FDF4' },
  PENDING:   { label: 'Pending',   color: '#6366F1', bg: '#EEF2FF' },
  CANCELLED: { label: 'Cancelled', color: '#DC2626', bg: '#FEF2F2' },
  COMPLETED: { label: 'Attended',  color: '#6B7280', bg: '#F3F4F6' },
  NO_SHOW:   { label: 'No-show',   color: '#D97706', bg: '#FFFBEB' },
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} width={32} height={32}
      style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: '50%' }} />
  }
  return (
    <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg,#0870E2,#7DE7EC)', color: '#fff',
      fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {initials}
    </div>
  )
}

type Tab = 'bookings' | 'actions'

export default function ClassDetailPopup({ cls, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [tab,      setTab]      = useState<Tab>('bookings')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading,  setLoading]  = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [cancelled,  setCancelled]  = useState(false)

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
      .then(d => { if (d?.bookings) setBookings(d.bookings); setLoading(false) })
      .catch(() => setLoading(false))
  }, [cls.id])

  const pct = cls.enrolled / cls.cap
  const barColor = pct >= 1 ? '#DC2626' : pct > 0.7 ? '#D97706' : '#16A34A'
  const isFull = pct >= 1

  async function handleCancelClass() {
    if (!confirm(`Cancel "${cls.name}"? All bookings will be notified.`)) return
    setCancelling(true)
    await new Promise(r => setTimeout(r, 800)) // optimistic
    setCancelled(true)
    setCancelling(false)
  }

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
                {cls.enrolled} booked · {cls.cap - cls.enrolled} spots left
              </span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: barColor }}>{cls.enrolled}/{cls.cap}</span>
          </div>
          <div className="w-full h-1.5 rounded-full" style={{ background: '#F3F4F6' }}>
            <div style={{ width: `${Math.min(pct * 100, 100)}%`, height: '100%', borderRadius: 9999, background: barColor, transition: 'width 0.4s' }} />
          </div>
          {isFull && <p style={{ fontSize: 10, color: '#DC2626', fontWeight: 600, marginTop: 3 }}>Class is full</p>}
        </div>

        {/* Tabs */}
        <div className="shrink-0 flex" style={{ borderBottom: '1px solid #F3F4F6' }}>
          {(['bookings', 'actions'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: '10px 0', fontSize: 12, fontWeight: tab === t ? 700 : 500,
                color: tab === t ? '#0870E2' : '#6B7280', background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: tab === t ? '2px solid #0870E2' : '2px solid transparent', textTransform: 'capitalize' }}>
              {t === 'bookings' ? `Bookings (${cls.enrolled})` : 'Actions'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>

          {/* ── Bookings tab ── */}
          {tab === 'bookings' && (
            <>
              {loading ? (
                <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '32px 0' }}>Loading…</p>
              ) : bookings.length === 0 ? (
                <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '32px 0' }}>No bookings yet</p>
              ) : bookings.map((b, i) => {
                const st = BOOKING_STATUS[b.status] ?? { label: b.status, color: '#6B7280', bg: '#F3F4F6' }
                return (
                  <div key={b.id} className="flex items-center gap-3 px-4 py-2.5"
                    style={{ borderBottom: i < bookings.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                    <Avatar name={b.name} avatarUrl={b.avatarUrl} />
                    <span style={{ fontSize: 13, color: '#111827', flex: 1 }}>{b.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: st.color, background: st.bg, padding: '2px 8px', borderRadius: 999 }}>
                      {st.label}
                    </span>
                  </div>
                )
              })}
            </>
          )}

          {/* ── Actions tab ── */}
          {tab === 'actions' && (
            <div className="p-4 flex flex-col gap-3">

              {/* Add booking */}
              <button className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl cursor-pointer text-left"
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

              {/* QR Code */}
              <button className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl cursor-pointer text-left"
                style={{ background: '#F5F3FF', border: '1px solid #EDE9FE' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#7C3AED' }}>
                  <QrCode size={16} style={{ color: '#fff' }} />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#6D28D9' }}>QR Check-in</p>
                  <p style={{ fontSize: 11, color: '#7C3AED' }}>Show QR code for student self check-in</p>
                </div>
                <ChevronRight size={14} style={{ color: '#7C3AED', marginLeft: 'auto', flexShrink: 0 }} />
              </button>

              {/* Mark all attended */}
              <button className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl cursor-pointer text-left"
                style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#16A34A' }}>
                  <CheckCircle size={16} style={{ color: '#fff' }} />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#15803D' }}>Mark All Attended</p>
                  <p style={{ fontSize: 11, color: '#16A34A' }}>Set all confirmed bookings as completed</p>
                </div>
                <ChevronRight size={14} style={{ color: '#16A34A', marginLeft: 'auto', flexShrink: 0 }} />
              </button>

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
