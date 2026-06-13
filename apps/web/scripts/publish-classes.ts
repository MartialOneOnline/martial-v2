#!/usr/bin/env tsx
/**
 * publish-classes.ts — Safe dry-run script for publishing active classes.
 *
 * Usage:
 *   # Dry-run (default — no writes):
 *   npx tsx apps/web/scripts/publish-classes.ts
 *
 *   # Scope to a single school by slug or id:
 *   npx tsx apps/web/scripts/publish-classes.ts --school=roger-gracie-malaga
 *   npx tsx apps/web/scripts/publish-classes.ts --school=clr0abc123
 *
 *   # Apply changes (REQUIRES explicit flag — not safe by default):
 *   npx tsx apps/web/scripts/publish-classes.ts --apply
 *   npx tsx apps/web/scripts/publish-classes.ts --apply --school=roger-gracie-malaga
 *
 * NEVER run with --apply without verifying the dry-run output first.
 */

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../lib/prisma-client/client'

interface ScheduleSlot {
  dayOfWeek: number
  startTime: string
  endTime: string
}

// ── Argument parsing ────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const APPLY  = args.includes('--apply')
const SCHOOL = args.find(a => a.startsWith('--school='))?.split('=')[1] ?? null

// ── Problem detection ───────────────────────────────────────────────────────────
interface Problem {
  code: string
  description: string
}

interface ClassForCheck {
  schedule: unknown
  school: { status: string }
  isActive: boolean
}

function detectProblems(cls: ClassForCheck): Problem[] {
  const problems: Problem[] = []

  // 1. Class itself must be active
  if (!cls.isActive) {
    problems.push({ code: 'INACTIVE', description: 'Class is marked inactive' })
  }

  // 2. School must not be suspended
  if (cls.school.status === 'SUSPENDED') {
    problems.push({ code: 'SCHOOL_SUSPENDED', description: 'School is suspended' })
  }

  // 3. Schedule must be valid
  const schedule = cls.schedule as ScheduleSlot[] | null
  if (!schedule || !Array.isArray(schedule) || schedule.length === 0) {
    problems.push({ code: 'NO_SCHEDULE', description: 'No schedule slots defined' })
  } else {
    for (const slot of schedule) {
      if (slot.dayOfWeek == null || !slot.startTime || !slot.endTime) {
        problems.push({ code: 'INVALID_SCHEDULE', description: 'Schedule slot missing dayOfWeek, startTime, or endTime' })
        break
      }
    }
  }

  return problems
}

// ── Main ────────────────────────────────────────────────────────────────────────
async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  })

  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(' publish-classes.ts')
    console.log(` Mode:   ${APPLY ? '⚠️  APPLY (writes enabled)' : '🔍 DRY-RUN (no writes)'}`)
    console.log(` School: ${SCHOOL ?? 'All schools'}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // Build where clause
    const schoolFilter = SCHOOL
      ? { school: { OR: [{ slug: SCHOOL }, { id: SCHOOL }] } }
      : {}

    // Fetch active, unpublished classes
    const candidates = await prisma.class.findMany({
      where: {
        isActive: true,
        isPublished: false,
        ...schoolFilter,
      },
      include: {
        school: { select: { id: true, name: true, slug: true, status: true } },
      },
      orderBy: [{ school: { name: 'asc' } }, { name: 'asc' }],
    })

    if (candidates.length === 0) {
      console.log('✅ No active unpublished classes found.')
      return
    }

    console.log(`Found ${candidates.length} active unpublished class(es):\n`)

    const publishable: typeof candidates = []
    const blocked:     typeof candidates = []

    for (const cls of candidates) {
      const problems = detectProblems(cls as ClassForCheck)
      const schedule = cls.schedule as ScheduleSlot[] | null
      const scheduleStr = schedule?.map(s => `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][s.dayOfWeek]} ${s.startTime}–${s.endTime}`).join(', ') ?? '—'

      console.log(`  📋 ${cls.name}`)
      console.log(`     School:   ${cls.school.name} (${cls.school.slug})`)
      console.log(`     ID:       ${cls.id}`)
      console.log(`     Schedule: ${scheduleStr}`)

      if (problems.length > 0) {
        blocked.push(cls)
        console.log(`     ❌ BLOCKED: ${problems.map(p => p.description).join('; ')}`)
        console.log(`     Action:   SKIP (will not publish)`)
      } else {
        publishable.push(cls)
        console.log(`     ✅ CLEAN: No issues detected`)
        console.log(`     Action:   ${APPLY ? 'WILL PUBLISH' : 'Would publish (dry-run)'}`)
      }
      console.log()
    }

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(` Total candidates: ${candidates.length}`)
    console.log(` Publishable:      ${publishable.length}`)
    console.log(` Blocked:          ${blocked.length}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    if (!APPLY) {
      console.log('ℹ️  DRY-RUN — no changes were made.')
      console.log('   To apply, re-run with --apply\n')
      return
    }

    // ── APPLY mode ──────────────────────────────────────────────────────────────
    if (publishable.length === 0) {
      console.log('Nothing to publish.')
      return
    }

    console.log(`Publishing ${publishable.length} class(es)...\n`)
    let published = 0
    let failed    = 0

    for (const cls of publishable) {
      try {
        await prisma.class.update({
          where: { id: cls.id },
          data: { isPublished: true },
        })
        console.log(`  ✅ Published: ${cls.name} (${cls.id})`)
        published++
      } catch (err) {
        console.error(`  ❌ Failed:   ${cls.name} (${cls.id}) — ${(err as Error).message}`)
        failed++
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(` Done. Published: ${published}  Failed: ${failed}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  } finally {
    await prisma.$disconnect()
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
