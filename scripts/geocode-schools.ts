/**
 * Geocode schools without lat/lng using Nominatim (free, 1 req/s limit)
 * Run: npx tsx --env-file=.env scripts/geocode-schools.ts
 */
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../apps/web/lib/prisma-client/client.js'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function geocode(city: string, country: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const query = encodeURIComponent(`${city}, ${country}`)
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'MartialApp/2.0 (school-geocoder)' },
    })
    const data = await res.json() as any[]
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    }
  } catch {}
  return null
}

async function main() {
  const schools = await prisma.school.findMany({
    where: { lat: null, city: { not: null } },
    select: { id: true, name: true, city: true, country: true },
  })

  console.log(`📍 Geocoding ${schools.length} schools...`)

  let updated = 0
  let failed = 0

  for (const school of schools) {
    const coords = await geocode(school.city!, school.country)
    if (coords) {
      await prisma.school.update({
        where: { id: school.id },
        data: { lat: coords.lat, lng: coords.lng },
      })
      updated++
      if (updated % 50 === 0) console.log(`  ✓ ${updated} geocoded...`)
    } else {
      failed++
    }
    await sleep(1100) // Nominatim: max 1 req/s
  }

  console.log(`\n✅ Done: ${updated} geocoded, ${failed} failed`)
}

main().finally(() => prisma.$disconnect())
