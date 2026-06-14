/**
 * Seed: Roger Gracie Málaga — MembershipPlans, Memberships, Transactions
 *
 * Runs AFTER seed-rgm.ts and seed-rgm-students.ts.
 *
 * Run: npx tsx prisma/seed-rgm-payments.ts
 *
 * Sources:
 *   prisma/v1-subscriptions.csv       → MembershipPlan
 *   prisma/v1-user-subscriptions.csv  → Membership (filtered school_id=798)
 *   prisma/v1-incomes.csv             → Transaction INCOME (user_id=798)
 *   prisma/v1-expenses.csv            → Transaction EXPENSE (user_id=798)
 */

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../apps/web/lib/prisma-client/client'
import * as dotenv from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'

dotenv.config({ path: resolve(__dirname, '../apps/web/.env.local') })

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
} as any)

const SCHOOL_ID = 'cmq6k2n5t0000x4o0rcvlmhmv'
const V1_SCHOOL_USER_ID = 798

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function parseCSV(path: string): Record<string, string>[] {
  const raw = readFileSync(resolve(__dirname, path), 'utf-8')
  const lines = raw.trim().split('\n')
  if (lines.length < 2) return []

  // Parse header — strip quotes and BOM
  const headers = lines[0].replace(/^﻿/, '').split(',').map(h => h.replace(/^"|"$/g, '').trim())

  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    // Simple CSV parser — handles quoted fields with embedded commas/newlines
    const fields = splitCSVLine(lines[i])
    if (fields.length < headers.length) continue
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = (fields[idx] ?? '').replace(/^"|"$/g, '').trim() })
    rows.push(row)
  }
  return rows
}

function splitCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function mapPaymentMethod(method: string): string {
  const m = (method ?? '').toLowerCase()
  if (m === 'stripe') return 'STRIPE'
  if (m === 'cash') return 'CASH'
  if (m === 'gocardless') return 'DIRECT_DEBIT'
  if (m === 'bank transfer') return 'BANK_TRANSFER'
  return 'OTHER'
}

function mapBillingCycle(type: number, freqAmount: number, freqType: number): string {
  // type 2=TRIAL, 3=SINGLE_PASS → one-off
  if (type === 2 || type === 3) return 'one-off'
  // type 1=SUBSCRIPTION
  if (freqType === 4) return 'annual'
  if (freqType === 3 && freqAmount === 6) return 'semi-annual'
  if (freqType === 3 && freqAmount === 3) return 'quarterly'
  if (freqType === 3) return 'monthly'
  if (freqType === 2) return 'weekly'
  return 'monthly'
}

function mapPlanType(type: number): string {
  if (type === 2) return 'TRIAL'
  if (type === 3) return 'SINGLE_PASS'
  return 'SUBSCRIPTION'
}

// account_id → TransactionCategory
const ACCOUNT_CATEGORY: Record<string, string> = {
  '11': 'RENT',
  '19': 'SALARY',
  '5':  'RENT',
  '12': 'OTHER',
  '20': 'OTHER',
  '21': 'OTHER',
  '22': 'OTHER',
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('💳 Seeding Roger Gracie Málaga — Payments module\n')

  // Load student v1_id → email map (from existing JSON)
  const students: { v1_id: string; email: string }[] = JSON.parse(
    readFileSync(resolve(__dirname, 'rgm-students.json'), 'utf-8')
  )
  const v1IdToEmail = new Map(students.map(s => [s.v1_id, s.email]))

  // ── 1. MembershipPlans ───────────────────────────────────────────────────────
  console.log('📋 Creating MembershipPlans...')

  const subs = parseCSV('v1-subscriptions.csv')
  const rgmSubs = subs.filter(s => s.user_id === String(V1_SCHOOL_USER_ID))

  const v1PlanToV2Id = new Map<string, string>()

  for (const sub of rgmSubs) {
    const type = parseInt(sub.type ?? '1')
    const freqAmount = parseInt(sub.frequency_amount ?? '1') || 1
    const freqType = parseInt(sub.frequency_type ?? '3') || 3
    const price = parseFloat(sub.price ?? '0')
    const isPublic = sub.is_public === '1'
    const isEnabled = sub.is_enabled === '1'

    const billingCycle = mapBillingCycle(type, freqAmount, freqType)
    const planType = mapPlanType(type)

    // validityDays for passes/trials
    let validityDays: number | null = null
    if (sub.expire_in && sub.expire_period) {
      const expireIn = parseInt(sub.expire_in)
      const expirePeriod = parseInt(sub.expire_period)
      // expire_period: 1=day, 2=week, 3=month
      const multiplier = expirePeriod === 1 ? 1 : expirePeriod === 2 ? 7 : 30
      validityDays = expireIn * multiplier
    }

    const existing = await (prisma as any).membershipPlan.findFirst({
      where: { schoolId: SCHOOL_ID, name: sub.title },
    })

    const plan = existing ?? await (prisma as any).membershipPlan.create({
      data: {
        schoolId: SCHOOL_ID,
        name: sub.title,
        description: sub.description || null,
        price,
        currency: 'EUR',
        planType,
        billingCycle,
        validityDays,
        isPublic,
        isActive: isEnabled,
        stripePriceId: sub.stripe_price_id || null,
      },
    })

    v1PlanToV2Id.set(sub.id, plan.id)
    console.log(`  ✅ Plan: ${sub.title} (€${price}/${billingCycle})`)
  }

  // ── 2. Memberships ────────────────────────────────────────────────────────────
  console.log('\n👥 Creating Memberships...')

  const userSubs = parseCSV('v1-user-subscriptions.csv')
  const rgmUserSubs = userSubs.filter(us => us.school_id === String(V1_SCHOOL_USER_ID))

  // Deduplicate: keep first record per (user_id, subscription_id)
  const seen = new Set<string>()
  const deduped = rgmUserSubs.filter(us => {
    const key = `${us.user_id}:${us.subscription_id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  let membershipCreated = 0
  let membershipSkipped = 0

  // Build a lookup for subscription plan names/prices
  const subById = new Map(subs.map(s => [s.id, s]))

  for (const us of deduped) {
    const email = v1IdToEmail.get(us.user_id)
    if (!email) { membershipSkipped++; continue }

    const user = await (prisma as any).user.findUnique({ where: { email } })
    if (!user) { membershipSkipped++; continue }

    const planId = v1PlanToV2Id.get(us.subscription_id)
    const v1Sub = subById.get(us.subscription_id)
    const planName = v1Sub?.title ?? 'Membership'
    const price = parseFloat(v1Sub?.price ?? '0')
    const paymentMethod = mapPaymentMethod(us.method)
    const status = us.status === '1' ? 'ACTIVE' : 'CANCELLED'
    const startDate = new Date(us.created_at || Date.now())

    const existing = await (prisma as any).membership.findFirst({
      where: { userId: user.id, schoolId: SCHOOL_ID, planName },
    })
    if (existing) { membershipSkipped++; continue }

    await (prisma as any).membership.create({
      data: {
        userId: user.id,
        schoolId: SCHOOL_ID,
        planId: planId ?? null,
        planName,
        price,
        currency: 'EUR',
        paymentMethod,
        status,
        startDate,
      },
    })
    membershipCreated++
  }

  console.log(`  ✅ Created: ${membershipCreated} memberships (skipped: ${membershipSkipped} — user not in V2)`)

  // ── 3. Transactions — INCOME ──────────────────────────────────────────────────
  console.log('\n💰 Creating Income transactions...')

  const incomes = parseCSV('v1-incomes.csv')
  const rgmIncomes = incomes.filter(r => r.user_id === String(V1_SCHOOL_USER_ID))

  for (const row of rgmIncomes) {
    const existing = await (prisma as any).transaction.findFirst({
      where: {
        schoolId: SCHOOL_ID,
        type: 'INCOME',
        amount: parseFloat(row.total),
        date: new Date(row.income_date),
      },
    })
    if (existing) continue

    await (prisma as any).transaction.create({
      data: {
        schoolId: SCHOOL_ID,
        type: 'INCOME',
        status: 'PAID',
        category: ACCOUNT_CATEGORY[row.account_id] ?? 'OTHER',
        amount: parseFloat(row.total),
        currency: 'EUR',
        description: row.note || null,
        date: new Date(row.income_date),
      },
    })
    console.log(`  ✅ Income: ${row.note || '(sin nota)'} €${row.total} (${row.income_date})`)
  }

  // ── 4. Transactions — EXPENSE ─────────────────────────────────────────────────
  console.log('\n💸 Creating Expense transactions...')

  const expenses = parseCSV('v1-expenses.csv')
  const rgmExpenses = expenses.filter(r => r.user_id === String(V1_SCHOOL_USER_ID))

  let expenseCreated = 0
  for (const row of rgmExpenses) {
    const existing = await (prisma as any).transaction.findFirst({
      where: {
        schoolId: SCHOOL_ID,
        type: 'EXPENSE',
        amount: parseFloat(row.total),
        date: new Date(row.expense_date),
      },
    })
    if (existing) continue

    await (prisma as any).transaction.create({
      data: {
        schoolId: SCHOOL_ID,
        type: 'EXPENSE',
        status: 'PAID',
        category: ACCOUNT_CATEGORY[row.account_id] ?? 'OTHER',
        amount: parseFloat(row.total),
        currency: 'EUR',
        description: row.note || null,
        date: new Date(row.expense_date),
      },
    })
    expenseCreated++
  }
  console.log(`  ✅ Expenses created: ${expenseCreated}`)

  console.log('\n🎉 seed-rgm-payments complete!')
  console.log(`   Plans: ${v1PlanToV2Id.size} | Memberships: ${membershipCreated} | Incomes: ${rgmIncomes.length} | Expenses: ${expenseCreated}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
