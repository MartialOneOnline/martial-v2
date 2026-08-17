// The GDPR "digital consent age" varies 13–16 by EU member state (Art. 8);
// 16 is the strictest of the countries this platform operates in, used as a
// single global threshold rather than a per-country lookup (the student's
// own country isn't known at /complete-profile time — only the school's is).
export const MIN_CONSENT_AGE = 16

// Full year/month/day comparison, not just a year subtraction — someone
// born this calendar year hasn't had their birthday yet is still the
// younger age until the actual date passes.
export function calculateAge(dateOfBirth: string | Date): number {
  const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--
  return age
}
