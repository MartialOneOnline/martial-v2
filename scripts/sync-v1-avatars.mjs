/**
 * Upload V1 profile photos to Supabase Storage (avatars bucket) and set
 * User.avatarUrl, for a school's students.
 *
 * Replaces scripts/upload-avatars.{mjs,ts}: those read from a static,
 * one-off snapshot (prisma/rgm-students.json, dated 12 June) and an old
 * userdetails export, so anyone added or reactivated since then (e.g. by
 * scripts/fix-rga-active-status.mjs) was never even attempted. This version
 * queries SchoolMember directly, so it always reflects the current roster,
 * and matches V1 the same way scripts/fix-rga-active-status.mjs does
 * (notes marker preferred, unambiguous-email fallback otherwise).
 *
 * Only uploads for users that don't already have an avatarUrl. Skips (and
 * counts) V1 photo references whose file isn't present in --photos-dir —
 * that's a data-availability gap (the local photo export is older than some
 * V1 uploads), not something this script can fix; re-export V1's photo
 * folder to close it.
 *
 * Usage:
 *   node scripts/sync-v1-avatars.mjs --school-id=<v2 id> --v1-school-id=<v1 id> --dry-run
 *   node scripts/sync-v1-avatars.mjs --school-id=<v2 id> --v1-school-id=<v1 id>
 *   node scripts/sync-v1-avatars.mjs ... --photos-dir=/path/to/photos --csv-dir=/path/to/csvs
 *
 * Omitting --school-id/--v1-school-id defaults to Roger Gracie Malaga (798).
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { parseCSV, nullIfEmpty } from './lib/rga-belts.mjs'
import { matchV1Id, buildEmailFallbackMap } from './lib/rga-active-status.mjs'

// apps/web/app/api/dashboard/upload/route.ts caps normal avatar uploads at
// 5MB — V1's raw phone-camera exports routinely blow past that (seen up to
// 11MB), so every photo gets resized/re-encoded to a small JPEG before
// upload rather than only doing it for the ones that happen to be oversized.
const AVATAR_MAX_DIMENSION = 800

const DRY_RUN = process.argv.includes('--dry-run')

function getArg(flag, fallback) {
  const prefix = `--${flag}=`
  const hit = process.argv.find(a => a.startsWith(prefix))
  return hit ? hit.slice(prefix.length) : fallback
}

const SCHOOL_ID = getArg('school-id', 'cmq6k2n5t0000x4o0rcvlmhmv')
const V1_SCHOOL_ID = getArg('v1-school-id', '798') // informational only — V1's export tool already scopes users*.csv per school
const CSV_DIR = path.resolve(getArg('csv-dir', path.join(process.env.HOME, 'Downloads')))
const PHOTOS_DIR = path.resolve(getArg('photos-dir', path.join(process.env.HOME, 'Downloads/profile_photo 2')))

const envPath = path.resolve(process.cwd(), 'apps/web/.env.local')
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8').split('\n')
    .filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] })
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY)

function findLatestCsv(prefixRegex) {
  const matches = fs.readdirSync(CSV_DIR)
    .filter(f => prefixRegex.test(f) && f.endsWith('.csv'))
    .map(f => ({ f, mtime: fs.statSync(path.join(CSV_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
  return matches.length ? path.join(CSV_DIR, matches[0].f) : null
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)
  console.log(`School: ${SCHOOL_ID} (V1 id ${V1_SCHOOL_ID}) | CSV dir: ${CSV_DIR} | Photos dir: ${PHOTOS_DIR}`)

  const usersPath = findLatestCsv(/^users(\s|\.|$)/i)
  const detailsPath = findLatestCsv(/^userdetails/i)
  for (const [label, p] of [['users', usersPath], ['userdetails', detailsPath]]) {
    if (!p) { console.error(`No ${label}*.csv found in ${CSV_DIR}`); process.exit(1) }
    console.log(`  ${label}: ${path.basename(p)}`)
  }
  if (!fs.existsSync(PHOTOS_DIR)) { console.error(`Photos dir not found: ${PHOTOS_DIR}`); process.exit(1) }

  const v1Users = parseCSV(usersPath)
  const v1Details = parseCSV(detailsPath)
  const detailByUserId = new Map(v1Details.map(d => [d.user_id, d]))
  const v1IdByEmail = buildEmailFallbackMap(v1Users)
  const photoFiles = new Set(fs.readdirSync(PHOTOS_DIR))

  const { data: members, error: mErr } = await db.schema('public').from('school_members')
    .select('id,userId,notes').eq('schoolId', SCHOOL_ID)
  if (mErr) { console.error('members fetch error:', mErr); process.exit(1) }
  console.log(`school_members at school: ${members.length}`)

  const userIds = [...new Set(members.map(m => m.userId))]
  const users = []
  for (let i = 0; i < userIds.length; i += 200) {
    const { data, error } = await db.schema('public').from('users').select('id,email,avatarUrl').in('id', userIds.slice(i, i + 200))
    if (error) { console.error('users fetch error:', error); process.exit(1) }
    users.push(...data)
  }
  const emailByUserId = new Map(users.map(u => [u.id, (u.email ?? '').trim().toLowerCase()]))
  const userById = new Map(users.map(u => [u.id, u]))

  let alreadyHasAvatar = 0, unmatched = 0, noPhotoRef = 0, fileMissing = 0
  const toUpload = []
  const missingFileSamples = []

  for (const m of members) {
    const user = userById.get(m.userId)
    if (!user) continue
    if (user.avatarUrl) { alreadyHasAvatar++; continue }

    const { v1Id } = matchV1Id(m, emailByUserId, v1IdByEmail)
    if (!v1Id) { unmatched++; continue }

    const photoRef = nullIfEmpty(detailByUserId.get(v1Id)?.profile_photo)
    if (!photoRef) { noPhotoRef++; continue }

    if (!photoFiles.has(photoRef)) {
      fileMissing++
      if (missingFileSamples.length < 10) missingFileSamples.push({ email: user.email, v1Id, photoRef })
      continue
    }

    toUpload.push({ userId: user.id, email: user.email, photoRef })
  }

  console.log(`\nAlready has avatarUrl: ${alreadyHasAvatar}`)
  console.log(`No unambiguous V1 match: ${unmatched}`)
  console.log(`Matched but V1 has no photo reference: ${noPhotoRef}`)
  console.log(`Matched + has photo reference, but file NOT in ${path.basename(PHOTOS_DIR)}: ${fileMissing}`)
  console.log(`Ready to upload now: ${toUpload.length}`)
  if (missingFileSamples.length) console.log('Sample missing-file cases (need a fresh V1 photo export):', missingFileSamples)

  if (DRY_RUN) {
    console.log('\nSample to upload:', toUpload.slice(0, 10))
    return
  }
  if (!toUpload.length) { console.log('\nNothing to upload.'); return }

  let uploaded = 0, errors = 0
  for (const { userId, email, photoRef } of toUpload) {
    const storagePath = `${userId}.jpg`
    try {
      const raw = fs.readFileSync(path.join(PHOTOS_DIR, photoRef))
      // failOn: 'none' — some V1 exports are slightly malformed JPEGs (seen:
      // "Invalid SOS parameters for sequential JPEG") that libvips rejects
      // by default but can still decode most of; worth a usable avatar over
      // a hard failure.
      const buf = await sharp(raw, { failOn: 'none' })
        .rotate() // apply EXIF orientation before stripping it
        .resize(AVATAR_MAX_DIMENSION, AVATAR_MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer()
      const { error: uploadError } = await db.storage.from('avatars').upload(storagePath, buf, { contentType: 'image/jpeg', upsert: true })
      if (uploadError) { console.error(`Upload error for ${email}:`, uploadError.message); errors++; continue }

      const { data: { publicUrl } } = db.storage.from('avatars').getPublicUrl(storagePath)
      const { error: updateError } = await db.schema('public').from('users').update({ avatarUrl: publicUrl }).eq('id', userId)
      if (updateError) { console.error(`DB update error for ${email}:`, updateError.message); errors++; continue }

      uploaded++
    } catch (err) {
      console.error(`Error for ${email}:`, err.message)
      errors++
    }
  }

  console.log(`\nUploaded: ${uploaded} | Errors: ${errors}`)
}

main().catch(e => { console.error(e); process.exit(1) })
