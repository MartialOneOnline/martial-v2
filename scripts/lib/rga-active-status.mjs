// Pure selection/matching logic behind scripts/fix-rga-active-status.mjs,
// kept dependency-free (no Supabase, no fs) so it's directly unit-testable.

export function blank(v) {
  return v === '' || v === 'NULL' || v == null
}

// V1's own "Active" list = member_status='active' AND user_type='3' (student)
// AND parent_id IS NULL (top-level account — V1 doesn't count family
// sub-accounts separately). Per the confirmed decision, this app instead
// keeps family sub-accounts as ACTIVE (V2 has no family-account concept and
// they do train) — so parent_id is deliberately NOT part of this filter.
// Only user_type='3' (student) and member_status='active' are required.
export function deriveActiveV1Ids(v1Users) {
  return new Set(
    v1Users
      .filter(u => u.member_status === 'active' && u.user_type === '3')
      .map(u => u.id),
  )
}

// Unambiguous lowercase-email -> V1 id map, for the controlled fallback match
// when a SchoolMember has no v1_student: notes marker. Any email shared by
// more than one V1 user id is dropped entirely rather than guessed at.
export function buildEmailFallbackMap(v1Users) {
  const counts = new Map()
  for (const u of v1Users) {
    if (blank(u.email)) continue
    const e = u.email.trim().toLowerCase()
    counts.set(e, (counts.get(e) ?? 0) + 1)
  }
  const map = new Map()
  for (const u of v1Users) {
    if (blank(u.email)) continue
    const e = u.email.trim().toLowerCase()
    if (counts.get(e) === 1) map.set(e, u.id)
  }
  return map
}

const NOTES_RE = /^v1_student:(\d+)$/

// Resolves which V1 id (if any) a SchoolMember matches, preferring the notes
// marker over the email fallback. Returns { v1Id, matchMethod } or
// { v1Id: null, matchMethod: null } when neither identifies it.
export function matchV1Id(member, emailByUserId, v1IdByEmail) {
  const notesMatch = member.notes && member.notes.match(NOTES_RE)
  if (notesMatch) return { v1Id: notesMatch[1], matchMethod: 'notes' }

  const email = emailByUserId.get(member.userId)
  if (email && v1IdByEmail.has(email)) {
    return { v1Id: v1IdByEmail.get(email), matchMethod: 'email' }
  }
  return { v1Id: null, matchMethod: null }
}

// Full per-member decision: whether/how it was matched to V1, and — if
// matched — whether it needs a status update. Pure function, no I/O; the
// caller supplies the pre-built lookup maps.
//
// skipReason values: 'non-student-role' | 'unmatched' | 'v1-id-missing-from-export' | null
export function resolveMember(member, { emailByUserId, v1IdByEmail, v1UserById, activeV1Ids }) {
  if (member.role !== 'STUDENT') {
    return { skipReason: 'non-student-role', v1Id: null, matchMethod: null, target: null }
  }

  const { v1Id, matchMethod } = matchV1Id(member, emailByUserId, v1IdByEmail)
  if (!v1Id) {
    return { skipReason: 'unmatched', v1Id: null, matchMethod: null, target: null }
  }
  if (!v1UserById.has(v1Id)) {
    return { skipReason: 'v1-id-missing-from-export', v1Id, matchMethod, target: null }
  }

  const target = activeV1Ids.has(v1Id) ? 'ACTIVE' : 'ARCHIVED'
  return { skipReason: null, v1Id, matchMethod, target }
}
