'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CalendarDays, CreditCard, Award, DollarSign,
  Settings, HelpCircle, Shield, QrCode, ChevronRight,
  Camera, LogOut, School, Medal, BookOpen,
} from 'lucide-react'

type Profile = {
  name: string | null
  email: string
  phone: string | null
  dateOfBirth: string | null
  avatarUrl: string | null
  role: string
  memberships: { status: string }[]
  bookings: unknown[]
  schoolMembers: { belt: string | null; beltDegree: number | null }[]
  gradings: unknown[]
}

const MENU_SECTIONS = [
  {
    items: [
      { label: 'My Classes',    href: '/my/classes',    icon: CalendarDays,  desc: 'Upcoming & past bookings' },
      { label: 'Membership',    href: '/my/membership', icon: CreditCard,    desc: 'Plans & subscriptions' },
      { label: 'Ranking',       href: '/my/progress',   icon: Medal,         desc: 'Belts & grading history' },
      { label: 'Transactions',  href: '/my/payments',   icon: DollarSign,    desc: 'Payment history' },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Settings',         href: '/my/settings',  icon: Settings,     desc: 'Notifications & preferences' },
      { label: 'QR Code Scanner',  href: '/my/qr',        icon: QrCode,       desc: 'Scan to check in' },
      { label: 'Payment Method',   href: '/my/payments',  icon: CreditCard,   desc: 'Manage payment methods' },
      { label: 'Help & Support',   href: '/my/help',      icon: HelpCircle,   desc: 'Get help' },
      { label: 'Privacy',          href: '/my/privacy',   icon: Shield,       desc: 'Privacy & permissions' },
    ],
  },
]

export default function MyProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    fetch('/api/my')
      .then(r => r.json())
      .then(d => {
        const u = d.user
        setProfile(u)
        setName(u?.name ?? '')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const initials = (profile?.name || profile?.email || 'U').slice(0, 2).toUpperCase()
  const activeMemberships = profile?.memberships?.filter(m => m.status === 'ACTIVE').length ?? 0
  const totalClasses = profile?.bookings?.length ?? 0
  const currentBelt = profile?.schoolMembers?.[0]?.belt

  return (
    <div className="min-h-screen">

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 px-5 py-4 sticky top-0 z-10 flex items-center justify-between">
        <h1 className="text-base font-bold text-[#101828]">Profile</h1>
        <button
          onClick={() => setEditing(e => !e)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
            editing
              ? 'bg-[#0870E2] text-white'
              : 'text-[#0870E2] hover:bg-[#0870E2]/8'
          }`}
        >
          {editing ? 'Save' : 'Edit'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-60">
          <div className="w-5 h-5 border-2 border-[#0870E2] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── Profile card ── */}
          <div className="bg-white border-b border-gray-100 px-5 py-6">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative shrink-0">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[#0870E2]/10 flex items-center justify-center text-[#0870E2] font-bold text-xl">
                    {initials}
                  </div>
                )}
                {editing && (
                  <button className="absolute bottom-0 right-0 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm">
                    <Camera className="w-3 h-3 text-gray-500" />
                  </button>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                {editing ? (
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full text-base font-bold text-[#101828] bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0870E2]/20 focus:border-[#0870E2]"
                  />
                ) : (
                  <p className="text-base font-bold text-[#101828] truncate">{profile?.name || 'Add your name'}</p>
                )}
                <p className="text-xs text-gray-400 mt-0.5 truncate">{profile?.email}</p>
                {profile?.phone && (
                  <p className="text-xs text-gray-400 mt-0.5">{profile.phone}</p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mt-5">
              {[
                { label: 'Memberships', value: activeMemberships, href: '/my/membership' },
                { label: 'Classes',     value: totalClasses,       href: '/my/classes' },
                { label: 'Current belt', value: currentBelt?.split(' ')[0] ?? '—', href: '/my/progress' },
              ].map(({ label, value, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="bg-[#F8F9FB] rounded-xl p-3 text-center hover:bg-[#0870E2]/5 transition-colors"
                >
                  <p className="text-lg font-bold text-[#101828]">{value}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{label}</p>
                </Link>
              ))}
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button className="py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Share Profile
              </button>
              <Link
                href="/explore"
                className="py-2.5 rounded-xl bg-[#0870E2] text-white text-xs font-semibold text-center hover:bg-[#005580] transition-colors"
              >
                Find Academies
              </Link>
            </div>
          </div>

          {/* ── Personal info (editable) ── */}
          {editing && (
            <div className="bg-white border-b border-gray-100 px-5 py-4 space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Personal details</p>
              {[
                { label: 'Email', value: profile?.email ?? '', disabled: true, type: 'email' },
                { label: 'Phone', value: profile?.phone ?? '', disabled: false, type: 'tel' },
                { label: 'Date of birth', value: profile?.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString('en-GB') : '', disabled: true, type: 'text' },
              ].map(({ label, value, disabled, type }) => (
                <div key={label}>
                  <label className="text-[11px] font-semibold text-gray-400 mb-1 block">{label}</label>
                  <input
                    type={type}
                    defaultValue={value}
                    disabled={disabled}
                    className={`w-full h-10 px-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#0870E2]/20 focus:border-[#0870E2] transition-colors ${
                      disabled
                        ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                        : 'border-gray-200 text-gray-700'
                    }`}
                  />
                </div>
              ))}
            </div>
          )}

          {/* ── Menu sections ── */}
          {MENU_SECTIONS.map((section, si) => (
            <div key={si} className="mt-2">
              {section.label && (
                <p className="px-5 pt-4 pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                  {section.label}
                </p>
              )}
              <div className="bg-white border-y border-gray-100">
                {section.items.map((item, ii) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href + item.label}
                      href={item.href}
                      className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors ${
                        ii < section.items.length - 1 ? 'border-b border-gray-50' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-[#0870E2]/8 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-[#0870E2]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#101828]">{item.label}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{item.desc}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}

          {/* ── Sign out ── */}
          <div className="px-5 py-4 mt-2">
            <Link
              href="/api/auth/signout"
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-100 text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="text-sm font-semibold">Sign out</span>
            </Link>
          </div>

          {/* ── Danger zone ── */}
          <div className="px-5 pb-8">
            <button className="text-xs text-gray-400 hover:text-red-400 transition-colors underline underline-offset-2">
              Delete account
            </button>
          </div>
        </>
      )}
    </div>
  )
}
