import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/admin/invitations/import — bulk import from parsed rows
// Expects JSON body: { rows: Array<{ name, email, phone?, city?, country?, activities?, website? }> }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const rows: any[] = body.rows || []

  if (!rows.length) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
  }

  // Get existing emails to skip duplicates
  const emails = rows.map(r => (r.email || '').toLowerCase().trim()).filter(Boolean)
  const existing = await prisma.schoolInvitation.findMany({
    where: { email: { in: emails } },
    select: { email: true },
  })
  const existingEmails = new Set(existing.map(e => e.email))

  const toCreate = rows
    .filter(r => r.name && r.email && !existingEmails.has(r.email.toLowerCase().trim()))
    .map(r => ({
      name: r.name.trim(),
      email: r.email.toLowerCase().trim(),
      phone: r.phone || null,
      city: r.city || null,
      country: r.country || null,
      activities: r.activities || null,
      website: r.website || null,
      status: 'PENDING' as const,
      source: 'IMPORT' as const,
    }))

  const result = await prisma.schoolInvitation.createMany({
    data: toCreate,
    skipDuplicates: true,
  })

  return NextResponse.json({
    created: result.count,
    skipped: rows.length - toCreate.length,
    total: rows.length,
  })
}
