/**
 * School-defined CUSTOM staff roles (SchoolMember.role = 'CUSTOM' +
 * customRoleId → StaffRole.permissions) in the dashboard.
 *
 * Before: hasDashboardAccess() / requireDashboardAccess() only knew the 6
 * base staff roles, so a CUSTOM member was sent to /my and refused by every
 * report route. Now they're admitted as staff and judged by their own
 * toggles — exactly what the school switched on, nothing more.
 *
 * Runs the real chain (dashboard layout → hasDashboardAccess, route →
 * requireDashboardAccess / requireSchoolAccess → staffCan → StaffRole
 * lookup) against a small in-memory SchoolMember/StaffRole table. Only the
 * Supabase session, next/* and Prisma are mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── in-memory data ─────────────────────────────────────────────────────────
type Row = { userId: string; schoolId: string; role: string; status: string; customRoleId: string | null }
let members: Row[] = []
let staffRoles: Record<string, string[]> = {}
let currentUser: { id: string; role: string } | null = null

// Minimal Prisma `where` evaluator — enough for the filters the auth code uses
// (equality, { in }, { not: null }, OR), so the tests check real query shapes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function matches(row: any, where: any): boolean {
  return Object.entries(where ?? {}).every(([k, v]) => {
    if (k === 'OR') return (v as unknown[]).some(w => matches(row, w))
    if (k === 'schoolId_userId') {
      const key = v as { schoolId: string; userId: string }
      return row.schoolId === key.schoolId && row.userId === key.userId
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cond = v as any
    if (cond !== null && typeof cond === 'object') {
      if ('in' in cond) return cond.in.includes(row[k])
      if ('not' in cond) return row[k] !== cond.not
    }
    return row[k] === cond
  })
}

const pick = (row: Row | undefined) => row ? { ...row } : null

// Every other model a route may touch answers "nothing there"
function emptyModel() {
  return {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    count: vi.fn().mockResolvedValue(0),
    groupBy: vi.fn().mockResolvedValue([]),
    aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 0 } }),
    update: vi.fn().mockResolvedValue({ modules: null, _count: { gradingSystems: 0 } }),
    upsert: vi.fn().mockResolvedValue({ planCurrency: 'EUR', planPriceMonthly: 0, planPriceQuarterly: 0, planPriceAnnual: 0 }),
  }
}

const db = vi.hoisted(() => ({}) as Record<string, unknown>)

vi.mock('@/lib/db', () => ({ prisma: db }))

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: currentUser ? { id: `auth-${currentUser.id}` } : null } }) },
  }),
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({ getAll: () => [], get: (k: string) => (k === 'currentSchoolId' ? { value: 'school-1' } : undefined) }),
  headers: async () => ({ get: () => null }),
}))

vi.mock('next/navigation', () => ({
  redirect: (url: string) => { throw new Error(`REDIRECT:${url}`) },
  notFound: () => { throw new Error('NOT_FOUND') },
}))

vi.mock('../components/DashboardShell', () => ({ default: ({ children }: { children: unknown }) => children }))

function resetDb() {
  for (const k of Object.keys(db)) delete db[k]
  // Any model not listed below answers "nothing there"
  Object.setPrototypeOf(db, new Proxy({}, {
    get: (_t, k) => (typeof k === 'string' ? (db[k] = emptyModel()) : undefined),
  }))
  Object.assign(db, {
    user: {
      ...emptyModel(),
      findUnique: vi.fn(async () => currentUser
        ? { id: currentUser.id, role: currentUser.role, email: 'x@test.com', name: 'X', deletedAt: null }
        : null),
    },
    userPreference: emptyModel(),
    schoolMember: {
      ...emptyModel(),
      findUnique: vi.fn(async ({ where }) => pick(members.find(r => matches(r, where)))),
      findFirst: vi.fn(async ({ where }) => pick(members.find(r => matches(r, where)))),
      count: vi.fn(async ({ where }) => members.filter(r => matches(r, where)).length),
    },
    staffRole: {
      ...emptyModel(),
      findUnique: vi.fn(async ({ where }) => (where.id in staffRoles ? { permissions: staffRoles[where.id] } : null)),
    },
    school: {
      ...emptyModel(),
      findUnique: vi.fn().mockResolvedValue({ country: 'ES', timezone: 'Europe/Madrid', modules: null, _count: { gradingSystems: 0 } }),
    },
  })
}

// The layout is a server component written for the automatic JSX runtime
;(globalThis as { React?: unknown }).React = (await import('react')).default

const { staffCan } = await import('@/lib/auth/customRoles')
const { requireDashboardAccess } = await import('@/lib/auth/server')
const { hasDashboardAccess } = await import('@/lib/auth/contexts')
const { default: DashboardLayout } = await import('@/app/dashboard/layout')
const paymentsReport = await import('@/app/api/dashboard/reports/payments/route')
const membersRoute = await import('@/app/api/dashboard/members/route')
const schoolRoute = await import('@/app/api/dashboard/school/route')
const billingRoute = await import('@/app/api/dashboard/billing/route')

// ── scenario helpers ───────────────────────────────────────────────────────
const ME = 'user-1'
function signedIn(globalRole = 'STUDENT') { currentUser = { id: ME, role: globalRole } }
function customMember(perms: string[], over: Partial<Row> = {}) {
  staffRoles = { 'role-1': perms }
  members = [{ userId: ME, schoolId: 'school-1', role: 'CUSTOM', status: 'ACTIVE', customRoleId: 'role-1', ...over }]
}
function baseMember(role: string, over: Partial<Row> = {}) {
  members = [{ userId: ME, schoolId: 'school-1', role, status: 'ACTIVE', customRoleId: null, ...over }]
}
const get = (path: string) => new NextRequest(`http://localhost${path}`)
const patch = (path: string, body: unknown) => new NextRequest(`http://localhost${path}`, { method: 'PATCH', body: JSON.stringify(body) })

async function layoutOutcome(): Promise<string> {
  try {
    await DashboardLayout({ children: 'page' })
    return 'dashboard'
  } catch (e) {
    return (e as Error).message
  }
}

beforeEach(() => {
  members = []
  staffRoles = {}
  currentUser = null
  resetDb()
})

// ── staffCan ───────────────────────────────────────────────────────────────
describe('staffCan()', () => {
  it('a CUSTOM role passes only with the toggle on', async () => {
    staffRoles = { r: ['school.members.view'] }
    expect(await staffCan({ role: 'CUSTOM', customRoleId: 'r' }, 'school.members.view')).toBe(true)
    expect(await staffCan({ role: 'CUSTOM', customRoleId: 'r' }, 'school.payments.view')).toBe(false)
  })

  it('a CUSTOM role with no StaffRole, or a deleted one, has nothing', async () => {
    expect(await staffCan({ role: 'CUSTOM', customRoleId: null }, 'school.classes.view')).toBe(false)
    expect(await staffCan({ role: 'CUSTOM', customRoleId: 'gone' }, 'school.classes.view')).toBe(false)
  })

  it('a CUSTOM role is never admitted by a legacy base-role list', async () => {
    staffRoles = { r: [] }
    expect(await staffCan({ role: 'CUSTOM', customRoleId: 'r' }, 'school.bookings.manage', ['OWNER', 'ADMIN', 'INSTRUCTOR'])).toBe(false)
  })

  it('STUDENT never passes, even for permissions its matrix lists (classes.view, bookings.view)', async () => {
    expect(await staffCan({ role: 'STUDENT', customRoleId: null }, 'school.classes.view')).toBe(false)
    expect(await staffCan({ role: 'STUDENT', customRoleId: null }, 'school.bookings.view')).toBe(false)
    expect(await staffCan({ role: 'STUDENT', customRoleId: null }, 'school.classes.view', ['STUDENT'])).toBe(false)
  })

  it('base roles keep their historic route list when one is given, else follow the matrix', async () => {
    // INSTRUCTOR has no members.view in the matrix, but the profile page always let it in
    expect(await staffCan({ role: 'INSTRUCTOR', customRoleId: null }, 'school.members.view', ['OWNER', 'ADMIN', 'INSTRUCTOR'])).toBe(true)
    expect(await staffCan({ role: 'INSTRUCTOR', customRoleId: null }, 'school.members.view')).toBe(false)
    expect(await staffCan({ role: 'MANAGER', customRoleId: null }, 'school.members.view')).toBe(true)
  })
})

// ── requireDashboardAccess ─────────────────────────────────────────────────
describe('requireDashboardAccess() with a CUSTOM role', () => {
  it('admits an ACTIVE CUSTOM member of this school that has the permission the route names', async () => {
    signedIn(); customMember(['school.analytics.view'])
    const { member } = await requireDashboardAccess('school-1', 'school.analytics.view')
    expect(member).toMatchObject({ role: 'CUSTOM', customRoleId: 'role-1' })
  })

  it('refuses it without that permission', async () => {
    signedIn(); customMember(['school.classes.view'])
    await expect(requireDashboardAccess('school-1', 'school.analytics.view')).rejects.toThrow('FORBIDDEN')
  })

  it('refuses it when the route names no permission (fail closed)', async () => {
    signedIn(); customMember(['school.analytics.view'])
    await expect(requireDashboardAccess('school-1')).rejects.toThrow('FORBIDDEN')
  })

  it('refuses an inactive CUSTOM member', async () => {
    signedIn(); customMember(['school.analytics.view'], { status: 'INACTIVE' })
    await expect(requireDashboardAccess('school-1', 'school.analytics.view')).rejects.toThrow('FORBIDDEN')
  })

  it('refuses a CUSTOM member of another school', async () => {
    signedIn(); customMember(['school.analytics.view'], { schoolId: 'school-2' })
    await expect(requireDashboardAccess('school-1', 'school.analytics.view')).rejects.toThrow('FORBIDDEN')
  })

  it('still refuses a STUDENT, whatever permission is asked', async () => {
    signedIn(); baseMember('STUDENT')
    await expect(requireDashboardAccess('school-1', 'school.classes.view')).rejects.toThrow('FORBIDDEN')
  })

  it('base staff roles behave as before', async () => {
    signedIn(); baseMember('INSTRUCTOR')
    await expect(requireDashboardAccess('school-1', 'school.classes.view')).resolves.toBeTruthy()
    await expect(requireDashboardAccess('school-1')).resolves.toBeTruthy()
  })
})

// ── dashboard layout ───────────────────────────────────────────────────────
describe('dashboard layout redirect', () => {
  it('lets an ACTIVE CUSTOM member in', async () => {
    signedIn(); customMember(['school.classes.view'])
    expect(await hasDashboardAccess(ME)).toBe(true)
    expect(await layoutOutcome()).toBe('dashboard')
  })

  it('sends a CUSTOM member with no StaffRole to /my (no permissions at all)', async () => {
    signedIn(); customMember([], { customRoleId: null })
    expect(await layoutOutcome()).toBe('REDIRECT:/my')
  })

  it('sends an inactive CUSTOM member to /my', async () => {
    signedIn(); customMember(['school.classes.view'], { status: 'INACTIVE' })
    expect(await layoutOutcome()).toBe('REDIRECT:/my')
  })

  it('sends a STUDENT to /my', async () => {
    signedIn(); baseMember('STUDENT')
    expect(await layoutOutcome()).toBe('REDIRECT:/my')
  })

  it('still lets base staff and SUPERADMIN in, and sends a signed-out visitor to login', async () => {
    signedIn(); baseMember('RECEPTIONIST')
    expect(await layoutOutcome()).toBe('dashboard')
    members = []; signedIn('SUPERADMIN')
    expect(await layoutOutcome()).toBe('dashboard')
    currentUser = null
    expect(await layoutOutcome()).toBe('REDIRECT:/login?redirect=/dashboard')
  })
})

// ── Payments report end to end (school.analytics.view) ──────────────────────
describe('GET /api/dashboard/reports/payments for a CUSTOM role', () => {
  const call = () => paymentsReport.GET(get('/api/dashboard/reports/payments'))

  it('200 with school.analytics.view', async () => {
    signedIn(); customMember(['school.analytics.view'])
    expect((await call()).status).toBe(200)
  })

  it('403 without it (other toggles on)', async () => {
    signedIn(); customMember(['school.payments.view', 'school.members.view', 'school.settings.manage'])
    expect((await call()).status).toBe(403)
  })

  it('refused for a STUDENT, an inactive CUSTOM member and a CUSTOM member of another school', async () => {
    signedIn(); baseMember('STUDENT')
    expect((await call()).status).toBe(403)
    // Inactive and nothing else: no school to work in at all
    customMember(['school.analytics.view'], { status: 'INACTIVE' })
    expect((await call()).status).toBe(400)
    // Analytics in school-2 says nothing about school-1, where they're a student
    customMember(['school.analytics.view'], { schoolId: 'school-2' })
    members.push({ userId: ME, schoolId: 'school-1', role: 'STUDENT', status: 'ACTIVE', customRoleId: null })
    expect((await call()).status).toBe(403)
  })
})

// ── Members (school.members.view) ──────────────────────────────────────────
describe('GET /api/dashboard/members for a CUSTOM role', () => {
  it('200 with school.members.view, 403 without', async () => {
    signedIn(); customMember(['school.members.view'])
    expect((await membersRoute.GET()).status).toBe(200)
    customMember(['school.analytics.view'])
    expect((await membersRoute.GET()).status).toBe(403)
  })

  it('403 for a STUDENT', async () => {
    signedIn(); baseMember('STUDENT')
    expect((await membersRoute.GET()).status).toBe(403)
  })
})

// ── Settings (school.settings.view / school.settings.manage) ───────────────
describe('school settings for a CUSTOM role', () => {
  it('billing needs school.settings.view', async () => {
    signedIn(); customMember(['school.settings.view'])
    expect((await billingRoute.GET(get('/api/dashboard/billing'))).status).toBe(200)
    customMember(['school.members.view'])
    expect((await billingRoute.GET(get('/api/dashboard/billing'))).status).toBe(403)
  })

  it('saving school settings needs school.settings.manage — view alone is not enough', async () => {
    signedIn(); customMember(['school.settings.view'])
    expect((await schoolRoute.PATCH(patch('/api/dashboard/school', { language: 'es' }))).status).toBe(403)
    customMember(['school.settings.view', 'school.settings.manage'])
    expect((await schoolRoute.PATCH(patch('/api/dashboard/school', { language: 'es' }))).status).toBe(200)
  })

  it('a STUDENT cannot save school settings', async () => {
    signedIn(); baseMember('STUDENT')
    expect((await schoolRoute.PATCH(patch('/api/dashboard/school', { language: 'es' }))).status).toBe(403)
  })
})
