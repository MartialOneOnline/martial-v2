/**
 * planPurchase — loads what planEligibility needs from the database. Kept
 * apart from the pure evaluation so both can be tested on their own.
 */

import { prisma } from '@/lib/db'
import type { ScheduleSlot } from '@/lib/scheduling'
import {
  findNextSession, utcDateKey, NEXT_SESSION_WINDOW_DAYS,
  type ProviderConfig, type ClassContext,
} from './planEligibility'

export function providerConfigOf(school: {
  stripeSecretKey: string | null
  revolutSecretKey: string | null
  revolutWebhookSecret: string | null
}): ProviderConfig {
  return {
    stripe: !!school.stripeSecretKey,
    revolut: !!(school.revolutSecretKey && school.revolutWebhookSecret),
  }
}

export type LoadedClass = { id: string; name: string; context: ClassContext }

/**
 * The class a purchase is being evaluated for. Must belong to `schoolId` and be
 * active + published (the only classes the public booking entry points list).
 * Returns null for anything else — callers treat that as "class unavailable",
 * never as "not restricted".
 */
export async function loadClassContext(schoolId: string, classId: string, now: Date): Promise<LoadedClass | null> {
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { id: true, name: true, schoolId: true, isActive: true, isPublished: true, schedule: true },
  })
  if (!cls || cls.schoolId !== schoolId || !cls.isActive || !cls.isPublished) return null

  const windowEnd = new Date(now.getTime() + (NEXT_SESSION_WINDOW_DAYS + 1) * 86_400_000)
  const cancellations = await prisma.classCancellation.findMany({
    where: { classId: cls.id, date: { gte: new Date(`${utcDateKey(now)}T00:00:00.000Z`), lte: windowEnd } },
    select: { date: true },
  })
  const cancelled = new Set(cancellations.map(c => utcDateKey(c.date)))
  const nextSession = findNextSession(cls.schedule as ScheduleSlot[] | null, cancelled, now)
  return { id: cls.id, name: cls.name, context: { classId: cls.id, nextSession } }
}

/**
 * A PAUSED membership the buyer already has at this school. Buying a new plan
 * never touches it (owner's decision), but if it is tied to a Stripe
 * subscription it may start charging again when resumed — the buyer must be
 * told before paying. Never exposes the external subscription id.
 */
export async function findPausedMembership(userId: string, schoolId: string) {
  const paused = await prisma.membership.findFirst({
    where: { userId, schoolId, status: 'PAUSED' },
    orderBy: { startDate: 'desc' },
    select: { planName: true, stripeSubId: true },
  })
  if (!paused) return null
  return { planName: paused.planName, recurring: !!paused.stripeSubId }
}
