import { prisma } from '../apps/web/lib/db'

async function main() {
  const user = await prisma.user.update({
    where: { email: 'p.cabomedina@gmail.com' },
    data: { role: 'SUPERADMIN' },
    select: { id: true, email: true, role: true },
  })
  console.log('Updated:', user)
  await prisma.$disconnect()
}

main()
