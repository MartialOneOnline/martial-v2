import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guardSuperadmin } from '@/lib/auth/server'

// GET /api/admin/settings/general — notifications, platform toggles, security, email sender
export async function GET(req: NextRequest) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const settings = await prisma.platformSettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton' },
    update: {},
  })

  return NextResponse.json({ settings })
}

// PATCH /api/admin/settings/general
export async function PATCH(req: NextRequest) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const body = await req.json()
  const {
    notifyNewSchool, notifyVerificationReq, notifyWeeklyReport,
    allowSelfRegistration, requireEmailVerification, maintenanceMode,
    superAdminEmail, supportEmail,
    emailSenderName,
  } = body

  const data: Record<string, unknown> = {}

  if (notifyNewSchool !== undefined) data.notifyNewSchool = !!notifyNewSchool
  if (notifyVerificationReq !== undefined) data.notifyVerificationReq = !!notifyVerificationReq
  if (notifyWeeklyReport !== undefined) data.notifyWeeklyReport = !!notifyWeeklyReport
  if (allowSelfRegistration !== undefined) data.allowSelfRegistration = !!allowSelfRegistration
  if (requireEmailVerification !== undefined) data.requireEmailVerification = !!requireEmailVerification
  if (maintenanceMode !== undefined) data.maintenanceMode = !!maintenanceMode

  if (superAdminEmail !== undefined) data.superAdminEmail = superAdminEmail?.trim() || null
  if (supportEmail !== undefined) data.supportEmail = supportEmail?.trim() || null
  if (emailSenderName !== undefined) data.emailSenderName = emailSenderName?.trim() || 'Martial'

  const updated = await prisma.platformSettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', ...data },
    update: data,
  })

  return NextResponse.json({ settings: updated })
}
