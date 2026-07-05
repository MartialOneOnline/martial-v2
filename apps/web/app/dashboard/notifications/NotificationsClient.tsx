'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Bell, Menu, CheckCheck, Info, AlertTriangle, CreditCard, Users, Loader2, RefreshCw,
} from 'lucide-react'
import { useDashboard } from '../../../components/DashboardShell'
import { useT } from '../../../lib/i18n/LanguageContext'

type FilterTab = 'All' | 'Unread' | 'Payments' | 'Members' | 'Classes' | 'System'

const TYPE_CATEGORY: Record<string, FilterTab> = {
  PAYMENT_RECEIVED: 'Payments', PAYMENT_PENDING: 'Payments', MEMBERSHIP_REQUEST: 'Payments', MEMBERSHIP_EXPIRING: 'Payments',
  NEW_LEAD: 'Members', NEW_MEMBER: 'Members', STUDENT_INACTIVE: 'Members', MESSAGE: 'Members',
  CLASS_FULL: 'Classes', CLASS_CANCELLED: 'Classes', GRADING_COMPLETED: 'Classes',
}

const CATEGORY_STYLES: Record<string, { bg: string; color: string; border: string; icon: React.ElementType }> = {
  Members:  { bg: '#EEF2FF', color: '#6366F1', border: '#C7D2FE', icon: Users },
  Payments: { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0', icon: CreditCard },
  Classes:  { bg: '#EFF6FF', color: '#0071E3', border: '#BFDBFE', icon: Info },
  System:   { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB', icon: AlertTriangle },
}

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
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const TABS: FilterTab[] = ['All', 'Unread', 'Payments', 'Members', 'Classes', 'System']

export default function NotificationsClient() {
  const { setMenuOpen } = useDashboard()
  const router = useRouter()
  const t = useT()
  const tabLabels: Record<FilterTab, string> = {
    All: t.notifications.tabAll, Unread: t.notifications.tabUnread, Payments: t.notifications.tabPayments,
    Members: t.notifications.tabMembers, Classes: t.notifications.tabClasses, System: t.notifications.tabSystem,
  }

  const [notifs, setNotifs] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)
  const [activeTab, setActiveTab] = useState<FilterTab>('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const load = useCallback(() => {
    setLoading(true); setError(false)
    fetch('/api/dashboard/notifications?limit=20')
      .then(r => { if (!r.ok) throw new Error('failed'); return r.json() })
      .then(d => {
        setNotifs(d.notifications ?? [])
        setUnread(d.unread ?? 0)
        setHasMore(!!d.hasMore)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const loadMore = async () => {
    const last = notifs[notifs.length - 1]
    if (!last) return
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/dashboard/notifications?limit=20&before=${encodeURIComponent(last.createdAt)}`)
      const d = await res.json()
      setNotifs(prev => [...prev, ...(d.notifications ?? [])])
      setHasMore(!!d.hasMore)
    } catch {
      // leave hasMore as-is so the user can retry
    } finally {
      setLoadingMore(false)
    }
  }

  const markAllRead = async () => {
    await fetch('/api/dashboard/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      .catch(() => {})
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
    setUnread(0)
  }

  const toggleRead = (n: Notif) => {
    if (!n.read) {
      fetch('/api/dashboard/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: n.id }) })
        .catch(() => {})
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
      setUnread(prev => Math.max(0, prev - 1))
    }
    if (n.href) router.push(n.href)
  }

  const filtered = notifs.filter(n => {
    if (activeTab === 'All') return true
    if (activeTab === 'Unread') return !n.read
    return (TYPE_CATEGORY[n.type] ?? 'System') === activeTab
  })

  const tabCount = (tab: FilterTab) => {
    if (tab === 'All') return notifs.length
    if (tab === 'Unread') return unread
    return notifs.filter(n => (TYPE_CATEGORY[n.type] ?? 'System') === tab).length
  }

  return (
    <main style={{ flex: 1, minWidth: 0 }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="md:hidden" onClick={() => setMenuOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <Menu size={20} style={{ color: '#374151' }} />
        </button>
        <span style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>{t.notifications.title}</span>
        <div style={{ flex: 1 }} />
        <Link href="/dashboard/notifications" style={{ position: 'relative', color: '#374151', display: 'flex', alignItems: 'center' }}>
          <Bell size={18} style={{ color: '#6B7280' }} />
          {unread > 0 && (
            <span style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', background: '#DC2626', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {unread}
            </span>
          )}
        </Link>
      </div>

      <div className="px-4 md:px-8 py-6 flex flex-col gap-6">

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 style={{ fontWeight: 700, fontSize: 20, color: '#111827', margin: 0 }}>{t.notifications.title}</h1>
            {unread > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: '#EFF6FF', color: '#0071E3', border: '1px solid #BFDBFE' }}>
                {unread} {t.notifications.unread}
              </span>
            )}
          </div>
          {unread > 0 && (
            <button onClick={markAllRead} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, background: 'transparent', border: '1px solid #E5E7EB', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
              <CheckCheck size={14} /> {t.notifications.markAllRead}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #E5E7EB', overflowX: 'auto' }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                color: activeTab === tab ? '#0071E3' : '#6B7280',
                borderBottom: activeTab === tab ? '2px solid #0071E3' : '2px solid transparent',
                marginBottom: -2, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
              }}>
              {tabLabels[tab]}
              <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 999, background: activeTab === tab ? '#EFF6FF' : '#F3F4F6', color: activeTab === tab ? '#0071E3' : '#9CA3AF', fontWeight: 600 }}>
                {tabCount(tab)}
              </span>
            </button>
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={22} style={{ color: '#9CA3AF' }} className="animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertTriangle size={22} style={{ color: '#DC2626' }} />
              <p style={{ fontSize: 13, color: '#6B7280' }}>Couldn&apos;t load notifications.</p>
              <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, background: '#F3F4F6', border: 'none', fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                <RefreshCw size={13} /> Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>{t.notifications.noNotifications}</div>
          ) : filtered.map((n, i) => {
            const category = TYPE_CATEGORY[n.type] ?? 'System'
            const catStyle = CATEGORY_STYLES[category]!
            const Icon = catStyle.icon
            return (
              <div key={n.id} onClick={() => toggleRead(n)} style={{
                display: 'flex', gap: 14, padding: '14px 16px',
                background: n.read ? '#fff' : '#F0F7FF',
                borderLeft: n.read ? '3px solid transparent' : '3px solid #0071E3',
                borderBottom: i < filtered.length - 1 ? '1px solid #F3F4F6' : 'none',
                cursor: 'pointer',
              }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: catStyle.bg, border: `1px solid ${catStyle.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={15} style={{ color: catStyle.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-start justify-between gap-2">
                    <span style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, color: '#111827' }}>{n.title}</span>
                    <span style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap', flexShrink: 0 }}>{timeAgo(n.createdAt)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{n.body}</div>
                  <div style={{ marginTop: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 999, background: catStyle.bg, color: catStyle.color, border: `1px solid ${catStyle.border}` }}>
                      {tabLabels[category]}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {!loading && !error && hasMore && activeTab === 'All' && (
          <button onClick={loadMore} disabled={loadingMore}
            style={{ alignSelf: 'center', padding: '8px 20px', borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer', opacity: loadingMore ? 0.6 : 1 }}>
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        )}

      </div>
    </main>
  )
}
