import { NextRequest, NextResponse } from 'next/server'
import { guardSuperadmin } from '@/lib/auth/server'
import { findMembershipStatusDrift } from '@/lib/services/membership'

export async function GET(req: NextRequest) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const members = await findMembershipStatusDrift()
  return NextResponse.json({ members })
}
