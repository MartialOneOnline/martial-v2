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
// cleaning up first.

const CALLING_CODE: Record<string, string> = {
  ES: '34', PT: '351', GB: '44', IE: '353', FR: '33', NL: '31', DE: '49', IT: '39',
  BR: '55', US: '1', VE: '58', AE: '971', AU: '61', JP: '81',
}

/** The phone as entered, or null when empty / a "NULL" placeholder / has no digits. */
export function cleanPhone(raw: string | null | undefined): string | null {
  const s = raw?.trim()
  if (!s || /^null$/i.test(s) || !/\d/.test(s)) return null
  return s
}

/**
 * Digits for https://wa.me/<digits>: international numbers ("+34…", "0034…")
 * keep their code; national numbers get the school country's calling code.
 */
export function whatsappNumber(raw: string | null | undefined, schoolCountry: string | null | undefined): string | null {
  const phone = cleanPhone(raw)
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (phone.startsWith('+')) return digits
  if (digits.startsWith('00')) return digits.slice(2)
  const code = schoolCountry ? CALLING_CODE[schoolCountry.toUpperCase()] : undefined
  if (!code) return digits
  // Already has the code but no "+" (e.g. "34612345678")
  if (digits.startsWith(code) && digits.length > 10) return digits
  return code + digits.replace(/^0+/, '')
}
