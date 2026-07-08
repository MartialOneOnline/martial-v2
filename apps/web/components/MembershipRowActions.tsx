'use client'

import { useState } from 'react'
import { MoreVertical, Loader2, CheckCircle, Pause, Play, XCircle } from 'lucide-react'
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

// Per-row action menu (Activate / Pause / Resume / Cancel) for a Membership record.
// Shared between the Memberships plan-members view and the Payments > Subscriptions
// table — both operate on the same PATCH /api/dashboard/memberships/[id] endpoint.
// Built on the shared portal-based RowMenu so the dropdown isn't clipped by the
// `overflow-hidden` table/card wrappers both hosts use.
export default function MembershipRowActions({
  membershipId, status, onDone,
}: { membershipId: string; status: string; onDone: (id: string, newStatus: string) => void }) {
  const [loading, setLoading] = useState<MembershipAction | null>(null)
  const actions = allowedMembershipActions(status)

  if (actions.length === 0) return null

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
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 148 }}>
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
  )
}
