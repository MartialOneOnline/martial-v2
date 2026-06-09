import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.ts'
import { config } from 'dotenv'
import path from 'path'

config({ path: path.resolve(process.cwd(), '.env') })

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! })
const prisma = new PrismaClient({ adapter })

// ─── Roger Gracie academies worldwide ──────────────────────────────────────
// Source: https://www.rogergracieassociation.com/academy-finder/
// slug format: rg-{city-lowercase} (duplicates: rg-buckingham-1, etc.)

const RG_ACADEMIES = [
  // UK
  { slug: 'rg-barnet',             name: 'Roger Gracie Barnet',              city: 'Barnet',              country: 'GB' },
  { slug: 'rg-bedford',            name: 'Roger Gracie Bedford',             city: 'Bedford',             country: 'GB' },
  { slug: 'rg-bolton',             name: 'Roger Gracie Bolton',              city: 'Bolton',              country: 'GB' },
  { slug: 'rg-bristol',            name: 'Roger Gracie Bristol',             city: 'Bristol',             country: 'GB' },
  { slug: 'rg-buckingham',         name: 'Roger Gracie Buckingham',          city: 'Buckingham',          country: 'GB' },
  { slug: 'rg-buckinghamshire',    name: 'Roger Gracie Buckinghamshire',     city: 'Buckinghamshire',     country: 'GB' },
  { slug: 'rg-chester',            name: 'Roger Gracie Chester',             city: 'Chester',             country: 'GB' },
  { slug: 'rg-darlington',         name: 'Roger Gracie Darlington',          city: 'Darlington',          country: 'GB' },
  { slug: 'rg-henley',             name: 'Roger Gracie Henley',              city: 'Henley',              country: 'GB' },
  { slug: 'rg-leicester',          name: 'Roger Gracie Leicester',           city: 'Leicester',           country: 'GB' },
  { slug: 'rg-london-hq',          name: 'Roger Gracie London HQ',           city: 'London',              country: 'GB' },
  { slug: 'rg-marlow',             name: 'Roger Gracie Marlow',              city: 'Marlow',              country: 'GB' },
  { slug: 'rg-moorgate',           name: 'Roger Gracie Moorgate',            city: 'London',              country: 'GB' },
  { slug: 'rg-north-east',         name: 'Roger Gracie North East',          city: 'North East',          country: 'GB' },
  { slug: 'rg-preston',            name: 'Roger Gracie Preston',             city: 'Preston',             country: 'GB' },
  { slug: 'rg-queens-park',        name: 'Roger Gracie Queens Park',         city: 'London',              country: 'GB' },
  { slug: 'rg-salford',            name: 'Roger Gracie Salford',             city: 'Salford',             country: 'GB' },
  { slug: 'rg-south-herts',        name: 'Roger Gracie South Herts',         city: 'South Herts',         country: 'GB' },
  { slug: 'rg-taunton',            name: 'Roger Gracie Taunton',             city: 'Taunton',             country: 'GB' },
  { slug: 'rg-watford',            name: 'Roger Gracie Watford',             city: 'Watford',             country: 'GB' },
  { slug: 'rg-welwyn-garden-city', name: 'Roger Gracie Welwyn Garden City',  city: 'Welwyn Garden City',  country: 'GB' },
  // Austria
  { slug: 'rg-graz',              name: 'Roger Gracie Graz',                city: 'Graz',                country: 'AT' },
  { slug: 'rg-kufstein',          name: 'Roger Gracie Kufstein',             city: 'Kufstein',            country: 'AT' },
  { slug: 'rg-linz',              name: 'Roger Gracie Linz',                city: 'Linz',                country: 'AT' },
  { slug: 'rg-vienna',            name: 'Roger Gracie Vienna',              city: 'Vienna',              country: 'AT' },
  // Croatia
  { slug: 'rg-split',             name: 'Roger Gracie Split',               city: 'Split',               country: 'HR' },
  { slug: 'rg-zagreb',            name: 'Roger Gracie Zagreb',              city: 'Zagreb',              country: 'HR' },
  // Italy
  { slug: 'rg-abiategrasso',      name: 'Roger Gracie Abiategrasso',        city: 'Abiategrasso',        country: 'IT' },
  { slug: 'rg-cagliari',          name: 'Roger Gracie Cagliari',            city: 'Cagliari',            country: 'IT' },
  { slug: 'rg-ciampino',          name: 'Roger Gracie Ciampino',            city: 'Ciampino',            country: 'IT' },
  { slug: 'rg-ravenna',           name: 'Roger Gracie Ravenna',             city: 'Ravenna',             country: 'IT' },
  { slug: 'rg-reggio-emilia',     name: 'Roger Gracie Reggio Emilia',       city: 'Reggio Emilia',       country: 'IT' },
  { slug: 'rg-rome',              name: 'Roger Gracie Rome',                city: 'Rome',                country: 'IT' },
  { slug: 'rg-treviso',           name: 'Roger Gracie Treviso',             city: 'Treviso',             country: 'IT' },
  // Lithuania
  { slug: 'rg-kaunas',            name: 'Roger Gracie Kaunas',              city: 'Kaunas',              country: 'LT' },
  { slug: 'rg-klaipeda',          name: 'Roger Gracie Klaipėda',            city: 'Klaipėda',            country: 'LT' },
  { slug: 'rg-vilnius',           name: 'Roger Gracie Vilnius',             city: 'Vilnius',             country: 'LT' },
  // Netherlands
  { slug: 'rg-amsterdam',         name: 'Roger Gracie Amsterdam',           city: 'Amsterdam',           country: 'NL' },
  // Slovakia
  { slug: 'rg-bratislava',        name: 'Roger Gracie Bratislava',          city: 'Bratislava',          country: 'SK' },
  // Spain (Málaga already seeded separately — only add the others)
  { slug: 'rg-draco',             name: 'Roger Gracie Draco',               city: 'Draco',               country: 'ES' },
  { slug: 'rg-sevilla',           name: 'Roger Gracie Sevilla',             city: 'Sevilla',             country: 'ES' },
  { slug: 'rg-tarifa',            name: 'Roger Gracie Tarifa',              city: 'Tarifa',              country: 'ES' },
  // Turkey
  { slug: 'rg-istanbul',          name: 'Roger Gracie Istanbul',            city: 'Istanbul',            country: 'TR' },
  // Norway
  { slug: 'rg-oslo',              name: 'Roger Gracie Oslo',                city: 'Oslo',                country: 'NO' },
  // Germany
  { slug: 'rg-nuernberg',         name: 'Roger Gracie Nuernberg',           city: 'Nuremberg',           country: 'DE' },
  // International
  { slug: 'rg-baku',              name: 'Roger Gracie Baku',                city: 'Baku',                country: 'AZ' },
  { slug: 'rg-dubai',             name: 'Roger Gracie Dubai',               city: 'Dubai',               country: 'AE' },
  { slug: 'rg-texas',             name: 'Roger Gracie Texas',               city: 'Texas',               country: 'US' },
]

async function main() {
  console.log('🥋  Seeding Martial App V2...\n')

  // ── Disciplines ─────────────────────────────────────────────────────────────
  console.log('📌 Disciplines...')
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

  // ── Roger Gracie Affiliation ─────────────────────────────────────────────────
  console.log('🏛️  Roger Gracie Affiliation...')
  const affiliation = await prisma.affiliation.upsert({
    where: { slug: 'roger-gracie' },
    update: {},
    create: {
      slug:        'roger-gracie',
      name:        'Roger Gracie Association',
      description: 'The Roger Gracie Association brings together BJJ academies worldwide under the Roger Gracie brand. Founded by 10x World Champion Roger Gracie.',
      website:     'https://www.rogergracieassociation.com',
      instagram:   'rogergracie',
      country:     'GB',
    },
  })

  // ── Roger Gracie TV ──────────────────────────────────────────────────────────
  console.log('📺  Roger Gracie TV...')
  const rgTv = await prisma.contentPlatform.upsert({
    where: { slug: 'rg-tv' },
    update: {},
    create: {
      slug:         'rg-tv',
      name:         'Roger Gracie TV',
      description:  "Exclusive BJJ instructional content from Roger Gracie and the Association's top black belts. Available to members of affiliated academies.",
      affiliationId: affiliation.id,
      isActive:     true,
    },
  })

  // ── Roger Gracie Málaga (flagship — full data) ──────────────────────────────
  console.log('🏫  Roger Gracie Málaga (flagship)...')
  const malaga = await prisma.school.upsert({
    where: { slug: 'roger-gracie-malaga' },
    update: {
      affiliationId: affiliation.id,
      status: 'PARTNER',
    },
    create: {
      name:          'Roger Gracie Malaga',
      slug:          'roger-gracie-malaga',
      status:        'PARTNER',
      source:        'AFFILIATE',
      affiliationId: affiliation.id,
      country:       'ES',
      city:          'Málaga',
      address:       'Calle Polifemo, 3, Málaga, España',
      postcode:      '29004',
      lat:            36.68696,
      lng:           -4.4472137,
      phone:         '+34665988898',
      email:         'rogergraciemalaga@gmail.com',
      website:       'http://rogergraciemalaga.com/',
      instagram:     'rogergraciemalaga',
      facebook:      'https://www.facebook.com/rogergraciemalaga',
      description:   'Roger Gracie Malaga es una escuela de Jiu Jitsu situada en Málaga. Ofrecemos clases para todos los niveles. Filial de Roger Gracie Academy.',
      tagline:       'Elite BJJ training in the heart of Málaga',
      coverUrl:      '/roger-gracie-malaga.jpg',
      priceFrom:     65,
      hasFreeTrialCls: true,
      facilities:    ['Wi-Fi', 'Lockers', 'Lounge', 'Showers', 'Store', 'Tatami', 'Water', 'Fit Room', 'Bike Parking'],
      googleRating:  4.9,
      googleReviews: 128,
    },
  })

  // ── Disciplines for Málaga ───────────────────────────────────────────────────
  for (const discId of [bjj.id, grappling.id]) {
    await prisma.schoolDiscipline.upsert({
      where: { schoolId_disciplineId: { schoolId: malaga.id, disciplineId: discId } },
      update: {},
      create: { schoolId: malaga.id, disciplineId: discId },
    })
  }

  // ── Instructors for Málaga ───────────────────────────────────────────────────
  await prisma.instructor.upsert({
    where: { id: 'pablo-cabo-rgm' },
    update: {},
    create: {
      id: 'pablo-cabo-rgm', schoolId: malaga.id,
      name: 'Pablo Cabo', role: 'Head Instructor',
      belt: 'Black Belt 4th Degree',
      isHead: true, isActive: true, sortOrder: 1,
    },
  })
  await prisma.instructor.upsert({
    where: { id: 'jose-luis-montiel-rgm' },
    update: {},
    create: {
      id: 'jose-luis-montiel-rgm', schoolId: malaga.id,
      name: 'Jose Luis Montiel', role: 'Instructor',
      belt: 'Black Belt 1st Degree',
      isHead: false, isActive: true, sortOrder: 2,
    },
  })

  // ── Classes for Málaga ───────────────────────────────────────────────────────
  const classes = [
    { id: 'rgm-bjj-todos',    name: 'Jiu Jitsu Todos los Niveles', level: 'All levels', duration: 90,
      schedule: [{ dayOfWeek:1,startTime:'10:00',endTime:'11:30' },{ dayOfWeek:3,startTime:'10:00',endTime:'11:30' },{ dayOfWeek:4,startTime:'19:00',endTime:'20:30' },{ dayOfWeek:5,startTime:'10:00',endTime:'11:30' },{ dayOfWeek:6,startTime:'11:00',endTime:'12:30' }] },
    { id: 'rgm-bjj-avanzado', name: 'Jiu Jitsu Avanzado',          level: 'Advanced',   duration: 90,
      schedule: [{ dayOfWeek:1,startTime:'19:00',endTime:'20:30' },{ dayOfWeek:3,startTime:'19:00',endTime:'20:30' }] },
    { id: 'rgm-bjj-iniciacion', name: 'Jiu Jitsu Iniciación',      level: 'Beginner',   duration: 60,
      schedule: [{ dayOfWeek:1,startTime:'20:30',endTime:'21:30' },{ dayOfWeek:2,startTime:'19:00',endTime:'20:00' },{ dayOfWeek:3,startTime:'20:30',endTime:'21:30' },{ dayOfWeek:4,startTime:'19:00',endTime:'20:00' }] },
    { id: 'rgm-nogi',           name: 'NoGi / Grappling',           level: 'All levels', duration: 90,
      schedule: [{ dayOfWeek:2,startTime:'10:00',endTime:'11:30' },{ dayOfWeek:2,startTime:'20:00',endTime:'21:30' },{ dayOfWeek:4,startTime:'10:00',endTime:'11:30' },{ dayOfWeek:5,startTime:'19:00',endTime:'20:30' }] },
    { id: 'rgm-open-mat',       name: 'Open Mat',                   level: 'All levels', duration: 90,
      schedule: [] },
  ]
  for (const cls of classes) {
    await prisma.class.upsert({
      where: { id: cls.id }, update: {},
      create: { id: cls.id, schoolId: malaga.id, name: cls.name, level: cls.level, duration: cls.duration, capacity: 30, isActive: true, schedule: cls.schedule, currency: 'EUR' },
    })
  }

  // ── Membership Plans for Málaga ──────────────────────────────────────────────
  // Standard plans (public)
  const plans = [
    { id:'rgm-mensual',    name:'Jiu Jitsu Mensual',   price:65,  billingCycle:'monthly',  isPopular:true,  features:['Acceso ilimitado','BJJ Gi y NoGi','Todos los niveles'] },
    { id:'rgm-trimestral', name:'Jiu Jitsu Trimestral',price:180, billingCycle:'quarterly', isPopular:false, features:['Acceso ilimitado','Ahorra vs mensual','BJJ Gi y NoGi'] },
    { id:'rgm-infantil',   name:'Jiu Jitsu Infantil',  price:50,  billingCycle:'monthly',  isPopular:false, features:['Clases infantiles y adultos','Desde 4 años'] },
    { id:'rgm-family',     name:'Family Jiu Jitsu',    price:100, billingCycle:'monthly',  isPopular:false, features:['1 adulto + 2 menores','Acceso ilimitado'] },
    { id:'rgm-bono8',      name:'Bono 8 Clases',        price:100, billingCycle:'one-off',  isPopular:false, features:['8 accesos','Válido 3 meses'], classLimit:8 },
    { id:'rgm-2semanas',   name:'Pase 2 Semanas',       price:35,  billingCycle:'one-off',  isPopular:false, features:['14 días acceso ilimitado'] },
    { id:'rgm-1semana',    name:'Pase 1 Semana',        price:40,  billingCycle:'one-off',  isPopular:false, features:['7 días acceso ilimitado'] },
    { id:'rgm-1dia',       name:'Pase 1 Día',           price:20,  billingCycle:'one-off',  isPopular:false, features:['1 día, hasta 2 clases'] },
    { id:'rgm-privada',    name:'Clase Privada',        price:50,  billingCycle:'one-off',  isPopular:false, features:['Sesión individual','Técnica personalizada'] },
  ]
  // RG TV premium plan
  const premiumRgTvPlan = {
    id:'rgm-premium-rgtv', name:'Jiu Jitsu Premium + RG TV', price:85, billingCycle:'monthly', isPopular:false,
    features:['Acceso ilimitado','Roger Gracie TV incluido','BJJ Gi y NoGi'],
    contentPlatformId: rgTv.id,
  }

  for (const plan of [...plans, premiumRgTvPlan]) {
    await prisma.membershipPlan.upsert({
      where: { id: plan.id }, update: {},
      create: {
        id: plan.id, schoolId: malaga.id,
        name: plan.name, price: plan.price, currency: 'EUR',
        billingCycle: plan.billingCycle, features: plan.features,
        isPopular: plan.isPopular, isActive: true,
        classLimit: (plan as any).classLimit ?? null,
        contentPlatformId: (plan as any).contentPlatformId ?? null,
      },
    })
  }

  // Private (not shown publicly)
  for (const trial of [
    { id:'rgm-prueba-semana', name:'Prueba 1 Semana', price:0, features:['7 días gratis','Sin compromiso'] },
    { id:'rgm-prueba-dia',    name:'Prueba 1 Día',    price:0, features:['1 día gratis','Sin compromiso'] },
  ]) {
    await prisma.membershipPlan.upsert({
      where: { id: trial.id }, update: {},
      create: { id: trial.id, schoolId: malaga.id, name: trial.name, price: 0, currency: 'EUR', billingCycle: 'one-off', features: trial.features, isPopular: false, isActive: false },
    })
  }

  console.log(`✅ Málaga: ${classes.length} classes, ${plans.length + 1} plans (+ 2 private)`)

  // ── All other Roger Gracie academies (UNVERIFIED — ready to claim) ──────────
  console.log(`\n🌍  Seeding ${RG_ACADEMIES.length} Roger Gracie academies worldwide...`)

  for (const academy of RG_ACADEMIES) {
    await prisma.school.upsert({
      where: { slug: academy.slug },
      update: { affiliationId: affiliation.id },
      create: {
        name:          academy.name,
        slug:          academy.slug,
        status:        'UNVERIFIED',
        source:        'AFFILIATE',
        affiliationId: affiliation.id,
        city:          academy.city,
        country:       academy.country,
        hasFreeTrialCls: false,
      },
    })
    process.stdout.write('.')
  }

  console.log(`\n✅ ${RG_ACADEMIES.length} academies seeded\n`)

  // ── Summary ──────────────────────────────────────────────────────────────────
  const totalSchools = await prisma.school.count()
  const totalRg = await prisma.school.count({ where: { affiliationId: affiliation.id } })

  console.log('─────────────────────────────────────────')
  console.log('🥋  SEED COMPLETE')
  console.log(`    Affiliation:   Roger Gracie Association`)
  console.log(`    Platform:      Roger Gracie TV (${rgTv.id})`)
  console.log(`    RG Academies:  ${totalRg} (including Málaga)`)
  console.log(`    Total schools: ${totalSchools}`)
  console.log('─────────────────────────────────────────')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
