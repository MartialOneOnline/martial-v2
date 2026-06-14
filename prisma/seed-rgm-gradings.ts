/**
 * seed-rgm-gradings.ts
 *
 * Imports real belt promotion history for Roger Gracie Málaga from V1 promote_students table.
 * Maps V1 belt_rank IDs → belt name + degree using the belt_ranks CSV.
 * Maps V1 student_id → V2 userId via v1-users.csv (email lookup).
 *
 * Run from repo root:
 *   DATABASE_URL="..." DIRECT_URL="..." npx tsx prisma/seed-rgm-gradings.ts
 */

import { resolve } from 'path'
import * as dotenv from 'dotenv'
dotenv.config({ path: resolve(__dirname, '../apps/web/.env.local') })

import { createReadStream } from 'fs'
import { parse } from 'csv-parse'
import { prisma } from '../apps/web/lib/db'

const SCHOOL_ID           = 'cmq6k2n5t0000x4o0rcvlmhmv'
const V1_SCHOOL_OWNER_ID  = '798'

const PROMOTIONS_CSV  = resolve(__dirname, 'v1-promote-students.csv')
const BELT_RANKS_CSV  = resolve('/Users/pablocabo/Downloads/belt_ranks (3).csv')
const USERS_CSV       = resolve(__dirname, '../scripts/v1-users.csv')

async function readCsv(filePath: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const rows: any[] = []
    createReadStream(filePath)
      .pipe(parse({ columns: true, skip_empty_lines: true, trim: true, relax_quotes: true }))
      .on('data', (r: any) => rows.push(r))
      .on('end', () => resolve(rows))
      .on('error', reject)
  })
}

// Belt rank ID → { belt, degree } for RGM (user_id=798)
// Blanco=White, Azul=Blue, Morado=Purple, Marron=Brown, Negro=Black
function normBeltTitle(title: string): { belt: string; degree: number } {
  const t = title.trim()
  const degreeMatch = t.match(/(\d+)\s*Grado/i)
  const degree = degreeMatch ? parseInt(degreeMatch[1]) : 0

  if (t.startsWith('Negro'))  return { belt: 'Negro',  degree }
  if (t.startsWith('Marron')) return { belt: 'Marron', degree }
  if (t.startsWith('Marrón')) return { belt: 'Marron', degree }
  if (t.startsWith('Morado')) return { belt: 'Morado', degree }
  if (t.startsWith('Azul'))   return { belt: 'Azul',   degree }
  if (t.startsWith('Blanco')) return { belt: 'Blanco', degree }
  // English belt names (other schools in the CSV)
  if (t.startsWith('Black'))  return { belt: 'Negro',  degree }
  if (t.startsWith('Brown'))  return { belt: 'Marron', degree }
  if (t.startsWith('Purple')) return { belt: 'Morado', degree }
  if (t.startsWith('Blue'))   return { belt: 'Azul',   degree }
  if (t.startsWith('White'))  return { belt: 'Blanco', degree }
  return { belt: t, degree: 0 }
}

async function main() {
  // 1. Build belt rank ID → { belt, degree } map
  const beltRankRows = await readCsv(BELT_RANKS_CSV)
  const beltMap = new Map<number, { belt: string; degree: number }>()
  for (const row of beltRankRows) {
    const id    = parseInt(row.id)
    const title = row.title
    if (!isNaN(id) && title) {
      beltMap.set(id, normBeltTitle(title))
    }
  }
  console.log(`Belt map: ${beltMap.size} entries`)

  // 2. Build V1 student_id → V2 userId via email
  const v1Users = await readCsv(USERS_CSV)
  const v1EmailMap = new Map(v1Users.map(u => [parseInt(u.id), u.email?.toLowerCase()]))
  const v2Users = await prisma.user.findMany({ select: { id: true, email: true } })
  const v2EmailMap = new Map(v2Users.map(u => [u.email?.toLowerCase(), u.id]))

  const userMap = new Map<number, string>()
  for (const [v1Id, email] of v1EmailMap) {
    const v2Id = email ? v2EmailMap.get(email) : undefined
    if (v2Id) userMap.set(v1Id, v2Id)
  }
  console.log(`User map: ${userMap.size} V1→V2 user resolutions`)

  // 3. Load promotions — only RGM (user_id=798)
  const allPromos = await readCsv(PROMOTIONS_CSV)
  const rgmPromos = allPromos.filter(r => r.user_id === V1_SCHOOL_OWNER_ID)
  console.log(`RGM promotions: ${rgmPromos.length} out of ${allPromos.length} total`)

  // 4. Delete existing gradings for RGM (replace with real data)
  const deleted = await prisma.grading.deleteMany({ where: { schoolId: SCHOOL_ID } })
  console.log(`Deleted ${deleted.count} previous grading records`)

  // 5. Import real promotion events
  let imported = 0, skipped = 0

  for (const row of rgmPromos) {
    const v1StudentId = parseInt(row.student_id)
    const v2UserId    = userMap.get(v1StudentId)
    if (!v2UserId) { skipped++; continue }

    const oldBeltId  = parseInt(row.old_belt_id)
    const nextBeltId = parseInt(row.next_belt_id)

    const fromBeltInfo = beltMap.get(oldBeltId)
    const toBeltInfo   = nextBeltId > 0 ? beltMap.get(nextBeltId) : null

    // If next_belt_id=0, it means just a stripe/degree within same belt (advance one step)
    // Use fromBelt as toBelt with degree+1
    const toBelt   = toBeltInfo?.belt   ?? fromBeltInfo?.belt   ?? 'Blanco'
    const toDegree = toBeltInfo?.degree ?? ((fromBeltInfo?.degree ?? 0) + 1)

    const gradedAt = new Date(row.created_at)
    if (isNaN(gradedAt.getTime())) { skipped++; continue }

    await prisma.grading.create({
      data: {
        schoolId:  SCHOOL_ID,
        userId:    v2UserId,
        fromBelt:  fromBeltInfo?.belt ?? null,
        toBelt,
        toDegree,
        gradedAt,
        isPublic:  true,
      },
    })
    imported++
  }

  console.log(`\nDone.`)
  console.log(`  Imported: ${imported}`)
  console.log(`  Skipped:  ${skipped}  (V1 student not in V2 or bad date)`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
