'use client'

import { useState } from 'react'
import { X, UserPlus, Mail, User, Globe, CheckCircle } from 'lucide-react'

interface Props {
  onClose: () => void
}

const LANGS = [
  { value: 'es', label: 'Español',   flag: '🇪🇸' },
  { value: 'en', label: 'English',   flag: '🇬🇧' },
  { value: 'pt', label: 'Português', flag: '🇵🇹' },
  { value: 'fr', label: 'Français',  flag: '🇫🇷' },
]

const inp: React.CSSProperties = {
  width: '100%', border: '1px solid #E5E7EB', borderRadius: 12,
  padding: '10px 14px 10px 36px', fontSize: 14, color: '#111827',
  outline: 'none', background: '#fff', boxSizing: 'border-box',
}

export default function InviteUserModal({ onClose }: Props) {
  const [name,    setName]    = useState('')
  const [email,   setEmail]   = useState('')
  const [lang,    setLang]    = useState('es')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [sent,    setSent]    = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim()) { setError('Email is required'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard/members/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined, lang }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to send invitation'); return }
      setSent(true)
    } catch {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ background: '#fff' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #E5E7EB' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#EFF6FF' }}>
              <UserPlus size={15} style={{ color: '#0071E3' }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Invite User</p>
              <p style={{ fontSize: 11, color: '#9CA3AF' }}>Send an invitation to join your academy</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
            <X size={18} />
          </button>
        </div>

        {sent ? (
          <div className="px-5 py-10 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#F0FDF4' }}>
              <CheckCircle size={28} style={{ color: '#16A34A' }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Invitation Sent!</p>
            <p style={{ fontSize: 13, color: '#6B7280' }}>
              We sent an invite to <strong>{email}</strong>
            </p>
            <button onClick={onClose}
              style={{ marginTop: 8, padding: '9px 28px', background: '#0071E3', color: '#fff',
                border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">

            {/* Name */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Full Name</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="John Doe" style={inp} />
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Email Address *</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required placeholder="john@example.com" style={inp} />
              </div>
            </div>

            {/* Language */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                <Globe size={11} />
                Email language
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {LANGS.map(l => (
                  <button key={l.value} type="button" onClick={() => setLang(l.value)}
                    style={{
                      flex: 1, padding: '8px 4px', borderRadius: 10, cursor: 'pointer',
                      border: `2px solid ${lang === l.value ? '#0071E3' : '#E5E7EB'}`,
                      background: lang === l.value ? '#EFF6FF' : '#fff',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                      transition: 'all 0.15s',
                    }}>
                    <span style={{ fontSize: 18 }}>{l.flag}</span>
                    <span style={{ fontSize: 10, fontWeight: lang === l.value ? 700 : 500,
                      color: lang === l.value ? '#0071E3' : '#6B7280' }}>{l.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <p style={{ fontSize: 13, color: '#DC2626', background: '#FEF2F2',
                padding: '8px 12px', borderRadius: 8 }}>{error}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
                style={{ border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer"
                style={{ background: loading ? '#93C5FD' : '#0071E3', border: 'none' }}>
                {loading ? 'Sending…' : 'Send Invitation'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  )
}
