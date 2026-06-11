import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../apps/web/lib/prisma-client/client.js'

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })

async function main() {
  const deleted = await prisma.school.deleteMany({
    where: { status: 'UNVERIFIED', source: 'AFFILIATE' }
  })
  console.log('Deleted:', deleted.count, 'RG affiliate schools')
}

main().finally(() => prisma.$disconnect())
