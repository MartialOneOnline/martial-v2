/* eslint-disable @typescript-eslint/no-explicit-any -- a tiny structural
   in-memory stand-in for the Prisma client: rows and args are untyped. */

// In-memory Prisma stand-in for the ownership-flow tests. Supports exactly the
// query shapes lib/claims uses: where-filters (equality, null, in/notIn, not,
// lt/gt, contains/equals with mode, OR), include/select of the relations
// below, orderBy on one field, conditional updateMany, upsert, groupBy(status).
//
// $transaction runs the callback against the same tables but restores a
// snapshot if it throws (rollback). `SELECT … FOR UPDATE` on schools takes a
// per-school mutex held until the transaction ends, like Postgres row locks,
// so concurrent Promise.all() calls interleave realistically.

type Row = Record<string, any>
type Tables = Record<string, Row[]>

const RELATIONS: Record<string, Record<string, { table: string; local: string; foreign: string; many: boolean }>> = {
  schoolInvitation: {
    school: { table: 'school', local: 'schoolId', foreign: 'id', many: false },
    claimRequest: { table: 'claimRequest', local: 'claimRequestId', foreign: 'id', many: false },
  },
  claimRequest: {
    school: { table: 'school', local: 'schoolId', foreign: 'id', many: false },
    sourceSchool: { table: 'school', local: 'sourceSchoolId', foreign: 'id', many: false },
    invitations: { table: 'schoolInvitation', local: 'id', foreign: 'claimRequestId', many: true },
    events: { table: 'claimRequestEvent', local: 'id', foreign: 'claimRequestId', many: true },
  },
  school: {
    members: { table: 'schoolMember', local: 'id', foreign: 'schoolId', many: true },
  },
}

const DEFAULTS: Record<string, () => Row> = {
  claimRequest: () => ({ status: 'PENDING', city: null, phone: null, message: null, locale: null, sourceSchoolId: null, schoolId: null, linkedById: null, linkedAt: null, rejectReason: null, completedAt: null, completedUserId: null, resolvedAt: null, updatedAt: null }),
  schoolInvitation: () => ({ token: `legacy-${Math.random()}`, status: 'PENDING', source: 'MANUAL', isActive: true, schoolId: null, claimRequestId: null, sentAt: null, openedAt: null, registeredAt: null, tokenHash: null, sentToEmail: null, expiresAt: null, usedAt: null, revokedAt: null, tokenNonce: null, deliveryStatus: null, deliveryAttempt: 0, deliveryStartedAt: null, deliveryKeyAt: null, deliveryPayload: null, deliveryError: null, providerMessageId: null, acceptedUserId: null, phone: null, city: null, country: null, website: null, notes: null, activities: null, invitedById: null }),
  school: () => ({ status: 'UNVERIFIED', claimedById: null, claimedAt: null, email: null, city: null, country: null, website: null, logoUrl: null, language: 'en' }),
  schoolMember: () => ({ status: 'ACTIVE' }),
  user: () => ({ role: 'STUDENT', supabaseAuthId: null, name: null }),
  claimRequestEvent: () => ({ actorUserId: null, data: null }),
  userPreference: () => ({}),
  platformSettings: () => ({}),
}

let idSeq = 0
const newId = (t: string) => `${t}_${++idSeq}`

function matchValue(v: any, cond: any, row: Row, table: string): boolean {
  if (cond === null) return v === null || v === undefined
  if (cond instanceof Date) return v instanceof Date && v.getTime() === cond.getTime()
  if (typeof cond !== 'object') return v === cond
  const insensitive = cond.mode === 'insensitive'
  const norm = (x: any) => (insensitive && typeof x === 'string' ? x.toLowerCase() : x)
  for (const [op, arg] of Object.entries(cond)) {
    if (op === 'mode') continue
    if (op === 'equals' && norm(v) !== norm(arg)) return false
    if (op === 'in' && !(arg as any[]).includes(v)) return false
    if (op === 'notIn' && (arg as any[]).includes(v)) return false
    if (op === 'not' && (arg === null ? v === null || v === undefined : v === arg)) return false
    if (op === 'lt' && !(v !== null && v !== undefined && v < (arg as any))) return false
    if (op === 'gt' && !(v !== null && v !== undefined && v > (arg as any))) return false
    if (op === 'gte' && !(v !== null && v !== undefined && v >= (arg as any))) return false
    if (op === 'lte' && !(v !== null && v !== undefined && v <= (arg as any))) return false
    if (op === 'contains' && !(typeof v === 'string' && norm(v).includes(norm(arg)))) return false
  }
  void row; void table
  return true
}

export function matches(db: Tables, table: string, row: Row, where: any): boolean {
  if (!where) return true
  for (const [k, cond] of Object.entries(where)) {
    if (k === 'OR') { if (!(cond as any[]).some(w => matches(db, table, row, w))) return false; continue }
    if (k === 'AND') { if (!(cond as any[]).every(w => matches(db, table, row, w))) return false; continue }
    const rel = RELATIONS[table]?.[k]
    if (rel && !rel.many) {
      const target = db[rel.table]!.find(r => r[rel.foreign] === row[rel.local])
      if (!target || !matches(db, rel.table, target, cond)) return false
      continue
    }
    if (!matchValue(row[k], cond, row, table)) return false
  }
  return true
}

function shape(db: Tables, table: string, row: Row, args: any): Row {
  // `select` keeps only the listed fields (like Prisma), so a test can prove a
  // column never leaves the server; `include` keeps every scalar.
  const out: Row = args?.select
    ? Object.fromEntries(Object.entries(row).filter(([k]) => args.select[k]))
    : { ...row }
  for (const k of Object.keys(args?.omit ?? {})) delete out[k]
  const spec = args?.include ?? args?.select
  if (spec) {
    for (const [k, v] of Object.entries(spec)) {
      const rel = RELATIONS[table]?.[k]
      if (!rel || !v) continue
      const sub = typeof v === 'object' ? v as any : {}
      if (rel.many) {
        let rows = db[rel.table]!.filter(r => r[rel.foreign] === row[rel.local] && matches(db, rel.table, r, sub.where))
        rows = sortRows(rows, sub.orderBy)
        if (sub.take) rows = rows.slice(0, sub.take)
        out[k] = rows.map(r => shape(db, rel.table, r, sub))
      } else {
        const target = db[rel.table]!.find(r => r[rel.foreign] === row[rel.local])
        out[k] = target ? shape(db, rel.table, target, sub) : null
      }
    }
  }
  return out
}

function sortRows(rows: Row[], orderBy: any): Row[] {
  if (!orderBy) return rows
  const first = Object.entries(Array.isArray(orderBy) ? orderBy[0] : orderBy)[0] as [string, string] | undefined
  if (!first) return rows
  const [key, dir] = first
  return [...rows].sort((a, b) => {
    const x = a[key] instanceof Date ? a[key].getTime() : a[key]
    const y = b[key] instanceof Date ? b[key].getTime() : b[key]
    return (x < y ? -1 : x > y ? 1 : 0) * (dir === 'desc' ? -1 : 1)
  })
}

function checkUnique(table: string, rows: Row[], row: Row) {
  const uniques: Record<string, string[][]> = {
    school: [['slug']], schoolInvitation: [['tokenHash'], ['token']], user: [['supabaseAuthId']],
    schoolMember: [['schoolId', 'userId']], userPreference: [['userId']],
  }
  for (const cols of uniques[table] ?? []) {
    if (cols.some(c => row[c] === null || row[c] === undefined)) continue
    if (rows.some(r => r !== row && cols.every(c => r[c] === row[c]))) {
      const err: any = new Error(`Unique constraint failed on ${table}.${cols.join(',')}`); err.code = 'P2002'; throw err
    }
  }
}

export type FakeDb = ReturnType<typeof createFakeDb>

export function createFakeDb() {
  const tables: Tables = {
    claimRequest: [], claimRequestEvent: [], schoolInvitation: [], school: [], schoolMember: [], user: [], userPreference: [], platformSettings: [],
  }
  const locks = new Map<string, Promise<void>>()
  // Fault injection: tests set e.g. faults['schoolMember.upsert'] = new Error()
  const faults: Record<string, Error | undefined> = {}

  function model(table: string, txLocks?: (() => void)[]) {
    void txLocks
    const rows = () => tables[table]!
    const fault = (op: string) => { const f = faults[`${table}.${op}`]; if (f) throw f }
    return {
      async findUnique(args: any) { fault('findUnique'); const r = rows().find(x => matches(tables, table, x, args.where)); return r ? shape(tables, table, r, args) : null },
      async findUniqueOrThrow(args: any) { const r = rows().find(x => matches(tables, table, x, args.where)); if (!r) throw new Error('not found'); return shape(tables, table, r, args) },
      async findFirst(args: any = {}) { const r = sortRows(rows().filter(x => matches(tables, table, x, args.where)), args.orderBy)[0]; return r ? shape(tables, table, r, args) : null },
      async findMany(args: any = {}) {
        let r = sortRows(rows().filter(x => matches(tables, table, x, args.where)), args.orderBy)
        if (args.take) r = r.slice(0, args.take)
        return r.map(x => shape(tables, table, x, args))
      },
      async count(args: any = {}) { return rows().filter(x => matches(tables, table, x, args.where)).length },
      async create(args: any) {
        fault('create')
        const now = new Date()
        const row = { id: newId(table), ...(DEFAULTS[table]?.() ?? {}), createdAt: now, ...(table === 'schoolInvitation' ? { updatedAt: now } : {}), ...args.data }
        rows().push(row); checkUnique(table, rows(), row)
        return shape(tables, table, row, args)
      },
      async update(args: any) {
        fault('update')
        const row = rows().find(x => matches(tables, table, x, args.where))
        if (!row) { const err: any = new Error('Record not found'); err.code = 'P2025'; throw err }
        Object.assign(row, args.data, { updatedAt: new Date() }); checkUnique(table, rows(), row)
        return shape(tables, table, row, args)
      },
      async updateMany(args: any) {
        fault('updateMany')
        const hit = rows().filter(x => matches(tables, table, x, args.where))
        for (const row of hit) {
          const data = { ...args.data }
          for (const [k, v] of Object.entries(data)) if (v && typeof v === 'object' && 'increment' in (v as any)) data[k] = (row[k] ?? 0) + (v as any).increment
          Object.assign(row, data, { updatedAt: new Date() }); checkUnique(table, rows(), row)
        }
        return { count: hit.length }
      },
      async upsert(args: any) {
        fault('upsert')
        const where = args.where.schoolId_userId ?? args.where
        const row = rows().find(x => matches(tables, table, x, where))
        if (row) { Object.assign(row, args.update); return row }
        const created = { id: newId(table), ...(DEFAULTS[table]?.() ?? {}), createdAt: new Date(), ...args.create }
        rows().push(created); checkUnique(table, rows(), created)
        return created
      },
      async groupBy(args: any) {
        const by = args.by[0]
        const groups = new Map<any, number>()
        for (const r of rows().filter(x => matches(tables, table, x, args.where))) groups.set(r[by], (groups.get(r[by]) ?? 0) + 1)
        return [...groups.entries()].map(([k, n]) => ({ [by]: k, _count: { _all: n } }))
      },
      async delete(args: any) { const i = rows().findIndex(x => matches(tables, table, x, args.where)); const [r] = tables[table]!.splice(i, 1); return r },
    }
  }

  function client(held?: string[]) {
    const c: any = {}
    for (const t of Object.keys(tables)) c[t] = model(t)
    c.$queryRaw = async (strings: TemplateStringsArray, ...values: any[]) => {
      const sql = strings.join('?')
      const take = async (id: string) => {
        if (held && !held.includes(id)) {
          while (locks.has(id)) await locks.get(id)
          let release!: () => void
          locks.set(id, new Promise<void>(r => { release = r }))
          held.push(id)
          ;(c.__releases ??= []).push(() => { locks.delete(id); release() })
        }
      }
      const byRequest = /FROM school_invitations WHERE "claimRequestId" = \? ORDER BY id FOR UPDATE/.exec(sql)
      if (byRequest) {
        const rows = tables.schoolInvitation!.filter(x => x.claimRequestId === values[0]).sort((x, y) => (x.id < y.id ? -1 : 1))
        for (const r of rows) await take(`school_invitations:${r.id}`)
        return rows.map(x => ({ id: x.id }))
      }
      const lockMatch = /FROM (schools|school_invitations|claim_requests) WHERE id = \? FOR UPDATE/.exec(sql)
      if (lockMatch) {
        await take(`${lockMatch[1]}:${values[0] as string}`)
        if (lockMatch[1] === 'school_invitations') return tables.schoolInvitation!.filter(x => x.id === values[0]).map(x => ({ id: x.id }))
        if (lockMatch[1] === 'claim_requests') return tables.claimRequest!.filter(x => x.id === values[0]).map(x => ({ id: x.id, status: x.status, schoolId: x.schoolId ?? null }))
        const s = tables.school!.find(x => x.id === values[0])
        return s ? [{ id: s.id, status: s.status, name: s.name }] : []
      }
      if (/SELECT "deletedAt" FROM users WHERE id = \? FOR UPDATE/.test(sql)) {
        await take(`users:${values[0] as string}`)
        return tables.user!.filter(x => x.id === values[0]).map(x => ({ deletedAt: x.deletedAt ?? null }))
      }
      throw new Error(`fake $queryRaw: unsupported SQL ${sql}`)
    }
    c.$executeRaw = async (strings: TemplateStringsArray, ...values: any[]) => {
      const sql = strings.join('?')
      if (/SELECT pg_advisory_xact_lock\(hashtextextended\(\?, 0\)\)/.test(sql)) {
        // Same semantics as the row locks: held until the transaction ends.
        const take = async (id: string) => {
          if (held && !held.includes(id)) {
            while (locks.has(id)) await locks.get(id)
            let release!: () => void
            locks.set(id, new Promise<void>(r => { release = r }))
            held.push(id)
            ;(c.__releases ??= []).push(() => { locks.delete(id); release() })
          }
        }
        await take(`advisory:${values[0] as string}`)
        return 1
      }
      throw new Error(`fake $executeRaw: unsupported SQL ${sql}`)
    }
    return c
  }

  const root = client()
  root.$transaction = async (fn: (tx: any) => Promise<any>) => {
    const snapshot = structuredClone(tables)
    const held: string[] = []
    const tx = client(held)
    try {
      const result = await fn(tx)
      return result
    } catch (err) {
      for (const k of Object.keys(tables)) { tables[k]!.length = 0; tables[k]!.push(...snapshot[k]!) }
      throw err
    } finally {
      for (const r of tx.__releases ?? []) r()
    }
  }

  return { prisma: root, tables, faults }
}

// Shared instance for vi.mock('@/lib/db') in the ownership-flow tests.
export const fakeDb = createFakeDb()

export function resetFakeDb() {
  for (const rows of Object.values(fakeDb.tables)) rows.length = 0
  for (const k of Object.keys(fakeDb.faults)) delete fakeDb.faults[k]
}
