import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'

const REVOLUT_API = 'https://merchant.revolut.com/api/1.0'

// POST /api/dashboard/revolut/register-webhook
// Registers the Revolut webhook URL for this school using their secret key.
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })

  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!['OWNER', 'ADMIN'].includes(member.role))
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { revolutSecretKey: true },
  })

  if (!school?.revolutSecretKey)
    return NextResponse.json({ error: 'Save your Revolut secret key first' }, { status: 400 })

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://martial-v2-web.vercel.app'
  const webhookUrl = `${origin}/api/webhooks/revolut`

  const res = await fetch(`${REVOLUT_API}/webhooks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${school.revolutSecretKey}`,
      'Content-Type': 'application/json',
      'Revolut-Api-Version': '2024-09-01',
    },
    body: JSON.stringify({
      url: webhookUrl,
      events: ['ORDER_COMPLETED', 'ORDER_PAYMENT_DECLINED', 'ORDER_PAYMENT_FAILED'],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    // 422 may mean webhook already registered — treat as success
    if (res.status === 422 && err.includes('already')) {
      return NextResponse.json({ ok: true, message: 'Webhook already registered' })
    }
    return NextResponse.json({ error: `Revolut error: ${err}` }, { status: 400 })
  }

  const data = await res.json()
  return NextResponse.json({ ok: true, webhook: data })
}
