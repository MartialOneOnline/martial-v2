import { NextRequest, NextResponse } from 'next/server'
import { guardSuperadmin } from '@/lib/auth/server'
import { listClaimRequests } from '@/lib/claims/adminViews'
import { isClaimView } from '@/lib/claims/queue'

// GET /api/admin/claim-requests?view=pending|in_progress|legacy|history|all&q=
// The old PATCH (resolve/dismiss) is gone: closing without recording what
// happened is exactly what lost the 2026-11-22 request. Decisions go through
// POST /api/admin/claim-requests/[id].
export async function GET(req: NextRequest) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny
  const { searchParams } = new URL(req.url)
  const viewParam = searchParams.get('view')
  const view = isClaimView(viewParam) ? viewParam : 'pending'
  return NextResponse.json(await listClaimRequests(view, (searchParams.get('q') ?? '').slice(0, 100)))
}
