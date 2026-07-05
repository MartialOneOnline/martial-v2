import { prisma } from '../lib/db'

const email = process.argv[2]
if (!email) { console.error('Usage: tsx scripts/delete-user.ts <email>'); process.exit(1) }

async function main() {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, schoolMembers: { select: { id: true, schoolId: true } } } })
  if (!user) { console.log('User not found'); return }
  console.log(`Found: ${user.name} (${user.id}), ${user.schoolMembers.length} school member(s)`)

  const schoolIds = user.schoolMembers.map(m => m.schoolId)
  await prisma.schoolMember.deleteMany({ where: { userId: user.id } })
  await prisma.user.delete({ where: { id: user.id } })

  // Free up the email on the public join form — leaves the Lead record for
  // history but stops it from blocking re-registration (see the "already
  // registered" bug: dedup check only excludes LOST leads).
  if (schoolIds.length > 0) {
    const { count } = await prisma.lead.updateMany({
      where: { schoolId: { in: schoolIds }, email, status: { not: 'LOST' } },
      data: { status: 'LOST' },
    })
    if (count > 0) console.log(`Marked ${count} lead(s) as LOST.`)
  }

  console.log('Deleted.')
}

main().finally(() => prisma.$disconnect())
