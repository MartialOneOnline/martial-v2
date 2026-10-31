/**
 * Creates a working demo/test account for Google Play's "App access" review
 * requirement — a real STUDENT account, pre-confirmed (no email step) and
 * enrolled at an existing real school with an active membership, so the
 * reviewer sees the app's actual content instead of an empty account.
 *
 * Usage:
 *   npx tsx scripts/create-play-store-test-account.ts
 */
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../apps/web/lib/prisma-client/client.js'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const envPath = path.resolve(process.cwd(), 'apps/web/.env.local')
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8').split('\n')
    .filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] })
)
for (const [k, v] of Object.entries(env)) if (!(k in process.env)) process.env[k] = v

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const TEST_EMAIL = 'googleplay-reviewer@martialapp.com'
const TEST_PASSWORD = 'GPlayReview2026!' + crypto.randomBytes(3).toString('hex')
const TEST_NAME = 'Google Play Reviewer'

async function main() {
  const school = await prisma.school.findFirst({
    where: { name: { contains: 'Roger Gracie Malaga', mode: 'insensitive' } },
    select: { id: true, name: true, slug: true },
  })
  if (!school) {
    console.error('Could not find "Roger Gracie Malaga" school — aborting.')
    process.exit(1)
  }
  console.log('Using school:', school.name, school.id)

  const existing = await prisma.user.findFirst({ where: { email: TEST_EMAIL }, select: { id: true } })
  if (existing) {
    console.error(`A user with email ${TEST_EMAIL} already exists (id=${existing.id}) — aborting to avoid duplicates.`)
    process.exit(1)
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { name: TEST_NAME },
  })
  if (createErr || !created.user) {
    console.error('Supabase createUser failed:', createErr)
    process.exit(1)
  }

  const user = await prisma.user.create({
    data: {
      email: TEST_EMAIL,
      name: TEST_NAME,
      role: 'STUDENT',
      supabaseAuthId: created.user.id,
      dateOfBirth: new Date('1995-01-01'),
    },
  })

  await prisma.schoolMember.create({
    data: {
      schoolId: school.id,
      userId: user.id,
      role: 'STUDENT',
      status: 'ACTIVE',
      joinedAt: new Date(),
      belt: 'Blue Belt',
    },
  })

  await prisma.membership.create({
    data: {
      userId: user.id,
      schoolId: school.id,
      planName: 'Unlimited Monthly',
      price: 89,
      currency: 'EUR',
      paymentMethod: 'CASH',
      status: 'ACTIVE',
      startDate: new Date(),
    },
  })

  console.log('\n✅ Test account created:')
  console.log('   Email:   ', TEST_EMAIL)
  console.log('   Password:', TEST_PASSWORD)
  console.log('   School:  ', school.name)
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())
