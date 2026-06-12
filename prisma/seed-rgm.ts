/**
 * Seed: Roger Gracie Málaga — import V1 data into V2 DB
 *
 * Run: npx tsx prisma/seed-rgm.ts
 */

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../apps/web/lib/prisma-client/client'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(__dirname, '../apps/web/.env.local') })

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
} as any)

const SCHOOL_ID = 'cmq6k2n5t0000x4o0rcvlmhmv'
const OWNER_SUPABASE_ID = '30ee1dbe-2c35-445b-9086-14f9b7fb18b9'
const OWNER_EMAIL = 'rogergraciemalaga@gmail.com'

// Map Spanish day names → dayOfWeek (0=Sun)
const DAY_MAP: Record<string, number> = {
  Domingo: 0, Lunes: 1, Martes: 2, Miércoles: 3,
  Jueves: 4, Viernes: 5, Sábado: 6,
}

function parseTime(t: string) {
  // "10:00 - 11:30" → { startTime: "10:00", endTime: "11:30" }
  const [start, end] = t.split(' - ').map(s => s.trim())
  return { startTime: start, endTime: end }
}

async function main() {
  console.log('🥋 Seeding Roger Gracie Málaga...\n')

  // ── 1. Upsert owner User ──────────────────────────────────────────────────
  const owner = await prisma.user.upsert({
    where: { email: OWNER_EMAIL },
    update: { supabaseAuthId: OWNER_SUPABASE_ID, name: 'Roger Gracie Málaga', role: 'SCHOOL_OWNER' },
    create: {
      id: OWNER_SUPABASE_ID, // use Supabase UUID as Prisma id for consistency
      email: OWNER_EMAIL,
      name: 'Roger Gracie Málaga',
      supabaseAuthId: OWNER_SUPABASE_ID,
      role: 'SCHOOL_OWNER',
      phone: '+34665988898',
    },
  })
  console.log(`✅ Owner user: ${owner.id}`)

  // ── 2. SchoolMember — OWNER ───────────────────────────────────────────────
  await prisma.schoolMember.upsert({
    where: { schoolId_userId: { schoolId: SCHOOL_ID, userId: owner.id } },
    update: { role: 'OWNER', status: 'ACTIVE' },
    create: {
      schoolId: SCHOOL_ID,
      userId: owner.id,
      role: 'OWNER',
      status: 'ACTIVE',
      joinedAt: new Date('2020-01-01'),
    },
  })
  console.log('✅ Owner SchoolMember')

  // ── 3. Instructors ────────────────────────────────────────────────────────
  const instructors = [
    {
      name: 'Pablo Cabo',
      role: 'Head Instructor',
      belt: 'Black Belt 4th Degree',
      bio: 'Cinturón negro 4º grado del maestro Roger Gracie. Más de 15 años de experiencia docente internacional. Competidor activo y medallista en torneos europeos e internacionales.',
      instagram: 'pablocabobjj',
    },
    {
      name: 'Jose Luis Montiel',
      role: 'Instructor',
      belt: 'Black Belt 1st Degree',
      bio: 'Conocido como "Monti". Medalla de bronce en el Campeonato Europeo IBJJF 2020 (Master). Especialista en iniciación y defensa personal.',
      instagram: 'montibjj',
    },
    {
      name: 'Roger Gracie',
      role: 'Honorary Master',
      belt: 'Black Belt 5th Degree',
      bio: 'Nieto del fundador del Jiu Jitsu. 10 veces campeón del Mundo IBJJF. Reconocido como el competidor más dominante de la historia.',
      instagram: 'rogergracie',
    },
  ]

  const instructorMap: Record<string, string> = {}

  for (const inst of instructors) {
    const existing = await prisma.instructor.findFirst({ where: { schoolId: SCHOOL_ID, name: inst.name } })
    const record = existing ?? await prisma.instructor.create({
      data: { schoolId: SCHOOL_ID, name: inst.name, role: inst.role, belt: inst.belt, bio: inst.bio, instagram: inst.instagram, isHead: inst.name === 'Pablo Cabo' },
    })
    instructorMap[inst.name] = record.id
    console.log(`✅ Instructor: ${inst.name}`)
  }

  // ── 4. Disciplines ────────────────────────────────────────────────────────
  const disciplines = [
    { name: 'BJJ', slug: 'bjj' },
    { name: 'No-Gi / Grappling', slug: 'no-gi-grappling' },
    { name: 'Kids BJJ', slug: 'kids-bjj' },
    { name: 'Self Defense', slug: 'self-defense' },
  ]

  for (const d of disciplines) {
    const disc = await prisma.discipline.upsert({
      where: { slug: d.slug },
      update: {},
      create: { name: d.name, slug: d.slug },
    })
    await prisma.schoolDiscipline.upsert({
      where: { schoolId_disciplineId: { schoolId: SCHOOL_ID, disciplineId: disc.id } },
      update: {},
      create: { schoolId: SCHOOL_ID, disciplineId: disc.id },
    })
    console.log(`✅ Discipline: ${d.name}`)
  }

  // ── 5. Classes ────────────────────────────────────────────────────────────
  type ClassDef = {
    name: string
    time: string
    days: string[]
    category: string
    instructor: string
    level: string
    description: string
  }

  const CLASSES_SCHEDULE: ClassDef[] = [
    { name: 'Jiu Jitsu Todos', time: '10:00 - 11:30', days: ['Lunes', 'Miércoles', 'Viernes'], category: 'adults', instructor: 'Pablo Cabo', level: 'Todos los niveles', description: 'Clase completa apta para cualquier nivel de experiencia, combinando técnica fundamental, drills y combate libre.' },
    { name: 'NOGI (Grappling)', time: '10:00 - 11:30', days: ['Martes', 'Jueves'], category: 'grappling', instructor: 'Pablo Cabo', level: 'Todos los niveles', description: 'Entrenamiento dinámico sin kimono, enfocado en derribos, transiciones rápidas y llaves de sumisión.' },
    { name: 'Jiu Jitsu Infantil (Kids)', time: '18:00 - 19:00', days: ['Martes', 'Jueves'], category: 'kids', instructor: 'Pablo Cabo', level: 'Todos los niveles', description: 'Programa educativo y de defensa personal que infunde confianza, respeto, coordinación y autodisciplina en los más jóvenes.' },
    { name: 'Jiu Jitsu Infantil (Kids)', time: '10:00 - 11:00', days: ['Sábado'], category: 'kids', instructor: 'Pablo Cabo', level: 'Todos los niveles', description: 'La sesión del sábado para inculcar valores de equipo, juegos coordinativos aplicados y técnicas lúdicas de Jiu Jitsu.' },
    { name: 'Jiu Jitsu Todos', time: '11:00 - 12:30', days: ['Sábado'], category: 'adults', instructor: 'Pablo Cabo / Monti', level: 'Todos los niveles', description: 'La clase estrella del sábado para repasar las técnicas semanales seguido de un asombroso bloque de rodadas y Open Mat.' },
    { name: 'Jiu Jitsu Avanzado', time: '19:00 - 20:30', days: ['Lunes', 'Miércoles'], category: 'adults', instructor: 'Pablo Cabo', level: 'Avanzados', description: 'Sesión intensiva orientada a la competición, combinando técnicas complejas de control y estrategias de combate.' },
    { name: 'Jiu Jitsu Todos', time: '19:00 - 20:30', days: ['Jueves'], category: 'adults', instructor: 'Jose Luis Montiel', level: 'Todos los niveles', description: 'Clase grupal versátil donde los alumnos de cualquier nivel practican secuencias de escape y ataques coordinados.' },
    { name: 'NOGI (Grappling)', time: '19:00 - 20:30', days: ['Viernes'], category: 'grappling', instructor: 'Pablo Cabo', level: 'Todos los niveles', description: 'Práctica fluida sin kimono para consolidar transiciones fluidas de derribo a sumisión antes del fin de semana.' },
    { name: 'Jiu Jitsu Iniciación', time: '19:00 - 20:00', days: ['Martes', 'Jueves'], category: 'adults', instructor: 'Jose Luis Montiel', level: 'Iniciación', description: 'Programa especializado y seguro concebido para construir cimientos sólidos en defensas, posturas y zafadas básicas.' },
    { name: 'NOGI (Grappling)', time: '20:00 - 21:30', days: ['Martes'], category: 'grappling', instructor: 'Pablo Cabo', level: 'Todos los niveles', description: 'Sesión avanzada de No-Gi focalizada en secuencias de sumisión y resistencia física óptima.' },
    { name: 'Jiu Jitsu Iniciación', time: '20:30 - 21:30', days: ['Lunes', 'Miércoles'], category: 'adults', instructor: 'Jose Luis Montiel', level: 'Iniciación', description: 'Aprende los conceptos fundamentales paso a paso en un ambiente seguro y formativo idóneo para principiantes.' },
  ]

  // Group classes by name+time+instructor → one Class record with multi-day schedule
  const grouped = new Map<string, ClassDef & { allDays: string[] }>()
  for (const cls of CLASSES_SCHEDULE) {
    const key = `${cls.name}|${cls.time}|${cls.instructor}`
    if (grouped.has(key)) {
      grouped.get(key)!.allDays.push(...cls.days)
    } else {
      grouped.set(key, { ...cls, allDays: [...cls.days] })
    }
  }

  for (const cls of grouped.values()) {
    const { startTime, endTime } = parseTime(cls.time)
    const [startH, startM] = startTime.split(':').map(Number)
    const [endH, endM] = endTime.split(':').map(Number)
    const duration = (endH * 60 + endM) - (startH * 60 + startM)

    const schedule = cls.allDays.map(day => ({
      dayOfWeek: DAY_MAP[day],
      startTime,
      endTime,
    }))

    // Resolve instructor id (use first named instructor if "Pablo Cabo / Monti")
    const instructorName = cls.instructor.includes('/') ? 'Pablo Cabo' : cls.instructor
    const instructorId = instructorMap[instructorName] ?? null

    const levelMap: Record<string, string> = {
      'Todos los niveles': 'All levels',
      'Iniciación': 'Beginner',
      'Avanzados': 'Advanced',
    }

    await prisma.class.create({
      data: {
        schoolId: SCHOOL_ID,
        name: cls.name,
        description: cls.description,
        level: levelMap[cls.level] ?? cls.level,
        duration,
        capacity: cls.category === 'kids' ? 20 : 30,
        price: 0,
        isActive: true,
        schedule,
        instructorId,
      },
    })
    console.log(`✅ Class: ${cls.name} (${cls.allDays.join(', ')} ${startTime})`)
  }

  console.log('\n🎉 Seed complete — Roger Gracie Málaga data imported.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
