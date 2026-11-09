import { prisma } from '@/lib/db'
import { currencyForCountry } from './currency'

/** Server-side: default currency for a school, from its country (AU → AUD). Falls back to EUR. */
export async function schoolDefaultCurrency(schoolId: string): Promise<string> {
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { country: true } })
  return currencyForCountry(school?.country)
}
