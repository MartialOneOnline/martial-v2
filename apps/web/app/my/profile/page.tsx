'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  CalendarDays, CreditCard, DollarSign, ChevronRight,
  Camera, LogOut, Medal, Settings, HelpCircle, Shield, QrCode,
} from 'lucide-react'
import { getBeltImage } from '../../../lib/belts'
import { createClient } from '../../../lib/supabase/client'

type Profile = {
  name: string | null
  email: string
  phone: string | null
  dateOfBirth: string | null
  avatarUrl: string | null
  memberships: { status: string; planName: string }[]
  bookings: unknown[]
  schoolMembers: { belt: string | null; beltDegree: number | null }[]
  gradings: unknown[]
}

const MENU: { label?: string; items: { label: string; href: string; icon: React.ElementType; desc: string; color: string; bg: string }[] }[] = [
  {
    items: [
      { label: 'My Classes',    href: '/my/classes',    icon: CalendarDays, desc: 'Upcoming & past bookings',       color: '#007AFF', bg: 'rgba(0,122,255,.10)' },
      { label: 'Membership',    href: '/my/membership', icon: CreditCard,   desc: 'Plans & subscriptions',          color: '#34C759', bg: 'rgba(52,199,89,.10)' },
      { label: 'Ranking',       href: '/my/progress',   icon: Medal,        desc: 'Belt & grading history',         color: '#FF9500', bg: 'rgba(255,149,0,.10)' },
      { label: 'Transactions',  href: '/my/payments',   icon: DollarSign,   desc: 'Payment history',                color: '#32ADE6', bg: 'rgba(50,173,230,.10)' },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Settings',       href: '/my/settings', icon: Settings,    desc: 'Notifications & preferences',    color: '#6B6B70', bg: 'rgba(107,107,112,.10)' },
      { label: 'QR Check-in',    href: '/my/qr',       icon: QrCode,      desc: 'Show QR code to check in',       color: '#007AFF', bg: 'rgba(0,122,255,.10)' },
      { label: 'Help & Support', href: '/my/help',     icon: HelpCircle,  desc: 'Get help with your account',     color: '#FF9500', bg: 'rgba(255,149,0,.10)' },
      { label: 'Privacy',        href: '/my/privacy',  icon: Shield,      desc: 'Your data & permissions',        color: '#5856D6', bg: 'rgba(88,86,214,.10)' },
    ],
  },
]

export default function MyProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading]  = useState(true)
  const [editing, setEditing]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [name, setName]           = useState('')
  const [phone, setPhone]         = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef              = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/my')
      .then(r => r.json())
      .then(d => {
        const u = d.user
        setProfile(u)
        setName(u?.name ?? '')
        setPhone(u?.phone ?? '')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    await fetch('/api/my', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone }),
    }).catch(() => {})
    setProfile(p => p ? { ...p, name, phone } : p)
    setSaving(false)
    setEditing(false)
  }

  async function handleAvatarUpload(file: File) {
    setUploading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const ext = file.name.split('.').pop()
      const path = `avatars/${user.id}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await fetch('/api/my', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: publicUrl }),
      })
      setProfile(p => p ? { ...p, avatarUrl: publicUrl } : p)
    } catch (err) {
      console.error('[avatar upload]', err)
    } finally {
      setUploading(false)
    }
  }

  const initials        = (profile?.name || profile?.email || 'U').slice(0, 2).toUpperCase()
  const activePlan      = profile?.memberships?.find(m => m.status === 'ACTIVE')
  const totalClasses    = profile?.bookings?.length ?? 0
  const member          = profile?.schoolMembers?.[0]
  const beltImg         = member?.belt ? getBeltImage(member.belt, member.beltDegree ?? 0) : null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: '#F2F2F7' }}>
        <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#007AFF', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-4" style={{ background: '#F2F2F7' }}>
      <div className="max-w-lg mx-auto">

        {/* ── Page header ── */}
        <div className="px-4 md:px-6 pt-4 md:pt-7 pb-2 flex items-center justify-between">
          <div>
            <p className="text-xs" style={{ color: '#6B6B70' }}>Student portal</p>
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#1C1C1E', letterSpacing: '-0.5px' }}>Profile</h1>
          </div>
          <button
            onClick={editing ? handleSave : () => setEditing(true)}
            className="text-sm font-medium px-4 py-1.5 rounded-full transition-colors"
            style={editing
              ? { background: '#007AFF', color: '#fff' }
              : { background: 'rgba(0,122,255,.10)', color: '#007AFF' }}
          >
            {saving ? 'Saving…' : editing ? 'Save' : 'Edit'}
          </button>
        </div>

        {/* ── Avatar + name card ── */}
        <div className="mx-4 md:mx-6 mt-3 mb-4 rounded-2xl p-5" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)' }}>
          <div className="flex items-center gap-4 mb-5">
            <div className="relative shrink-0">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-semibold" style={{ background: 'rgba(0,122,255,.12)', color: '#007AFF' }}>
                  {initials}
                </div>
              )}
              {editing && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 w-6 h-6 bg-white rounded-full flex items-center justify-center"
                  style={{ boxShadow: '0 1px 4px rgba(0,0,0,.18)' }}
                >
                  {uploading
                    ? <div className="w-2.5 h-2.5 border border-t-transparent rounded-full animate-spin" style={{ borderColor: '#007AFF', borderTopColor: 'transparent' }} />
                    : <Camera className="w-3 h-3" style={{ color: '#6B6B70' }} />
                  }
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f) }}
              />
            </div>
            <div className="flex-1 min-w-0">
              {editing ? (
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full text-base font-semibold rounded-xl px-3 py-2 mb-1 focus:outline-none"
                  style={{ border: '1px solid #E5E5EA', color: '#1C1C1E', fontSize: 16 }}
                />
              ) : (
                <p className="text-base font-semibold truncate mb-0.5" style={{ color: '#1C1C1E' }}>{profile?.name || 'Add your name'}</p>
              )}
              <p className="text-xs truncate" style={{ color: '#6B6B70' }}>{profile?.email}</p>
              {!editing && profile?.phone && (
                <p className="text-xs mt-0.5" style={{ color: '#6B6B70' }}>{profile.phone}</p>
              )}
              {editing && (
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Phone number"
                  type="tel"
                  className="w-full rounded-xl px-3 py-2 mt-1 focus:outline-none text-sm"
                  style={{ border: '1px solid #E5E5EA', color: '#1C1C1E' }}
                />
              )}
            </div>
          </div>

          {/* Belt + stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl p-3 text-center" style={{ background: '#F2F2F7' }}>
              {beltImg ? (
                <img src={beltImg} alt={member?.belt ?? ''} className="h-4 w-auto mx-auto mb-1 object-contain" />
              ) : (
                <p className="text-lg font-semibold mb-1" style={{ color: '#1C1C1E' }}>—</p>
              )}
              <p className="text-[10px]" style={{ color: '#6B6B70' }}>Belt</p>
            </div>
            <Link href="/my/classes" className="rounded-xl p-3 text-center" style={{ background: '#F2F2F7' }}>
              <p className="text-lg font-semibold mb-1" style={{ color: '#1C1C1E' }}>{totalClasses}</p>
              <p className="text-[10px]" style={{ color: '#6B6B70' }}>Classes</p>
            </Link>
            <Link href="/my/membership" className="rounded-xl p-3 text-center" style={{ background: '#F2F2F7' }}>
              <p className="text-lg font-semibold mb-1" style={{ color: activePlan ? '#34C759' : '#1C1C1E' }}>{activePlan ? '●' : '—'}</p>
              <p className="text-[10px]" style={{ color: '#6B6B70' }}>Member</p>
            </Link>
          </div>
        </div>

        {/* ── Menu sections ── */}
        {MENU.map((section, si) => (
          <div key={si} className="mb-4">
            {section.label && (
              <p className="px-4 md:px-6 pb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B6B70' }}>
                {section.label}
              </p>
            )}
            <div className="mx-4 md:mx-6 rounded-2xl overflow-hidden" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)' }}>
              {section.items.map((item, ii) => {
                const Icon = item.icon
                const color = item.color
                const bg    = item.bg
                return (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    className="flex items-center gap-4 px-4 py-3.5 transition-colors active:bg-gray-50"
                    style={ii < section.items.length - 1 ? { borderBottom: '0.5px solid rgba(60,60,67,.12)' } : {}}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
                      <Icon className="w-4.5 h-4.5" style={{ color, width: 18, height: 18 }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: '#1C1C1E' }}>{item.label}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: '#6B6B70' }}>{item.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 shrink-0" style={{ color: '#C7C7CC' }} />
                  </Link>
                )
              })}
            </div>
          </div>
        ))}

        {/* ── Sign out ── */}
        <div className="mx-4 md:mx-6 mb-2 rounded-2xl overflow-hidden" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)' }}>
          <button
            onClick={() => { window.location.href = '/api/auth/signout' }}
            className="w-full flex items-center gap-4 px-4 py-3.5 transition-colors active:bg-red-50"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,59,48,.10)' }}>
              <LogOut className="w-4.5 h-4.5" style={{ color: '#FF3B30', width: 18, height: 18 }} />
            </div>
            <span className="text-sm font-medium" style={{ color: '#FF3B30' }}>Sign out</span>
          </button>
        </div>

        <div className="text-center py-4">
          <button className="text-xs" style={{ color: '#AEAEB2', background: 'none', border: 'none', cursor: 'pointer' }}>
            Delete account
          </button>
        </div>

      </div>
    </div>
  )
}
