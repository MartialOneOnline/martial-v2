/**
 * V1 → V2 Photo Upload
 * Uploads logo, cover and gallery images for all 27 active V1 schools
 * to Supabase Storage (avatars bucket) under schools/{slug}/
 *
 * Run: node scripts/migrate-v1-photos.mjs
 * Dry run: node scripts/migrate-v1-photos.mjs --dry-run
 */

import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL    = 'https://fixipigqxebxferfxlsv.supabase.co'
const SUPABASE_SECRET = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpeGlwaWdxeGVieGZlcmZ4bHN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg3ODA3MSwiZXhwIjoyMDk1NDU0MDcxfQ.FKoH-DSgqdtk_qBMgByJwWDEcR11kb-Hlclsf4NGHpA'
const BUCKET     = 'avatars'
const PHOTOS_DIR = '/Users/pablocabo/Downloads/profile_photo 2'
const CSV_DIR    = '/Users/pablocabo/Downloads'
const DRY_RUN    = process.argv.includes('--dry-run')

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET)

function readCsv(f) {
  return parse(fs.readFileSync(path.join(CSV_DIR, f), 'utf8'), { columns: true, skip_empty_lines: true, relax_quotes: true })
}

function slugify(name) {
  return name.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function upload(localPath, storagePath) {
  if (!fs.existsSync(localPath)) return null
  if (DRY_RUN) return `DRY/${storagePath}`
  const buf  = fs.readFileSync(localPath)
  const ext  = path.extname(localPath).toLowerCase()
  const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buf, { contentType: mime, upsert: true })
  if (error) { console.warn(`    ⚠ ${path.basename(localPath)}: ${error.message}`); return null }
  return supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl
}

async function run() {
  const schools   = readCsv('users (8).csv').filter(r => r.user_type === '2' && !r.deleted_at.match(/^\d/))
  const detailMap = Object.fromEntries(readCsv('userdetails (7).csv').map(r => [r.user_id, r]))
  const photoFiles = fs.readdirSync(PHOTOS_DIR)

  console.log(`\n📸 Uploading photos for ${schools.length} schools${DRY_RUN ? ' [DRY RUN]' : ''}\n`)

  const log = []

  for (const school of schools) {
    const sid  = school.id
    const d    = detailMap[sid] ?? {}
    const slug = slugify(school.name.trim())
    const entry = { sid, name: school.name.trim(), slug, logo: null, cover: null, gallery: [] }

    console.log(`── [${sid}] ${school.name}`)

    // Logo
    if (d.profile_photo && d.profile_photo.trim()) {
      const ext = path.extname(d.profile_photo) || '.png'
      entry.logo = await upload(path.join(PHOTOS_DIR, d.profile_photo.trim()), `schools/${slug}/logo${ext}`)
      console.log(`   logo   → ${entry.logo ? '✓' : '✗'} ${d.profile_photo}`)
    }

    // Cover
    if (d.public_photo && d.public_photo.trim()) {
      const ext = path.extname(d.public_photo) || '.jpg'
      entry.cover = await upload(path.join(PHOTOS_DIR, d.public_photo.trim()), `schools/${slug}/cover${ext}`)
      console.log(`   cover  → ${entry.cover ? '✓' : '✗'} ${d.public_photo}`)
    }

    // Gallery (files prefixed with schoolId)
    const gallery = photoFiles.filter(f => f.startsWith(`${sid}profile_photo_`))
    for (const [i, file] of gallery.entries()) {
      const ext = path.extname(file) || '.jpg'
      const url = await upload(path.join(PHOTOS_DIR, file), `schools/${slug}/gallery/${i}${ext}`)
      if (url) entry.gallery.push(url)
    }
    if (gallery.length) console.log(`   gallery → ${entry.gallery.length}/${gallery.length} uploaded`)

    log.push(entry)
    await new Promise(r => setTimeout(r, 100))
  }

  // Print final URL map
  console.log('\n\n📋 Results (paste into migration script or DB):\n')
  for (const e of log) {
    console.log(`[${e.sid}] ${e.name}`)
    if (e.logo)         console.log(`   logo:    ${e.logo}`)
    if (e.cover)        console.log(`   cover:   ${e.cover}`)
    if (e.gallery.length) console.log(`   gallery: ${e.gallery.length} photos`)
  }

  console.log('\n✅ Done\n')
}

run().catch(console.error)
