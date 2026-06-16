/**
 * V1 → V2 School Migration
 * Reads V1 CSVs, uploads images to Supabase Storage, upserts school records.
 *
 * Run: node scripts/migrate-v1-schools.mjs
 * (from monorepo root)
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { parse } from 'csv-parse/sync'
import { createClient } from '@supabase/supabase-js'

function genId() {
  return crypto.randomBytes(12).toString('base64url').replace(/[^a-z0-9]/gi, '').slice(0, 24)
}

// ── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL    = 'https://fixipigqxebxferfxlsv.supabase.co'
const SUPABASE_SECRET = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpeGlwaWdxeGVieGZlcmZ4bHN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTg3ODA3MSwiZXhwIjoyMDk1NDU0MDcxfQ.FKoH-DSgqdtk_qBMgByJwWDEcR11kb-Hlclsf4NGHpA'
const BUCKET          = 'avatars'
const PHOTOS_DIR      = '/Users/pablocabo/Downloads/profile_photo 2'
const CSV_DIR         = '/Users/pablocabo/Downloads'

const DRY_RUN = process.argv.includes('--dry-run')

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET)

// ── Helpers ──────────────────────────────────────────────────────────────────
function readCsv(filename) {
  const raw = fs.readFileSync(path.join(CSV_DIR, filename), 'utf8')
  return parse(raw, { columns: true, skip_empty_lines: true, relax_quotes: true })
}

function nullify(v) {
  if (!v || v.trim() === '' || v.trim() === 'NULL') return null
  return v.trim()
}

function slugify(name) {
  return name.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function uploadImage(localPath, storagePath) {
  if (!fs.existsSync(localPath)) { console.log(`    skip (not found): ${path.basename(localPath)}`); return null }
  if (DRY_RUN) return `DRY_RUN/${storagePath}`
  const buf  = fs.readFileSync(localPath)
  const ext  = path.extname(localPath).toLowerCase()
  const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buf, { contentType: mime, upsert: true })
  if (error) { console.warn(`    ⚠ upload failed ${storagePath}: ${error.message}`); return null }
  return supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl
}

// ── Country normalizer ───────────────────────────────────────────────────────
const COUNTRY_MAP = {
  'spain': 'ES', 'españa': 'ES', 'espanha': 'ES',
  'estados unidos': 'US', 'united states': 'US',
  'reino unido': 'GB', 'uk': 'GB',
  'irlanda': 'IE', 'ireland': 'IE',
  'japón': 'JP', 'japan': 'JP',
  'brasil': 'BR', 'brazil': 'BR',
  'portugal': 'PT',
  'países bajos': 'NL', 'netherlands': 'NL',
  'venezuela': 'VE',
  'emiratos árabes unidos': 'AE', 'uae': 'AE',
}
const normalizeCountry = r => COUNTRY_MAP[(r || '').toLowerCase()] ?? r ?? null

// ── Load lookup maps ─────────────────────────────────────────────────────────
const facMap = Object.fromEntries(readCsv('facilties (1).csv').map(r => [r.id, r.name]))
const actMap = Object.fromEntries(readCsv('activities (1).csv').map(r => [r.id, r.name]))
const photoFiles = fs.readdirSync(PHOTOS_DIR)

// ── Load V1 data ─────────────────────────────────────────────────────────────
const schools   = readCsv('users (8).csv')
  .filter(r => r.user_type === '2' && !r.deleted_at.match(/^\d/))
const detailMap = Object.fromEntries(readCsv('userdetails (7).csv').map(r => [r.user_id, r]))

// ── Ensure disciplines exist (upsert by name) ────────────────────────────────
async function ensureDiscipline(name) {
  const slug = slugify(name)
  if (DRY_RUN) return `dry-${slug}`
  const { data: existing } = await supabase.from('disciplines').select('id').eq('slug', slug).single()
  if (existing) return existing.id
  const { data: inserted, error } = await supabase.from('disciplines').insert({ id: genId(), name, slug }).select('id').single()
  if (error) { console.warn(`    ⚠ discipline insert failed: ${name} — ${error.message}`); return null }
  return inserted.id
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function migrate() {
  console.log(`\n🚀 Migrating ${schools.length} schools from V1 → V2${DRY_RUN ? ' [DRY RUN]' : ''}\n`)
  const results = []

  for (const school of schools) {
    const sid  = school.id
    const d    = detailMap[sid] ?? {}
    const name = school.name.trim()
    const slug = slugify(name)

    console.log(`\n── [${sid}] ${name}`)

    // Activities + Facilities
    const actIds = (d.activities || '').split(',').map(x => x.trim()).filter(Boolean)
    const facIds = (d.facilities || '').split(',').map(x => x.trim()).filter(Boolean)
    const actNames = actIds.map(id => actMap[id] ?? id)
    const facNames = facIds.map(id => facMap[id] ?? id)

    // Upload logo
    let logoUrl = null
    if (d.profile_photo) {
      const ext = path.extname(d.profile_photo) || '.png'
      logoUrl = await uploadImage(
        path.join(PHOTOS_DIR, d.profile_photo),
        `schools/${slug}/logo${ext}`
      )
      console.log(`  logo  → ${logoUrl ? '✓' : '✗'}`)
    }

    // Upload cover
    let coverUrl = null
    if (d.public_photo) {
      const ext = path.extname(d.public_photo) || '.jpg'
      coverUrl = await uploadImage(
        path.join(PHOTOS_DIR, d.public_photo),
        `schools/${slug}/cover${ext}`
      )
      console.log(`  cover → ${coverUrl ? '✓' : '✗'}`)
    }

    // Upload gallery
    const galleryFiles = photoFiles.filter(f => f.startsWith(`${sid}profile_photo_`))
    const photos = []
    for (const [i, file] of galleryFiles.entries()) {
      const ext = path.extname(file) || '.jpg'
      const url = await uploadImage(
        path.join(PHOTOS_DIR, file),
        `schools/${slug}/gallery/${i}${ext}`
      )
      if (url) photos.push(url)
    }
    if (galleryFiles.length > 0) console.log(`  gallery → ${photos.length}/${galleryFiles.length}`)

    // School row payload (DB column names are snake_case)
    const row = {
      name,
      slug,
      status:      'VERIFIED',
      source:      'MANUAL',
      country:     normalizeCountry(school.country),
      city:        school.city        || null,
      address:     school.address     || null,
      postcode:    school.postal_code || null,
      lat:         school.latitude    ? parseFloat(school.latitude)  : null,
      lng:         school.longitude   ? parseFloat(school.longitude) : null,
      email:       nullify(school.email),
      phone:       nullify(d.phone_number) || nullify(d.mobile_number),
      website:     nullify(d.webiste),
      instagram:   nullify(d.instagram),
      facebook:    nullify(d.facebook),
      description: nullify(d.bio),
      logoUrl,
      coverUrl,
      photos,
      facilities:  facNames,
      v1UserId:    parseInt(sid, 10),
    }

    if (DRY_RUN) {
      console.log('  payload:', JSON.stringify({ ...row, photos: `[${photos.length} photos]` }, null, 2))
      results.push({ sid, name, status: 'dry-run' })
      continue
    }

    // Check if school already exists by v1_user_id
    const { data: existing } = await supabase
      .from('schools')
      .select('id, slug')
      .eq('v1UserId', parseInt(sid, 10))
      .single()

    if (existing) {
      const { error } = await supabase.from('schools').update(row).eq('id', existing.id)
      if (error) { console.error(`  ✗ update: ${error.message}`); results.push({ sid, name, status: 'error', error: error.message }); continue }
      console.log(`  ✓ updated (id=${existing.id})`)
      results.push({ sid, name, status: 'updated', id: existing.id })
      await upsertDisciplines(existing.id, actNames)
    } else {
      // Avoid slug collision
      let finalSlug = slug
      const { data: clash } = await supabase.from('schools').select('id').eq('slug', slug).single()
      if (clash) finalSlug = `${slug}-${sid}`

      const now = new Date().toISOString()
      const { data: inserted, error } = await supabase
        .from('schools').insert({ id: genId(), ...row, slug: finalSlug, createdAt: now, updatedAt: now }).select('id').single()
      if (error) { console.error(`  ✗ insert: ${error.message}`); results.push({ sid, name, status: 'error', error: error.message }); continue }
      console.log(`  ✓ inserted (id=${inserted.id}, slug=${finalSlug})`)
      results.push({ sid, name, status: 'inserted', id: inserted.id })
      await upsertDisciplines(inserted.id, actNames)
    }

    await new Promise(r => setTimeout(r, 150))
  }

  console.log('\n\n📊 Summary:')
  for (const r of results) {
    const icon = r.status === 'error' ? '✗' : '✓'
    console.log(`  ${icon} [${r.sid}] ${r.name} — ${r.status}${r.error ? ': ' + r.error : ''}`)
  }
  console.log('\n✅ Done\n')
}

async function upsertDisciplines(schoolId, actNames) {
  if (!actNames.length) return
  for (const name of actNames) {
    const discId = await ensureDiscipline(name)
    if (!discId) continue
    const { error } = await supabase.from('school_disciplines')
      .upsert({ schoolId, disciplineId: discId }, { onConflict: 'schoolId,disciplineId', ignoreDuplicates: true })
    if (error && !error.message.includes('duplicate')) console.warn(`    ⚠ discipline link: ${error.message}`)
  }
  console.log(`  disciplines → ${actNames.join(', ')}`)
}

migrate().catch(console.error)
