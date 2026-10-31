import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js'

// Normalizes a phone number for loose equality checks (anti-abuse matching),
// not for storage, display, or dialing — this is not a full E.164 parser.
// Treats "+34 600 000 000", "0034 600 000 000", "+34600000000", and
// "600000000" as the same number.
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/[^\d+]/g, '') // strip spaces, dashes, parens, dots — keep a leading +
  if (digits.startsWith('00')) digits = '+' + digits.slice(2) // 0034... -> +34...
  if (!digits.startsWith('+')) {
    // No country code — assume Spain (the platform's primary market) for a
    // bare national mobile number.
    digits = '+34' + digits.replace(/^0+/, '')
  }
  return digits
}

// ── Contacting students (Users report) ───────────────────────────────────────
// Imported V1 data stores missing phones as the literal string "NULL" and most
// Spanish numbers without a country code ("612345678"), so wa.me links need
// cleaning up first. National numbering rules (Italy keeps its leading 0,
// most countries drop it) come from libphonenumber-js, not hand-rolled rules.

/** The phone as entered, or null when empty / a "NULL" placeholder / has no digits. */
export function cleanPhone(raw: string | null | undefined): string | null {
  const s = raw?.trim()
  if (!s || /^null$/i.test(s) || !/\d/.test(s)) return null
  return s
}

/**
 * Digits for https://wa.me/<digits> (E.164 without "+"), or null when the
 * number can't be resolved to a valid international number — better no
 * WhatsApp button than one that opens a chat with the wrong person.
 * National numbers are read with the school's country as default region.
 */
export function whatsappNumber(raw: string | null | undefined, schoolCountry: string | null | undefined): string | null {
  const phone = cleanPhone(raw)
  if (!phone) return null
  const region = schoolCountry && /^[A-Za-z]{2}$/.test(schoolCountry) ? schoolCountry.toUpperCase() as CountryCode : undefined
  const parsed = parsePhoneNumberFromString(phone.replace(/^00/, '+'), region)
  if (!parsed || !parsed.isValid()) return null
  return parsed.number.slice(1)
}
