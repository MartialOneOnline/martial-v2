import { prisma } from '@/lib/db'
import { isGradingEnabled } from '@/lib/school-modules'

/** Server-side: is the Belts & gradings module on for this school? */
export async function getGradingEnabledForSchool(schoolId: string): Promise<boolean> {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { modules: true, _count: { select: { gradingSystems: { where: { isActive: true } } } } },
  })
  return school ? isGradingEnabled(school.modules, school._count.gradingSystems) : false
}
