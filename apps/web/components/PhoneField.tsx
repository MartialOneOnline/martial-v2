'use client'

import { usePhoneField, DIAL_CODES, flagEmoji } from '@/lib/usePhoneField'

const BORDER = '#E5E7EB'
const TEXT = '#101828'

// Segmented phone input for the auth-flow pages (register, complete-profile):
// a country/dial-code select on the left, formatted national number on the
// right. See usePhoneField for the shared formatting/E.164 logic — /my/profile
// uses that same hook with its own (Tailwind/iOS-style) markup instead of
// this component, since the two pages don't share a visual language.
export function PhoneField({ label, value, onChange, error, placeholder = 'Phone number' }: {
  label: string; value: string; onChange: (e164: string) => void
  error?: string; placeholder?: string
}) {
  const { country, national, setCountryCode, setNationalInput } = usePhoneField(value, onChange)
  const borderColor = error ? '#DC2626' : BORDER

  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 6 }}>{label}</label>
      <div style={{ display: 'flex', border: `1px solid ${borderColor}`, borderRadius: 10, overflow: 'hidden' }}>
        <select
          value={country}
          onChange={e => setCountryCode(e.target.value as typeof country)}
          aria-label="Country code"
          style={{ border: 'none', borderRight: `1px solid ${borderColor}`, padding: '11px 8px', fontSize: 14, color: TEXT, background: '#fff', outline: 'none', flexShrink: 0 }}
        >
          {DIAL_CODES.map(c => (
            <option key={c.code} value={c.code}>{flagEmoji(c.code)} +{c.dial}</option>
          ))}
        </select>
        <input
          type="tel"
          value={national}
          onChange={e => setNationalInput(e.target.value)}
          placeholder={placeholder}
          style={{ flex: 1, minWidth: 0, padding: '11px 14px', fontSize: 15, border: 'none', outline: 'none', color: TEXT, background: 'transparent' }}
        />
      </div>
      {error && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#DC2626' }}>{error}</p>}
    </div>
  )
}
