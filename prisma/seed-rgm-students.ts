/**
 * Seed: Import 684 active RGM students into V2 as User + SchoolMember records
 *
 * Run: npx tsx prisma/seed-rgm-students.ts
 *
 * Safe to re-run — uses upsert on email. Skips existing users.
 */

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../apps/web/lib/prisma-client/client'
import * as dotenv from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'

dotenv.config({ path: resolve(__dirname, '../apps/web/.env.local') })

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
} as any)

const SCHOOL_ID = 'cmq6k2n5t0000x4o0rcvlmhmv'

// "Azul 3 Grado" → { belt: "Azul", beltDegree: 3 }
function parseBelt(raw: string): { belt: string; beltDegree: number } {
  const match = raw.match(/^(.+?)\s+(\d+)\s+Grado[s]?$/i)
  if (match) return { belt: match[1], beltDegree: parseInt(match[2]) }
  return { belt: raw, beltDegree: 0 }
}

type StudentRow = {
  v1_id: string
  email: string
  name: string
  belt: string
  phone: string | null
  status: string
}

async function main() {
  const students: StudentRow[] = JSON.parse(
    readFileSync(resolve(__dirname, 'rgm-students.json'), 'utf-8')
  )

  console.log(`🥋 Importing ${students.length} RGM students...\n`)

  let created = 0
  let skipped = 0
  let errors = 0

  for (const s of students) {
    try {
      // Upsert User — if email already exists, just update belt/phone if missing
      const user = await prisma.user.upsert({
        where: { email: s.email },
        update: {
          // Only fill in missing data, don't overwrite if set
          ...(s.phone ? {} : {}), // phone not in schema — skip
        },
        create: {
          email: s.email,
          name: s.name,
          role: 'STUDENT',
          phone: s.phone ?? undefined,
        },
      })

      // Upsert SchoolMember
      const existing = await prisma.schoolMember.findUnique({
        where: { schoolId_userId: { schoolId: SCHOOL_ID, userId: user.id } },
      })

      const { belt, beltDegree } = parseBelt(s.belt)

      if (!existing) {
        await prisma.schoolMember.create({
          data: {
            schoolId: SCHOOL_ID,
            userId: user.id,
            role: 'STUDENT',
            status: 'ACTIVE',
            belt,
            beltDegree,
            joinedAt: new Date(),
          },
        })
        created++
      } else {
        // Update belt if not yet set
        if (!existing.belt && belt) {
          await prisma.schoolMember.update({
            where: { schoolId_userId: { schoolId: SCHOOL_ID, userId: user.id } },
            data: { belt, beltDegree },
          })
        }
        skipped++
      }

      if ((created + skipped) % 50 === 0) {
        console.log(`  → ${created + skipped}/${students.length} processed (${created} new, ${skipped} existing)`)
      }
    } catch (e: any) {
      console.error(`  ✗ Error for ${s.email}: ${e.message}`)
      errors++
    }
  }

  console.log(`
✅ Import complete:
   New members: ${created}
   Already existed: ${skipped}
   Errors: ${errors}
   Total processed: ${created + skipped + errors}/${students.length}
`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
