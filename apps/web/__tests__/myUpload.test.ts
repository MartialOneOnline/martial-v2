/**
 * Tests for POST /api/my/upload — student avatar upload. Every upload is
 * resized + re-encoded to WebP (see lib/processImageUpload.ts) and stored at
 * a stable per-user path; the returned URL carries ?v= so the long-lived
 * cache-control never serves the previous photo.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import sharp from 'sharp'

const mockGetAuthUser = vi.fn()
vi.mock('@/lib/auth/server', () => ({ getAuthUser: mockGetAuthUser }))

const { POST } = await import('@/app/api/my/upload/route')

async function jpeg(width: number, height: number) {
  return new Uint8Array(
    await sharp({ create: { width, height, channels: 3, background: { r: 10, g: 120, b: 200 } } }).jpeg().toBuffer(),
  )
}

function uploadRequest(bytes: Uint8Array, type = 'image/jpeg') {
  const form = new FormData()
  form.append('file', new File([bytes as BlobPart], 'me.jpg', { type }))
  return new NextRequest('http://localhost/api/my/upload', { method: 'POST', body: form })
}

function storedUpload() {
  const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
  const [url, init] = fetchMock.mock.calls[0]! as [string, RequestInit]
  return { url, headers: init.headers as Record<string, string>, body: init.body as Uint8Array }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))
  mockGetAuthUser.mockResolvedValue({ id: 'user-1' })
})

describe('POST /api/my/upload', () => {
  it('401s without a session', async () => {
    mockGetAuthUser.mockResolvedValue(null)
    const res = await POST(uploadRequest(await jpeg(10, 10)))
    expect(res.status).toBe(401)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('stores a downsized WebP at the stable per-user path with a long cache', async () => {
    const res = await POST(uploadRequest(await jpeg(4000, 3000)))
    expect(res.status).toBe(200)

    const { url, headers, body } = storedUpload()
    expect(url).toMatch(/\/object\/avatars\/user-1\.webp$/)
    expect(headers['Content-Type']).toBe('image/webp')
    expect(headers['cache-control']).toBe('max-age=31536000')

    const meta = await sharp(body).metadata()
    expect(meta.format).toBe('webp')
    expect(meta.width).toBe(512)
    expect(meta.height).toBe(384)
  })

  it('returns a versioned public URL so re-uploads bust the cache', async () => {
    const res = await POST(uploadRequest(await jpeg(10, 10)))
    const { url } = await res.json()
    expect(url).toMatch(/\/object\/public\/avatars\/user-1\.webp\?v=\d+$/)
  })

  it('400s a file that passes the signature sniff but cannot be decoded', async () => {
    const fake = new Uint8Array(1024)
    fake.set([0xff, 0xd8, 0xff])
    const res = await POST(uploadRequest(fake))
    expect(res.status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })
})
