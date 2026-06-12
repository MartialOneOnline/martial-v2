import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../apps/web/lib/prisma-client/client.js'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

async function main() {
  const s = await prisma.school.findFirst({ where: { slug: 'roger-gracie-malaga' } })
  if (!s) { console.error('School not found'); return }
  await prisma.school.update({ where: { id: s.id }, data: { v1UserId: 798 } })
  console.log(`✅ v1UserId=798 set on ${s.name}`)
}

main().finally(() => prisma.$disconnect())
