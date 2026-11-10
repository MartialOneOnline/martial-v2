import { prisma } from '@/lib/db'

type Db = Pick<typeof prisma, 'accountMerge'>

// A user id captured before an account merge (Stripe checkout metadata,
// anything created earlier and delivered later) may point at a row that was
// merged away. Follow the AccountMerge chain (A → B → C) to the account that
// survives, so late writes land there instead of on the retired row.
export async function resolveSurvivingUserId(userId: string, db: Db = prisma): Promise<string> {
  let current = userId
  const seen = new Set<string>([current])
  for (let i = 0; i < 20; i++) {
    const merge = await db.accountMerge.findFirst({
      where: { mergedUserId: current },
      orderBy: { createdAt: 'desc' },
      select: { keptUserId: true },
    })
    if (!merge || seen.has(merge.keptUserId)) return current
    current = merge.keptUserId
    seen.add(current)
  }
  return current
}
