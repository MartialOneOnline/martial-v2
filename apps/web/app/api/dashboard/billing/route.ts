import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'

// GET /api/dashboard/billing — school's Martial SaaS subscription + platform plan pricing
export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const schoolId = searchParams.get('schoolId') ?? (await getCurrentSchoolId())
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })

  if (user.role !== 'SUPERADMIN') {
    try {
      await requireSchoolAccess(user.id, schoolId)
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const [subscription, platformSettings] = await Promise.all([
    prisma.schoolSubscription.findUnique({ where: { schoolId } }),
    prisma.platformSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton' },
      update: {},
      select: {
        planCurrency: true,
        planPriceMonthly: true,
        planPriceQuarterly: true,
        planPriceAnnual: true,
        stripePriceIdMonthly: true,
        stripePriceIdQuarterly: true,
        stripePriceIdAnnual: true,
      },
    }),
  ])

  const plans = {
    currency: platformSettings.planCurrency,
    monthly: platformSettings.stripePriceIdMonthly ? platformSettings.planPriceMonthly : null,
    quarterly: platformSettings.stripePriceIdQuarterly ? platformSettings.planPriceQuarterly : null,
    annual: platformSettings.stripePriceIdAnnual ? platformSettings.planPriceAnnual : null,
  }

  return NextResponse.json({ subscription, plans })
}
