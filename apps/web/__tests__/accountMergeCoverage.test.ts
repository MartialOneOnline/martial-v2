/**
 * Every column that points at a User must be handled by the merge
 * (lib/accountMerge.ts USER_REFERENCES). If this fails after a schema change,
 * add the new column to mergeUsersInTx and to USER_REFERENCES — otherwise a
 * merge leaves that data on the dead account (or the delete is blocked).
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { USER_REFERENCES } from '@/lib/accountMerge'

// Plain-string user ids without a FK; keep in sync with the schema comments.
const FREE_REFERENCES = ['Instructor.userId', 'SchoolClaim.reviewedBy', 'LimitedCollection.athleteUserId', 'CollectibleOwnership.createdBy']
// Unrelated or intentionally historical
const IGNORED = ['AccountMerge.keptUserId', 'AccountMerge.mergedUserId', 'AccountMerge.actorId']

function userRelationColumns(schema: string): string[] {
  const out: string[] = []
  for (const block of schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)) {
    const [, model, body] = block
    for (const line of body!.split('\n')) {
      const m = line.match(/^\s+\w+\s+User\??\s+@relation\(([^)]*)\)/)
      const fields = m?.[1]?.match(/fields:\s*\[(\w+)\]/)
      if (fields) out.push(`${model}.${fields[1]}`)
    }
  }
  return out
}

describe('account merge covers every User reference', () => {
  const schema = readFileSync(path.resolve(__dirname, '../../../prisma/schema.prisma'), 'utf8')
  const handled = new Set<string>([...USER_REFERENCES.moved, ...USER_REFERENCES.deduped, ...USER_REFERENCES.dropped])

  it('handles every FK to users', () => {
    const fks = userRelationColumns(schema)
    expect(fks.length).toBeGreaterThan(25)
    expect(fks.filter(c => !handled.has(c) && !IGNORED.includes(c))).toEqual([])
  })

  it('handles the known free (non-FK) user id columns', () => {
    expect(FREE_REFERENCES.filter(c => !handled.has(c))).toEqual([])
  })

  it('lists nothing that no longer exists', () => {
    const fks = new Set(userRelationColumns(schema))
    expect([...handled].filter(c => !fks.has(c) && !FREE_REFERENCES.includes(c))).toEqual([])
  })
})
