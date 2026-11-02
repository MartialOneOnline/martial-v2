import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { schoolTimeZone } from '@/lib/memberActivity'
import { schoolNoon } from '@/lib/balance/months'
import { balanceAccess } from '@/lib/balance/access'
import { EXPENSE_CATEGORIES } from '@/lib/balance/pnl'

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * POST /api/dashboard/balance/expense { category, amount, currency, date: 'YYYY-MM-DD', description? }
 * — the Balance's "Add expense". The day is the school's calendar day, stored
 * at 12:00 school time (the generic transactions endpoint reads a bare date in
 * the server's timezone).
 */
export async function POST(req: NextRequest) {
  const auth = await balanceAccess('school.payments.manage')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await req.json().catch(() => null)
  const amount = Number(body?.amount)
  const match = typeof body?.date === 'string' ? DAY.exec(body.date) : null
  const category = (EXPENSE_CATEGORIES as readonly string[]).includes(body?.category) ? body.category : null
  const currency = typeof body?.currency === 'string' && /^[A-Z]{3}$/.test(body.currency) ? body.currency : null
  if (!(amount > 0) || amount > 10_000_000 || !match || !category || !currency) {
    return NextResponse.json({ error: 'category, amount > 0, currency and date (YYYY-MM-DD) required' }, { status: 400 })
  }
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const check = new Date(Date.UTC(y, m - 1, d))
  if (check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })

  const school = await prisma.school.findUnique({ where: { id: auth.schoolId }, select: { country: true } })
  const tx = await prisma.transaction.create({
    data: {
      schoolId: auth.schoolId, type: 'EXPENSE', status: 'PAID', category, currency,
      amount: Math.round(amount * 100) / 100,
      date: schoolNoon(y, m, d, schoolTimeZone(school?.country)),
      description: typeof body.description === 'string' ? body.description.trim().slice(0, 200) || null : null,
    },
    select: { id: true },
  })
  return NextResponse.json(tx, { status: 201 })
}
