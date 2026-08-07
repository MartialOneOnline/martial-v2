'use client'

import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import NotificationsPopup from './popups/NotificationsPopup'

export default function NotificationBell() {
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetch('/api/dashboard/notifications?limit=1')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setUnreadCount(d.unread ?? 0) })
      .catch(() => {})
  }, [])

  return (
    <div className="relative">
      <button
        onClick={() => setShowNotifications(v => !v)}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
        style={{ background: showNotifications ? '#EFF6FF' : '#F9FAFB', border: '1px solid #E5E7EB' }}
      >
        <Bell size={15} strokeWidth={1.5} style={{ color: '#374151' }} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full px-1"
            style={{ background: '#DC2626', fontSize: 9, fontWeight: 700, color: '#fff', lineHeight: 1 }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {showNotifications && (
        <NotificationsPopup onClose={() => setShowNotifications(false)} onUnreadChange={setUnreadCount} />
      )}
    </div>
  )
}
