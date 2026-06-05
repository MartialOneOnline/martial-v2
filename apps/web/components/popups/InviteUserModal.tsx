'use client'

import { useState } from 'react'
import { X, UserPlus, Mail, Phone, User, ChevronDown } from 'lucide-react'

interface Props {
  onClose: () => void
}

const ROLES = ['Student', 'Staff', 'Instructor', 'Admin']

export default function InviteUserModal({ onClose }: Props) {
  const [email, setEmail]   = useState('')
  const [name, setName]     = useState('')
  const [phone, setPhone]   = useState('')
  const [role, setRole]     = useState('Student')
  const [sent, setSent]     = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSent(true)
    setTimeout(onClose, 1800)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
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
              <span style={{ fontSize: 28 }}>✓</span>
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Invitation Sent!</p>
            <p style={{ fontSize: 13, color: '#6B7280' }}>We sent an invite to <strong>{email}</strong></p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
            {/* Name */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Full Name</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm"
                  style={{ border: '1px solid #E5E7EB', outline: 'none', color: '#111827' }}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Email Address *</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="john@example.com"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm"
                  style={{ border: '1px solid #E5E7EB', outline: 'none', color: '#111827' }}
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Phone (optional)</label>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+34 600 000 000"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm"
                  style={{ border: '1px solid #E5E7EB', outline: 'none', color: '#111827' }}
                />
              </div>
            </div>

            {/* Role */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Role</label>
              <div className="relative">
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm appearance-none"
                  style={{ border: '1px solid #E5E7EB', outline: 'none', color: '#111827', background: '#fff' }}
                >
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9CA3AF' }} />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
                style={{ border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer"
                style={{ background: '#0071E3', border: 'none' }}
              >
                Send Invitation
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
