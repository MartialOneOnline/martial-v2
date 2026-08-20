'use client'

import { useState } from 'react'
import { MoreVertical, Loader2, CheckCircle, Pause, Play, XCircle, Pencil, X } from 'lucide-react'
import RowMenu from './RowMenu'

export type MembershipAction = 'activate' | 'pause' | 'resume' | 'cancel'

const ACTION_CONFIG: Record<MembershipAction, { label: string; icon: React.ElementType; color: string }> = {
  activate: { label: 'Activate',   icon: CheckCircle, color: '#16A34A' },
  pause:    { label: 'Pause',      icon: Pause,       color: '#D97706' },
  resume:   { label: 'Resume',     icon: Play,        color: '#0870E2' },
  cancel:   { label: 'Cancel',     icon: XCircle,     color: '#EF4444' },
}

export function allowedMembershipActions(status: string): MembershipAction[] {
  switch (status) {
    case 'PENDING':  return ['activate', 'cancel']
    case 'ACTIVE':   return ['pause', 'cancel']
    case 'PAUSED':   return ['resume', 'cancel']
    default:         return []
  }
}

// Small modal to correct startDate/endDate on a CASH membership directly from
// the row menu — same PATCH action:'updateDates' the student-profile pencil
// uses, just exposed here too so a wrong renewal date doesn't require
// drilling into the member's profile. CASH-only, same reasoning as there:
// Stripe/Revolut dates are subscription/webhook-driven.
function EditDatesModal({ membershipId, startDate, endDate, onClose, onSaved }: {
  membershipId: string
  startDate: string
  endDate: string | null
  onClose: () => void
  onSaved: (id: string, startDate: string, endDate: string | null) => void
}) {
  const [start, setStart] = useState(startDate.slice(0, 10))
  const [end, setEnd] = useState(endDate ? endDate.slice(0, 10) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/dashboard/memberships/${membershipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateDates', startDate: start, endDate: end || null }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error ?? 'Could not update dates'); return }
      onSaved(membershipId, data.startDate, data.endDate)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl" style={{ background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>Edit dates</p>
            <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex' }}>
              <X size={14} style={{ color: '#6B7280' }} />
            </button>
          </div>
          <div className="flex flex-col gap-3 px-5 py-4">
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Start</label>
              <input type="date" value={start} onChange={e => setStart(e.target.value)}
                style={{ width: '100%', fontSize: 13, padding: '7px 10px', borderRadius: 8, border: '1px solid #D1D5DB' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Expires</label>
              <input type="date" value={end} onChange={e => setEnd(e.target.value)}
                style={{ width: '100%', fontSize: 13, padding: '7px 10px', borderRadius: 8, border: '1px solid #D1D5DB' }} />
            </div>
            {error && <p style={{ fontSize: 12, color: '#DC2626', margin: 0 }}>{error}</p>}
          </div>
          <div className="flex gap-2 px-5 py-4" style={{ borderTop: '1px solid #F3F4F6' }}>
            <button onClick={onClose} disabled={saving}
              style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff',
                fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: '#16A34A',
                fontSize: 13, fontWeight: 600, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// Per-row action menu (Activate / Pause / Resume / Cancel) for a Membership record,
// with an optional "Ver perfil" link folded into the same dropdown so a row never
// shows two separate "..." triggers side by side. Shared between the Memberships
// plan-members view and the Payments > Subscriptions table — both operate on the
// same PATCH /api/dashboard/memberships/[id] endpoint.
// Built on the shared portal-based RowMenu so the dropdown isn't clipped by the
// `overflow-hidden` table/card wrappers both hosts use.
//
// paymentMethod/startDate/endDate are optional — pass them (from a CASH
// membership) to also offer "Edit dates" in the menu. Omit them where that
// data isn't already loaded (e.g. the plan-members view) and the option
// simply won't appear.
export default function MembershipRowActions({
  membershipId, status, onDone, profileHref, paymentMethod, startDate, endDate, onDatesUpdated,
}: {
  membershipId: string
  status: string
  onDone: (id: string, newStatus: string) => void
  profileHref?: string
  paymentMethod?: string
  startDate?: string
  endDate?: string | null
  onDatesUpdated?: (id: string, startDate: string, endDate: string | null) => void
}) {
  const [loading, setLoading] = useState<MembershipAction | null>(null)
  const [editingDates, setEditingDates] = useState(false)
  const actions = allowedMembershipActions(status)
  const canEditDates = paymentMethod === 'CASH' && startDate !== undefined && onDatesUpdated

  if (actions.length === 0 && !profileHref && !canEditDates) return null

  async function doAction(action: MembershipAction) {
    setLoading(action)
    try {
      const res = await fetch(`/api/dashboard/memberships/${membershipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error(await res.text())
      const { status: newStatus } = await res.json()
      onDone(membershipId, newStatus)
      // Notify sidebar to re-fetch pending count when PENDING status changes
      if (status === 'PENDING' || newStatus === 'PENDING') {
        window.dispatchEvent(new CustomEvent('membership-pending-changed'))
      }
    } catch (err) {
      console.error('[membership action]', err)
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      <RowMenu trigger={({ onClick }) => (
        <button
          onClick={onClick}
          style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #E5E7EB',
            background: '#fff', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          {loading
            ? <Loader2 size={13} className="animate-spin" style={{ color: '#9CA3AF' }} />
            : <MoreVertical size={13} style={{ color: '#6B7280' }} />}
        </button>
      )}>
        <div className="rounded-xl py-1 overflow-hidden"
          style={{ background: '#fff', border: '1px solid #E5E7EB',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 170 }}>
          {profileHref && (
            <a href={profileHref}
              className="w-full text-left px-4 py-2.5 flex items-center gap-2"
              style={{ fontSize: 13, fontWeight: 600, color: '#374151',
                textDecoration: 'none', display: 'block' }}>
              Ver perfil
            </a>
          )}
          {canEditDates && (
            <button onClick={() => setEditingDates(true)}
              className="w-full text-left px-4 py-2.5 flex items-center gap-2"
              style={{ background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, color: '#374151' }}>
              <Pencil size={14} />
              Edit dates
            </button>
          )}
          {actions.map(action => {
            const cfg = ACTION_CONFIG[action]
            const Icon = cfg.icon
            return (
              <button key={action} onClick={() => doAction(action)}
                className="w-full text-left px-4 py-2.5 flex items-center gap-2"
                style={{ background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, color: cfg.color }}>
                <Icon size={14} />
                {cfg.label}
              </button>
            )
          })}
        </div>
      </RowMenu>
      {editingDates && startDate !== undefined && onDatesUpdated && (
        <EditDatesModal
          membershipId={membershipId}
          startDate={startDate}
          endDate={endDate ?? null}
          onClose={() => setEditingDates(false)}
          onSaved={(id, s, e) => { setEditingDates(false); onDatesUpdated(id, s, e) }}
        />
      )}
    </>
  )
}
