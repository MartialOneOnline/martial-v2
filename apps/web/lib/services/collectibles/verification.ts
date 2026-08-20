import { randomBytes } from 'crypto'

// Crockford-ish base32 (no 0/O/1/I/L) so a hand-typed or read-aloud code
// can't be confused between similar-looking characters.
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
const CODE_LENGTH = 10

// Random, non-sequential public verification code — deliberately NOT derived
// from editionNumber/collectionId (a predictable code would let someone guess
// neighboring units' verification URLs). crypto.randomBytes, not Math.random.
export function generateVerificationCode(): string {
  const bytes = randomBytes(CODE_LENGTH)
  let code = ''
  for (const byte of bytes) {
    code += CODE_ALPHABET[byte % CODE_ALPHABET.length]
  }
  return code
}

// Zero-padded to the width of totalUnits, e.g. generateSku('BUC-LEGACY-2026', 7, 50) -> 'BUC-LEGACY-2026-07'
export function generateSku(prefix: string, editionNumber: number, totalUnits: number): string {
  const width = String(totalUnits).length
  return `${prefix}-${String(editionNumber).padStart(width, '0')}`
}

// "07/50" — derived, never stored (see CollectibleUnit schema comment).
export function formatDisplayNumber(editionNumber: number, totalUnits: number): string {
  const width = String(totalUnits).length
  return `${String(editionNumber).padStart(width, '0')}/${totalUnits}`
}
