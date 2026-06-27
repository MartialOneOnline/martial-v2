'use client'

import { useState } from 'react'
import { X, Send, Users, ChevronDown, CheckCircle, AlertCircle } from 'lucide-react'

interface Props {
  onClose: () => void
}

const AUDIENCES = ['All Students', 'Active Members', 'Inactive (30+ days)', 'Trial Students', 'Staff Only']
const CHANNELS  = ['Email', 'Push Notification', 'SMS', 'In-App Message']

const sel: React.CSSProperties = {
  width: '100%', padding: '10px 32px 10px 12px', borderRadius: 10,
  border: '1px solid #E5E7EB', outline: 'none', color: '#111827',
  background: '#fff', fontSize: 14, appearance: 'none',
}

export default function SendModal({ onClose }: Props) {
  const [audience, setAudience] = useState('All Students')
  const [channel,  setChannel]  = useState('Email')
  const [subject,  setSubject]  = useState('')
  const [message,  setMessage]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [result,   setResult]   = useState<{ sent: number; total: number } | null>(null)

  const charLimit = 1600
  const remaining = charLimit - message.length

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audience, channel, subject, message }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to send'); return }
      setResult({ sent: data.sent, total: data.total })
    } catch {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}>
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

        {/* Success */}
        {result ? (
          <div className="px-5 py-10 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#F0FDF4' }}>
              <CheckCircle size={28} style={{ color: '#16A34A' }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Message Sent!</p>
            <p style={{ fontSize: 13, color: '#6B7280' }}>
              Delivered to <strong>{result.sent}</strong> of <strong>{result.total}</strong> recipients in <strong>{audience}</strong>
            </p>
            <button onClick={onClose}
              style={{ marginTop: 8, padding: '9px 28px', background: '#16A34A', color: '#fff',
                border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Close
            </button>
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
                  <select value={audience} onChange={e => setAudience(e.target.value)} style={sel}>
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
                  <select value={channel} onChange={e => setChannel(e.target.value)} style={sel}>
                    {CHANNELS.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9CA3AF' }} />
                </div>
              </div>
            </div>

            {/* Channel warning */}
            {channel !== 'Email' && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 12px',
                background: '#FFFBEB', borderRadius: 10, border: '1px solid #FDE68A' }}>
                <AlertCircle size={14} style={{ color: '#D97706', flexShrink: 0 }} />
                <p style={{ fontSize: 13, color: '#92400E', margin: 0 }}>
                  <strong>{channel}</strong> is not available yet — switch to Email to send now.
                </p>
              </div>
            )}

            {/* Subject */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Subject</label>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="Class update, reminder..."
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB',
                  outline: 'none', fontSize: 14, color: '#111827', boxSizing: 'border-box' }} />
            </div>

            {/* Message */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Message *</label>
              <textarea required value={message}
                onChange={e => setMessage(e.target.value.slice(0, charLimit))}
                placeholder="Type your message here..."
                rows={4}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB',
                  outline: 'none', fontSize: 14, color: '#111827', resize: 'none', boxSizing: 'border-box' }} />
              <p style={{ fontSize: 11, color: remaining < 50 ? '#DC2626' : '#9CA3AF', textAlign: 'right', marginTop: 4 }}>
                {remaining} characters remaining
              </p>
            </div>

            {/* Error */}
            {error && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 12px',
                background: '#FEF2F2', borderRadius: 10 }}>
                <AlertCircle size={14} style={{ color: '#DC2626', flexShrink: 0 }} />
                <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
                style={{ border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>
                Cancel
              </button>
              <button type="submit" disabled={loading || channel !== 'Email'}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer flex items-center justify-center gap-2"
                style={{ background: loading || channel !== 'Email' ? '#86EFAC' : '#16A34A', border: 'none' }}>
                <Send size={13} />
                {loading ? 'Sending…' : 'Send Now'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
