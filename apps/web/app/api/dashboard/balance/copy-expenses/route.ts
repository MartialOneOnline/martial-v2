import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { schoolTimeZone } from '@/lib/memberActivity'
import { zonedStartOfDay } from '@/lib/absences/periods'
import { dayKey } from '@/lib/absences/stopped'
import { copyDay } from '@/lib/balance/pnl'
import { schoolNoon } from '@/lib/balance/months'
import { balanceAccess } from '@/lib/balance/access'

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/

/**
 * POST /api/dashboard/balance/copy-expenses { month: 'YYYY-MM' } — fills a
 * month that has no expenses with a copy of the last month before it that
 * has them (rent, salaries…). Refuses a month that already has expenses or
 * lies in the future. Copies are ordinary transactions, editable in Transactions.
 */
export async function POST(req: NextRequest) {
  const auth = await balanceAccess('school.payments.manage')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { schoolId } = auth

  const body = await req.json().catch(() => null)
  const match = typeof body?.month === 'string' ? MONTH.exec(body.month) : null
  if (!match) return NextResponse.json({ error: 'month (YYYY-MM) required' }, { status: 400 })
  const ty = Number(match[1]), tm = Number(match[2])

  const now = new Date()
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { country: true } })
  const timeZone = schoolTimeZone(school?.country)
  const start = zonedStartOfDay(ty, tm, 1, timeZone)
  const end = new Date(zonedStartOfDay(ty, tm + 1, 1, timeZone).getTime() - 1)
  if (start > now) return NextResponse.json({ error: 'FUTURE_MONTH' }, { status: 400 })

  const expense = { schoolId, type: 'EXPENSE' as const, status: 'PAID' as const, deletedAt: null }
  const created = await prisma.$transaction(async tx => {
    // Re-checked inside the transaction so two clicks can't copy twice
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${schoolId}), hashtext(${body.month}))`
    if (await tx.transaction.count({ where: { ...expense, date: { gte: start, lte: end } } })) return null
    const last = await tx.transaction.findFirst({ where: { ...expense, date: { lt: start } }, orderBy: { date: 'desc' }, select: { date: true } })
    if (!last) return []
    const [sy, sm] = dayKey(last.date, timeZone).split('-').map(Number) as [number, number]
    const source = await tx.transaction.findMany({
      where: { ...expense, date: { gte: zonedStartOfDay(sy, sm, 1, timeZone), lt: zonedStartOfDay(sy, sm + 1, 1, timeZone) } },
      select: { category: true, amount: true, currency: true, description: true, paymentMethod: true, date: true },
    })
    const sourceKey = `${sy}-${String(sm).padStart(2, '0')}`
    return Promise.all(source.map(s => {
      const day = copyDay(Number(dayKey(s.date, timeZone).slice(8, 10)), ty, tm)
      return tx.transaction.create({
        data: {
          schoolId, type: 'EXPENSE', status: 'PAID', category: s.category, amount: s.amount, currency: s.currency,
          description: s.description, paymentMethod: s.paymentMethod,
          // 12:00 school time (DST-safe): well inside the day
          date: schoolNoon(ty, tm, day, timeZone),
          notes: `Copied from ${sourceKey}`,
        },
        select: { id: true },
      })
    })).then(list => ({ list, sourceKey }))
  })

  if (created === null) return NextResponse.json({ error: 'ALREADY_HAS_EXPENSES' }, { status: 409 })
  if (Array.isArray(created)) return NextResponse.json({ error: 'NO_EXPENSES_TO_COPY' }, { status: 404 })
  return NextResponse.json({ created: created.list.length, from: created.sourceKey }, { status: 201 })
}
