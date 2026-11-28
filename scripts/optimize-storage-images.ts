/**
 * One-off backfill: shrink the images already stored in Supabase Storage
 * (buckets `avatars` and `class-images`) and give them a long cache-control.
 *
 * Until Nov 2026 uploads were stored byte-for-byte (up to 5MB phone photos)
 * and rendered as 32–42px avatars, which blew through the Supabase
 * cached-egress quota. New uploads are now resized + re-encoded in
 * apps/web/lib/processImageUpload.ts; this script does the same for what is
 * already there.
 *
 * Storage-only: every object is overwritten IN PLACE at the same path and in
 * the SAME format (jpg stays jpg, etc.), so every URL saved in the database
 * keeps working — nothing in the DB is written. The DB is only read to find
 * which stored files are wide banners/covers (they get the larger preset
 * instead of being shrunk to avatar size).
 *
 * An object is only re-encoded when it is bigger than SKIP_BELOW_BYTES and
 * the result is actually smaller; otherwise, if its cache-control is short,
 * only the header is refreshed (same bytes re-uploaded).
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/optimize-storage-images.ts          # dry-run (default)
 *   npx tsx --env-file=.env scripts/optimize-storage-images.ts --live   # actually overwrite
 */
import { createClient } from '@supabase/supabase-js'
import { PrismaPg } from '@prisma/adapter-pg'
import sharp from 'sharp'
import { PrismaClient } from '../apps/web/lib/prisma-client/client.js'
import { IMAGE_PRESETS, type ImagePreset } from '../apps/web/lib/processImageUpload.js'

const LIVE = process.argv.includes('--live')
const BUCKETS = ['avatars', 'class-images'] as const
type Bucket = (typeof BUCKETS)[number]
const DEFAULT_PRESET: Record<Bucket, ImagePreset> = { 'avatars': 'avatar', 'class-images': 'image' }
const SKIP_BELOW_BYTES = 150 * 1024
const CACHE_SECONDS = 31536000

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const storage = createClient(SUPABASE_URL, process.env.SUPABASE_SECRET_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
}).storage
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })

// "<bucket>/<path>" for a public Supabase Storage URL, query string dropped.
function objectKey(url: string | null): string | null {
  if (!url) return null
  const m = url.match(/\/storage\/v1\/object\/public\/([^?#]+)/)
  return m ? decodeURIComponent(m[1]!) : null
}

async function wideImageKeys(): Promise<Set<string>> {
  const [schools, events, classes, camps, platforms] = await Promise.all([
    prisma.school.findMany({ where: { coverUrl: { not: null } }, select: { coverUrl: true } }),
    prisma.event.findMany({ where: { coverUrl: { not: null } }, select: { coverUrl: true } }),
    prisma.class.findMany({ where: { coverUrl: { not: null } }, select: { coverUrl: true } }),
    prisma.camp.findMany({ where: { coverUrl: { not: null } }, select: { coverUrl: true } }),
    prisma.contentPlatform.findMany({ where: { bannerUrl: { not: null } }, select: { bannerUrl: true } }),
  ])
  const urls = [
    ...schools.map(r => r.coverUrl), ...events.map(r => r.coverUrl), ...classes.map(r => r.coverUrl),
    ...camps.map(r => r.coverUrl), ...platforms.map(r => r.bannerUrl),
  ]
  return new Set(urls.map(objectKey).filter((k): k is string => k !== null))
}

type StoredObject = { path: string; size: number; mimetype: string; cacheControl: string }

// Recursive listing — older uploads live under an `avatars/` folder inside
// the avatars bucket, newer ones at the root.
async function listAll(bucket: Bucket, prefix = ''): Promise<StoredObject[]> {
  const out: StoredObject[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await storage.from(bucket).list(prefix, { limit: 1000, offset })
    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`)
    for (const item of data ?? []) {
      const path = prefix ? `${prefix}/${item.name}` : item.name
      if (item.id === null) { out.push(...await listAll(bucket, path)); continue } // folder
      const meta = (item.metadata ?? {}) as { size?: number; mimetype?: string; cacheControl?: string }
      out.push({ path, size: meta.size ?? 0, mimetype: meta.mimetype ?? '', cacheControl: meta.cacheControl ?? '' })
    }
    if ((data ?? []).length < 1000) return out
  }
}

async function reencode(input: Buffer, preset: ImagePreset): Promise<{ buffer: Buffer; mime: string } | null> {
  const { maxWidth, maxHeight, quality } = IMAGE_PRESETS[preset]
  const img = sharp(input, { limitInputPixels: 50_000_000 })
  const { format } = await img.metadata()
  const resized = img.rotate().resize({ width: maxWidth, height: maxHeight, fit: 'inside', withoutEnlargement: true })
  // Keep the original format so the stored Content-Type and the extension
  // in every saved URL stay consistent.
  if (format === 'jpeg') return { buffer: await resized.jpeg({ quality, mozjpeg: true }).toBuffer(), mime: 'image/jpeg' }
  if (format === 'png') return { buffer: await resized.png({ compressionLevel: 9, palette: true, quality }).toBuffer(), mime: 'image/png' }
  if (format === 'webp') return { buffer: await resized.webp({ quality }).toBuffer(), mime: 'image/webp' }
  return null
}

const kb = (n: number) => `${(n / 1024).toFixed(0)}KB`

async function main() {
  console.log(LIVE ? '*** LIVE — objects will be overwritten ***' : 'Dry-run (pass --live to write)')
  const wide = await wideImageKeys()
  let before = 0, after = 0, shrunk = 0, headerOnly = 0, skipped = 0, failed = 0

  for (const bucket of BUCKETS) {
    const objects = await listAll(bucket)
    console.log(`\n${bucket}: ${objects.length} objects`)

    for (const obj of objects) {
      const key = `${bucket}/${obj.path}`
      const needsHeader = !obj.cacheControl.includes(String(CACHE_SECONDS))
      const tooBig = obj.size > SKIP_BELOW_BYTES
      if (!tooBig && !needsHeader) { skipped++; continue }

      try {
        const { data: blob, error } = await storage.from(bucket).download(obj.path)
        if (error || !blob) throw new Error(error?.message ?? 'empty download')
        const original = Buffer.from(await blob.arrayBuffer())

        const preset: ImagePreset = wide.has(key) ? 'cover' : DEFAULT_PRESET[bucket]
        const result = tooBig ? await reencode(original, preset) : null
        const useNew = result !== null && result.buffer.length < original.length
        const body = useNew ? result.buffer : original
        const contentType = useNew ? result.mime : (obj.mimetype || 'application/octet-stream')

        if (!useNew && !needsHeader) { skipped++; continue }
        before += original.length; after += body.length
        if (useNew) shrunk++; else headerOnly++
        console.log(`  ${useNew ? 'shrink' : 'header'} ${key}  ${kb(original.length)} → ${kb(body.length)}  [${preset}]`)

        if (LIVE) {
          const { error: upErr } = await storage.from(bucket).upload(obj.path, body, {
            upsert: true, contentType, cacheControl: String(CACHE_SECONDS),
          })
          if (upErr) throw new Error(upErr.message)
        }
      } catch (e) {
        failed++
        console.error(`  FAILED ${key}: ${(e as Error).message}`)
      }
    }
  }

  console.log(`\nShrunk: ${shrunk}  Header only: ${headerOnly}  Skipped: ${skipped}  Failed: ${failed}`)
  console.log(`Bytes for touched objects: ${kb(before)} → ${kb(after)}`)
  if (!LIVE) console.log('Nothing written (dry-run).')
}

main().finally(() => prisma.$disconnect())
