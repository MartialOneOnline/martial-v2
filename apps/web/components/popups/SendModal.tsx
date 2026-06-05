'use client'

import { useState } from 'react'
import { X, Send, Users, ChevronDown } from 'lucide-react'

interface Props {
  onClose: () => void
}

const AUDIENCES = ['All Students', 'Active Members', 'Inactive (30+ days)', 'Trial Students', 'Staff Only']
const CHANNELS  = ['Push Notification', 'Email', 'SMS', 'In-App Message']

export default function SendModal({ onClose }: Props) {
  const [audience, setAudience]   = useState('All Students')
  const [channel, setChannel]     = useState('Push Notification')
  const [subject, setSubject]     = useState('')
  const [message, setMessage]     = useState('')
  const [sent, setSent]           = useState(false)

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    setSent(true)
    setTimeout(onClose, 1800)
  }

  const charLimit = 160
  const remaining = charLimit - message.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" style={{ background: '#fff' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #E5E7EB' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#F0FDF4' }}>
              <Send size={14} style={{ color: '#16A34A' }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Send Message</p>
              <p style={{ fontSize: 11, color: '#9CA3AF' }}>Broadcast to students or staff</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
            <X size={18} />
          </button>
        </div>

        {sent ? (
          <div className="px-5 py-10 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#F0FDF4' }}>
              <Send size={24} style={{ color: '#16A34A' }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Message Sent!</p>
            <p style={{ fontSize: 13, color: '#6B7280' }}>Your message was delivered to <strong>{audience}</strong></p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="px-5 py-5 space-y-4">
            {/* Audience + Channel */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                  <Users size={12} /> Audience
                </label>
                <div className="relative">
                  <select
                    value={audience}
                    onChange={e => setAudience(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm appearance-none"
                    style={{ border: '1px solid #E5E7EB', outline: 'none', color: '#111827', background: '#fff' }}
                  >
                    {AUDIENCES.map(a => <option key={a}>{a}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9CA3AF' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                  <Send size={12} /> Channel
                </label>
                <div className="relative">
                  <select
                    value={channel}
                    onChange={e => setChannel(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm appearance-none"
                    style={{ border: '1px solid #E5E7EB', outline: 'none', color: '#111827', background: '#fff' }}
                  >
                    {CHANNELS.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9CA3AF' }} />
                </div>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Subject</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Class update, reminder..."
                className="w-full px-3 py-2.5 rounded-xl text-sm"
                style={{ border: '1px solid #E5E7EB', outline: 'none', color: '#111827' }}
              />
            </div>

            {/* Message */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Message *</label>
              <textarea
                required
                value={message}
                onChange={e => setMessage(e.target.value.slice(0, charLimit))}
                placeholder="Type your message here..."
                rows={4}
                className="w-full px-3 py-2.5 rounded-xl text-sm resize-none"
                style={{ border: '1px solid #E5E7EB', outline: 'none', color: '#111827' }}
              />
              <p style={{ fontSize: 11, color: remaining < 20 ? '#DC2626' : '#9CA3AF', textAlign: 'right', marginTop: 4 }}>
                {remaining} characters remaining
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
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
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer flex items-center justify-center gap-2"
                style={{ background: '#16A34A', border: 'none' }}
              >
                <Send size={13} /> Send Now
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
