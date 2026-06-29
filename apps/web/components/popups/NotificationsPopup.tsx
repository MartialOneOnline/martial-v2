'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, X, Info, AlertTriangle, CheckCircle, MessageSquare, CreditCard, Users, Loader2 } from 'lucide-react'

interface Notif {
  id: string
  type: string
  title: string
  body: string
  href: string | null
  read: boolean
  createdAt: string
}

const TYPE_STYLE: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  MEMBERSHIP_REQUEST: { icon: CreditCard,    color: '#D97706', bg: '#FFFBEB' },
  PAYMENT_RECEIVED:   { icon: CheckCircle,   color: '#16A34A', bg: '#F0FDF4' },
  PAYMENT_PENDING:    { icon: CreditCard,    color: '#D97706', bg: '#FFFBEB' },
  NEW_MEMBER:         { icon: Users,         color: '#0071E3', bg: '#EFF6FF' },
  NEW_LEAD:           { icon: Users,         color: '#F97316', bg: '#FFF7ED' },
  STUDENT_INACTIVE:   { icon: AlertTriangle, color: '#D97706', bg: '#FFFBEB' },
  CLASS_FULL:         { icon: Info,          color: '#0071E3', bg: '#EFF6FF' },
  CLASS_CANCELLED:    { icon: AlertTriangle, color: '#DC2626', bg: '#FEF2F2' },
  GRADING_COMPLETED:  { icon: CheckCircle,   color: '#16A34A', bg: '#F0FDF4' },
  MEMBERSHIP_EXPIRING:{ icon: AlertTriangle, color: '#D97706', bg: '#FFFBEB' },
  default:            { icon: MessageSquare, color: '#6366F1', bg: '#EEF2FF' },
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'ahora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

interface Props {
  onClose: () => void
  onUnreadChange?: (count: number) => void
}

export default function NotificationsPopup({ onClose, onUnreadChange }: Props) {
  const ref    = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [notifs,   setNotifs]   = useState<Notif[]>([])
  const [unread,   setUnread]   = useState(0)
  const [loading,  setLoading]  = useState(true)

  const load = useCallback(() => {
    fetch('/api/dashboard/notifications?limit=20')
      .then(r => r.json())
      .then(d => {
        setNotifs(d.notifications ?? [])
        setUnread(d.unread ?? 0)
        onUnreadChange?.(d.unread ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [onUnreadChange])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const markAllRead = async () => {
    await fetch('/api/dashboard/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
    setUnread(0)
    onUnreadChange?.(0)
  }

  const markRead = async (n: Notif) => {
    if (!n.read) {
      fetch('/api/dashboard/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: n.id }) }).catch(() => {})
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
      setUnread(prev => Math.max(0, prev - 1))
      onUnreadChange?.(Math.max(0, unread - 1))
    }
    if (n.href) { router.push(n.href); onClose() }
  }

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
          {unread > 0 && (
            <button onClick={markAllRead}
              style={{ fontSize: 11, fontWeight: 600, color: '#0071E3', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCheck size={13} /> Mark all read
            </button>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ maxHeight: 380, overflowY: 'auto', scrollbarWidth: 'none' }}>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} style={{ color: '#9CA3AF' }} className="animate-spin" />
          </div>
        ) : notifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Bell size={24} style={{ color: '#D1D5DB' }} />
            <p style={{ fontSize: 13, color: '#9CA3AF' }}>No notifications yet</p>
          </div>
        ) : notifs.map((n, i) => {
          const style = TYPE_STYLE[n.type] ?? TYPE_STYLE['default']!
          const Icon  = style.icon
          return (
            <div
              key={n.id}
              onClick={() => markRead(n)}
              className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
              style={{ borderBottom: i < notifs.length - 1 ? '1px solid #F9FAFB' : 'none', opacity: n.read ? 0.6 : 1 }}
            >
              <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: style.bg }}>
                <Icon size={14} style={{ color: style.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p style={{ fontSize: 12, fontWeight: n.read ? 500 : 700, color: '#111827' }}>{n.title}</p>
                  <span style={{ fontSize: 10, color: '#9CA3AF', whiteSpace: 'nowrap' }}>{timeAgo(n.createdAt)}</span>
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
          onClick={() => { router.push('/dashboard/notifications'); onClose() }}
          style={{ width: '100%', fontSize: 12, fontWeight: 600, color: '#0071E3', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}
        >
          View all notifications →
        </button>
      </div>
    </div>
  )
}
