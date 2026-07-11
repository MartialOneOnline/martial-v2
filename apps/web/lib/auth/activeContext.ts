import { prisma } from '@/lib/db'
import { DASHBOARD_ROLES } from './contexts'
import type { SchoolMemberRole } from '../prisma-client/enums'

// This lives next to contexts.ts rather than inside it on purpose:
// contexts.ts answers "can this user get into /dashboard or /my at all"
// (hasDashboardAccess/hasStudentAccess, both global — no schoolId). This file
// answers a different question: "which specific {mode, school} pairs can this
// user switch into, and is a given pair one of them" — the Facebook-style
// context switcher needs a *list* of candidates plus a *validator* for one
// candidate, neither of which the existing functions return. Keeping the pure
// list/validate helpers separate from the access gates means a future PR can
// wire cookies/redirects against this file without touching the already-
// shipped /dashboard and /my guards.

export type ActiveContextMode = 'dashboard' | 'student'

// The persisted/selected context (future PR: read this shape out of a
// cookie). Deliberately minimal — just enough to re-derive everything else
// from the DB on every request, never trusted on its own.
export type ActiveContext = {
  mode: ActiveContextMode
  schoolId: string
}

// One row of a future context-switcher UI. Superset of ActiveContext with
// exactly the display data the schema already has (see prior audit — no
// schema changes needed): School.name/logoUrl for the card, the real
// SchoolMemberRole for a role badge, and an optional subtitle (belt/degree
// for student contexts; null otherwise — dashboard contexts don't have an
// equivalent "progress" line, the role badge already says everything).
export type AvailableContext = ActiveContext & {
  schoolName: string
  schoolLogoUrl: string | null
  role: SchoolMemberRole
  subtitle: string | null
}

// Status filters below intentionally mirror hasDashboardAccess()'s
// `status: 'ACTIVE'` and hasStudentAccess()'s `status: { in: ['ACTIVE',
// 'LEAD', 'FROZEN'] }` (contexts.ts) rather than inventing a third rule. A
// context that wouldn't pass the corresponding hasXAccess() gate has no
// business showing up as "available to switch into" — ARCHIVED and INACTIVE
// memberships fall outside *both* lists, so they never produce a context
// (no ARCHIVED-specific branch needed: it's just never matched).

// Builds every {mode, school} pair this user could switch into right now.
//
// A single SchoolMember row can only ever produce ONE AvailableContext:
// - schema has @@unique([schoolId, userId]) on SchoolMember, so a user has at
//   most one row per school — there is no second row to source a second
//   context from.
// - a row's `role` is a single enum value, either a DASHBOARD_ROLES entry or
//   STUDENT, never both. A staff row that happens to carry non-null
//   belt/beltDegree (e.g. an instructor who is also graded) is still one row
//   with role OWNER/ADMIN/MANAGER/INSTRUCTOR/ASSISTANT_INSTRUCTOR/
//   RECEPTIONIST — it maps to exactly one 'dashboard' context, never an
//   additional 'student' one, no matter what belt/beltDegree hold. Modeling
//   "staff + student in the same school" as two switchable contexts would
//   require a schema change (e.g. allowing two SchoolMember rows per
//   school+user) that is explicitly out of scope here.
//
// SUPERADMIN is not referenced anywhere in this function. This function only
// ever looks at SchoolMember rows, and a SUPERADMIN with no SchoolMember rows
// of their own simply gets an empty array back — correct, since a bare
// superadmin has no school to switch into via this mechanism. The bypass
// that lets a SUPERADMIN reach /admin regardless of SchoolMember happens in
// a separate layer upstream (see the User.role check elsewhere) and this
// function does not need to know about it.
export async function listAvailableContexts(userId: string): Promise<AvailableContext[]> {
  const memberships = await prisma.schoolMember.findMany({
    where: {
      userId,
      OR: [
        { status: 'ACTIVE', role: { in: DASHBOARD_ROLES } },
        { status: { in: ['ACTIVE', 'LEAD', 'FROZEN'] }, role: 'STUDENT' },
      ],
    },
    include: { school: { select: { id: true, name: true, logoUrl: true } } },
  })

  const contexts: AvailableContext[] = memberships
    .filter(m => m.school)
    .map(m => {
      const mode: ActiveContextMode = m.role === 'STUDENT' ? 'student' : 'dashboard'
      return {
        mode,
        schoolId: m.school.id,
        schoolName: m.school.name,
        schoolLogoUrl: m.school.logoUrl,
        role: m.role,
        subtitle: mode === 'student' ? beltSubtitle(m.belt, m.beltDegree) : null,
      }
    })

  // Stable order: dashboard contexts before student ones (a staff+student
  // dual-role user sees their "work" contexts first), then alphabetical by
  // school name within each group — arbitrary but deterministic, avoids the
  // UI reshuffling cards between renders on ties in DB row order.
  return contexts.sort((a, b) => {
    if (a.mode !== b.mode) return a.mode === 'dashboard' ? -1 : 1
    return a.schoolName.localeCompare(b.schoolName)
  })
}

// beltDegree 0 is a real, meaningful value (a fresh belt with no stripes
// yet) but not worth a "· Degree 0" suffix — only show the degree once it's
// actually been earned.
function beltSubtitle(belt: string | null, beltDegree: number | null): string | null {
  if (!belt) return null
  return beltDegree ? `${belt} · Degree ${beltDegree}` : belt
}

// Re-validates a single {mode, schoolId} pair against the DB — never trust a
// context read back from a cookie/client without this. Intentionally makes
// its own query rather than reusing listAvailableContexts() output: this is
// the function a future cookie-reading middleware will call on every
// request, and it should not have to materialize every context the user has
// just to check one.
export async function isValidContext(userId: string, context: ActiveContext): Promise<boolean> {
  const { mode, schoolId } = context

  if (mode === 'dashboard') {
    const count = await prisma.schoolMember.count({
      where: { userId, schoolId, status: 'ACTIVE', role: { in: DASHBOARD_ROLES } },
    })
    return count > 0
  }

  if (mode === 'student') {
    const count = await prisma.schoolMember.count({
      where: { userId, schoolId, status: { in: ['ACTIVE', 'LEAD', 'FROZEN'] }, role: 'STUDENT' },
    })
    return count > 0
  }

  // Exhaustiveness backstop — ActiveContextMode is a closed union, so this is
  // unreachable from valid TS callers, but guards against a bad value
  // arriving from an untyped source (e.g. a cookie parsed with JSON.parse).
  return false
}
