/**
 * Security tests for POST /api/claim/[id] — from the invitation/registration
 * audit (2026-07-06). This endpoint trusts nothing but the SchoolInvitation
 * `id` (a cuid) in the URL — unlike the student invite flow, there is no
 * Supabase-signed token involved.
 *
 * Mitigated (2026-07-06): no longer silently overwrites the password or
 * global role of a pre-existing account, and a createdAt-based TTL rejects
 * old invitations.
 *
 * Still open, by explicit decision: the `id` itself is still the only thing
 * required to claim a school when no pre-existing account conflicts — see
 * the first test below, which is intentionally left red.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockListUsers = vi.fn()
const mockUpdateUserById = vi.fn()
const mockCreateUser = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: {
      admin: {
        listUsers: mockListUsers,
        updateUserById: mockUpdateUserById,
        createUser: mockCreateUser,
      },
    },
  }),
}))
vi.mock('next/headers', () => ({
  cookies: async () => ({ getAll: () => [], setAll: () => {} }),
}))

const mockInvitationFindUnique = vi.fn()
const mockInvitationUpdate = vi.fn(async () => ({}))
const mockUserFindFirst = vi.fn()
const mockUserUpdate = vi.fn(async (_args: { where: { id: string }; data: Record<string, unknown> }) => ({}))
const mockUserCreate = vi.fn()
const mockSchoolFindFirst = vi.fn(async () => null)
const mockSchoolCreate = vi.fn()
const mockSchoolUpdate = vi.fn(async () => ({}))
const mockMemberUpsert = vi.fn(async () => ({}))
const mockPreferenceUpsert = vi.fn(async () => ({}))

vi.mock('@/lib/db', () => ({
  prisma: {
    schoolInvitation: {
      findUnique: mockInvitationFindUnique,
      update: mockInvitationUpdate,
    },
    user: {
      findFirst: mockUserFindFirst,
      update: mockUserUpdate,
      create: mockUserCreate,
    },
    school: {
      findFirst: mockSchoolFindFirst,
      create: mockSchoolCreate,
      update: mockSchoolUpdate,
    },
    schoolMember: {
      upsert: mockMemberUpsert,
    },
    userPreference: {
      upsert: mockPreferenceUpsert,
    },
  },
}))

const { POST } = await import('@/app/api/claim/[id]/route')

function makeReq(body: Record<string, unknown>) {
  return { json: async () => body } as any
}
function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

const baseInvitation = {
  id: 'inv-1',
  email: 'newowner@example.com',
  name: 'New Academy',
  schoolId: null,
  status: 'SENT',
  createdAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour old — clock-relative so it's never accidentally "expired"
  school: null,
}

describe('POST /api/claim/[id] — security gaps (audit finding, P0)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInvitationFindUnique.mockResolvedValue({ ...baseInvitation })
    mockListUsers.mockResolvedValue({ data: { users: [] } })
    mockCreateUser.mockResolvedValue({ data: { user: { id: 'supabase-new-1' } }, error: null })
    mockUserFindFirst.mockResolvedValue(null)
    mockUserCreate.mockResolvedValue({ id: 'user-new-1' })
    mockSchoolCreate.mockResolvedValue({ id: 'school-new-1' })
  })

  // P0 residual, deferred by explicit decision (2026-07-06): claiming still
  // only requires knowing the invitation `id` — a bare id+password is enough
  // when no pre-existing account conflicts. Swapping `id` for the unused
  // `token` column would NOT close this — both are equally opaque cuids, so
  // it'd just be a different bearer secret with the same threat model. The
  // real fix is a second factor (e.g. Supabase-verified email, same pattern
  // as the student invite flow), which is a bigger change than this
  // stabilization round covers. Left as `.todo` — not a passing assertion,
  // not a false-green — so it stays visible until that real fix lands.
  it.todo('reject claiming a school with only the invitation id + a chosen password — requires a real second factor (e.g. Supabase-verified email), not just a differently-named opaque id')

  it('fixed: must not silently overwrite the password of a pre-existing Supabase user matching the invitation email', async () => {
    mockListUsers.mockResolvedValue({ data: { users: [{ id: 'existing-auth-1', email: 'newowner@example.com' }] } })
    const res = await POST(makeReq({ name: 'Someone', password: 'brandNewPassword1' }), makeParams('inv-1'))
    expect(mockUpdateUserById).not.toHaveBeenCalled()
    expect(res.status).toBe(409)
  })

  it('fixed: must not overwrite an existing Prisma User\'s role to SCHOOL_OWNER (claimed via a fresh Supabase account, e.g. an existing STUDENT elsewhere)', async () => {
    // No pre-existing Supabase auth user (so a new one gets created), but a
    // Prisma User row already exists for this email — e.g. someone invited
    // as a STUDENT to a different school who hasn't accepted that invite yet.
    mockUserFindFirst.mockResolvedValue({ id: 'user-existing-1', role: 'STUDENT', name: 'Existing Name' })
    await POST(makeReq({ name: 'Someone', password: 'brandNewPassword1' }), makeParams('inv-1'))
    expect(mockUserUpdate).toHaveBeenCalled()
    const updateCall = mockUserUpdate.mock.calls[0]
    // Desired: role should not be silently overwritten for a pre-existing user.
    expect(updateCall?.[0]?.data?.role).toBeUndefined()
  })

  it('control: an invitation already REGISTERED is correctly rejected (410)', async () => {
    mockInvitationFindUnique.mockResolvedValue({ ...baseInvitation, status: 'REGISTERED' })
    const res = await POST(makeReq({ name: 'Bob', password: 'password123' }), makeParams('inv-1'))
    expect(res.status).toBe(410)
  })

  it('fixed: a 6-month-old invitation is now rejected as expired (createdAt-based TTL, no schema change)', async () => {
    // SchoolInvitation has no `expiresAt` column; the fix uses createdAt with
    // a hardcoded 30-day TTL. Clock-relative so it's never accidentally fresh.
    mockInvitationFindUnique.mockResolvedValue({
      ...baseInvitation,
      createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      status: 'SENT',
    })
    const res = await POST(makeReq({ name: 'Bob', password: 'password123' }), makeParams('inv-1'))
    const json = await res.json()
    expect(json.ok).not.toBe(true)
    expect(res.status).toBe(410)
  })
})
