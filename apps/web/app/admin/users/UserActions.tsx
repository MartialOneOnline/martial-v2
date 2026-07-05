'use client'

import { useEffect, useState } from 'react'
import {
  MoreHorizontal, Pencil, MessageCircle, Trash2, X, Loader2,
  Lock, Send, CheckCircle2,
} from 'lucide-react'
import { adminFetch } from '@/lib/api/adminFetch'

export type AdminUser = {
  id: string
  name: string | null
  email: string
  phone?: string | null
  role: string
  avatarUrl: string | null
  createdAt: string
  schoolMembers: { school: { id: string; name: string; slug: string; status: string } }[]
  _count: { memberships: number }
}

const field = 'w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0870E2] focus:ring-2 focus:ring-[#0870E2]/10'
const label = 'block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide'

const ROLES = ['SUPERADMIN', 'SCHOOL_OWNER', 'INSTRUCTOR', 'STUDENT']

// ── Row kebab menu ─────────────────────────────────────────────────────────────
// Open/close state is owned by the parent table (one menu open at a time),
// matching the pattern already used for the All Schools table.
export function UserActionsMenu({ user, isOpen, onToggle, onClose, onEdit, onContact, onDelete }: {
  user: AdminUser
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  onEdit: () => void
  onContact: () => void
  onDelete: () => void
}) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={onClose} />
          <div className="absolute right-0 top-9 rounded-xl z-20 py-1"
            style={{ background: '#fff', border: '1px solid #E5E7EB', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 160 }}>
            <button
              onClick={() => { onClose(); onEdit() }}
              className="w-full flex items-center gap-2 text-left px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <Pencil size={13} /> Edit
            </button>
            <button
              onClick={() => { onClose(); onContact() }}
              className="w-full flex items-center gap-2 text-left px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <MessageCircle size={13} /> Contact
            </button>
            {user.role !== 'SUPERADMIN' && (
              <>
                <div className="my-1 border-t border-gray-100" />
                <button
                  onClick={() => { onClose(); onDelete() }}
                  className="w-full flex items-center gap-2 text-left px-4 py-2 text-xs font-medium hover:bg-red-50"
                  style={{ color: '#DC2626' }}
                >
                  <Trash2 size={13} /> Delete
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Edit user modal ────────────────────────────────────────────────────────────
type EditForm = { name: string; email: string; phone: string; role: string }

export function EditUserModal({ userId, onClose, onSaved }: {
  userId: string; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState<EditForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    adminFetch(`/api/admin/users/${userId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setForm({
        name: d.user.name ?? '', email: d.user.email ?? '', phone: d.user.phone ?? '', role: d.user.role ?? 'STUDENT',
      }))
      .catch(() => setError('Could not load user'))
      .finally(() => setLoading(false))
  }, [userId])

  function set(k: keyof EditForm, v: string) { setForm(f => f && ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    if (!form.email.trim()) { setError('Email is required'); return }
    setSaving(true)
    setError('')
    const res = await adminFetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error || 'Failed to save'); return }
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-[#101828]">Edit User</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
          </div>
        ) : !form ? (
          <p className="text-xs text-red-500">{error || 'Could not load user'}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className={label}>Name</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} className={field} />
            </div>
            <div>
              <label className={label}>Email *</label>
              <input type="email" required value={form.email} onChange={e => set('email', e.target.value)} className={field} />
            </div>
            <div>
              <label className={label}>Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} className={field} />
            </div>
            <div>
              <label className={label}>Role</label>
              <select value={form.role} onChange={e => set('role', e.target.value)} className={field}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <p className="text-[11px] text-gray-400 mt-1.5">Changing role does not grant school access by itself.</p>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 h-10 rounded-xl bg-[#0870E2] text-white text-sm font-semibold hover:bg-[#0660c8] disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Contact user modal ─────────────────────────────────────────────────────────
// Push is only meaningful for staff roles with a dashboard notification bell —
// plain students have no per-user notification inbox in this app today.
export function ContactUserModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const [message, setMessage] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const canPush = user.role !== 'STUDENT' && !!user.schoolMembers[0]
  const [sendPush, setSendPush] = useState(canPush)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  function openWhatsApp() {
    if (!user.phone) return
    const digits = user.phone.replace(/\D/g, '')
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, '_blank')
  }

  async function handleSend() {
    if (!message.trim()) { setError('Write a message first'); return }
    if (!sendEmail && !sendPush) { setError('Select at least one channel'); return }
    setSending(true)
    setError('')
    const res = await adminFetch(`/api/admin/users/${user.id}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, email: sendEmail, push: sendPush }),
    })
    setSending(false)
    if (!res.ok) { setError('Failed to send'); return }
    setSent(true)
    setTimeout(onClose, 1400)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-[#101828]">Contact {user.name || user.email}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {sent ? (
          <div className="py-8 flex flex-col items-center gap-2 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            <p className="text-sm font-semibold text-gray-900">Message sent</p>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              placeholder="Write your message…"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0870E2] focus:ring-2 focus:ring-[#0870E2]/10 resize-none"
            />
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} /> Send email
            </label>
            {canPush && (
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input type="checkbox" checked={sendPush} onChange={e => setSendPush(e.target.checked)} /> Send push notification (shows in their dashboard)
              </label>
            )}
            {user.phone && (
              <button
                type="button"
                onClick={openWhatsApp}
                className="w-full h-10 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" /> Open WhatsApp
              </button>
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button type="button" onClick={handleSend} disabled={sending}
                className="flex-1 h-10 rounded-xl bg-[#0870E2] text-white text-sm font-semibold hover:bg-[#0660c8] disabled:opacity-50 flex items-center justify-center gap-2">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Delete confirm modal ───────────────────────────────────────────────────────
// No soft-delete concept for User — single step, gated behind the admin's own
// password, same as the permanent-delete step for Schools.
export function DeleteUserModal({ user, onClose, onDeleted }: {
  user: AdminUser; onClose: () => void; onDeleted: () => void
}) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setBusy(true)
    setError('')
    const res = await adminFetch(`/api/admin/users/${user.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setError(data.error || 'Failed to delete user'); return }
    onDeleted()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div className="rounded-2xl p-8 flex flex-col items-center text-center gap-4"
        style={{ background: '#fff', width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
        onClick={e => e.stopPropagation()}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#FEF2F2' }}>
          <Trash2 size={24} style={{ color: '#DC2626' }} />
        </div>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Permanently delete user?</h3>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>
            <strong>{user.name || user.email}</strong> will be permanently deleted. This cannot be undone.
          </p>
        </div>
        <div className="w-full text-left">
          <label className={label}>Confirm your password</label>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Your account password"
              autoFocus
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/10"
            />
          </div>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-3 w-full">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl cursor-pointer"
            style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>
            Cancel
          </button>
          <button onClick={handleDelete} disabled={busy || !password} className="flex-1 py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-2"
            style={{ fontSize: 13, fontWeight: 600, border: 'none', background: '#DC2626', color: '#fff', opacity: (busy || !password) ? 0.6 : 1 }}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            {busy ? 'Deleting…' : 'Permanently delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
