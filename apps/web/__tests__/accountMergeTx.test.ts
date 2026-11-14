/* eslint-disable @typescript-eslint/no-explicit-any -- fake Prisma/Supabase clients */
/**
 * mergeUsersInTx against a fake transaction client: which rows survive the
 * unique-per-user conflicts. Signed waivers and live content access must
 * never be the row that is deleted; revoked staff roles must not come back.
 */
import { describe, it, expect, vi } from 'vitest'
import { mergeUsersInTx, MergeConflictError } from '@/lib/accountMerge'

type Rows = Record<string, Record<string, unknown>[]>

function fakeTx(seed: Rows) {
  const calls: { model: string; method: string; args: any }[] = []
  const rowsFor = (model: string, where: any) =>
    (seed[model] ?? []).filter(r => Object.entries(where ?? {}).every(([k, v]) => typeof v !== 'object' || v === null ? r[k] === v : true))
  const handler = (model: string) => new Proxy({}, {
    get: (_t, method: string) => vi.fn(async (args: any) => {
      calls.push({ model, method, args })
      if (model === 'user' && method === 'findUnique') {
        const id = args.where.id
        return { id, email: `${id}@x.com`, name: id, phone: null, gender: null, dateOfBirth: null, avatarUrl: null,
          guardianName: null, guardianContact: null, guardianConsentAt: null, role: 'STUDENT', schoolId: null,
          supabaseAuthId: null, deletedAt: null }
      }
      if (method === 'findMany') return rowsFor(model, args?.where)
      if (method === 'findUnique') return null
      if (method === 'updateMany' || method === 'deleteMany') return { count: 0 }
      return {}
    }),
  })
  const tx: any = new Proxy({}, { get: (_t, model: string) => (model === '$queryRaw' ? vi.fn(async () => []) : handler(model)) })
  const deleted = (model: string) => calls.filter(c => c.model === model && c.method === 'delete').map(c => c.args.where.id)
  const updates = (model: string) => calls.filter(c => c.model === model && c.method === 'update').map(c => c.args)
  return { tx, calls, deleted, updates }
}

const input = { keepId: 'K', mergeId: 'S', loginFrom: 'keep' as const, emailFrom: 'keep' as const, keptAuthId: null, actorId: null, disabledAuth: [] }

describe('mergeUsersInTx — unique-per-user rows', () => {
  it('keeps the signed waiver and deletes the unsigned one, whichever account has it', async () => {
    const { tx, deleted } = fakeTx({
      userWaiver: [
        { id: 'w-k', userId: 'K', waiverId: 'waiver-1', signedAt: null },
        { id: 'w-s', userId: 'S', waiverId: 'waiver-1', signedAt: new Date('2026-09-01') },
        { id: 'w-k2', userId: 'K', waiverId: 'waiver-2', signedAt: new Date('2026-01-01') },
        { id: 'w-s2', userId: 'S', waiverId: 'waiver-2', signedAt: null },
      ],
    })
    await mergeUsersInTx(tx, input)
    expect(deleted('userWaiver').sort()).toEqual(['w-k', 'w-s2'])
  })

  it('refuses (rolls back) when both accounts signed the same waiver', async () => {
    const { tx, deleted } = fakeTx({
      userWaiver: [
        { id: 'w-k', userId: 'K', waiverId: 'waiver-1', signedAt: new Date('2026-01-01') },
        { id: 'w-s', userId: 'S', waiverId: 'waiver-1', signedAt: new Date('2026-09-01') },
      ],
    })
    await expect(mergeUsersInTx(tx, input)).rejects.toBeInstanceOf(MergeConflictError)
    expect(deleted('userWaiver')).toEqual([])
  })

  it('keeps the live content access, not the revoked one', async () => {
    const { tx, deleted } = fakeTx({
      contentAccess: [
        { id: 'a-k', userId: 'K', platformId: 'p1', isActive: false, revokedAt: new Date('2026-09-01'), endDate: null },
        { id: 'a-s', userId: 'S', platformId: 'p1', isActive: true, revokedAt: null, endDate: null },
      ],
    })
    await mergeUsersInTx(tx, input)
    expect(deleted('contentAccess')).toEqual(['a-k'])
  })

  it('adds lesson views together instead of dropping one', async () => {
    const { tx, deleted, updates } = fakeTx({
      curriculumLessonView: [
        { id: 'v-k', userId: 'K', lessonId: 'l1', viewCount: 2, firstViewedAt: new Date('2026-09-01'), lastViewedAt: new Date('2026-09-02') },
        { id: 'v-s', userId: 'S', lessonId: 'l1', viewCount: 3, firstViewedAt: new Date('2026-08-01'), lastViewedAt: new Date('2026-10-01') },
      ],
    })
    await mergeUsersInTx(tx, input)
    expect(deleted('curriculumLessonView')).toEqual(['v-s'])
    expect(updates('curriculumLessonView')[0]).toMatchObject({ where: { id: 'v-k' }, data: { viewCount: 5 } })
  })

  it('combines same-school members without reactivating a revoked owner', async () => {
    const { tx, updates, deleted } = fakeTx({
      schoolMember: [
        { id: 'm-k', userId: 'K', schoolId: 's1', role: 'OWNER', customRoleId: null, status: 'INACTIVE', joinedAt: null, belt: null, beltRankId: null, beltDegree: null, beltDate: null, emergencyContact: null, medicalNotes: null, notes: null },
        { id: 'm-s', userId: 'S', schoolId: 's1', role: 'STUDENT', customRoleId: null, status: 'ACTIVE', joinedAt: null, belt: null, beltRankId: null, beltDegree: null, beltDate: null, emergencyContact: null, medicalNotes: null, notes: null },
      ],
    })
    await mergeUsersInTx(tx, input)
    expect(updates('schoolMember').find(u => u.where.id === 'm-k')?.data).toMatchObject({ role: 'STUDENT', status: 'ACTIVE' })
    expect(deleted('schoolMember')).toEqual(['m-s'])
  })
})

describe('mergeUsersInTx — the merged row', () => {
  it('is deleted (not just marked), before keep gets its final email and login', async () => {
    const { tx, calls } = fakeTx({})
    await mergeUsersInTx(tx, { ...input, keptAuthId: 'auth-r' })
    const userCalls = calls.filter(c => c.model === 'user' && (c.method === 'delete' || c.method === 'update'))
    expect(userCalls.map(c => `${c.method} ${c.args.where.id}`)).toEqual(['delete S', 'update K'])
    expect(userCalls[1]!.args.data).toMatchObject({ email: 'K@x.com', supabaseAuthId: 'auth-r' })
    expect(calls.find(c => c.model === 'accountMerge' && c.method === 'create')?.args.data).toMatchObject({ keptUserId: 'K', mergedUserId: 'S', mergedEmail: 'S@x.com' })
  })
})
