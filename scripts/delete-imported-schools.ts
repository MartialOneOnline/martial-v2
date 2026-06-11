import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../apps/web/lib/prisma-client/client.js'

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })

async function main() {
  const deleted = await prisma.school.deleteMany({
    where: { source: 'VONSEL' }
  })
  console.log('Deleted:', deleted.count, 'imported schools')
  const remaining = await prisma.school.count()
  console.log('Remaining:', remaining)
}

main().finally(() => prisma.$disconnect())
