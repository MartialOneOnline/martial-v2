/**
 * Persistent Google Play reviewer account for the SCHOOL/OWNER side of the
 * app (the student-side equivalent is googleplay-reviewer@martialapp.com).
 * Declared as a second "Sign in details" credential set in Play Console so
 * reviewers can access /dashboard (class management, memberships, AI
 * assistant, etc.), not just the /my student pages.
 */
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../apps/web/lib/prisma-client/client.js'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

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

const TEST_EMAIL = 'googleplay-reviewer-school@martialapp.com'
const TEST_PASSWORD = 'GPlaySchool2026!' + require('crypto').randomBytes(3).toString('hex')
const TEST_NAME = 'Google Play Reviewer (School)'

async function main() {
  const school = await prisma.school.findFirst({
    where: { name: { contains: 'Roger Gracie Malaga', mode: 'insensitive' } },
    select: { id: true, name: true },
  })
  if (!school) { console.error('school not found'); process.exit(1) }

  const existing = await prisma.user.findFirst({ where: { email: TEST_EMAIL } })
  if (existing) { console.error(`already exists (id=${existing.id})`); process.exit(1) }

  const { data: created, error } = await admin.auth.admin.createUser({
    email: TEST_EMAIL, password: TEST_PASSWORD, email_confirm: true, user_metadata: { name: TEST_NAME },
  })
  if (error || !created.user) { console.error(error); process.exit(1) }

  const user = await prisma.user.create({
    data: { email: TEST_EMAIL, name: TEST_NAME, role: 'STUDENT', supabaseAuthId: created.user.id },
  })

  await prisma.schoolMember.create({
    data: { schoolId: school.id, userId: user.id, role: 'OWNER', status: 'ACTIVE', joinedAt: new Date() },
  })

  console.log('\n✅ School reviewer account created:')
  console.log('   Email:   ', TEST_EMAIL)
  console.log('   Password:', TEST_PASSWORD)
  console.log('   School:  ', school.name)
}
main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
