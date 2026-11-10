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

type LockDb = Pick<typeof prisma, 'accountMerge' | '$queryRaw'>

// For writes inside a transaction (webhooks, check-in): lock the user row
// FOR SHARE and, if it was merged away, move on to the surviving account.
// An account merge locks both rows FOR UPDATE while it moves data, so the
// two serialize: either this write commits first (and the merge then moves
// it) or the merge commits first and this re-reads the result and writes to
// the survivor. Resolving before the transaction alone would miss a merge
// that completes between the lookup and the write.
export async function lockSurvivingUser(tx: LockDb, userId: string): Promise<string> {
  let current = userId
  const seen = new Set<string>([current])
  for (let i = 0; i < 20; i++) {
    const rows = await tx.$queryRaw<{ deletedAt: Date | null }[]>`SELECT "deletedAt" FROM users WHERE id = ${current} FOR SHARE`
    if (!rows[0]?.deletedAt) return current
    const merge = await tx.accountMerge.findFirst({
      where: { mergedUserId: current },
      orderBy: { createdAt: 'desc' },
      select: { keptUserId: true },
    })
    // Deleted without a merge (self-delete): leave it to the caller's own checks.
    if (!merge || seen.has(merge.keptUserId)) return current
    current = merge.keptUserId
    seen.add(current)
  }
  return current
}
