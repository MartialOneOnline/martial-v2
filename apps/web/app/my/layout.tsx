import React from 'react'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/server'
import { hasDashboardAccess, hasStudentAccess } from '@/lib/auth/contexts'
import { prisma } from '@/lib/db'
import { calculateAge, MIN_CONSENT_AGE } from '@/lib/age'
import { getSchoolModules } from '@/lib/school-modules'
import MyShell from '../../components/MyShell'

export default async function MyLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser()

  if (!user) {
    redirect('/login?redirect=/my')
  }

  // Inverse of the /dashboard guard (see dashboard/layout.tsx): a user whose
  // only SchoolMember rows are staff-facing (OWNER, ADMIN, ...) has no real
  // student profile — that row exists purely to grant dashboard permissions.
  // Sending them into /my would render a fake/empty student portal. Only
  // block them if they truly have no STUDENT-role membership anywhere; staff
  // who are *also* enrolled as a student in some school keep access to /my.
  const [staffAccess, studentAccess] = await Promise.all([
    hasDashboardAccess(user.id),
    hasStudentAccess(user.id),
  ])

  if (staffAccess && !studentAccess) {
    redirect('/dashboard')
  }

  // Registration only ever collects name/email/password (see
  // app/api/auth/register/route.ts) — photo, phone and date of birth get
  // filled in here instead. Checked on every /my request (not just once at
  // signup) so a user who closes the tab mid-way is sent right back until
  // all three are set (and, for a student under MIN_CONSENT_AGE, until a
  // parent/guardian has also confirmed — see /complete-profile). /complete-profile
  // itself lives outside this layout, so no loop.
  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { phone: true, dateOfBirth: true, avatarUrl: true, guardianConsentAt: true },
  })
  const isMinor = profile?.dateOfBirth != null && calculateAge(profile.dateOfBirth) < MIN_CONSENT_AGE
  const guardianDone = !isMinor || profile?.guardianConsentAt != null
  if (profile && (!profile.phone || !profile.dateOfBirth || !profile.avatarUrl || !guardianDone)) {
    redirect('/complete-profile')
  }

  // Same priority as MyShell used to resolve client-side (active membership >
  // most recent membership > plain SchoolMember, e.g. a LEAD awaiting payment
  // approval) — resolved here instead so the sidebar/topbar render the real
  // school name + logo on first paint, instead of the generic "Martial"
  // placeholder flashing in while a client-side fetch is still in flight.
  const schoolData = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      memberships: {
        where: { status: { in: ['ACTIVE', 'PENDING', 'PAUSED'] } },
        orderBy: { startDate: 'desc' },
        take: 3,
        select: {
          status: true,
          school: {
            select: {
              name: true, logoUrl: true, modules: true,
              _count: { select: { gradingSystems: { where: { isActive: true } } } },
            },
          },
        },
      },
      schoolMembers: {
        where: { status: { in: ['ACTIVE', 'LEAD', 'FROZEN'] }, role: 'STUDENT' },
        take: 1,
        select: {
          school: {
            select: {
              name: true, logoUrl: true, modules: true,
              _count: { select: { gradingSystems: { where: { isActive: true } } } },
            },
          },
        },
      },
    },
  })
  const membership = schoolData?.memberships.find(m => m.status === 'ACTIVE') ?? schoolData?.memberships[0]
  const rawSchool = membership?.school ?? schoolData?.schoolMembers[0]?.school
  const initialSchool = rawSchool && {
    name: rawSchool.name,
    logoUrl: rawSchool.logoUrl,
    modules: getSchoolModules(rawSchool.modules),
    hasGrading: rawSchool._count.gradingSystems > 0,
  }

  return <MyShell initialSchool={initialSchool ?? null}>{children}</MyShell>
}
