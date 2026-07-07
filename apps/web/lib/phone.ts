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
