import { createClient } from '@supabase/supabase-js'
import { prisma } from './db'
import { sendEmailChangeCode } from './email/sendEmailChangeCode'
import { AUTH_TIMEOUT_MS, type AuthEmailApi, type EmailChangeDeps, type EmailChangeStore } from './emailChange'

// Prisma implementation of EmailChangeStore. Every method is one atomic
// statement (or one transaction): the conditional updateMany calls are what
// serialize concurrent requests for the same user.
export const prismaEmailChangeStore: EmailChangeStore = {
  async getUserEmail(userId) {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, deletedAt: true } })
    return u && !u.deletedAt ? u.email : null
  },
  async isEmailTaken(email, exceptUserId) {
    const taken = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, id: { not: exceptUserId } },
      select: { id: true },
    })
    return taken !== null
  },
  async getRequest(userId) {
    return prisma.emailChangeRequest.findUnique({
      where: { userId },
      select: { id: true, newEmail: true, codeHash: true, attempts: true, status: true, expiresAt: true, updatedAt: true },
    })
  },
  async putPendingRequest(userId, data, cooldownBefore) {
    // The cooldown is in the WHERE clause: of two concurrent resends only one
    // matches, the other sees a fresh updatedAt and gets 'too_soon'.
    const replaced = await prisma.emailChangeRequest.updateMany({
      where: { userId, status: 'PENDING', updatedAt: { lte: cooldownBefore } },
      data: { ...data, attempts: 0 },
    })
    if (replaced.count === 1) return 'stored'
    const existing = await prisma.emailChangeRequest.findUnique({ where: { userId }, select: { status: true } })
    if (existing) return existing.status === 'APPLYING' ? 'busy' : 'too_soon'
    try {
      await prisma.emailChangeRequest.create({ data: { userId, ...data } })
      return 'stored'
    } catch (err) {
      // P2002: a concurrent request created it first.
      if ((err as { code?: string })?.code === 'P2002') return 'too_soon'
      throw err
    }
  },
  async recordFailedAttempt(requestId) {
    const r = await prisma.emailChangeRequest.updateMany({
      where: { id: requestId, status: 'PENDING' },
      data: { attempts: { increment: 1 } },
    })
    if (r.count !== 1) return null
    const row = await prisma.emailChangeRequest.findUnique({ where: { id: requestId }, select: { attempts: true } })
    return row?.attempts ?? null
  },
  async claimForApplying(requestId, codeHash, maxAttempts) {
    const r = await prisma.emailChangeRequest.updateMany({
      where: { id: requestId, status: 'PENDING', codeHash, attempts: { lt: maxAttempts } },
      data: { status: 'APPLYING' },
    })
    return r.count === 1
  },
  async releaseClaim(requestId) {
    await prisma.emailChangeRequest.updateMany({
      where: { id: requestId, status: 'APPLYING' },
      data: { status: 'PENDING' },
    })
  },
  async deleteRequest(requestId, status) {
    const r = await prisma.emailChangeRequest.deleteMany({ where: { id: requestId, status } })
    return r.count === 1
  },
  async commitEmail(userId, requestId, newEmail) {
    return prisma.$transaction(async tx => {
      // Holding the APPLYING row is the right to write: if reconcile already
      // settled it, this late attempt writes nothing.
      const claimed = await tx.emailChangeRequest.deleteMany({ where: { id: requestId, status: 'APPLYING' } })
      if (claimed.count !== 1) return false
      await tx.user.update({ where: { id: userId }, data: { email: newEmail } })
      return true
    })
  },
}

// Supabase Auth admin API. updateUserById normally reports failures as a
// returned { error }, not a throw — both are surfaced as ok: false.
export function supabaseAuthEmailApi(): AuthEmailApi {
  // Same service-role client as lib/supabase/admin.ts, but every call is cut
  // off after AUTH_TIMEOUT_MS so no attempt outlives STALE_APPLYING_MS.
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      fetch: (input, init) => fetch(input, {
        ...init,
        signal: init?.signal
          ? AbortSignal.any([init.signal, AbortSignal.timeout(AUTH_TIMEOUT_MS)])
          : AbortSignal.timeout(AUTH_TIMEOUT_MS),
      }),
    },
  })
  return {
    async getEmail(authId) {
      const { data, error } = await admin.auth.admin.getUserById(authId)
      if (error) throw error
      return data.user?.email ?? null
    },
    async setEmail(authId, email) {
      const { error } = await admin.auth.admin.updateUserById(authId, { email, email_confirm: true })
      if (!error) return { ok: true }
      const taken = /already|registered|exists/i.test(error.message)
      if (!taken) console.error('[emailChange] auth update failed:', error)
      return { ok: false, taken }
    },
  }
}

export function emailChangeDeps(): EmailChangeDeps {
  return {
    store: prismaEmailChangeStore,
    auth: supabaseAuthEmailApi(),
    sendCode: async (to, code, lang) => (await sendEmailChangeCode({ recipientEmail: to, code, lang })).success,
    secret: process.env.SUPABASE_SECRET_KEY!,
    log: (msg, err) => console.error(msg, err ?? ''),
  }
}
