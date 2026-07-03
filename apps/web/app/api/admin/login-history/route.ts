import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guardSuperadmin } from '@/lib/auth/server'
import type { Prisma, Role } from '@/lib/prisma-client/client'

const VALID_ROLES = ['SUPERADMIN', 'SCHOOL_OWNER', 'INSTRUCTOR', 'STUDENT'] as const

export async function GET(req: NextRequest) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const role = searchParams.get('role') || ''
  const startDate = searchParams.get('startDate') || ''
  const endDate = searchParams.get('endDate') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 20

  const where: Prisma.LoginHistoryWhereInput = {}
  if (search) {
    where.OR = [
      { userName: { contains: search, mode: 'insensitive' } },
      { userEmail: { contains: search, mode: 'insensitive' } },
      { ipAddress: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (role && (VALID_ROLES as readonly string[]).includes(role)) {
    where.userRole = role as Role
  }
  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) where.createdAt.gte = new Date(startDate)
    if (endDate) where.createdAt.lte = new Date(`${endDate}T23:59:59.999Z`)
  }

  const [items, total] = await Promise.all([
    prisma.loginHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        userEmail: true,
        userName: true,
        userRole: true,
        ipAddress: true,
        country: true,
        city: true,
        userAgent: true,
        browser: true,
        os: true,
        device: true,
        createdAt: true,
        user: { select: { id: true, avatarUrl: true } },
      },
    }),
    prisma.loginHistory.count({ where }),
  ])

  return NextResponse.json({ items, total, pages: Math.ceil(total / limit) })
}
