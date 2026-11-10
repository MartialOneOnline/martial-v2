import { prisma } from '@/lib/db'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeForSearch } from '@/lib/search'
import {
  type AuthAdmin, type LoginInfo, type MergeChoice, type MergeDeps, type Side,
  defaultSides, loadSideDetail, loadSummary, mergeBlockers, mergeUsersInTx, mergeWarnings, suggestDefaults,
} from '@/lib/accountMerge'

// Production wiring for lib/accountMerge.ts (Supabase service-role + Prisma).

export function supabaseAuthAdmin(): AuthAdmin {
  const admin = createAdminClient()
  return {
    async getUser(id) {
      const { data, error } = await admin.auth.admin.getUserById(id)
      if (error || !data?.user) return null
      const u = data.user
      return {
        id: u.id,
        email: u.email ?? null,
        providers: [...new Set((u.identities ?? []).map(i => i.provider))],
        lastSignInAt: u.last_sign_in_at ?? null,
      }
    },
    async updateUser(id, attrs) {
      const { error } = await admin.auth.admin.updateUserById(id, attrs)
      return { error: error ? error.message : null }
    },
  }
}

export function prismaMergeDeps(auth: AuthAdmin): MergeDeps {
  return {
    auth,
    load: id => loadSummary(prisma, id),
    runTx: input => prisma.$transaction(tx => mergeUsersInTx(tx, input), { timeout: 30_000, maxWait: 10_000 }),
  }
}

async function loginOf(auth: AuthAdmin, authId: string | null): Promise<LoginInfo | null> {
  if (!authId) return null
  const u = await auth.getUser(authId)
  return u ? { authId: u.id, email: u.email, providers: u.providers, lastSignInAt: u.lastSignInAt } : null
}

// Everything the admin modal shows. Without loginFrom/emailFrom (or with
// suggest=true) the server also picks which account to keep.
export async function buildMergePreview(
  auth: AuthAdmin,
  params: { keepId: string; mergeId: string; loginFrom?: Side; emailFrom?: Side; suggest?: boolean },
) {
  const [a, b] = await Promise.all([loadSummary(prisma, params.keepId), loadSummary(prisma, params.mergeId)])
  if (!a || !b) return null
  const [la, lb] = await Promise.all([loginOf(auth, a.supabaseAuthId), loginOf(auth, b.supabaseAuthId)])
  const A = { ...a, login: la }
  const B = { ...b, login: lb }

  let keep = A
  let merge = B
  if (params.suggest) {
    const s = suggestDefaults(A, B)
    if (s.keepId !== A.id) { keep = B; merge = A }
  }
  const defaults = defaultSides(keep, merge)
  const choice: MergeChoice = {
    keepId: keep.id,
    mergeId: merge.id,
    loginFrom: params.suggest ? defaults.loginFrom : params.loginFrom ?? defaults.loginFrom,
    emailFrom: params.suggest ? defaults.emailFrom : params.emailFrom ?? defaults.emailFrom,
  }

  const [keepDetail, mergeDetail, selfRequestLeads] = await Promise.all([
    loadSideDetail(prisma, keep.id),
    loadSideDetail(prisma, merge.id),
    prisma.lead.count({ where: { convertedUserId: merge.id, source: 'SELF_REQUEST' } }),
  ])
  const K = { ...keep, detail: keepDetail }
  const M = { ...merge, detail: mergeDetail }

  const side = (s: typeof K) => ({
    id: s.id, name: s.name, email: s.email, phone: s.phone, avatarUrl: s.avatarUrl, role: s.role,
    createdAt: s.createdAt, deletedAt: s.deletedAt, login: s.login, ...s.detail,
  })
  return {
    keep: side(K),
    merge: side(M),
    choice,
    blockers: mergeBlockers(keep, merge, choice),
    warnings: mergeWarnings(K, M, choice, selfRequestLeads),
  }
}

export type MergePreview = NonNullable<Awaited<ReturnType<typeof buildMergePreview>>>

// Likely duplicates: same normalized name, or same phone (last 9 digits).
// A shortlist for a human to check, never merged automatically — two
// different people can share a name.
export async function findDuplicateCandidates() {
  const users = await prisma.user.findMany({
    where: { deletedAt: null, role: { not: 'SUPERADMIN' } },
    select: {
      id: true, name: true, email: true, phone: true, avatarUrl: true, createdAt: true,
      schoolMembers: { select: { school: { select: { name: true } } } },
      _count: { select: { bookings: true, memberships: true } },
    },
  })
  const nameKey = (n: string | null) => (n ? normalizeForSearch(n).replace(/\s+/g, ' ').trim() : '')
  const phoneKey = (p: string | null) => {
    const d = (p ?? '').replace(/\D/g, '')
    return d.length >= 9 ? d.slice(-9) : ''
  }

  const groups = new Map<string, string[]>()
  const push = (k: string, id: string) => { if (!groups.has(k)) groups.set(k, []); groups.get(k)!.push(id) }
  for (const u of users) {
    const n = nameKey(u.name)
    if (n.includes(' ')) push(`name:${n}`, u.id) // single-word names are too common to mean anything
    const p = phoneKey(u.phone)
    if (p) push(`phone:${p}`, u.id)
  }

  const byId = new Map(users.map(u => [u.id, u]))
  const pairs = new Map<string, { a: string; b: string; reasons: Set<string> }>()
  for (const [k, ids] of groups) {
    if (ids.length < 2 || ids.length > 4) continue // big clusters are shared family/test phones, not one person
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const [a, b] = [ids[i]!, ids[j]!].sort() as [string, string]
        const key = `${a}|${b}`
        if (!pairs.has(key)) pairs.set(key, { a, b, reasons: new Set() })
        pairs.get(key)!.reasons.add(k.startsWith('name:') ? 'name' : 'phone')
      }
    }
  }

  const view = (id: string) => {
    const u = byId.get(id)!
    return {
      id: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl, createdAt: u.createdAt,
      schools: [...new Set(u.schoolMembers.map(m => m.school.name))],
      bookings: u._count.bookings, memberships: u._count.memberships,
    }
  }
  return [...pairs.values()]
    .map(p => ({ a: view(p.a), b: view(p.b), reasons: [...p.reasons] }))
    // Both reasons first, then pairs with an Apple relay side (the known cause)
    .sort((x, y) =>
      y.reasons.length - x.reasons.length ||
      Number(y.a.email.includes('privaterelay') || y.b.email.includes('privaterelay')) -
        Number(x.a.email.includes('privaterelay') || x.b.email.includes('privaterelay')) ||
      (x.a.name ?? '').localeCompare(y.a.name ?? ''))
}
