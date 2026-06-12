/**
 * Martial App V2 — Import Classes from V1 CSV exports
 *
 * Reads 3 V1 CSVs and inserts into V2 Supabase:
 *   - activities.csv   → Discipline lookup
 *   - userclasses.csv  → Class definitions per school
 *   - timetables.csv   → Weekly schedule per class
 *
 * Usage:
 *   DATABASE_URL="..." npx tsx scripts/import-classes-from-v1.ts
 *   DATABASE_URL="..." npx tsx scripts/import-classes-from-v1.ts --user-id 798
 *   DATABASE_URL="..." npx tsx scripts/import-classes-from-v1.ts --user-id 798 --dry-run
 *
 * Files expected in scripts/ (or override with --activities, --userclasses, --timetables):
 *   scripts/v1-activities.csv
 *   scripts/v1-userclasses.csv
 *   scripts/v1-timetables.csv
 */

import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../apps/web/lib/prisma-client/client.js'

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const getArg = (flag: string) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null }
const hasFlag = (flag: string) => args.includes(flag)

const TARGET_USER_ID = getArg('--user-id') ? Number(getArg('--user-id')) : null
const DRY_RUN = hasFlag('--dry-run')

const ACTIVITIES_FILE  = getArg('--activities')  ?? path.resolve('scripts/v1-activities.csv')
const USERCLASSES_FILE = getArg('--userclasses') ?? path.resolve('scripts/v1-userclasses.csv')
const TIMETABLES_FILE  = getArg('--timetables')  ?? path.resolve('scripts/v1-timetables.csv')

// ── Prisma ────────────────────────────────────────────────────────────────────

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

// ── V1 activity_id → discipline slug ─────────────────────────────────────────

const ACTIVITY_SLUG_MAP: Record<string, string> = {
  '17': 'mma',
  '18': 'bjj',
  '19': 'karate',
  '20': 'judo',
  '21': 'krav-maga',
  '22': 'taekwondo',
  '23': 'muay-thai',
  '24': 'pilates',
  '25': 'fitness',
  '27': 'crossfit',
  '31': 'wrestling',
  '32': 'grappling',
  '33': 'boxing',
  '36': 'functional',
  '39': 'kickboxing',
  '40': 'k1',
  '43': 'sambo',
  '45': 'ju-jitsu',
  '46': 'luta-livre',
  '47': 'capoeira',
  '53': 'bjj',
  '55': 'yoga',
  '64': 'nogi',
  '65': 'ginastica-natural',
}

// ── Schedule parser ───────────────────────────────────────────────────────────

interface V2ScheduleSlot {
  dayOfWeek: number   // 0=Sun … 6=Sat
  startTime: string   // "HH:MM"
  endTime: string     // "HH:MM"
}

/**
 * Parse V1 session_timings JSON into V2 schedule slots.
 *
 * V1 format:
 *   {"1": {"start": ["19:00", "20:30"], "end": ["20:30", "22:00"]}}
 *
 * V2 format:
 *   [{dayOfWeek: 1, startTime: "19:00", endTime: "20:30"},
 *    {dayOfWeek: 1, startTime: "20:30", endTime: "22:00"}]
 */
function parseSessionTimings(raw: string | null): V2ScheduleSlot[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)

    // Handle both object format {"1": {...}} and array format [{...}]
    if (Array.isArray(parsed)) return []

    const slots: V2ScheduleSlot[] = []
    for (const [dayStr, val] of Object.entries(parsed as Record<string, any>)) {
      const dayOfWeek = parseInt(dayStr, 10)
      if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) continue

      const starts: string[] = Array.isArray(val.start) ? val.start : [val.start]
      const ends: string[]   = Array.isArray(val.end)   ? val.end   : [val.end]

      for (let i = 0; i < starts.length; i++) {
        const startTime = starts[i]
        const endTime   = ends[i]
        if (!startTime || !endTime) continue
        slots.push({ dayOfWeek, startTime, endTime })
      }
    }

    // Sort by day then time
    return slots.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
  } catch {
    return []
  }
}

// ── Duration helper ───────────────────────────────────────────────────────────

function calcDuration(startTime: string, endTime: string): number | null {
  try {
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    const mins = (eh! * 60 + em!) - (sh! * 60 + sm!)
    return mins > 0 ? mins : null
  } catch {
    return null
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('━━━ Martial App V2 — Class Importer ━━━')
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no writes)' : '✏️  LIVE'}`)
  if (TARGET_USER_ID) console.log(`Filter: user_id=${TARGET_USER_ID} only`)
  console.log()

  // 1. Load CSVs
  for (const f of [ACTIVITIES_FILE, USERCLASSES_FILE, TIMETABLES_FILE]) {
    if (!fs.existsSync(f)) {
      console.error(`❌ File not found: ${f}`)
      console.error(`   Copy your V1 exports to scripts/ as:`)
      console.error(`   - v1-activities.csv`)
      console.error(`   - v1-userclasses.csv`)
      console.error(`   - v1-timetables.csv`)
      process.exit(1)
    }
  }

  const activities: any[]  = parse(fs.readFileSync(ACTIVITIES_FILE),  { columns: true, skip_empty_lines: true })
  const userclasses: any[] = parse(fs.readFileSync(USERCLASSES_FILE), { columns: true, skip_empty_lines: true })
  const timetables: any[]  = parse(fs.readFileSync(TIMETABLES_FILE),  { columns: true, skip_empty_lines: true })

  console.log(`📂 Loaded: ${activities.length} activities · ${userclasses.length} userclasses · ${timetables.length} timetables`)

  // 2. Build lookup maps
  const activityById = new Map<string, any>(activities.map(a => [a.id, a]))
  const timetableByClassId = new Map<string, any[]>()
  for (const t of timetables) {
    const list = timetableByClassId.get(t.class_id) ?? []
    list.push(t)
    timetableByClassId.set(t.class_id, list)
  }

  // 3. Filter target schools
  const targetClasses = TARGET_USER_ID
    ? userclasses.filter(c => String(c.user_id) === String(TARGET_USER_ID))
    : userclasses

  // Only active classes (status = "a")
  const activeClasses = targetClasses.filter(c => c.status === 'a')
  const schoolIds = [...new Set(activeClasses.map(c => c.user_id))]
  console.log(`🏫 Schools to import: ${schoolIds.length} (${schoolIds.join(', ')})`)
  console.log(`📋 Active classes: ${activeClasses.length}`)
  console.log()

  // 4. Ensure disciplines exist in V2
  const disciplineSlugsNeeded = new Set<string>()
  for (const uc of activeClasses) {
    const slug = ACTIVITY_SLUG_MAP[uc.activity_id]
    if (slug) disciplineSlugsNeeded.add(slug)
  }

  const existingDisciplines = await prisma.discipline.findMany({
    where: { slug: { in: [...disciplineSlugsNeeded] } },
    select: { id: true, slug: true, name: true },
  })
  const disciplineBySlug = new Map(existingDisciplines.map(d => [d.slug, d]))
  console.log(`🥋 Disciplines found in V2: ${existingDisciplines.map(d => d.name).join(', ')}`)

  // Missing disciplines — report but don't block
  const missing = [...disciplineSlugsNeeded].filter(s => !disciplineBySlug.has(s))
  if (missing.length) {
    console.warn(`⚠️  Disciplines not in V2 (will skip discipline link): ${missing.join(', ')}`)
  }
  console.log()

  // 5. For each school, find V2 school record
  let totalCreated = 0
  let totalSkipped = 0

  for (const userId of schoolIds) {
    const schoolClasses = activeClasses.filter(c => String(c.user_id) === String(userId))

    // Try to find V2 school by v1UserId
    const school = await prisma.school.findFirst({
      where: { v1UserId: Number(userId) },
      select: { id: true, name: true, slug: true },
    })

    if (!school) {
      console.warn(`⚠️  No V2 school found for user_id=${userId} — skipping ${schoolClasses.length} classes`)
      totalSkipped += schoolClasses.length
      continue
    }

    console.log(`\n🏫 ${school.name} (V2 id=${school.id}, V1 user_id=${userId})`)
    console.log(`   ${schoolClasses.length} active classes to import`)

    // Get existing classes for this school (avoid duplicates)
    const existingClassNames = new Set(
      (await prisma.class.findMany({
        where: { schoolId: school.id },
        select: { name: true },
      })).map(c => c.name.toLowerCase())
    )

    for (const uc of schoolClasses) {
      const className = (uc.name ?? '').trim()
      if (!className) { totalSkipped++; continue }

      // Duplicate check by name
      if (existingClassNames.has(className.toLowerCase())) {
        console.log(`   ⏭  Skip (exists): ${className}`)
        totalSkipped++
        continue
      }

      // Discipline
      const activitySlug = ACTIVITY_SLUG_MAP[uc.activity_id]
      const discipline   = activitySlug ? disciplineBySlug.get(activitySlug) ?? null : null

      // Timetable / schedule
      const classTimetables = timetableByClassId.get(uc.id) ?? []
      // Use the active timetable (status="a"), prefer most recent
      const activeTimetable = classTimetables
        .filter(t => t.status === 'a' || !t.status)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]

      const schedule = activeTimetable
        ? parseSessionTimings(activeTimetable.session_timings)
        : []

      const capacity = activeTimetable ? parseInt(activeTimetable.allowed) || null : null

      // Duration: derive from first schedule slot if available
      let duration: number | null = null
      if (schedule.length > 0) {
        duration = calcDuration(schedule[0]!.startTime, schedule[0]!.endTime)
      }

      // One-off event (repeat=1) vs recurring class (repeat=0)
      const isOneOff = activeTimetable?.repeat === '1'

      // Type: 1=regular, 2=seminar, 3=seminar+grading
      const classType = uc.type
      const isTrial   = false

      const activityName = activityById.get(uc.activity_id)?.name ?? null

      const classData = {
        schoolId:     school.id,
        name:         className,
        description:  uc.description?.trim() || null,
        disciplineId: discipline?.id ?? null,
        level:        null,
        duration,
        capacity,
        price:        uc.price ? parseFloat(uc.price) : null,
        currency:     'EUR',
        isTrial,
        isActive:     true,
        schedule:     schedule.length > 0 ? schedule : null,
      }

      const dayLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
      const scheduleStr = schedule.length > 0
        ? schedule.map(s => `${dayLabels[s.dayOfWeek]} ${s.startTime}`).join(' · ')
        : isOneOff ? '(one-off event)' : '(no schedule)'

      console.log(`   ✅ ${className}`)
      console.log(`      Discipline: ${discipline?.name ?? activityName ?? '—'} · Capacity: ${capacity ?? '—'} · Schedule: ${scheduleStr}`)

      if (!DRY_RUN) {
        await prisma.class.create({ data: classData })
        existingClassNames.add(className.toLowerCase())
        totalCreated++
      } else {
        totalCreated++
      }
    }
  }

  console.log(`\n━━━ Summary ━━━`)
  console.log(`✅ Classes ${DRY_RUN ? 'would be created' : 'created'}: ${totalCreated}`)
  console.log(`⏭  Skipped: ${totalSkipped}`)
  if (DRY_RUN) console.log(`\n💡 Remove --dry-run to write to the database.`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
