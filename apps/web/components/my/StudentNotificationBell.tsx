'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, X, Loader2 } from 'lucide-react'
import { useT } from '../../lib/i18n/LanguageContext'
import { myFetch } from '../../lib/api/myFetch'

interface Notif {
  id: string
  type: string
  title: string
  body: string
  href: string | null
  read: boolean
  createdAt: string
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

// Student-side counterpart to components/NotificationBell.tsx — same bell +
// popup pattern, pointed at /api/my/notifications instead of the staff-only
// /api/dashboard/notifications, and restyled to the brand blue (#0870E2)
// used elsewhere in this redesign rather than the dashboard's #0071E3.
export default function StudentNotificationBell() {
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    myFetch('/api/my/notifications?limit=1')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setUnread(d.unread ?? 0) })
      .catch(() => {})
  }, [])

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Notifications"
        className="relative flex items-center justify-center rounded-full"
        style={{ width: 36, height: 36, background: open ? 'rgba(8,112,226,.10)' : 'transparent' }}
      >
        <Bell className="w-[19px] h-[19px]" strokeWidth={1.75} style={{ color: '#1C1C1E' }} />
        {unread > 0 && (
          <span
            className="absolute flex items-center justify-center rounded-full"
            style={{ top: 4, right: 4, minWidth: 15, height: 15, padding: '0 3px', background: '#EF4444', fontSize: 9, fontWeight: 700, color: '#fff', lineHeight: 1 }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && <NotificationPopup onClose={() => setOpen(false)} onUnreadChange={setUnread} />}
    </div>
  )
}

function NotificationPopup({ onClose, onUnreadChange }: { onClose: () => void; onUnreadChange: (n: number) => void }) {
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    myFetch('/api/my/notifications?limit=20')
      .then(r => r.json())
      .then(d => {
        setNotifs(d.notifications ?? [])
        setUnread(d.unread ?? 0)
        onUnreadChange(d.unread ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [onUnreadChange])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const markAllRead = async () => {
    await myFetch('/api/my/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
    setUnread(0)
    onUnreadChange(0)
  }

  const markRead = (n: Notif) => {
    if (!n.read) {
      myFetch('/api/my/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: n.id }) }).catch(() => {})
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
      setUnread(prev => Math.max(0, prev - 1))
      onUnreadChange(Math.max(0, unread - 1))
    }
    if (n.href) { router.push(n.href); onClose() }
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 rounded-2xl overflow-hidden z-50"
      style={{ width: 320, maxWidth: 'calc(100vw - 32px)', background: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,.14), 0 0 0 1px rgba(0,0,0,.04)' }}
    >
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '0.5px solid rgba(60,60,67,.12)' }}>
        <span className="text-sm font-semibold" style={{ color: '#1C1C1E' }}>{t.my.notifications}</span>
        <div className="flex items-center gap-3">
          {unread > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-1 text-xs font-medium" style={{ color: '#0870E2', background: 'none', border: 'none', cursor: 'pointer' }}>
              <CheckCheck className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div style={{ maxHeight: 360, overflowY: 'auto' }}>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#9CA3AF' }} />
          </div>
        ) : notifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Bell className="w-6 h-6" style={{ color: '#D1D5DB' }} />
            <p className="text-xs" style={{ color: '#9CA3AF' }}>{t.my.noNotificationsYet}</p>
          </div>
        ) : notifs.map((n, i) => (
          <div
            key={n.id}
            onClick={() => markRead(n)}
            className="flex items-start gap-3 px-4 py-3 cursor-pointer"
            style={{ borderBottom: i < notifs.length - 1 ? '0.5px solid rgba(60,60,67,.08)' : 'none', opacity: n.read ? 0.6 : 1 }}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs" style={{ fontWeight: n.read ? 500 : 700, color: '#1C1C1E' }}>{n.title}</p>
                <span className="text-[10px] shrink-0" style={{ color: '#9CA3AF' }}>{timeAgo(n.createdAt)}</span>
              </div>
              <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: '#6B6B70' }}>{n.body}</p>
            </div>
            {!n.read && <div className="shrink-0 w-1.5 h-1.5 rounded-full mt-1.5" style={{ background: '#0870E2' }} />}
          </div>
        ))}
      </div>
    </div>
  )
}
