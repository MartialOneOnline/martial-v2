'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Bell, Menu, Check, CheckCheck, Trash2, Info, AlertTriangle, CheckCircle, MessageSquare, Settings,
} from 'lucide-react'
import { useDashboard } from '../../../components/DashboardShell'
import { useT } from '../../../lib/i18n/LanguageContext'
import type { Translations } from '../../../lib/i18n/translations'

type FilterTab = 'All' | 'Unread' | 'Payments' | 'Members' | 'Classes' | 'System'

const CATEGORY_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  Members:  { bg: '#EEF2FF', color: '#6366F1', border: '#C7D2FE' },
  Payments: { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
  Classes:  { bg: '#EFF6FF', color: '#0071E3', border: '#BFDBFE' },
  System:   { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' },
}

const NOTIF_ICONS: Record<string, React.ElementType> = {
  Members:  MessageSquare,
  Payments: CheckCircle,
  Classes:  Info,
  System:   Settings,
}

const buildPrefGroups = (t: Translations) => [
  { label: t.notifications.tabPayments, group: 'Payments', items: [{ key: 'pay_success', label: t.notifications.paySuccess, desc: t.notifications.paySuccessDesc }, { key: 'pay_failed', label: t.notifications.payFailed, desc: t.notifications.payFailedDesc }, { key: 'pay_refund', label: t.notifications.payRefund, desc: t.notifications.payRefundDesc }] },
  { label: t.notifications.tabMembers,  group: 'Members',  items: [{ key: 'mem_new', label: t.notifications.memNew, desc: t.notifications.memNewDesc }, { key: 'mem_absent', label: t.notifications.memAbsent, desc: t.notifications.memAbsentDesc }, { key: 'mem_expiry', label: t.notifications.memExpiry, desc: t.notifications.memExpiryDesc }] },
  { label: t.notifications.tabClasses,  group: 'Classes',  items: [{ key: 'cls_full', label: t.notifications.clsFull, desc: t.notifications.clsFullDesc }, { key: 'cls_cancel', label: t.notifications.clsCancel, desc: t.notifications.clsCancelDesc }] },
  { label: t.notifications.tabSystem,   group: 'System',   items: [{ key: 'sys_update', label: t.notifications.sysUpdate, desc: t.notifications.sysUpdateDesc }, { key: 'sys_backup', label: t.notifications.sysBackup, desc: t.notifications.sysBackupDesc }] },
]
const PREF_KEYS = ['pay_success','pay_failed','pay_refund','mem_new','mem_absent','mem_expiry','cls_full','cls_cancel','sys_update','sys_backup']

interface Notif {
  id: number
  type: string
  title: string
  body: string
  description?: string
  time: string
  read: boolean
  category: string
}

const INITIAL_NOTIFS: Notif[] = [
  { id: 1, type: 'warning',  title: 'Low attendance alert',     body: '12 students haven\'t attended in 3+ weeks.',    time: '2m ago',  read: false, category: 'Members'  },
  { id: 2, type: 'success',  title: 'Payment received',         body: 'Fernanda Neves paid €65 for June membership.',  time: '18m ago', read: false, category: 'Payments' },
  { id: 3, type: 'info',     title: 'Class almost full',        body: 'BJJ Advanced is at 93% capacity today.',        time: '1h ago',  read: false, category: 'Classes'  },
  { id: 4, type: 'message',  title: 'New message',              body: 'Rafael: "Can I join the Friday No-Gi?"',        time: '3h ago',  read: true,  category: 'Members'  },
  { id: 5, type: 'success',  title: 'Grading completed',        body: '4 students passed their blue belt grading.',   time: '1d ago',  read: true,  category: 'Classes'  },
  { id: 6, type: 'system',   title: 'System update',            body: 'Platform updated to version 2.4.1.',           time: '2d ago',  read: true,  category: 'System'   },
]

function ToggleRow({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4" style={{ padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{label}</div>
        <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>{desc}</div>
      </div>
      <button onClick={onChange} style={{
        width: 40, height: 22, borderRadius: 99, border: 'none', cursor: 'pointer', flexShrink: 0,
        background: value ? '#0071E3' : '#E5E7EB', position: 'relative', transition: 'background 0.2s',
      }}>
        <span style={{
          position: 'absolute', top: 3, left: value ? 21 : 3, width: 16, height: 16,
          borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
        }} />
      </button>
    </div>
  )
}

const TABS: FilterTab[] = ['All', 'Unread', 'Payments', 'Members', 'Classes', 'System']

export default function NotificationsClient() {
  const { menuOpen, setMenuOpen } = useDashboard()
  const t = useT()
  const PREF_GROUPS = buildPrefGroups(t)
  const tabLabels: Record<FilterTab, string> = {
    All: t.notifications.tabAll, Unread: t.notifications.tabUnread, Payments: t.notifications.tabPayments,
    Members: t.notifications.tabMembers, Classes: t.notifications.tabClasses, System: t.notifications.tabSystem,
  }
  const [notifs, setNotifs] = useState<Notif[]>(INITIAL_NOTIFS)
  const [activeTab, setActiveTab] = useState<FilterTab>('All')
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(PREF_KEYS.map(k => [k, true]))
  )

  const unreadCount = notifs.filter(n => !n.read).length

  const filtered = notifs.filter(n => {
    if (activeTab === 'All') return true
    if (activeTab === 'Unread') return !n.read
    return n.category === activeTab
  })

  const tabCount = (tab: FilterTab) => {
    if (tab === 'All') return notifs.length
    if (tab === 'Unread') return unreadCount
    return notifs.filter(n => n.category === tab).length
  }

  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  const toggleRead = (id: number) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: !n.read } : n))
  const togglePref = (key: string) => setPrefs(prev => ({ ...prev, [key]: !prev[key] }))

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
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', background: '#DC2626', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {unreadCount}
                </span>
              )}
            </Link>
          </div>

          <div className="px-4 md:px-8 py-6 flex flex-col gap-6">

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h1 style={{ fontWeight: 700, fontSize: 20, color: '#111827', margin: 0 }}>{t.notifications.title}</h1>
                {unreadCount > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: '#EFF6FF', color: '#0071E3', border: '1px solid #BFDBFE' }}>
                    {unreadCount} {t.notifications.unread}
                  </span>
                )}
              </div>
              <button onClick={markAllRead} style={{ padding: '7px 14px', borderRadius: 9, background: 'transparent', border: '1px solid #E5E7EB', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
                {t.notifications.markAllRead}
              </button>
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
              {filtered.map((n, i) => {
                const Icon = (NOTIF_ICONS[n.category] ?? Info) as React.ElementType
                const catStyle = CATEGORY_STYLES[n.category] ?? CATEGORY_STYLES['System']!
                return (
                  <div key={n.id} onClick={() => toggleRead(n.id)} style={{
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
                        <span style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap', flexShrink: 0 }}>{n.time}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{n.description}</div>
                      <div style={{ marginTop: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 999, background: catStyle.bg, color: catStyle.color, border: `1px solid ${catStyle.border}` }}>
                          {tabLabels[n.category as FilterTab] ?? n.category}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
              {filtered.length === 0 && (
                <div style={{ padding: '40px 0', textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>{t.notifications.noNotifications}</div>
              )}
            </div>

            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #F3F4F6' }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{t.notifications.preferences}</div>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{t.notifications.preferencesDesc}</div>
              </div>
              <div style={{ padding: '0 24px' }}>
                {PREF_GROUPS.map(group => (
                  <div key={group.label}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.06em', padding: '14px 0 4px' }}>{group.label.toUpperCase()}</div>
                    {group.items.map(item => (
                      <ToggleRow key={item.key} label={item.label} desc={item.desc} value={prefs[item.key] ?? true} onChange={() => togglePref(item.key)} />
                    ))}
                  </div>
                ))}
                <div style={{ height: 8 }} />
              </div>
            </div>

          </div>
      </main>
  )
}
