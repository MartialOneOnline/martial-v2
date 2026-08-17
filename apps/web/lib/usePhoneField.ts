import { useMemo, useState } from 'react'
import { AsYouType, getCountryCallingCode, type CountryCode } from 'libphonenumber-js'
import { COUNTRIES } from '@/lib/countries'

export function flagEmoji(iso: string): string {
  return iso.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)))
}

// Reuses the same 21-country list /register and /onboarding/school already
// show for "Country" — every one of them resolves to a real ITU calling
// code via libphonenumber-js, so no separate dial-code data file is needed.
export const DIAL_CODES = COUNTRIES.map(([code, name]) => ({
  code: code as CountryCode,
  name,
  dial: getCountryCallingCode(code as CountryCode),
}))

function splitE164(value: string): { country: CountryCode; national: string } {
  if (value) {
    // Longest dial code first — otherwise a shared prefix (e.g. +1) could
    // match the wrong country before a more specific one is tried.
    const match = [...DIAL_CODES].sort((a, b) => b.dial.length - a.dial.length)
      .find(c => value.startsWith(`+${c.dial}`))
    if (match) return { country: match.code, national: value.slice(match.dial.length + 1) }
  }
  return { country: 'ES', national: value.replace(/^\+/, '') }
}

// Shared behavior behind every phone input in the app: a country/dial-code
// selector plus a live-formatted national number, communicating with the
// caller purely in E.164 (+34600123456) — so the stored value is always
// unambiguous and WhatsApp/SMS-ready regardless of how it was typed, no
// matter which presentational component (PhoneField, or a page's own
// inline markup) renders the two controls.
export function usePhoneField(value: string, onChange: (e164: string) => void) {
  const initial = useMemo(() => splitE164(value), []) // eslint-disable-line react-hooks/exhaustive-deps
  const [country, setCountry] = useState<CountryCode>(initial.country)
  const [national, setNational] = useState(initial.national)

  function emit(nextCountry: CountryCode, nextNational: string) {
    const dial = DIAL_CODES.find(c => c.code === nextCountry)!.dial
    const digits = nextNational.replace(/\D/g, '')
    onChange(digits ? `+${dial}${digits}` : '')
  }

  function setNationalInput(raw: string) {
    const formatted = new AsYouType(country).input(raw)
    setNational(formatted)
    emit(country, formatted)
  }

  function setCountryCode(next: CountryCode) {
    setCountry(next)
    const digits = national.replace(/\D/g, '')
    const formatted = new AsYouType(next).input(digits)
    setNational(formatted)
    emit(next, formatted)
  }

  return { country, national, setCountryCode, setNationalInput }
}
