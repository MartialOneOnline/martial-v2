import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.ts'
import { config } from 'dotenv'
import path from 'path'

config({ path: path.resolve(process.cwd(), '.env') })

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding Roger Gracie Malaga...')

  // ── Disciplines ────────────────────────────────────────────────────────────
  const bjj = await prisma.discipline.upsert({
    where: { slug: 'jiu-jitsu' },
    update: {},
    create: { name: 'Jiu Jitsu', slug: 'jiu-jitsu' },
  })

  const grappling = await prisma.discipline.upsert({
    where: { slug: 'grappling' },
    update: {},
    create: { name: 'Grappling', slug: 'grappling' },
  })

  // ── School ─────────────────────────────────────────────────────────────────
  const school = await prisma.school.upsert({
    where: { slug: 'roger-gracie-malaga' },
    update: {},
    create: {
      name: 'Roger Gracie Malaga',
      slug: 'roger-gracie-malaga',
      status: 'CLAIMED',
      source: 'VONSEL',
      country: 'ES',
      city: 'Málaga',
      address: 'Calle Polifemo, 3, Málaga, España',
      postcode: '29004',
      lat: 36.68696,
      lng: -4.4472137,
      phone: '+34665988898',
      email: 'rogergraciemalaga@gmail.com',
      website: 'http://rogergraciemalaga.com/',
      instagram: 'rogergraciemalaga',
      facebook: 'https://www.facebook.com/rogergraciemalaga',
      description: 'Roger Gracie Malaga es una escuela de Jiu Jitsu situada en Málaga. Ofrecemos clases para todos los niveles. Filial de Roger Gracie Academy.',
      tagline: 'Elite BJJ training in the heart of Málaga',
      coverUrl: '/roger-gracie-malaga.jpg',
      priceFrom: 65,
      hasFreeTrialCls: true,
      facilities: ['Wi-Fi', 'Lockers', 'Lounge', 'Showers', 'Store', 'Tatami', 'Water', 'Fit Room', 'Bike Parking'],
      affiliationName: 'Roger Gracie Academy',
      googleRating: 4.9,
      googleReviews: 128,
    },
  })

  // ── School disciplines ─────────────────────────────────────────────────────
  await prisma.schoolDiscipline.upsert({
    where: { schoolId_disciplineId: { schoolId: school.id, disciplineId: bjj.id } },
    update: {},
    create: { schoolId: school.id, disciplineId: bjj.id },
  })

  await prisma.schoolDiscipline.upsert({
    where: { schoolId_disciplineId: { schoolId: school.id, disciplineId: grappling.id } },
    update: {},
    create: { schoolId: school.id, disciplineId: grappling.id },
  })

  // ── Instructors ────────────────────────────────────────────────────────────
  await prisma.instructor.upsert({
    where: { id: 'pablo-cabo-rgm' },
    update: {},
    create: {
      id: 'pablo-cabo-rgm',
      schoolId: school.id,
      name: 'Pablo Cabo',
      role: 'Head Instructor',
      belt: 'Black Belt 4th Degree',
      isHead: true,
      isActive: true,
      sortOrder: 1,
    },
  })

  await prisma.instructor.upsert({
    where: { id: 'jose-luis-montiel-rgm' },
    update: {},
    create: {
      id: 'jose-luis-montiel-rgm',
      schoolId: school.id,
      name: 'Jose Luis Montiel',
      role: 'Instructor',
      belt: 'Black Belt 1st Degree',
      isHead: false,
      isActive: true,
      sortOrder: 2,
    },
  })

  // ── Classes ────────────────────────────────────────────────────────────────
  // Schedule format: [{ dayOfWeek: 1, startTime: "10:00", endTime: "11:30" }]
  // Days: 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat

  const classes = [
    {
      id: 'rgm-bjj-todos',
      name: 'Jiu Jitsu Todos los Niveles',
      description: 'Clases de Jiu Jitsu para todos los niveles. Calentamiento, técnica y sparring.',
      level: 'All levels',
      duration: 90,
      capacity: 30,
      isActive: true,
      schedule: [
        { dayOfWeek: 1, startTime: '10:00', endTime: '11:30' },
        { dayOfWeek: 3, startTime: '10:00', endTime: '11:30' },
        { dayOfWeek: 4, startTime: '19:00', endTime: '20:30' },
        { dayOfWeek: 5, startTime: '10:00', endTime: '11:30' },
        { dayOfWeek: 6, startTime: '11:00', endTime: '12:30' },
      ],
    },
    {
      id: 'rgm-bjj-avanzado',
      name: 'Jiu Jitsu Avanzado',
      description: 'Clases avanzadas de Jiu Jitsu para cinturones azul en adelante.',
      level: 'Advanced',
      duration: 90,
      capacity: 30,
      isActive: true,
      schedule: [
        { dayOfWeek: 1, startTime: '19:00', endTime: '20:30' },
        { dayOfWeek: 3, startTime: '19:00', endTime: '20:30' },
      ],
    },
    {
      id: 'rgm-bjj-iniciacion',
      name: 'Jiu Jitsu Iniciación',
      description: 'Clases para principiantes. Cinturones blancos, base y fundamentos del Jiu Jitsu.',
      level: 'Beginner',
      duration: 60,
      capacity: 30,
      isActive: true,
      schedule: [
        { dayOfWeek: 1, startTime: '20:30', endTime: '21:30' },
        { dayOfWeek: 2, startTime: '19:00', endTime: '20:00' },
        { dayOfWeek: 3, startTime: '20:30', endTime: '21:30' },
        { dayOfWeek: 4, startTime: '19:00', endTime: '20:00' },
      ],
    },
    {
      id: 'rgm-nogi',
      name: 'NoGi / Grappling',
      description: 'Clases de NoGi Grappling para todos los niveles.',
      level: 'All levels',
      duration: 90,
      capacity: 30,
      isActive: true,
      schedule: [
        { dayOfWeek: 2, startTime: '10:00', endTime: '11:30' },
        { dayOfWeek: 2, startTime: '20:00', endTime: '21:30' },
        { dayOfWeek: 4, startTime: '10:00', endTime: '11:30' },
        { dayOfWeek: 5, startTime: '19:00', endTime: '20:30' },
      ],
    },
    {
      id: 'rgm-open-mat',
      name: 'Open Mat',
      description: 'Entrenamiento libre. Sparring abierto para todos los alumnos.',
      level: 'All levels',
      duration: 90,
      capacity: 30,
      isActive: true,
      schedule: [],
    },
  ]

  for (const cls of classes) {
    await prisma.class.upsert({
      where: { id: cls.id },
      update: {},
      create: {
        id: cls.id,
        schoolId: school.id,
        name: cls.name,
        description: cls.description,
        level: cls.level,
        duration: cls.duration,
        capacity: cls.capacity,
        isActive: cls.isActive,
        schedule: cls.schedule,
        currency: 'EUR',
      },
    })
  }

  // ── Membership Plans ───────────────────────────────────────────────────────
  const plans = [
    {
      id: 'rgm-mensual',
      name: 'Jiu Jitsu Mensual',
      description: 'Acceso ilimitado a todas las clases. Se renueva automáticamente cada mes.',
      price: 65,
      billingCycle: 'monthly',
      features: ['Acceso ilimitado a todas las clases', 'BJJ Gi y NoGi', 'Todos los niveles'],
      isPopular: true,
    },
    {
      id: 'rgm-trimestral',
      name: 'Jiu Jitsu Trimestral',
      description: 'Acceso ilimitado durante 3 meses. Se renueva automáticamente cada trimestre.',
      price: 180,
      billingCycle: 'quarterly',
      features: ['Acceso ilimitado a todas las clases', 'Ahorra vs mensual', 'BJJ Gi y NoGi'],
      isPopular: false,
    },
    {
      id: 'rgm-infantil',
      name: 'Jiu Jitsu Infantil',
      description: 'Clases de Jiu Jitsu para niños de 4 a 16 años.',
      price: 50,
      billingCycle: 'monthly',
      features: ['Clases infantiles y adultos', 'Todos los niveles', 'Apto desde 4 años'],
      isPopular: false,
    },
    {
      id: 'rgm-family',
      name: 'Family Jiu Jitsu',
      description: 'Membresía familiar: 1 adulto + 2 menores. Acceso ilimitado.',
      price: 100,
      billingCycle: 'monthly',
      features: ['1 adulto + 2 menores', 'Clases adultos e infantiles', 'Acceso ilimitado'],
      isPopular: false,
    },
    {
      id: 'rgm-bono8',
      name: 'Bono 8 Clases',
      description: '8 accesos a cualquier clase de Jiu Jitsu o Grappling. Válido 3 meses.',
      price: 100,
      billingCycle: 'one-off',
      features: ['8 accesos', 'BJJ y Grappling', 'Válido 3 meses'],
      isPopular: false,
    },
    {
      id: 'rgm-2semanas',
      name: 'Pase 2 Semanas',
      description: 'Acceso ilimitado durante 2 semanas.',
      price: 35,
      billingCycle: 'one-off',
      features: ['14 días acceso ilimitado', 'Todas las clases'],
      isPopular: false,
    },
    {
      id: 'rgm-1semana',
      name: 'Pase 1 Semana',
      description: 'Acceso ilimitado durante 7 días.',
      price: 40,
      billingCycle: 'one-off',
      features: ['7 días acceso ilimitado', 'Todas las clases'],
      isPopular: false,
    },
    {
      id: 'rgm-1dia',
      name: 'Pase 1 Día',
      description: 'Acceso de un día para visitantes.',
      price: 20,
      billingCycle: 'one-off',
      features: ['1 día acceso', 'Hasta 2 clases'],
      isPopular: false,
    },
    {
      id: 'rgm-privada',
      name: 'Clase Privada',
      description: 'Clase privada individual. Técnica y táctica personalizada.',
      price: 50,
      billingCycle: 'one-off',
      features: ['Sesión individual', 'Con head instructor', 'Técnica personalizada'],
      isPopular: false,
    },
    {
      id: 'rgm-prueba-semana',
      name: 'Prueba 1 Semana',
      description: 'Una semana gratis para conocer la academia.',
      price: 0,
      billingCycle: 'one-off',
      features: ['7 días gratis', 'Sin compromiso', 'Todas las clases'],
      isPopular: false,
      isActive: false, // private — not shown publicly
    },
    {
      id: 'rgm-prueba-dia',
      name: 'Prueba 1 Día',
      description: 'Un día gratis para conocer la academia.',
      price: 0,
      billingCycle: 'one-off',
      features: ['1 día gratis', 'Sin compromiso'],
      isPopular: false,
      isActive: false, // private — not shown publicly
    },
  ]

  for (const plan of plans) {
    await prisma.membershipPlan.upsert({
      where: { id: plan.id },
      update: {},
      create: {
        id: plan.id,
        schoolId: school.id,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        currency: 'EUR',
        billingCycle: plan.billingCycle,
        features: plan.features,
        isPopular: plan.isPopular,
        isActive: (plan as any).isActive ?? true,
      },
    })
  }

  console.log('✅  Done! Roger Gracie Malaga seeded successfully.')
  console.log(`    School ID:   ${school.id}`)
  console.log(`    Classes:     ${classes.length}`)
  console.log(`    Plans:       ${plans.length}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
