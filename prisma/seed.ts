import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.ts'
import { config } from 'dotenv'
import path from 'path'

config({ path: path.resolve(process.cwd(), '.env') })

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding Roger Gracie Malaga...')

  // Disciplines
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

  // School
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

  // School disciplines
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

  // Instructors
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

  console.log('Done! Roger Gracie Malaga seeded successfully.')
  console.log(`  School ID: ${school.id}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
