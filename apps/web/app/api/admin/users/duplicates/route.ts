import { NextRequest, NextResponse } from 'next/server'
import { guardSuperadmin } from '@/lib/auth/server'
import { findDuplicateCandidates } from '@/lib/accountMergeServer'

// GET /api/admin/users/duplicates — pairs of accounts that look like the same
// person (same name or phone), for review in the Merge accounts tool.
export async function GET(req: NextRequest) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny
  return NextResponse.json({ pairs: await findDuplicateCandidates() })
}
