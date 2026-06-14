/**
 * seed-rgm-gradings.ts
 *
 * Creates a Grading record for each RGM student who has a non-White belt set in V2,
 * using the belt/beltDegree field that was imported from V1 during seed-rgm-students.ts.
 *
 * This represents "current belt as of V1 data export" — we don't have individual
 * grading event dates from V1, so we use the member's createdAt as the grading date.
 *
 * Run from repo root:
 *   DATABASE_URL="..." DIRECT_URL="..." npx tsx prisma/seed-rgm-gradings.ts
 */

import { resolve } from 'path'
import * as dotenv from 'dotenv'
dotenv.config({ path: resolve(__dirname, '../apps/web/.env.local') })

import { prisma } from '../apps/web/lib/db'

const SCHOOL_ID = 'cmq6k2n5t0000x4o0rcvlmhmv'

// Belt order for fromBelt inference
const BELT_ORDER = ['Blanco', 'Azul', 'Morado', 'Marrón', 'Negro']

function prevBelt(belt: string): string | null {
  const idx = BELT_ORDER.indexOf(belt)
  return idx > 0 ? BELT_ORDER[idx - 1] : null
}

async function main() {
  // Get all RGM members with a belt set
  const members = await prisma.schoolMember.findMany({
    where: { schoolId: SCHOOL_ID },
    include: { user: { select: { id: true, belt: true, beltDegree: true, createdAt: true } } },
  })

  const withBelt = members.filter(m => m.user.belt && m.user.belt !== 'Blanco')
  console.log(`RGM members: ${members.length} total, ${withBelt.length} with non-White belt`)

  let imported = 0, skipped = 0

  for (const m of withBelt) {
    const { id: userId, belt, beltDegree, createdAt } = m.user
    if (!belt) continue

    const existing = await prisma.grading.findFirst({
      where: { userId, schoolId: SCHOOL_ID, toBelt: belt },
    })
    if (existing) { skipped++; continue }

    await prisma.grading.create({
      data: {
        schoolId:  SCHOOL_ID,
        userId,
        fromBelt:  prevBelt(belt),
        toBelt:    belt,
        toDegree:  beltDegree ?? 0,
        gradedAt:  createdAt,
        notes:     'Imported from V1 — belt rank at time of migration',
        isPublic:  true,
      },
    })
    imported++
  }

  console.log(`\nDone.`)
  console.log(`  Imported: ${imported}`)
  console.log(`  Skipped:  ${skipped}  (already exists)`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
