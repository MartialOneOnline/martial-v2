'use client'

import { useState, useEffect } from 'react'
import { X, Pencil, MapPin, Globe, Phone, Mail, CheckCircle, AlertCircle } from 'lucide-react'

interface Props {
  onClose: () => void
  onSaved?: () => void
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 10,
  border: '1px solid #E5E7EB', outline: 'none', fontSize: 13,
  color: '#111827', boxSizing: 'border-box',
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
        {icon}{label}
      </label>
      {children}
    </div>
  )
}

export default function EditSchoolModal({ onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name: '', address: '', city: '', country: '', postcode: '',
    phone: '', email: '', website: '', description: '', tagline: '',
  })
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    fetch('/api/dashboard/school')
      .then(r => r.json())
      .then(d => {
        if (d.school) setForm({
          name:        d.school.name        ?? '',
          address:     d.school.address     ?? '',
          city:        d.school.city        ?? '',
          country:     d.school.country     ?? '',
          postcode:    d.school.postcode    ?? '',
          phone:       d.school.phone       ?? '',
          email:       d.school.email       ?? '',
          website:     d.school.website     ?? '',
          description: d.school.description ?? '',
          tagline:     d.school.tagline     ?? '',
        })
      })
      .finally(() => setLoading(false))
  }, [])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res = await fetch('/api/dashboard/school', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error saving'); return }
      setSaved(true)
      onSaved?.()
      setTimeout(onClose, 1800)
    } catch {
      setError('Connection error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" style={{ background: '#fff' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #E5E7EB' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#FFF7ED' }}>
              <Pencil size={14} style={{ color: '#D97706' }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Edit School Profile</p>
              <p style={{ fontSize: 11, color: '#9CA3AF' }}>Update your academy information</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
            <X size={18} />
          </button>
        </div>

        {saved ? (
          <div className="px-5 py-10 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#FFFBEB' }}>
              <CheckCircle size={28} style={{ color: '#D97706' }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Profile Updated!</p>
            <p style={{ fontSize: 13, color: '#6B7280' }}>Your school profile has been saved.</p>
          </div>
        ) : loading ? (
          <div className="px-5 py-10 text-center">
            <p style={{ fontSize: 13, color: '#9CA3AF' }}>Loading…</p>
          </div>
        ) : (
          <form onSubmit={handleSave} style={{ maxHeight: '70vh', overflowY: 'auto', scrollbarWidth: 'none' }}>
            <div className="px-5 py-5 space-y-4">

              {/* School Name */}
              <Field label="School Name" icon={<Pencil size={13} style={{ color: '#9CA3AF' }} />}>
                <input type="text" value={form.name} onChange={set('name')} required style={inputStyle} />
              </Field>

              {/* Tagline */}
              <Field label="Tagline / Type">
                <input type="text" value={form.tagline} onChange={set('tagline')}
                  placeholder="Jiu Jitsu Academy" style={inputStyle} />
              </Field>

              {/* Address */}
              <Field label="Address" icon={<MapPin size={13} style={{ color: '#9CA3AF' }} />}>
                <input type="text" value={form.address} onChange={set('address')} style={inputStyle} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="City">
                  <input type="text" value={form.city} onChange={set('city')} style={inputStyle} />
                </Field>
                <Field label="Postcode">
                  <input type="text" value={form.postcode} onChange={set('postcode')} style={inputStyle} />
                </Field>
              </div>

              <Field label="Country">
                <input type="text" value={form.country} onChange={set('country')} style={inputStyle} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Website" icon={<Globe size={13} style={{ color: '#9CA3AF' }} />}>
                  <input type="text" value={form.website} onChange={set('website')} style={inputStyle} />
                </Field>
                <Field label="Phone" icon={<Phone size={13} style={{ color: '#9CA3AF' }} />}>
                  <input type="tel" value={form.phone} onChange={set('phone')} style={inputStyle} />
                </Field>
              </div>

              <Field label="Contact Email" icon={<Mail size={13} style={{ color: '#9CA3AF' }} />}>
                <input type="email" value={form.email} onChange={set('email')} style={inputStyle} />
              </Field>

              <Field label="Description">
                <textarea value={form.description} onChange={set('description')} rows={3}
                  style={{ ...inputStyle, paddingTop: 10, paddingBottom: 10, resize: 'none' }} />
              </Field>

              {error && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 12px', background: '#FEF2F2', borderRadius: 10 }}>
                  <AlertCircle size={14} style={{ color: '#DC2626', flexShrink: 0 }} />
                  <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>{error}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 flex gap-3" style={{ borderTop: '1px solid #F3F4F6' }}>
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
                style={{ border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer"
                style={{ background: saving ? '#FCD34D' : '#D97706', border: 'none' }}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
