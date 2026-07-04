/**
 * seed-rgm-grading-system.ts
 *
 * Seeds the BJJ grading system + belt ranks for Roger Gracie Málaga
 * using data from belt_ranks (3).csv (V1 export).
 *
 * Run from repo root:
 *   npx tsx prisma/seed-rgm-grading-system.ts
 */

import { resolve } from 'path'
import * as dotenv from 'dotenv'
dotenv.config({ path: resolve(__dirname, '../apps/web/.env.local') })

import { createReadStream } from 'fs'
import { parse } from 'csv-parse'
import { prisma } from '../apps/web/lib/db'

const SCHOOL_ID      = 'cmq6k2n5t0000x4o0rcvlmhmv'
const V1_USER_ID     = '798'
const BELT_RANKS_CSV = resolve('/Users/pablocabo/Downloads/belt_ranks (3).csv')

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

// Maps V1 belt title to hex color
function beltColor(title: string): string {
  const t = title.toLowerCase()
  if (t.includes('negro') || t.includes('black'))  return '#111827'
  if (t.includes('marron') || t.includes('brown')) return '#7C3AED' // brown
  if (t.includes('morado') || t.includes('purple'))return '#7C3AED'
  if (t.includes('azul') || t.includes('blue'))    return '#1D4ED8'
  return '#9CA3AF' // blanco/white default
}

// Corrected brown color
function beltColorFixed(title: string): string {
  const t = title.toLowerCase()
  if (t.includes('negro') || t.includes('black'))   return '#111827'
  if (t.includes('marron') || t.includes('brown'))  return '#92400E'
  if (t.includes('morado') || t.includes('purple')) return '#6D28D9'
  if (t.includes('azul') || t.includes('blue'))     return '#1D4ED8'
  return '#6B7280' // blanco/white
}

// V1 exported each belt+degree as its own flat row ("Blanco", "Blanco 1 Grado",
// "Blanco 2 Grado", ...). The V2 schema models degrees as BeltRank.maxDegrees
// on a single canonical rank instead, so we group consecutive degree-suffixed
// rows into the preceding base (non-degree) row and count them as maxDegrees.
// Grading.fromBelt/toBelt (see seed-rgm-gradings.ts) already only ever use the
// 5 canonical Spanish names, so this grouping is what backfill-belt-rank-fks.ts
// expects to match against.
const DEGREE_SUFFIX = /\s+\d+\s*Grados?$/i

function groupRanksByBelt(rankRows: any[]) {
  const groups: { base: any; degreeRows: any[] }[] = []
  for (const row of rankRows) {
    if (!DEGREE_SUFFIX.test(row.title)) {
      groups.push({ base: row, degreeRows: [] })
    } else if (groups.length) {
      groups[groups.length - 1].degreeRows.push(row)
    }
  }
  return groups
}

async function main() {
  const allRows = await readCsv(BELT_RANKS_CSV)

  // Find the parent system row for RGM (user_id=798, no parent_id).
  // csv-parse gives the literal string "NULL" for empty CSV cells here, not JS null.
  const systemRow = allRows.find(r =>
    r.user_id === V1_USER_ID && (!r.parent_id || r.parent_id === 'NULL') && r.grading_system === '1'
  )
  if (!systemRow) throw new Error('RGM grading system row not found')

  // Get all belt rank rows for RGM (have parent_id pointing to systemRow)
  const rankRows = allRows
    .filter(r => r.user_id === V1_USER_ID && r.parent_id === systemRow.id)
    .sort((a, b) => parseInt(a.id) - parseInt(b.id))

  const groups = groupRanksByBelt(rankRows)
  console.log(`Found ${rankRows.length} flat V1 rows → ${groups.length} canonical belt ranks for RGM`)

  // Delete existing grading system for RGM (cascade deletes ranks)
  await prisma.gradingSystem.deleteMany({ where: { schoolId: SCHOOL_ID } })
  console.log('Cleared existing grading systems')

  // Create grading system
  const system = await prisma.gradingSystem.create({
    data: {
      schoolId:  SCHOOL_ID,
      name:      'BJJ Adultos',
      activity:  'BJJ',
      isDefault: true,
      isActive:  true,
      requireApproval:  true,
      gradingFee:       0,
      notifyStudent:    true,
      notifyInstructor: true,
    },
  })
  console.log(`Created grading system: ${system.id}`)

  // Create one canonical belt rank per group, in order
  let order = 0
  for (const { base, degreeRows } of groups) {
    const classes = base.classes && base.classes !== 'NULL' ? parseInt(base.classes) : null
    const minAge  = base.age_limit && base.age_limit !== 'NULL' && parseInt(base.age_limit) > 0
      ? parseInt(base.age_limit) : null

    await prisma.beltRank.create({
      data: {
        systemId:             system.id,
        order:                order++,
        name:                 base.title.trim(),
        color:                beltColorFixed(base.title),
        maxDegrees:           degreeRows.length,
        minAge,
        minMonthsAtPrevious:  null,
        totalClassesRequired: classes,
        classTypeIds:         [],
        requireCompetition:   false,
        requireExam:          false,
      },
    })
  }

  console.log(`\nDone — ${order} canonical belt ranks created for "${system.name}"`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
