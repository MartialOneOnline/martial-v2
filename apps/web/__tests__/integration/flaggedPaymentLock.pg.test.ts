/**
 * Integration test — recordFlaggedPayment's per-invoice advisory lock against
 * a REAL PostgreSQL (two backends, real transactions). Pending item 1 of the
 * Codex re-audit of Lote AF (c488720): the unit tests only simulate the lock.
 *
 * Skipped unless TEST_DATABASE_URL is set. Run it ONLY against an isolated,
 * disposable database with the migrations applied — never production:
 *
 *   DIRECT_URL="$TEST_DATABASE_URL" npx prisma migrate deploy      # repo root
 *   TEST_DATABASE_URL=... npx vitest run __tests__/integration      # apps/web
 *
 * Safety guards (the test refuses to run otherwise):
 *   - TEST_DATABASE_URL must differ from DATABASE_URL / DIRECT_URL;
 *   - a non-local host needs TEST_DATABASE_ISOLATED=yes;
 *   - the database must contain NO schools (a fresh test DB has none;
 *     production does).
 * It only inserts rows tagged with a per-run id and deletes them at the end.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, type Prisma } from '@/lib/prisma-client/client'
import { recordFlaggedPayment } from '@/lib/services/transactions'
import { PaymentMethod, TransactionStatus, TransactionType, TransactionCategory } from '@/lib/prisma-client/enums'

const URL = process.env.TEST_DATABASE_URL

function assertIsolated(url: string) {
  if (url === process.env.DATABASE_URL || url === process.env.DIRECT_URL)
    throw new Error('TEST_DATABASE_URL equals DATABASE_URL/DIRECT_URL — refusing to run')
  const host = new globalThis.URL(url).hostname
  const local = host === 'localhost' || host === '127.0.0.1' || host === '::1'
  if (!local && process.env.TEST_DATABASE_ISOLATED !== 'yes')
    throw new Error(`Non-local host ${host}: set TEST_DATABASE_ISOLATED=yes only if it is a disposable test database`)
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
const HOLD_MS = 1500 // how long the first transaction keeps the lock before committing

describe.skipIf(!URL)('recordFlaggedPayment advisory lock — real PostgreSQL', () => {
  let db: PrismaClient
  const run = `itest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  let userId = ''

  const input = (invoice: string) => ({
    schoolId: null, userId, amount: 50, currency: 'EUR',
    paymentMethod: PaymentMethod.STRIPE,
    reason: `integration test ${run}`, planId: 'plan-itest', planName: 'Itest plan',
    stripeInvoiceId: invoice,
  })
  const countFlagged = (invoice: string) =>
    db.transaction.count({ where: { stripeInvoiceId: invoice, status: TransactionStatus.FLAGGED } })

  beforeAll(async () => {
    assertIsolated(URL!)
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: URL!, max: 6 }) })
    if ((await db.school.count()) > 0)
      throw new Error('This database has schools — it does not look like a disposable test DB. Refusing to run.')
    userId = (await db.user.create({ data: { email: `${run}@example.test` }, select: { id: true } })).id
  })

  afterAll(async () => {
    if (!db) return
    await db.transaction.deleteMany({ where: { stripeInvoiceId: { startsWith: `in_${run}` } } })
    if (userId) await db.user.delete({ where: { id: userId } }).catch(() => {})
    await db.$disconnect()
  })

  it('two concurrent transactions on the same invoice → the second waits for the first and inserts nothing', async () => {
    const invoice = `in_${run}_same`
    const a = db.$transaction(async (tx) => {
      await recordFlaggedPayment(tx as Prisma.TransactionClient, input(invoice))
      await sleep(HOLD_MS) // keep the xact lock (and the uncommitted row) for a while
    }, { timeout: 15_000 })

    await sleep(200) // A holds the lock now
    const startedB = Date.now()
    let waitedMs = 0
    const b = db.$transaction(async (tx) => {
      await recordFlaggedPayment(tx as Prisma.TransactionClient, input(invoice))
      waitedMs = Date.now() - startedB
    }, { timeout: 15_000 })

    await Promise.all([a, b])
    expect(await countFlagged(invoice)).toBe(1)
    // B was really blocked by A's lock until A committed (not merely lucky timing).
    expect(waitedMs).toBeGreaterThanOrEqual(HOLD_MS - 400)
  })

  it('control: the same interleaving WITHOUT the lock inserts twice (the race is real)', async () => {
    const invoice = `in_${run}_nolock`
    // Same pre-check + insert recordFlaggedPayment does, minus the advisory lock.
    const unlocked = (tx: Prisma.TransactionClient, holdMs: number) => async () => {
      const existing = await tx.transaction.findFirst({ where: { stripeInvoiceId: invoice, status: TransactionStatus.FLAGGED } })
      if (existing) return
      await sleep(holdMs)
      await tx.transaction.create({
        data: {
          userId, type: TransactionType.INCOME, status: TransactionStatus.FLAGGED,
          category: TransactionCategory.MEMBERSHIP, paymentMethod: PaymentMethod.STRIPE,
          amount: 50, currency: 'EUR', date: new Date(), stripeInvoiceId: invoice, notes: `control ${run}`,
        },
      })
    }
    await Promise.all([
      db.$transaction(tx => unlocked(tx as Prisma.TransactionClient, 600)(), { timeout: 15_000 }),
      db.$transaction(tx => unlocked(tx as Prisma.TransactionClient, 600)(), { timeout: 15_000 }),
    ])
    expect(await countFlagged(invoice)).toBe(2)
  })

  it('different invoices do not block each other', async () => {
    const started = Date.now()
    let bDoneAt = 0
    await Promise.all([
      db.$transaction(async (tx) => {
        await recordFlaggedPayment(tx as Prisma.TransactionClient, input(`in_${run}_x`))
        await sleep(HOLD_MS)
      }, { timeout: 15_000 }),
      (async () => {
        await sleep(200)
        await db.$transaction(tx => recordFlaggedPayment(tx as Prisma.TransactionClient, input(`in_${run}_y`)), { timeout: 15_000 })
        bDoneAt = Date.now() - started
      })(),
    ])
    expect(await countFlagged(`in_${run}_x`)).toBe(1)
    expect(await countFlagged(`in_${run}_y`)).toBe(1)
    expect(bDoneAt).toBeLessThan(HOLD_MS) // finished while the other invoice's lock was still held
  })

  it('a rolled-back first transaction releases the lock and the second one records the payment', async () => {
    const invoice = `in_${run}_rollback`
    const a = db.$transaction(async (tx) => {
      await recordFlaggedPayment(tx as Prisma.TransactionClient, input(invoice))
      await sleep(600)
      throw new Error('simulated failure after flagging')
    }, { timeout: 15_000 }).catch(() => 'rolled back')
    await sleep(150)
    const b = db.$transaction(tx => recordFlaggedPayment(tx as Prisma.TransactionClient, input(invoice)), { timeout: 15_000 })
    expect(await a).toBe('rolled back')
    await b
    expect(await countFlagged(invoice)).toBe(1)
  })
})
