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
 * Supabase, and derive the stored file extension from the file's real byte
 * signature (see validateImageUpload.ts) rather than the client-declared
 * File.type or filename — neither of which is trustworthy, both are just
 * strings the caller sets. No path-traversal surface via File.name either
 * way, since the path was already server-derived before this.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import sharp from 'sharp'
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

// Real magic-byte prefixes so fixtures pass the route's byte-sniffing —
// a fixture whose type/name claims an image but whose bytes don't match one
// of these is exactly the "spoofed upload" case the route now rejects.
const SIGNATURES: Record<string, number[]> = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png':  [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  'image/webp': [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50],
}

// The route now decodes + re-encodes every upload with sharp, so
// "valid image" fixtures must be real decodable images, not just a magic
// number followed by zeros (that case is now the "corrupt image" fixture).
async function realImage(format: 'jpeg' | 'png' | 'webp', width = 64, height = 48) {
  const img = sharp({ create: { width, height, channels: 3, background: { r: 200, g: 30, b: 30 } } })
  return new Uint8Array(await img.toFormat(format).toBuffer())
}
const REAL: Record<string, Uint8Array> = {
  'image/jpeg': await realImage('jpeg'),
  'image/png':  await realImage('png'),
  'image/webp': await realImage('webp'),
}

type Fixture = {
  name: string; type: string; size: number
  // true (default): a real decodable image of `type` (size ignored)
  // 'signature': magic number padded with zeros to `size` — passes the
  //   sniff but can't be decoded (also used for the oversize case)
  // false: zero bytes, fails the sniff
  realBytes?: true | 'signature' | false
  bytes?: Uint8Array
}

function uploadRequest(qs: string, file?: Fixture) {
  const form = new FormData()
  if (file) {
    let bytes: Uint8Array
    if (file.bytes) {
      bytes = file.bytes
    } else if ((file.realBytes ?? true) === true && REAL[file.type]) {
      bytes = REAL[file.type]!
    } else {
      // Actually allocate `size` bytes — File.size (which the route checks)
      // reflects real content length, not a metadata field we can fake.
      bytes = new Uint8Array(file.size)
      if (file.realBytes !== false) bytes.set((SIGNATURES[file.type] ?? []).slice(0, file.size))
    }
    const blob = new Blob([bytes as BlobPart], { type: file.type })
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
    const res = await POST(uploadRequest('?bucket=avatars', { ...jpeg(6 * 1024 * 1024), realBytes: 'signature' }))
    expect(res.status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('derives the storage path extension from the real file bytes, not the client filename or declared type', async () => {
    // A weird/hostile filename must not influence the storage path — only
    // the sniffed content does.
    await POST(uploadRequest('?bucket=avatars', { name: '../../../etc/passwd', type: 'image/png', size: 1024 }))

    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    const calledUrl = fetchMock.mock.calls[0]![0] as string
    expect(calledUrl).toMatch(/\/object\/avatars\/user-1-\d+\.webp$/)
    expect(calledUrl).not.toContain('..')
    expect(calledUrl).not.toContain('passwd')
  })

  it('rejects a file that claims to be a JPEG but whose bytes are not one', async () => {
    const res = await POST(uploadRequest('?bucket=avatars', { name: 'photo.jpg', type: 'image/jpeg', size: 1024, realBytes: false }))
    expect(res.status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('400s a file whose signature is valid but whose bytes cannot be decoded', async () => {
    const res = await POST(uploadRequest('?bucket=avatars', { ...jpeg(), realBytes: 'signature' }))
    expect(res.status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('400s an unknown kind before calling Supabase', async () => {
    const res = await POST(uploadRequest('?bucket=avatars&kind=huge', jpeg()))
    expect(res.status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('POST /api/dashboard/upload — image processing', () => {
  function storedUpload() {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    const [url, init] = fetchMock.mock.calls[0]! as [string, RequestInit]
    return { url, headers: init.headers as Record<string, string>, body: init.body as Uint8Array }
  }

  it.each(['image/jpeg', 'image/png', 'image/webp'])('re-encodes %s to WebP', async (type) => {
    const res = await POST(uploadRequest('?bucket=avatars', { name: 'a', type, size: 1024 }))
    expect(res.status).toBe(200)
    const { url, headers, body } = storedUpload()
    expect(url).toMatch(/\.webp$/)
    expect(headers['Content-Type']).toBe('image/webp')
    expect((await sharp(body).metadata()).format).toBe('webp')
  })

  it('sends a long-lived cache-control header', async () => {
    await POST(uploadRequest('?bucket=avatars', jpeg()))
    expect(storedUpload().headers['cache-control']).toBe('max-age=31536000')
  })

  it.each([
    ['avatars (avatar preset)', '?bucket=avatars', 512, 341],
    ['logo preset', '?bucket=avatars&kind=logo', 512, 341],
    ['cover preset', '?bucket=avatars&kind=cover', 1620, 1080],
    ['class-images (image preset)', '?bucket=class-images', 1600, 1067],
  ])('downsizes a large photo for %s without cropping', async (_label, qs, w, h) => {
    const big = await realImage('jpeg', 3000, 2000)
    await POST(uploadRequest(qs, { name: 'big.jpg', type: 'image/jpeg', size: big.length, bytes: big }))
    const meta = await sharp(storedUpload().body).metadata()
    expect(meta.width).toBe(w)
    expect(meta.height).toBe(h)
  })

  it('never enlarges a small image', async () => {
    await POST(uploadRequest('?bucket=avatars&kind=cover', jpeg()))
    const meta = await sharp(storedUpload().body).metadata()
    expect(meta.width).toBe(64)
    expect(meta.height).toBe(48)
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
