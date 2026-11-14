import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/db'
import { normalizeForSearch } from '@/lib/search'
import { prismaClaimStore, prismaPinStore } from '@/lib/authPins'
import { resolveSurvivingUserId } from '@/lib/mergedUsers'
import {
  type AuthAdmin, type LoginInfo, type MergeChoice, type MergeDeps, type Side,
  defaultSides, loadSideDetail, loadSummary, mergeBlockers, mergeUsersInTx, mergeWarnings, pinClash, signedWaiverConflicts, suggestDefaults,
} from '@/lib/accountMerge'

// Production wiring for lib/accountMerge.ts (Supabase service-role + Prisma).

export const AUTH_TIMEOUT_MS = 10_000

// Every request is aborted after AUTH_TIMEOUT_MS at the fetch level — not
// just abandoned. That doesn't prove Supabase never applies it (it may have
// arrived just before the abort), which is what the auth pins are for.
export const abortingFetch: typeof fetch = (input, init) => {
  const timeout = AbortSignal.timeout(AUTH_TIMEOUT_MS)
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout
  return fetch(input, { ...init, signal })
}

function mergeAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: abortingFetch },
  })
}

// A definite refusal (4xx other than 408/429) can't be applied later; a
// timeout, network error, lost response or 5xx might be.
export function isUncertainWriteError(error: { status?: number; name?: string } | null | undefined): boolean {
  if (!error) return false
  const status = error.status ?? 0
  if (error.name === 'AuthRetryableFetchError') return true
  return !(status >= 400 && status < 500 && status !== 408 && status !== 429)
}

// Backstop on top of the fetch abort: never hangs and never throws.
async function withTimeout<T>(p: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      p,
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Supabase Auth timed out')), AUTH_TIMEOUT_MS) }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

// supabase-js reports "no such user" as an error with status 404 /
// code user_not_found; only that counts as missing.
export function isUserNotFound(error: { status?: number; code?: string } | null | undefined): boolean {
  return !!error && (error.code === 'user_not_found' || error.status === 404)
}

export function supabaseAuthAdmin(): AuthAdmin {
  const admin = mergeAdminClient()
  return {
    async getUser(id) {
      try {
        const { data, error } = await withTimeout(admin.auth.admin.getUserById(id))
        if (error) return isUserNotFound(error) ? { status: 'missing' } : { status: 'error', message: error.message }
        const u = data?.user
        if (!u) return { status: 'error', message: 'Empty answer from Supabase Auth' }
        return {
          status: 'found',
          user: {
            id: u.id,
            email: u.email ?? null,
            providers: [...new Set((u.identities ?? []).map(i => i.provider))],
            lastSignInAt: u.last_sign_in_at ?? null,
            bannedUntil: (u as { banned_until?: string | null }).banned_until ?? null,
          },
        }
      } catch (err) {
        return { status: 'error', message: err instanceof Error ? err.message : String(err) }
      }
    },
    async updateUser(id, attrs) {
      try {
        const { error } = await withTimeout(admin.auth.admin.updateUserById(id, attrs))
        return error ? { error: error.message, uncertain: isUncertainWriteError(error) } : { error: null, uncertain: false }
      } catch (err) {
        // Thrown = timed out or the connection broke: outcome unknown.
        return { error: err instanceof Error ? err.message : String(err), uncertain: true }
      }
    },
  }
}

// Claims + pins live in lib/authPins.ts (shared with the email-change flow).
export { prismaClaimStore, prismaPinStore }

export function prismaMergeDeps(auth: AuthAdmin): MergeDeps {
  return {
    auth,
    claims: prismaClaimStore,
    pins: prismaPinStore,
    load: id => loadSummary(prisma, id),
    signedWaiverConflicts: (keepId, mergeId) => signedWaiverConflicts(prisma, keepId, mergeId),
    // Short: no network calls inside. mergeUsersInTx locks both user rows
    // and re-checks them before moving anything.
    commit: input => prisma.$transaction(tx => mergeUsersInTx(tx, input), { timeout: 30_000, maxWait: 10_000 }),
  }
}

async function loginOf(auth: AuthAdmin, authId: string | null): Promise<LoginInfo | null> {
  if (!authId) return null
  const r = await auth.getUser(authId)
  return r.status === 'found'
    ? { authId: r.user.id, email: r.user.email, providers: r.user.providers, lastSignInAt: r.user.lastSignInAt }
    : null
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

  const [keepDetail, mergeDetail, selfRequestLeads, waiverConflicts] = await Promise.all([
    loadSideDetail(prisma, keep.id),
    loadSideDetail(prisma, merge.id),
    prisma.lead.count({ where: { convertedUserId: merge.id, source: 'SELF_REQUEST' } }),
    signedWaiverConflicts(prisma, keep.id, merge.id),
  ])
  // Same check runAccountMerge makes: an unanswered earlier write must agree.
  const plan = {
    retiredAuthId: (choice.loginFrom === 'keep' ? merge : keep).supabaseAuthId,
    keptAuthId: (choice.loginFrom === 'keep' ? keep : merge).supabaseAuthId,
    finalEmail: choice.emailFrom === 'keep' ? keep.email : merge.email,
  }
  const pins = await prismaPinStore.get([plan.retiredAuthId, plan.keptAuthId].filter((x): x is string => !!x))

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
    blockers: [
      ...mergeBlockers(keep, merge, choice, { signedWaiverConflicts: waiverConflicts }),
      ...[pinClash(pins, plan)].filter((x): x is string => !!x),
    ],
    warnings: mergeWarnings(K, M, choice, selfRequestLeads),
  }
}

export type MergePreview = NonNullable<Awaited<ReturnType<typeof buildMergePreview>>>

// When the preview can't load because one of the two ids was merged away
// (the merge deletes that row): follow both through the merge chain.
//   'same'      — both end in the same account: this pair is merged.
//   'elsewhere' — at least one went into a different account: this pair was
//                 NOT merged; says where each id ended up.
// null when neither id was ever merged (a plain unknown id).
export async function resolveMergedPair(keepId: string, mergeId: string) {
  const [k, m] = await Promise.all([resolveSurvivingUserId(keepId), resolveSurvivingUserId(mergeId)])
  if (k === keepId && m === mergeId) return null
  if (k === m) return { status: 'same' as const, survivorId: k }
  const moved = [[keepId, k], [mergeId, m]].filter(([from, to]) => from !== to) as [string, string][]
  const survivors = await prisma.user.findMany({
    where: { id: { in: moved.map(([, to]) => to) } },
    select: { id: true, name: true, email: true },
  })
  return {
    status: 'elsewhere' as const,
    moves: moved.map(([from, to]) => {
      const u = survivors.find(x => x.id === to)
      return { fromId: from, intoId: to, intoName: u?.name ?? null, intoEmail: u?.email ?? null }
    }),
  }
}

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
