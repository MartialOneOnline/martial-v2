/**
 * sniffImage() is what stands between a student's avatar upload and
 * Supabase Storage — it must trust actual file bytes, never a
 * client-declared filename or Content-Type (both trivially spoofable).
 */
import { describe, it, expect } from 'vitest'
import { sniffImage } from '@/lib/validateImageUpload'

describe('sniffImage()', () => {
  it('recognizes a real JPEG signature', () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
    expect(sniffImage(bytes)).toEqual({ ext: 'jpg', mime: 'image/jpeg' })
  })

  it('recognizes a real PNG signature', () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    expect(sniffImage(bytes)).toEqual({ ext: 'png', mime: 'image/png' })
  })

  it('recognizes a real WebP signature (RIFF....WEBP)', () => {
    const bytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])
    expect(sniffImage(bytes)).toEqual({ ext: 'webp', mime: 'image/webp' })
  })

  it('rejects a plain-text file even if it were named photo.jpg', () => {
    const bytes = new TextEncoder().encode('<script>alert(1)</script>')
    expect(sniffImage(bytes)).toBeNull()
  })

  it('rejects an SVG (script-capable) disguised with an image Content-Type', () => {
    const bytes = new TextEncoder().encode('<svg onload="alert(1)"></svg>')
    expect(sniffImage(bytes)).toBeNull()
  })

  it('rejects a RIFF file that is not actually WEBP (e.g. a WAV)', () => {
    const bytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45])
    expect(sniffImage(bytes)).toBeNull()
  })

  it('rejects an empty file', () => {
    expect(sniffImage(new Uint8Array(0))).toBeNull()
  })
})
