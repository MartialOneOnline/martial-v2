import { prisma } from '../apps/web/lib/db'

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true },
    orderBy: { createdAt: 'asc' }
  })
  console.log(JSON.stringify(users, null, 2))
  await prisma.$disconnect()
}

main()
