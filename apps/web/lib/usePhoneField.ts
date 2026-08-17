import { useMemo, useState } from 'react'
import {
  AsYouType, getCountries, getCountryCallingCode, isPossiblePhoneNumber, type CountryCode,
} from 'libphonenumber-js'

export function flagEmoji(iso: string): string {
  return iso.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)))
}

// Region display names via the standard Intl API — avoids hand-maintaining a
// 245-country name list alongside libphonenumber-js's own country/dial-code
// data. Both are broadly supported in modern Node/browsers; the ?? fallback
// only matters for an environment old enough to lack Intl.DisplayNames.
const REGION_NAMES = typeof Intl !== 'undefined' && 'DisplayNames' in Intl
  ? new Intl.DisplayNames(['en'], { type: 'region' })
  : null

// Every ITU-assigned calling code libphonenumber-js knows about (~245
// countries/territories) — not just the ~20 this app's own school/register
// forms list as "likely" countries. Spain pinned first as the primary
// market, the rest alphabetical by display name.
export const DIAL_CODES: { code: CountryCode; name: string; dial: string }[] = getCountries()
  .map(code => ({ code, name: REGION_NAMES?.of(code) ?? code, dial: getCountryCallingCode(code) }))
  .sort((a, b) => (a.code === 'ES' ? -1 : b.code === 'ES' ? 1 : a.name.localeCompare(b.name)))

function splitE164(value: string): { country: CountryCode; national: string } {
  if (value) {
    // Longest dial code first — otherwise a shared prefix (e.g. +1) could
    // match the wrong country before a more specific one is tried. Several
    // countries genuinely share a calling code (NANP: US/CA/several
    // Caribbean nations all use +1) — this picks whichever sorts first
    // among them, which only affects which flag the selector defaults to,
    // never the stored E.164 value itself.
    const match = [...DIAL_CODES].sort((a, b) => b.dial.length - a.dial.length)
      .find(c => value.startsWith(`+${c.dial}`))
    if (match) return { country: match.code, national: value.slice(match.dial.length + 1) }
  }
  return { country: 'ES', national: value.replace(/^\+/, '') }
}

// The longest digit-count that's still a *possible* number for this
// country (e.g. 9 for Spain) — found by probing, since libphonenumber-js
// doesn't expose a per-country max length directly. Used purely as an input
// cap (stop the field from growing past this many digits); real validity is
// still decided by isValidPhoneNumber at submit time, this just stops
// someone typing an obviously-too-long number in the first place.
const maxLengthCache = new Map<CountryCode, number>()
function maxNationalLength(country: CountryCode): number {
  const cached = maxLengthCache.get(country)
  if (cached !== undefined) return cached
  let max = 15
  for (let n = 15; n >= 4; n--) {
    if (isPossiblePhoneNumber('1'.repeat(n), country)) { max = n; break }
  }
  maxLengthCache.set(country, max)
  return max
}

// Shared behavior behind every phone input in the app: a country/dial-code
// selector plus a live-formatted, length-capped national number,
// communicating with the caller purely in E.164 (+34600123456) — so the
// stored value is always unambiguous and WhatsApp/SMS-ready regardless of
// how it was typed, no matter which presentational component (PhoneField,
// or a page's own inline markup) renders the two controls.
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
    const digits = raw.replace(/\D/g, '').slice(0, maxNationalLength(country))
    const formatted = new AsYouType(country).input(digits)
    setNational(formatted)
    emit(country, formatted)
  }

  function setCountryCode(next: CountryCode) {
    setCountry(next)
    const digits = national.replace(/\D/g, '').slice(0, maxNationalLength(next))
    const formatted = new AsYouType(next).input(digits)
    setNational(formatted)
    emit(next, formatted)
  }

  return { country, national, setCountryCode, setNationalInput }
}
