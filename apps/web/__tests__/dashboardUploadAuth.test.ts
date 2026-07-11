/**
 * Tests for POST /api/dashboard/upload — the file-upload endpoint used by
 * avatars/logo/cover (bucket=avatars) and class/event images
 * (bucket=class-images). Previously only checked getAuthUser(), so any
 * authenticated user — even one with no SchoolMember row anywhere, or a
 * STUDENT — could upload through it. It also forwarded whatever `bucket`
 * query param it received straight to the Supabase Storage REST API using
 * the service-role key (bypasses RLS), with no allow-list.
 *
 * Hardened to: require a staff SchoolMember of the current school (same
 * DASHBOARD_ROLES set that gates /dashboard entry — everyone except
 * STUDENT), reject any bucket not on a fixed allow-list before ever calling
 * Supabase, and derive the stored file extension from the validated
 * File.type instead of the client-supplied filename (no path-traversal
 * surface via File.name).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import type { SchoolMemberRole } from '@/lib/prisma-client/enums'

const mockGetAuthUser = vi.fn()
const mockGetCurrentSchoolId = vi.fn()
const mockRequireSchoolAccess = vi.fn()

vi.mock('@/lib/auth/server', () => ({
  getAuthUser: mockGetAuthUser,
  getCurrentSchoolId: mockGetCurrentSchoolId,
}))

vi.mock('@/lib/auth/contexts', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/contexts')>('@/lib/auth/contexts')
  return {
    ...actual,
    requireSchoolAccess: mockRequireSchoolAccess,
  }
})

const { POST } = await import('@/app/api/dashboard/upload/route')

function uploadRequest(qs: string, file?: { name: string; type: string; size: number }) {
  const form = new FormData()
  if (file) {
    // Actually allocate `size` bytes — File.size (which the route checks)
    // reflects real content length, not a metadata field we can fake.
    const blob = new Blob([new Uint8Array(file.size)], { type: file.type })
    form.append('file', new File([blob], file.name, { type: file.type }))
  }
  return new NextRequest(`http://localhost/api/dashboard/upload${qs}`, { method: 'POST', body: form })
}

function jpeg(size = 1024, name = 'photo.jpg') {
  return { name, type: 'image/jpeg', size }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({}),
  }))
  mockGetAuthUser.mockResolvedValue({ id: 'user-1', role: 'SCHOOL_OWNER' })
  mockGetCurrentSchoolId.mockResolvedValue('school-1')
  mockRequireSchoolAccess.mockResolvedValue({ role: 'OWNER', status: 'ACTIVE' })
})

describe('POST /api/dashboard/upload — auth', () => {
  it('401s when there is no authenticated user', async () => {
    mockGetAuthUser.mockResolvedValue(null)

    const res = await POST(uploadRequest('?bucket=avatars', jpeg()))

    expect(res.status).toBe(401)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('403s a STUDENT SchoolMember of the current school', async () => {
    mockRequireSchoolAccess.mockResolvedValue({ role: 'STUDENT', status: 'ACTIVE' })

    const res = await POST(uploadRequest('?bucket=avatars', jpeg()))

    expect(res.status).toBe(403)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('403s a user with no SchoolMember row in the current school', async () => {
    mockRequireSchoolAccess.mockRejectedValue(new Error('FORBIDDEN'))

    const res = await POST(uploadRequest('?bucket=avatars', jpeg()))

    expect(res.status).toBe(403)
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each<SchoolMemberRole>(['OWNER', 'ADMIN', 'MANAGER', 'INSTRUCTOR', 'ASSISTANT_INSTRUCTOR', 'RECEPTIONIST'])(
    'allows every staff role (%s) through to the upload',
    async (role) => {
      mockRequireSchoolAccess.mockResolvedValue({ role, status: 'ACTIVE' })

      const res = await POST(uploadRequest('?bucket=avatars', jpeg()))

      expect(res.status).toBe(200)
      expect(fetch).toHaveBeenCalledTimes(1)
    },
  )

  it('SUPERADMIN bypasses the SchoolMember role check', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'admin-1', role: 'SUPERADMIN' })
    mockRequireSchoolAccess.mockRejectedValue(new Error('FORBIDDEN')) // must not even be consulted

    const res = await POST(uploadRequest('?bucket=avatars', jpeg()))

    expect(res.status).toBe(200)
    expect(mockRequireSchoolAccess).not.toHaveBeenCalled()
  })
})

describe('POST /api/dashboard/upload — bucket allow-list', () => {
  it('rejects a bucket not on the allow-list and never calls Supabase', async () => {
    const res = await POST(uploadRequest('?bucket=some-other-bucket', jpeg()))

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/bucket/i)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('accepts the avatars bucket', async () => {
    const res = await POST(uploadRequest('?bucket=avatars', jpeg()))
    expect(res.status).toBe(200)
  })

  it('accepts the class-images bucket', async () => {
    const res = await POST(uploadRequest('?bucket=class-images', jpeg()))
    expect(res.status).toBe(200)
  })

  it('defaults to avatars when bucket is omitted (existing behaviour preserved)', async () => {
    const res = await POST(uploadRequest('', jpeg()))
    expect(res.status).toBe(200)
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    expect(fetchMock.mock.calls[0]![0]).toContain('/object/avatars/')
  })
})

describe('POST /api/dashboard/upload — file validation', () => {
  it('400s when no file is provided', async () => {
    const res = await POST(uploadRequest('?bucket=avatars'))
    expect(res.status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('400s an unsupported file type', async () => {
    const res = await POST(uploadRequest('?bucket=avatars', { name: 'doc.pdf', type: 'application/pdf', size: 1024 }))
    expect(res.status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('400s a file over the size limit', async () => {
    const res = await POST(uploadRequest('?bucket=avatars', jpeg(6 * 1024 * 1024)))
    expect(res.status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('derives the storage path extension from File.type, not the client filename', async () => {
    // A weird/hostile filename must not influence the storage path — only
    // the validated MIME type does.
    await POST(uploadRequest('?bucket=avatars', { name: '../../../etc/passwd', type: 'image/png', size: 1024 }))

    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    const calledUrl = fetchMock.mock.calls[0]![0] as string
    expect(calledUrl).toMatch(/\/object\/avatars\/user-1-\d+\.png$/)
    expect(calledUrl).not.toContain('..')
    expect(calledUrl).not.toContain('passwd')
  })

  it('accepts png and webp, mapping to the right extension', async () => {
    await POST(uploadRequest('?bucket=avatars', { name: 'a', type: 'image/png', size: 1024 }))
    let fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    expect(fetchMock.mock.calls[0]![0]).toMatch(/\.png$/)

    vi.clearAllMocks()
    mockGetAuthUser.mockResolvedValue({ id: 'user-1', role: 'SCHOOL_OWNER' })
    mockGetCurrentSchoolId.mockResolvedValue('school-1')
    mockRequireSchoolAccess.mockResolvedValue({ role: 'OWNER', status: 'ACTIVE' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))

    await POST(uploadRequest('?bucket=avatars', { name: 'a', type: 'image/webp', size: 1024 }))
    fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    expect(fetchMock.mock.calls[0]![0]).toMatch(/\.webp$/)
  })
})

describe('POST /api/dashboard/upload — existing callers stay covered', () => {
  // Mirrors the real fetch() calls in SettingsClient (avatar/logo/cover) and
  // ClassesClient/EventsClient/MembershipsClient (class images) — see grep
  // for `dashboard/upload` across apps/web/app.
  it.each([
    ['avatars self-avatar (ProfileTab)', '?bucket=avatars'],
    ['avatars school logo/cover (Organization tab)', '?bucket=avatars'],
    ['class-images (ClassesClient/EventsClient/MembershipsClient)', '?bucket=class-images'],
  ])('%s still succeeds for an OWNER', async (_label, qs) => {
    const res = await POST(uploadRequest(qs, jpeg()))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.url).toBeTruthy()
  })
})
