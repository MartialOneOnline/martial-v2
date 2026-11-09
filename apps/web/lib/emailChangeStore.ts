import { prisma } from './db'
import { createAdminClient } from './supabase/admin'
import { sendEmailChangeCode } from './email/sendEmailChangeCode'
import type { AuthEmailApi, EmailChangeDeps, EmailChangeStore } from './emailChange'

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
  async putPendingRequest(userId, data) {
    const replaced = await prisma.emailChangeRequest.updateMany({
      where: { userId, status: 'PENDING' },
      data: { ...data, attempts: 0 },
    })
    if (replaced.count === 1) return true
    try {
      await prisma.emailChangeRequest.create({ data: { userId, ...data } })
      return true
    } catch (err) {
      // P2002: a row appeared meanwhile (APPLYING, or a concurrent request).
      if ((err as { code?: string })?.code === 'P2002') return false
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
  async claimForApplying(requestId, codeHash) {
    const r = await prisma.emailChangeRequest.updateMany({
      where: { id: requestId, status: 'PENDING', codeHash },
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
  async deleteRequest(requestId) {
    await prisma.emailChangeRequest.deleteMany({ where: { id: requestId } })
  },
  async commitEmail(userId, requestId, newEmail) {
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { email: newEmail } }),
      prisma.emailChangeRequest.deleteMany({ where: { id: requestId } }),
    ])
  },
}

// Supabase Auth admin API. updateUserById normally reports failures as a
// returned { error }, not a throw — both are surfaced as ok: false.
export function supabaseAuthEmailApi(): AuthEmailApi {
  const admin = createAdminClient()
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
