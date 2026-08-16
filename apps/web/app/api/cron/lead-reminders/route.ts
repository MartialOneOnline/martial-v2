import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { notifyLeadReminder } from '@/lib/notifications/create'

// GET /api/cron/lead-reminders[?dryRun=true]
// Triggered daily by Vercel Cron (see vercel.json) — same CRON_SECRET auth as
// the other cron routes. Fires one notification per due reminder, then clears
// reminderAt so it doesn't refire tomorrow. A lead that already converted or
// was marked lost is excluded — no point reminding staff to follow up on it.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dryRun = new URL(req.url).searchParams.get('dryRun') === 'true'

  const dueLeads = await prisma.lead.findMany({
    where: { reminderAt: { lte: new Date() }, status: { notIn: ['CONVERTED', 'LOST'] } },
    select: { id: true, schoolId: true, name: true },
  })

  if (!dryRun) {
    for (const lead of dueLeads) notifyLeadReminder(lead.schoolId, lead.id, lead.name)
    if (dueLeads.length > 0) {
      await prisma.lead.updateMany({ where: { id: { in: dueLeads.map(l => l.id) } }, data: { reminderAt: null } })
    }
  }

  return NextResponse.json({ fired: dueLeads.length })
}
