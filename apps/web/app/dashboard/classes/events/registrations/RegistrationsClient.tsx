'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Menu, Search, Download, Check, Clock, XCircle, CheckCircle2, RefreshCw,
  ChevronLeft, ChevronRight, Mail, MessageCircle, LayoutList,
} from 'lucide-react'
import { useDashboard } from '../../../../../components/DashboardShell'
import { adminFetch } from '../../../../../lib/api/adminFetch'
import { fmtPrice } from '../../../../../lib/format'

type RegStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'
type FilterTab = 'ALL' | RegStatus

interface RegistrationRow {
  id: string
  userName: string
  userEmail: string | null
  userPhone: string | null
  eventId: string
  eventTitle: string
  eventStartAt: string
  ticketName: string
  quantity: number
  status: RegStatus
  paymentMethod: string
  amountPaid: number | null
  currency: string
  createdAt: string
  checkedIn: boolean
  checkedInAt: string | null
}

interface StatusCounts { PENDING: number; CONFIRMED: number; CANCELLED: number; COMPLETED: number; NO_SHOW: number }

interface EventOption { id: string; title: string; startAt: string }

const STATUS_MAP: Record<RegStatus, { bg: string; color: string; border: string; icon: React.ElementType; label: string }> = {
  PENDING:   { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A', icon: Clock,        label: 'Pending'   },
  CONFIRMED: { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0', icon: Check,        label: 'Confirmed' },
  CANCELLED: { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB', icon: XCircle,      label: 'Cancelled' },
  COMPLETED: { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', icon: CheckCircle2, label: 'Completed' },
  NO_SHOW:   { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA', icon: XCircle,      label: 'No show'   },
}

const PAGE_SIZE = 20

function getPaginationPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function RegistrationsClient() {
  const { setMenuOpen } = useDashboard()
  const searchParams = useSearchParams()

  const [registrations, setRegistrations] = useState<RegistrationRow[]>([])
  const [total,         setTotal]         = useState(0)
  const [countByStatus, setCountByStatus] = useState<StatusCounts>({ PENDING: 0, CONFIRMED: 0, CANCELLED: 0, COMPLETED: 0, NO_SHOW: 0 })
  const [loading,       setLoading]       = useState(true)
  const [updatingId,    setUpdatingId]    = useState<string | null>(null)

  const [events, setEvents] = useState<EventOption[]>([])
  const [eventId, setEventId] = useState(searchParams.get('event') ?? '')
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    adminFetch('/api/dashboard/events').then(r => r.json()).then(d =>
      setEvents((d.events ?? []).map((e: { id: string; title: string; startAt: string }) => ({ id: e.id, title: e.title, startAt: e.startAt })))
    )
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      ...(eventId ? { eventId } : {}),
      ...(activeFilter !== 'ALL' ? { status: activeFilter } : {}),
      ...(search ? { search } : {}),
    })
    const res = await adminFetch(`/api/dashboard/events/registrations?${params}`)
    if (res.ok) {
      const data = await res.json()
      setRegistrations(data.registrations ?? [])
      setTotal(data.total ?? 0)
      const cs = data.countByStatus ?? {}
      setCountByStatus({
        PENDING: cs.PENDING ?? 0, CONFIRMED: cs.CONFIRMED ?? 0, CANCELLED: cs.CANCELLED ?? 0,
        COMPLETED: cs.COMPLETED ?? 0, NO_SHOW: cs.NO_SHOW ?? 0,
      })
    }
    setLoading(false)
  }, [page, eventId, activeFilter, search])

  useEffect(() => { load() }, [load])

  async function updateStatus(reg: RegistrationRow, status: 'CONFIRMED' | 'CANCELLED') {
    setUpdatingId(reg.id)
    try {
      const res = await adminFetch(`/api/dashboard/events/${reg.eventId}/bookings/${reg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) setRegistrations(prev => prev.map(r => r.id === reg.id ? { ...r, status } : r))
    } finally {
      setUpdatingId(null)
    }
  }

  async function deleteRegistration(reg: RegistrationRow) {
    setUpdatingId(reg.id)
    try {
      const res = await adminFetch(`/api/dashboard/events/${reg.eventId}/bookings/${reg.id}`, { method: 'DELETE' })
      if (res.ok) { setRegistrations(prev => prev.filter(r => r.id !== reg.id)); setTotal(prev => prev - 1) }
    } finally {
      setUpdatingId(null)
    }
  }

  const totalCount = Object.values(countByStatus).reduce((a, b) => a + b, 0)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const pages = getPaginationPages(page, totalPages)

  const STATUS_FILTERS: { id: FilterTab; label: string; count: number }[] = [
    { id: 'ALL',       label: 'All',       count: totalCount },
    { id: 'PENDING',   label: 'Pending',   count: countByStatus.PENDING },
    { id: 'CONFIRMED', label: 'Confirmed', count: countByStatus.CONFIRMED },
    { id: 'CANCELLED', label: 'Cancelled', count: countByStatus.CANCELLED },
    { id: 'NO_SHOW',   label: 'No show',   count: countByStatus.NO_SHOW },
  ]

  const handleExport = () => {
    const headers = ['Attendee', 'Email', 'Phone', 'Event', 'Ticket', 'Quantity', 'Method', 'Amount', 'Currency', 'Date', 'Status', 'Checked in']
    const rows = registrations.map(r => [
      r.userName, r.userEmail ?? '', r.userPhone ?? '', r.eventTitle, r.ticketName, String(r.quantity),
      r.paymentMethod, r.amountPaid !== null ? String(r.amountPaid) : '', r.currency,
      new Date(r.createdAt).toLocaleDateString('en-GB'), r.status, r.checkedIn ? 'Yes' : 'No',
    ])
    const csv = [headers, ...rows].map(row => row.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `registrations-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  }

  return (
    <main style={{ flex: 1, minWidth: 0, width: '100%', overflow: 'auto' }}>

      {/* Topbar */}
      <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20"
        style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
        <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(true)}>
          <Menu size={16} style={{ color: '#374151' }} />
        </button>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 max-w-xs"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
          <Search size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
          <input type="text" placeholder="Search attendee name or email…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', width: '100%' }} />
        </div>
        <div className="flex-1" />
        <button onClick={handleExport} className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer"
          style={{ background: '#fff', border: '1px solid #E5E7EB', color: '#374151', fontSize: 13, fontWeight: 500 }}>
          <Download size={14} /> Export
        </button>
      </div>

      <div className="px-4 md:px-8 py-6 flex flex-col gap-5">

        {/* Title + total */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>
              Registrations
            </h1>
            <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>Everyone registered across your events</p>
          </div>
          <div className="rounded-2xl px-5 py-3" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
            <p style={{ fontSize: 11, fontWeight: 600, marginBottom: 2, color: '#16A34A' }}>Confirmed</p>
            <p style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: '#16A34A' }}>
              {loading ? '—' : countByStatus.CONFIRMED}
            </p>
          </div>
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-2 flex-wrap">

          {/* Event selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
            <LayoutList size={12} style={{ color: '#6B7280' }} />
            <select value={eventId} onChange={e => { setEventId(e.target.value); setPage(1) }}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12, color: '#374151', cursor: 'pointer', maxWidth: 220 }}>
              <option value="">All events</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.title} — {fmtDate(ev.startAt)}</option>
              ))}
            </select>
          </div>

          <div style={{ width: 1, height: 20, background: '#E5E7EB', flexShrink: 0 }} />

          {/* Status pills */}
          {STATUS_FILTERS.map(f => {
            const isOn = activeFilter === f.id
            const sc = f.id !== 'ALL' ? STATUS_MAP[f.id as RegStatus] : null
            return (
              <button key={f.id} onClick={() => { setActiveFilter(f.id); setPage(1) }}
                className="cursor-pointer"
                style={{ fontSize: 12, fontWeight: isOn ? 600 : 400, padding: '5px 12px', borderRadius: 8,
                  background: isOn ? (sc?.bg ?? '#111827') : '#fff',
                  color: isOn ? (sc?.color ?? '#fff') : '#6B7280',
                  border: isOn ? `1.5px solid ${sc?.border ?? '#111827'}` : '1.5px solid #E5E7EB' }}>
                {f.label}{' '}<span style={{ opacity: 0.65, fontSize: 11 }}>{f.count}</span>
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
                  { label: 'Attendee', cls: '' },
                  { label: 'Event',    cls: 'hidden md:table-cell' },
                  { label: 'Ticket',   cls: 'hidden sm:table-cell' },
                  { label: 'Amount',   cls: '' },
                  { label: 'Status',   cls: '' },
                  { label: '',         cls: '' },
                ].map((h, i) => (
                  <th key={i} className={`px-5 py-3 text-left ${h.cls}`}
                    style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center" style={{ fontSize: 13, color: '#9CA3AF' }}>Loading…</td></tr>
              ) : registrations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <RefreshCw size={28} style={{ color: '#E5E7EB', margin: '0 auto 10px' }} />
                    <p style={{ fontSize: 13, color: '#9CA3AF' }}>No registrations found</p>
                  </td>
                </tr>
              ) : registrations.map((r, idx) => {
                const sc = STATUS_MAP[r.status] ?? STATUS_MAP.PENDING
                const StatusIcon = sc.icon
                const canConfirm = r.status === 'PENDING' && r.paymentMethod === 'CASH'
                const canCancel  = r.status === 'PENDING' || r.status === 'CONFIRMED'
                const canDelete  = r.status === 'CANCELLED'
                return (
                  <tr key={r.id} style={{ borderBottom: idx < registrations.length - 1 ? '1px solid #F9FAFB' : 'none' }}
                    className="hover:bg-[#FAFAFA]">

                    <td className="px-5 py-3">
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{r.userName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {r.userEmail && (
                          <a href={`mailto:${r.userEmail}`} className="flex items-center gap-1 hover:underline"
                            style={{ fontSize: 11, color: '#9CA3AF' }}>
                            <Mail size={10} />{r.userEmail}
                          </a>
                        )}
                        {r.userPhone && (
                          <a href={`https://wa.me/${r.userPhone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:underline" style={{ fontSize: 11, color: '#16A34A' }}>
                            <MessageCircle size={10} />WhatsApp
                          </a>
                        )}
                      </div>
                    </td>

                    <td className="hidden md:table-cell px-5 py-3">
                      <p style={{ fontSize: 13, color: '#374151' }}>{r.eventTitle}</p>
                      <p style={{ fontSize: 11, color: '#9CA3AF' }}>{fmtDate(r.eventStartAt)}</p>
                    </td>

                    <td className="hidden sm:table-cell px-5 py-3">
                      <span style={{ fontSize: 13, color: '#374151' }}>{r.ticketName} × {r.quantity}</span>
                    </td>

                    <td className="px-5 py-3">
                      <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em', color: '#111827' }}>
                        {r.amountPaid !== null ? fmtPrice(r.amountPaid, r.currency) : '—'}
                      </span>
                    </td>

                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="inline-flex items-center gap-1.5"
                          style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
                            background: sc.bg, color: sc.color, border: '1px solid ' + sc.border, whiteSpace: 'nowrap' }}>
                          <StatusIcon size={10} />{sc.label}
                        </span>
                        {r.checkedIn && (
                          <span className="flex items-center gap-1" style={{ fontSize: 10, fontWeight: 600, color: '#15803D' }}>
                            <CheckCircle2 size={10} /> Checked in
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        {canConfirm && (
                          <button onClick={() => updateStatus(r, 'CONFIRMED')} disabled={updatingId === r.id}
                            className="cursor-pointer"
                            style={{ fontSize: 11, fontWeight: 600, color: '#fff', background: '#16A34A', border: 'none', borderRadius: 8, padding: '5px 10px' }}>
                            Mark as paid
                          </button>
                        )}
                        {canCancel && (
                          <button onClick={() => updateStatus(r, 'CANCELLED')} disabled={updatingId === r.id}
                            className="cursor-pointer"
                            style={{ fontSize: 11, fontWeight: 600, color: '#B91C1C', background: '#FEF2F2', border: 'none', borderRadius: 8, padding: '5px 10px' }}>
                            Cancel
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => deleteRegistration(r)} disabled={updatingId === r.id}
                            className="cursor-pointer"
                            style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', background: '#F3F4F6', border: 'none', borderRadius: 8, padding: '5px 10px' }}>
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
              <p style={{ fontSize: 13, color: '#6B7280' }}>
                Showing <span style={{ fontWeight: 600, color: '#111827' }}>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}</span>{' '}
                of <span style={{ fontWeight: 600, color: '#111827' }}>{total}</span>
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ fontSize: 13, border: '1px solid #E5E7EB', background: '#fff',
                    color: page === 1 ? '#D1D5DB' : '#374151', cursor: page === 1 ? 'not-allowed' : 'pointer', borderRadius: 8, padding: '6px 10px' }}>
                  <ChevronLeft size={14} />
                </button>
                {pages.map((p, i) =>
                  p === '...' ? <span key={'e' + i} style={{ fontSize: 13, color: '#9CA3AF', padding: '0 4px' }}>…</span> : (
                    <button key={p} onClick={() => setPage(p as number)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer"
                      style={{ fontSize: 13, fontWeight: p === page ? 600 : 400, border: 'none',
                        background: p === page ? '#F3F4F6' : 'transparent', color: p === page ? '#111827' : '#6B7280' }}>
                      {p}
                    </button>
                  )
                )}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ fontSize: 13, border: '1px solid #E5E7EB', background: '#fff',
                    color: page === totalPages ? '#D1D5DB' : '#374151', cursor: page === totalPages ? 'not-allowed' : 'pointer', borderRadius: 8, padding: '6px 10px' }}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
