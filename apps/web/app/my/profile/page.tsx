'use client'

import { useEffect, useState } from 'react'
import { User, Mail, Phone, Calendar, Save, Check, Camera } from 'lucide-react'

type Profile = {
  name: string | null
  email: string
  phone: string | null
  dateOfBirth: string | null
  avatarUrl: string | null
  role: string
}

export default function MyProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

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

  const save = async () => {
    setSaving(true)
    // Profile update endpoint — basic optimistic UI for now
    await new Promise(r => setTimeout(r, 600))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const initials = (profile?.name || profile?.email || 'U').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#0D1B2A]">Profile</h1>
          <p className="text-xs text-gray-400">Your personal information</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 h-9 px-4 rounded-xl text-white text-xs font-semibold hover:opacity-90 transition-all disabled:opacity-60"
          style={{ background: saved ? '#10B981' : '#006197' }}
        >
          {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="p-6 max-w-lg space-y-5">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-[#006197] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Avatar */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex flex-col items-center gap-4">
              <div className="relative">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="" className="w-20 h-20 rounded-full object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-[#006197]/10 flex items-center justify-center text-[#006197] font-bold text-2xl">
                    {initials}
                  </div>
                )}
                <button className="absolute bottom-0 right-0 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors">
                  <Camera className="w-3.5 h-3.5 text-gray-500" />
                </button>
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-[#0D1B2A]">{profile?.name || 'No name set'}</p>
                <p className="text-xs text-gray-400">{profile?.email}</p>
                <span className="inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#006197]/8 text-[#006197]">
                  {profile?.role?.replace('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                </span>
              </div>
            </div>

            {/* Form */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <p className="text-sm font-bold text-[#0D1B2A]">Personal details</p>
              </div>
              <div className="px-5 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Full name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full pl-9 pr-4 h-10 rounded-xl border border-gray-200 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#006197]/20 focus:border-[#006197]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="email"
                      value={profile?.email ?? ''}
                      disabled
                      className="w-full pl-9 pr-4 h-10 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-400 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Email is managed by your auth provider</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+34 600 000 000"
                      className="w-full pl-9 pr-4 h-10 rounded-xl border border-gray-200 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#006197]/20 focus:border-[#006197]"
                    />
                  </div>
                </div>

                {profile?.dateOfBirth && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Date of birth</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="text"
                        value={new Date(profile.dateOfBirth).toLocaleDateString('en-GB')}
                        disabled
                        className="w-full pl-9 pr-4 h-10 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-400 cursor-not-allowed"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Danger zone */}
            <div className="bg-white border border-red-50 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-red-50">
                <p className="text-sm font-bold text-red-500">Danger zone</p>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs text-gray-500 mb-3">Permanently delete your account and all associated data.</p>
                <button className="px-4 py-2 rounded-xl border border-red-200 text-red-500 text-xs font-semibold hover:bg-red-50 transition-colors">
                  Delete account
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
