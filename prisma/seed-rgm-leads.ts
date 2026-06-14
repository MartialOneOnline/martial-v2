/**
 * seed-rgm-leads.ts
 *
 * Imports V1 leads for Roger Gracie Málaga (user_id=798) into V2 Lead records.
 * V1 register_via → LeadSource mapping below.
 *
 * Run from repo root:
 *   DATABASE_URL="..." DIRECT_URL="..." npx tsx prisma/seed-rgm-leads.ts
 */

import { resolve } from 'path'
import * as dotenv from 'dotenv'
dotenv.config({ path: resolve(__dirname, '../apps/web/.env.local') })

import { createReadStream } from 'fs'
import { parse } from 'csv-parse'
import { prisma } from '../apps/web/lib/db'
import { LeadSource, LeadStatus } from '../apps/web/lib/prisma-client/enums'

const SCHOOL_ID = 'cmq6k2n5t0000x4o0rcvlmhmv'
const CSV_PATH  = resolve(__dirname, 'v1-leads.csv')

// V1 register_via codes (best-guess mapping from V1 platform)
const SOURCE_MAP: Record<string, LeadSource> = {
  '1':  LeadSource.WALK_IN,
  '2':  LeadSource.WEBSITE,
  '3':  LeadSource.REFERRAL,
  '4':  LeadSource.INSTAGRAM,
  '5':  LeadSource.OTHER,
  '6':  LeadSource.PHONE,
  '7':  LeadSource.INSTAGRAM,
  '8':  LeadSource.FACEBOOK,
  '9':  LeadSource.REFERRAL,
  '10': LeadSource.OTHER,
  '11': LeadSource.OTHER,
  '12': LeadSource.OTHER,
  '13': LeadSource.WALK_IN,
  '14': LeadSource.WEBSITE,
  '15': LeadSource.OTHER,
  '16': LeadSource.INSTAGRAM,
}

// V1 status: 0=new/uncontacted, 1=converted/followed-up
function mapStatus(status: string, followUp: string | null): LeadStatus {
  if (status === '1') return LeadStatus.CONVERTED
  if (followUp && followUp !== 'NULL') return LeadStatus.CONTACTED
  return LeadStatus.NEW
}

function cleanDate(raw: string | null): Date | null {
  if (!raw || raw === 'NULL' || raw.startsWith('2222') || raw.startsWith('1970')) return null
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

async function main() {
  const records: any[] = []
  await new Promise<void>((resolve, reject) => {
    createReadStream(CSV_PATH)
      .pipe(parse({ columns: true, skip_empty_lines: true, trim: true, relax_quotes: true }))
      .on('data', (row: any) => records.push(row))
      .on('end', resolve)
      .on('error', reject)
  })

  // Only RGM leads (user_id=798)
  const rgmLeads = records.filter(r => r.user_id === '798')
  console.log(`Found ${rgmLeads.length} RGM leads out of ${records.length} total`)

  // Build V1 userId → V2 userId map for conversion linking
  const v2Users = await prisma.user.findMany({
    where: { v1UserId: { not: null } },
    select: { id: true, v1UserId: true, email: true },
  })
  const userByEmail = new Map(v2Users.map(u => [u.email?.toLowerCase(), u.id]))

  let imported = 0, skipped = 0

  for (const row of rgmLeads) {
    const name  = `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim()
    const email = row.email?.toLowerCase() || null
    const phone = row.phone || null

    if (!name && !email && !phone) { skipped++; continue }

    const source  = SOURCE_MAP[row.register_via] ?? LeadSource.OTHER
    const status  = mapStatus(row.status, row.follow_up)
    const createdAt = cleanDate(row.created_at) ?? new Date()

    // If converted: link to V2 user by email
    let convertedUserId: string | null = null
    let convertedAt: Date | null = null
    if (status === LeadStatus.CONVERTED && email) {
      convertedUserId = userByEmail.get(email) ?? null
      if (convertedUserId) convertedAt = createdAt
    }

    await prisma.lead.upsert({
      where: { id: `v1-lead-${row.id}` },
      update: {},
      create: {
        id: `v1-lead-${row.id}`,
        schoolId: SCHOOL_ID,
        name,
        email,
        phone,
        source,
        status,
        convertedUserId,
        convertedAt,
        createdAt,
        updatedAt: cleanDate(row.updated_at) ?? createdAt,
      },
    })
    imported++
  }

  console.log(`\nDone.`)
  console.log(`  Imported: ${imported}`)
  console.log(`  Skipped:  ${skipped}  (no name/email/phone)`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
