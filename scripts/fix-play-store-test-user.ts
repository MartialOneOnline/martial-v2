import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../apps/web/lib/prisma-client/client.js'
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

async function main() {
  await prisma.user.update({
    where: { email: 'googleplay-reviewer@martialapp.com' },
    data: {
      name: 'Alex Rivera',
      phone: '+34600000000',
      avatarUrl: 'https://api.dicebear.com/9.x/initials/png?seed=Alex%20Rivera',
    },
  })
  console.log('updated')
}

main().catch(err => { console.error(err); process.exit(1) }).finally(() => prisma.$disconnect())
