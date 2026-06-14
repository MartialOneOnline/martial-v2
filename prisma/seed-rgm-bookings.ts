/**
 * seed-rgm-bookings.ts
 *
 * Imports V1 class_bookings for Roger Gracie Málaga (school_id=798) into V2 Booking records.
 * Resolves V1 student_id → V2 userId via User.v1UserId.
 * V1 class_id has no direct V2 equivalent — uses modulo distribution across RGM's classes.
 *
 * Run from repo root:
 *   DATABASE_URL="..." DIRECT_URL="..." npx tsx prisma/seed-rgm-bookings.ts
 */

import { resolve } from 'path'
import * as dotenv from 'dotenv'
dotenv.config({ path: resolve(__dirname, '../apps/web/.env.local') })

import { createReadStream } from 'fs'
import { parse } from 'csv-parse'
import { prisma } from '../apps/web/lib/db'
import { BookingStatus, PaymentMethod } from '../apps/web/lib/prisma-client/enums'

const SCHOOL_ID = 'cmq6k2n5t0000x4o0rcvlmhmv'
const CSV_PATH  = resolve(__dirname, 'v1-bookings.csv')

// V1 status: 1=booked/active, 2=cancelled
// V1 attendance: 1=present, 2=attended(confirmed), null=no-show/pending
function mapStatus(status: string, attendance: string | null): BookingStatus {
  if (status === '2') return BookingStatus.CANCELLED
  if (attendance === '1' || attendance === '2') return BookingStatus.COMPLETED
  return BookingStatus.CONFIRMED
}

function parseDate(raw: string | null): Date | null {
  if (!raw || raw === 'NULL') return null
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

async function main() {
  // Build V1 userId → V2 userId map
  const users = await prisma.user.findMany({
    where: { v1UserId: { not: null } },
    select: { id: true, v1UserId: true },
  })
  const userMap = new Map(users.map(u => [u.v1UserId!, u.id]))

  // Fetch RGM classes — used to distribute V1 class_ids
  const classes = await prisma.class.findMany({
    where: { schoolId: SCHOOL_ID },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })
  if (classes.length === 0) throw new Error('No classes found for RGM — run seed-rgm.ts first')

  // Build V1 class_id → V2 class_id map (modulo distribution for historical data)
  const classIdMap = new Map<number, string>()

  const records: any[] = []
  await new Promise<void>((resolve, reject) => {
    createReadStream(CSV_PATH)
      .pipe(parse({ columns: true, skip_empty_lines: true, trim: true, relax_quotes: true }))
      .on('data', (row: any) => records.push(row))
      .on('end', resolve)
      .on('error', reject)
  })

  let imported = 0, skipped = 0, duplicates = 0

  // Process in batches to avoid memory issues (34K rows)
  const BATCH = 500
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH)

    const inserts = []
    for (const row of batch) {
      const v1UserId = parseInt(row.student_id)
      const v2UserId = userMap.get(v1UserId)
      if (!v2UserId) { skipped++; continue }

      const v1ClassId = parseInt(row.class_id)
      if (!classIdMap.has(v1ClassId)) {
        classIdMap.set(v1ClassId, classes[classIdMap.size % classes.length].id)
      }
      const v2ClassId = classIdMap.get(v1ClassId)!

      const scheduledAt = parseDate(row.session_start)
      if (!scheduledAt) { skipped++; continue }

      const status    = mapStatus(row.status, row.attendance || null)
      const attendedAt = (status === BookingStatus.COMPLETED) ? parseDate(row.present_at) ?? scheduledAt : null

      inserts.push({
        userId:      v2UserId,
        classId:     v2ClassId,
        scheduledAt,
        attendedAt,
        status,
        paymentMethod: PaymentMethod.CASH,
        notes: null,
      })
    }

    // Upsert via createMany — skip duplicates where possible
    if (inserts.length > 0) {
      const result = await prisma.booking.createMany({ data: inserts, skipDuplicates: true })
      imported += result.count
      duplicates += inserts.length - result.count
    }

    if ((i / BATCH) % 10 === 0) process.stdout.write(`\r  ${i + batch.length}/${records.length} rows processed...`)
  }

  console.log(`\n\nDone.`)
  console.log(`  Imported:   ${imported}`)
  console.log(`  Skipped:    ${skipped}  (V1 user not in V2)`)
  console.log(`  Duplicates: ${duplicates}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
