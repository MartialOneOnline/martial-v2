'use client'

import { useEffect, useRef } from 'react'
import { Bell, CheckCheck, X, Info, AlertTriangle, CheckCircle, MessageSquare } from 'lucide-react'

interface Notification {
  id: number
  type: 'info' | 'success' | 'warning' | 'message'
  title: string
  body: string
  time: string
  read: boolean
}

const NOTIFICATIONS: Notification[] = [
  { id: 1, type: 'warning',  title: 'Low attendance alert',        body: '12 students haven\'t attended in 3+ weeks.',          time: '2m ago',   read: false },
  { id: 2, type: 'success',  title: 'Payment received',            body: 'Fernanda Neves paid €65 for June membership.',        time: '18m ago',  read: false },
  { id: 3, type: 'info',     title: 'Class almost full',           body: 'BJJ Advanced is at 93% capacity today.',              time: '1h ago',   read: false },
  { id: 4, type: 'message',  title: 'New message from student',    body: 'Rafael Gonzalez: "Can I join the Friday No-Gi?"',     time: '3h ago',   read: true  },
  { id: 5, type: 'success',  title: 'Grading completed',           body: '4 students passed their blue belt grading.',          time: '1d ago',   read: true  },
  { id: 6, type: 'info',     title: 'New lead registered',         body: 'A new trial student signed up via your website.',     time: '2d ago',   read: true  },
]

const TYPE_STYLE = {
  info:    { icon: Info,          color: '#0071E3', bg: '#EFF6FF' },
  success: { icon: CheckCircle,   color: '#16A34A', bg: '#F0FDF4' },
  warning: { icon: AlertTriangle, color: '#D97706', bg: '#FFFBEB' },
  message: { icon: MessageSquare, color: '#6366F1', bg: '#EEF2FF' },
}

interface Props {
  onClose: () => void
}

export default function NotificationsPopup({ onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const unread = NOTIFICATIONS.filter(n => !n.read).length

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-[360px] rounded-2xl shadow-2xl z-50 overflow-hidden"
      style={{ background: '#fff', border: '1px solid #E5E7EB' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '1px solid #F3F4F6' }}>
        <div className="flex items-center gap-2">
          <Bell size={15} style={{ color: '#111827' }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Notifications</span>
          {unread > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: '#DC2626', borderRadius: 999, padding: '1px 7px' }}>
              {unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            style={{ fontSize: 11, fontWeight: 600, color: '#0071E3', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <CheckCheck size={13} /> Mark all read
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ maxHeight: 380, overflowY: 'auto', scrollbarWidth: 'none' }}>
        {NOTIFICATIONS.map((n, i) => {
          const { icon: Icon, color, bg } = TYPE_STYLE[n.type]
          return (
            <div
              key={n.id}
              className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
              style={{ borderBottom: i < NOTIFICATIONS.length - 1 ? '1px solid #F9FAFB' : 'none', opacity: n.read ? 0.6 : 1 }}
            >
              <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                <Icon size={14} style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p style={{ fontSize: 12, fontWeight: n.read ? 500 : 700, color: '#111827' }}>{n.title}</p>
                  <span style={{ fontSize: 10, color: '#9CA3AF', whiteSpace: 'nowrap' }}>{n.time}</span>
                </div>
                <p style={{ fontSize: 11, color: '#6B7280', marginTop: 2, lineHeight: 1.4 }}>{n.body}</p>
              </div>
              {!n.read && (
                <div className="shrink-0 w-1.5 h-1.5 rounded-full mt-1.5" style={{ background: '#0071E3' }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
        <button
          style={{ width: '100%', fontSize: 12, fontWeight: 600, color: '#0071E3', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}
        >
          View all notifications →
        </button>
      </div>
    </div>
  )
}
