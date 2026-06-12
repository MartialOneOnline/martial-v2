import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'

type BulkRow = {
  name: string
  email: string
  phone?: string
  belt?: string
  beltDegree?: number
  status?: string
}

// POST /api/dashboard/members/bulk — import multiple students from CSV
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })

  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!['OWNER', 'ADMIN'].includes(member.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { rows }: { rows: BulkRow[] } = await req.json()
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
  }
  if (rows.length > 500) {
    return NextResponse.json({ error: 'Maximum 500 rows per import' }, { status: 400 })
  }

  const VALID_BELTS = ['Blanco', 'Azul', 'Morado', 'Marron', 'Negro']
  const results = { created: 0, skipped: 0, errors: [] as string[] }
  const createdMembers: object[] = []

  for (const row of rows) {
    const email = row.email?.trim().toLowerCase()
    const name = row.name?.trim()
    if (!email || !name) {
      results.errors.push(`Fila inválida: nombre o email vacío`)
      results.skipped++
      continue
    }

    try {
      const dbUser = await prisma.user.upsert({
        where: { email },
        update: { name },
        create: {
          email,
          name,
          phone: row.phone?.trim() || null,
          role: 'STUDENT',
        },
        select: { id: true, name: true, email: true, avatarUrl: true },
      })

      const existing = await prisma.schoolMember.findFirst({
        where: { userId: dbUser.id, schoolId },
      })

      if (existing) {
        results.skipped++
        continue
      }

      const belt = VALID_BELTS.includes(row.belt ?? '') ? (row.belt ?? 'Blanco') : 'Blanco'
      const member = await prisma.schoolMember.create({
        data: {
          userId: dbUser.id,
          schoolId,
          role: 'STUDENT',
          belt,
          beltDegree: row.beltDegree ?? 0,
          status: (['ACTIVE','INACTIVE','PENDING','FROZEN','ARCHIVED'].includes(row.status ?? '') ? row.status : 'ACTIVE') as 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'FROZEN' | 'ARCHIVED',
        },
      })

      // Fetch with user included
      const memberWithUser = await prisma.schoolMember.findUnique({
        where: { id: member.id },
        select: {
          id: true, belt: true, beltDegree: true, status: true, role: true, joinedAt: true,
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      })
      if (!memberWithUser) { results.skipped++; continue }

      createdMembers.push({
        id: memberWithUser.id,
        name: memberWithUser.user.name ?? memberWithUser.user.email,
        email: memberWithUser.user.email,
        avatarUrl: memberWithUser.user.avatarUrl ?? null,
        belt: memberWithUser.belt ?? 'Blanco',
        beltDegree: memberWithUser.beltDegree ?? 0,
        status: memberWithUser.status,
        role: memberWithUser.role,
        joinedAt: memberWithUser.joinedAt?.toISOString() ?? null,
      })
      results.created++
    } catch (e: unknown) {
      results.errors.push(`${email}: ${e instanceof Error ? e.message : 'Error'}`)
      results.skipped++
    }
  }

  return NextResponse.json({ ...results, members: createdMembers })
}
