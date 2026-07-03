import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/disciplines — public read of the discipline catalog
export async function GET() {
  const disciplines = await prisma.discipline.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ disciplines })
}
