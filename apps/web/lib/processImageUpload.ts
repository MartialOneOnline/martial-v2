import sharp from 'sharp'

// Every image that reaches Supabase Storage goes through here first. Uploads
// used to be stored byte-for-byte (up to 5MB phone photos) and then rendered
// as 32–42px avatars, which is what blew through the Supabase cached-egress
// quota in Nov 2026. Re-encoding to a capped size as WebP cuts a typical
// avatar from several MB to ~15–40KB.
//
// `fit: 'inside'` never crops — logos and covers keep their aspect ratio —
// and `withoutEnlargement` leaves already-small images at their size.
export const IMAGE_PRESETS = {
  avatar: { maxWidth: 512, maxHeight: 512, quality: 80 },
  logo: { maxWidth: 512, maxHeight: 512, quality: 85 },
  cover: { maxWidth: 1920, maxHeight: 1080, quality: 80 },
  image: { maxWidth: 1600, maxHeight: 1600, quality: 80 },
} as const

export type ImagePreset = keyof typeof IMAGE_PRESETS

export function isImagePreset(value: string | null): value is ImagePreset {
  return value !== null && Object.prototype.hasOwnProperty.call(IMAGE_PRESETS, value)
}

// Files are re-encoded and their URL changes on every upload (timestamped
// path or ?v= query), so browsers and the Supabase CDN can keep them for a
// year without ever showing a stale picture.
export const IMMUTABLE_CACHE_CONTROL = 'max-age=31536000'

export type ProcessedImage = { buffer: Buffer; ext: 'webp'; mime: 'image/webp' }

// Returns null when the bytes can't be decoded as an image (e.g. a file that
// passed the magic-number sniff but is truncated or corrupt).
export async function processImageUpload(input: Uint8Array, preset: ImagePreset): Promise<ProcessedImage | null> {
  const { maxWidth, maxHeight, quality } = IMAGE_PRESETS[preset]
  try {
    const buffer = await sharp(input, { limitInputPixels: 50_000_000 })
      .rotate() // apply EXIF orientation before metadata is stripped
      .resize({ width: maxWidth, height: maxHeight, fit: 'inside', withoutEnlargement: true })
      .webp({ quality })
      .toBuffer()
    return { buffer, ext: 'webp', mime: 'image/webp' }
  } catch {
    return null
  }
}
