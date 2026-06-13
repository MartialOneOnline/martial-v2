import { prisma } from '../lib/db'

const email = process.argv[2]
if (!email) { console.error('Usage: tsx scripts/delete-user.ts <email>'); process.exit(1) }

async function main() {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, schoolMembers: { select: { id: true } } } })
  if (!user) { console.log('User not found'); return }
  console.log(`Found: ${user.name} (${user.id}), ${user.schoolMembers.length} school member(s)`)
  await prisma.schoolMember.deleteMany({ where: { userId: user.id } })
  await prisma.user.delete({ where: { id: user.id } })
  console.log('Deleted.')
}

main().finally(() => prisma.$disconnect())
