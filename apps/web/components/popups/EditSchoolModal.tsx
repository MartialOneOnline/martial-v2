'use client'

import { useState } from 'react'
import { X, Pencil, MapPin, Globe, Phone, Mail, Upload } from 'lucide-react'

interface Props {
  onClose: () => void
}

export default function EditSchoolModal({ onClose }: Props) {
  const [form, setForm] = useState({
    name:        'Roger Gracie Malaga',
    discipline:  'Jiu Jitsu Academy',
    address:     'Calle Polifemo, 3, Málaga, España',
    website:     'rogergraciemalaga.com',
    phone:       '+34 600 000 000',
    email:       'info@rogergraciemalaga.com',
    description: 'Roger Gracie Malaga es una escuela de Jiu Jitsu situada en Málaga. Ofrecemos clases para todos los niveles.',
  })
  const [saved, setSaved] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(onClose, 1500)
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
              <Pencil size={24} style={{ color: '#D97706' }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Profile Updated!</p>
            <p style={{ fontSize: 13, color: '#6B7280' }}>Your school profile has been saved.</p>
          </div>
        ) : (
          <form onSubmit={handleSave} style={{ maxHeight: '70vh', overflowY: 'auto', scrollbarWidth: 'none' }}>
            <div className="px-5 py-5 space-y-4">

              {/* Cover / Logo upload */}
              <div className="flex gap-3">
                <button type="button"
                  className="flex-1 flex flex-col items-center gap-1.5 py-4 rounded-xl cursor-pointer"
                  style={{ border: '2px dashed #E5E7EB', background: '#F9FAFB' }}
                >
                  <Upload size={16} style={{ color: '#9CA3AF' }} />
                  <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>Upload Cover Photo</span>
                </button>
                <button type="button"
                  className="flex-1 flex flex-col items-center gap-1.5 py-4 rounded-xl cursor-pointer"
                  style={{ border: '2px dashed #E5E7EB', background: '#F9FAFB' }}
                >
                  <Upload size={16} style={{ color: '#9CA3AF' }} />
                  <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>Upload Logo</span>
                </button>
              </div>

              {/* School Name */}
              <Field label="School Name" icon={<Pencil size={13} style={{ color: '#9CA3AF' }} />}>
                <input type="text" value={form.name} onChange={set('name')}
                  className="input-field" style={inputStyle} />
              </Field>

              {/* Discipline */}
              <Field label="Discipline / Type">
                <input type="text" value={form.discipline} onChange={set('discipline')}
                  className="input-field" style={inputStyle} />
              </Field>

              {/* Address */}
              <Field label="Address" icon={<MapPin size={13} style={{ color: '#9CA3AF' }} />}>
                <input type="text" value={form.address} onChange={set('address')}
                  className="input-field" style={inputStyle} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                {/* Website */}
                <Field label="Website" icon={<Globe size={13} style={{ color: '#9CA3AF' }} />}>
                  <input type="text" value={form.website} onChange={set('website')}
                    className="input-field" style={inputStyle} />
                </Field>
                {/* Phone */}
                <Field label="Phone" icon={<Phone size={13} style={{ color: '#9CA3AF' }} />}>
                  <input type="tel" value={form.phone} onChange={set('phone')}
                    className="input-field" style={inputStyle} />
                </Field>
              </div>

              {/* Email */}
              <Field label="Contact Email" icon={<Mail size={13} style={{ color: '#9CA3AF' }} />}>
                <input type="email" value={form.email} onChange={set('email')}
                  className="input-field" style={inputStyle} />
              </Field>

              {/* Description */}
              <Field label="Description">
                <textarea value={form.description} onChange={set('description')} rows={3}
                  className="resize-none"
                  style={{ ...inputStyle, paddingTop: 10, paddingBottom: 10 }} />
              </Field>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 flex gap-3" style={{ borderTop: '1px solid #F3F4F6' }}>
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
                style={{ border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>
                Cancel
              </button>
              <button type="submit"
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer"
                style={{ background: '#D97706', border: 'none' }}>
                Save Changes
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 10,
  border: '1px solid #E5E7EB', outline: 'none', fontSize: 13, color: '#111827',
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
