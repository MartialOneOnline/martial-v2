'use client'

import Link from 'next/link'

// A single class occurrence row — square photo thumbnail, name/time/availability,
// and a trailing action pill. Shared visual language with the school-side
// "upcoming classes" row in app/dashboard/DashboardClient.tsx (same thumbnail
// radius, same info hierarchy), but typed for the student's own perspective:
// availability + personal booking state, not occupancy + management actions.
// Only wired into student pages today; the `variant` prop exists so a staff
// variant can be added later without another component being invented from
// scratch, without forcing that refactor onto the dashboard now.

export type ClassRowState = 'available' | 'booked' | 'full' | 'closed' | 'cancelled'

export interface ClassRowAction {
  label: string
  onClick?: () => void
  href?: string
  disabled?: boolean
  loading?: boolean
}

interface ClassRowProps {
  photoUrl: string | null
  fallbackBackground: string
  badgeLabel: string
  name: string
  timeLabel: string
  availabilityLabel?: string | null
  state: ClassRowState
  action: ClassRowAction
  onRowClick?: () => void
}

const STATE_ACTION_STYLE: Record<ClassRowState, { bg: string; color: string }> = {
  available: { bg: '#E8F7FF', color: '#006197' },
  booked:    { bg: '#E4F7EB', color: '#1E8734' },
  full:      { bg: '#F5F5F5', color: '#9E9E9E' },
  closed:    { bg: '#FFFBEB', color: '#D97706' },
  cancelled: { bg: '#F5F5F5', color: '#9E9E9E' },
}

export default function ClassRow({ photoUrl, fallbackBackground, badgeLabel, name, timeLabel, availabilityLabel, state, action, onRowClick }: ClassRowProps) {
  const actionStyle = STATE_ACTION_STYLE[state]
  const clickableAction = state === 'available' || state === 'closed'

  return (
    <div
      onClick={onRowClick}
      className="flex items-center gap-3 py-2.5"
      style={{ cursor: onRowClick ? 'pointer' : 'default' }}
    >
      {/* Thumbnail */}
      <div
        className="relative shrink-0 rounded-2xl overflow-hidden"
        style={{ width: 84, height: 84, background: state === 'cancelled' ? '#D1D1D6' : fallbackBackground }}
      >
        {photoUrl && (
          <img
            src={photoUrl}
            alt={name}
            className={`absolute inset-0 w-full h-full object-cover ${state === 'cancelled' ? 'grayscale opacity-60' : ''}`}
          />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide truncate mb-0.5" style={{ color: '#9CA3AF', letterSpacing: '.4px' }}>
          {badgeLabel}
        </p>
        <p className="text-[15px] font-semibold leading-tight truncate mb-1" style={{ color: state === 'cancelled' ? '#9E9E9E' : '#1C1C1E' }}>
          {name}
        </p>
        <p className="text-xs truncate" style={{ color: '#6B6B70' }}>
          {timeLabel}
          {availabilityLabel && <span> · {availabilityLabel}</span>}
        </p>
      </div>

      {/* Action */}
      <div className="shrink-0">
        {action.href && !action.disabled ? (
          <Link
            href={action.href}
            prefetch={false}
            onClick={e => e.stopPropagation()}
            className="flex items-center justify-center text-xs font-semibold rounded-full whitespace-nowrap"
            style={{ background: actionStyle.bg, color: actionStyle.color, padding: '10px 14px', minHeight: 44, textDecoration: 'none' }}
          >
            {action.label}
          </Link>
        ) : clickableAction && !action.disabled ? (
          <button
            onClick={e => { e.stopPropagation(); action.onClick?.() }}
            disabled={action.loading}
            className="flex items-center justify-center text-xs font-semibold rounded-full whitespace-nowrap disabled:opacity-60"
            style={{ background: actionStyle.bg, color: actionStyle.color, padding: '10px 14px', minHeight: 44, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {action.loading
              ? <span className="inline-block w-3 h-3 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: actionStyle.color, borderTopColor: 'transparent' }} />
              : action.label}
          </button>
        ) : (
          <span
            className="flex items-center justify-center text-xs font-semibold rounded-full whitespace-nowrap"
            style={{ background: actionStyle.bg, color: actionStyle.color, padding: '10px 14px', minHeight: 44 }}
          >
            {action.label}
          </span>
        )}
      </div>
    </div>
  )
}
