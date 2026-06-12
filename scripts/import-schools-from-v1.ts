/**
 * Martial App V2 — Import Schools from V1 CSV exports
 *
 * Creates V2 School records for all real (non-deleted) V1 schools,
 * sets v1UserId on each, then optionally imports their classes.
 *
 * Usage:
 *   DATABASE_URL="..." npx tsx --tsconfig apps/web/tsconfig.json scripts/import-schools-from-v1.ts
 *   DATABASE_URL="..." npx tsx --tsconfig apps/web/tsconfig.json scripts/import-schools-from-v1.ts --dry-run
 *
 * Files expected in scripts/:
 *   scripts/v1-users.csv
 *   scripts/v1-userdetails.csv
 */

import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../apps/web/lib/prisma-client/client.js'

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')

// ── Prisma ────────────────────────────────────────────────────────────────────

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

// ── Country normaliser ────────────────────────────────────────────────────────

const COUNTRY_MAP: Record<string, string> = {
  'España': 'ES', 'Spain': 'ES',
  'Estados Unidos': 'US', 'EE. UU.': 'US',
  'Irlanda': 'IE', 'Ireland': 'IE',
  'Espanha': 'ES', // PT spelling of Spain
  'UK': 'GB', 'Reino Unido': 'GB', 'United Kingdom': 'GB',
  'Alemania': 'DE', 'Germany': 'DE',
  'Marruecos': 'MA',
  'Francia': 'FR', 'France': 'FR',
  'Brasil': 'BR', 'Brazil': 'BR',
  'Italia': 'IT', 'Italy': 'IT',
  'Portugal': 'PT',
  'Argentina': 'AR',
  'Pakistan': 'PK',
  'Ecuador': 'EC',
  'Países Bajos': 'NL', 'Netherlands': 'NL',
  'Venezuela': 'VE',
}

function normaliseCountry(raw: string | null): string | null {
  if (!raw || raw === 'NULL') return null
  return COUNTRY_MAP[raw.trim()] ?? raw.trim()
}

// ── Slug generator ────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ── V1 school IDs that are real (non-deleted, non-test) ───────────────────────
// Derived from users.csv: status=a, deleted_at=NULL, no test names

const REAL_SCHOOL_V1_IDS = new Set([
  798, 862, 959, 973, 992, 1010, 1011, 1018, 1050,
  1178, 1863, 1900, 3494, 3712, 4105, 4171, 4252,
  4880, 4881, 6591,
])

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('━━━ Martial App V2 — School Importer ━━━')
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no writes)' : '✏️  LIVE'}`)
  console.log()

  // 1. Load CSVs
  const USERS_FILE   = path.resolve('scripts/v1-users.csv')
  const DETAILS_FILE = path.resolve('scripts/v1-userdetails.csv')

  for (const f of [USERS_FILE, DETAILS_FILE]) {
    if (!fs.existsSync(f)) { console.error(`❌ File not found: ${f}`); process.exit(1) }
  }

  const allUsers:   any[] = parse(fs.readFileSync(USERS_FILE),   { columns: true, skip_empty_lines: true })
  const allDetails: any[] = parse(fs.readFileSync(DETAILS_FILE), { columns: true, skip_empty_lines: true })

  // 2. Build details lookup
  const detailsByUserId = new Map<number, any>()
  for (const d of allDetails) {
    const uid = Number(d.user_id)
    if (!isNaN(uid)) detailsByUserId.set(uid, d)
  }

  // 3. Filter to real schools
  const schoolUsers = allUsers.filter(u => REAL_SCHOOL_V1_IDS.has(Number(u.id)))
  console.log(`🏫 Schools to process: ${schoolUsers.length}`)
  console.log()

  let created = 0
  let skipped = 0
  let updated = 0

  for (const u of schoolUsers) {
    const v1Id   = Number(u.id)
    const detail = detailsByUserId.get(v1Id)

    const name    = (u.name ?? '').trim()
    const address = u.address !== 'NULL' ? u.address.trim() : null
    const city    = u.city !== 'NULL'    ? u.city.trim()    : null
    const country = normaliseCountry(u.country)
    const lat     = u.latitude  !== 'NULL' ? parseFloat(u.latitude)  : null
    const lng     = u.longitude !== 'NULL' ? parseFloat(u.longitude) : null

    // Extra from userdetails
    const bio       = detail?.bio && detail.bio !== 'NULL'       ? detail.bio.trim()       : null
    const phone     = detail?.phone_number && detail.phone_number !== 'NULL' ? detail.phone_number.trim() : null
    const website   = detail?.webiste && detail.webiste !== 'NULL' ? detail.webiste.trim() : null
    const instagram = detail?.instagram && detail.instagram !== 'NULL' ? detail.instagram.trim() : null
    const facebook  = detail?.facebook  && detail.facebook !== 'NULL'  ? detail.facebook.trim()  : null

    // Check if already exists
    const existing = await prisma.school.findFirst({ where: { v1UserId: v1Id } })

    if (existing) {
      console.log(`⏭  Exists: ${name} (V1 user_id=${v1Id}) → V2 id=${existing.id}`)
      skipped++
      continue
    }

    // Generate a unique slug
    let baseSlug = slugify(name)
    let slug     = baseSlug
    let attempt  = 0

    while (true) {
      const conflict = await prisma.school.findFirst({ where: { slug } })
      if (!conflict) break
      attempt++
      slug = `${baseSlug}-${attempt}`
    }

    const schoolData = {
      name,
      slug,
      address,
      city,
      country,
      lat,
      lng,
      description: bio,
      phone,
      website,
      instagram,
      facebook,
      status:   'UNVERIFIED' as const,
      source:   'VONSEL'     as const,
      v1UserId: v1Id,
    }

    console.log(`✅ Creating: ${name}`)
    console.log(`   slug=${slug} · city=${city ?? '—'} · country=${country ?? '—'}`)
    if (bio) console.log(`   bio: ${bio.slice(0, 80)}...`)

    if (!DRY_RUN) {
      const school = await prisma.school.create({ data: schoolData })
      console.log(`   → V2 id=${school.id}`)
      created++
    } else {
      created++
    }
  }

  console.log()
  console.log('━━━ Summary ━━━')
  console.log(`✅ ${DRY_RUN ? 'Would create' : 'Created'}: ${created}`)
  console.log(`⏭  Already existed: ${skipped}`)
  if (DRY_RUN) console.log('\n💡 Remove --dry-run to write to the database.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
