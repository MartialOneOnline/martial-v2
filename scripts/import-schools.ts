import * as xlsx from 'xlsx'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../apps/web/lib/prisma-client/client.js'
import * as path from 'path'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

// Map country name → ISO2
const COUNTRY_MAP: Record<string, string> = {
  'Spain': 'ES', 'United Kingdom': 'GB', 'France': 'FR', 'Italy': 'IT',
  'Germany': 'DE', 'Sweden': 'SE', 'Portugal': 'PT', 'Poland': 'PL',
  'Switzerland': 'CH', 'Greece': 'GR', 'Netherlands': 'NL', 'Belgium': 'BE',
  'Ireland': 'IE', 'Croatia': 'HR', 'Finland': 'FI', 'Denmark': 'DK',
  'Norway': 'NO', 'Austria': 'AT', 'Czech Republic': 'CZ', 'Romania': 'RO',
  'Hungary': 'HU', 'Slovakia': 'SK', 'Slovenia': 'SI', 'Lithuania': 'LT',
  'Latvia': 'LV', 'Estonia': 'EE', 'Bulgaria': 'BG', 'Serbia': 'RS',
  'Turkey': 'TR', 'United States': 'US', 'Australia': 'AU', 'Brazil': 'BR',
  'Canada': 'CA', 'Azerbaijan': 'AZ', 'UAE': 'AE', 'Dubai': 'AE',
}

// Map V1 activity text → discipline slug
const DISCIPLINE_MAP: Record<string, string> = {
  'Brazilian Jiu Jitsu': 'bjj',
  'Jiu Jitsu': 'bjj',
  'BJJ': 'bjj',
  'Grappling': 'grappling',
  'MMA': 'mma',
  'Mixed Martial Arts': 'mma',
  'Boxing': 'boxing',
  'Kick Boxing': 'kickboxing',
  'Kickboxing': 'kickboxing',
  'Muay Thai': 'muay-thai',
  'Wrestling': 'wrestling',
  'Judo': 'judo',
  'Karate': 'karate',
  'No-Gi': 'grappling',
  'NoGi': 'grappling',
  'Submission Wrestling': 'grappling',
}

function slugify(name: string, city: string): string {
  const base = `${name} ${city}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80)
  return base
}

async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base
  let i = 2
  while (true) {
    const existing = await prisma.school.findUnique({ where: { slug } })
    if (!existing) return slug
    slug = `${base}-${i++}`
  }
}

async function main() {
  const filePath = path.join(__dirname, 'schools-import-ready.xlsx')
  const wb = xlsx.readFile(filePath)
  const ws = wb.Sheets['Schools_Input']
  const rows = xlsx.utils.sheet_to_json<Record<string, any>>(ws)

  console.log(`📥 Importing ${rows.length} schools...`)

  // Get all disciplines from DB
  const disciplines = await prisma.discipline.findMany()
  const disciplineMap = new Map(disciplines.map(d => [d.slug, d.id]))

  let created = 0
  let skipped = 0
  let errors = 0

  for (const row of rows) {
    const name: string = (row.name || '').trim()
    const city: string = (row.city || '').trim()

    if (!name) { skipped++; continue }

    const countryRaw: string = (row.country || '').trim()
    const country = COUNTRY_MAP[countryRaw] || countryRaw.substring(0, 2).toUpperCase() || 'XX'
    const baseSlug = slugify(name, city || country)
    const slug = await ensureUniqueSlug(baseSlug)

    // Parse disciplines
    const activitiesText: string = row.activities_text || ''
    const disciplineIds: string[] = []
    for (const [keyword, dslug] of Object.entries(DISCIPLINE_MAP)) {
      if (activitiesText.toLowerCase().includes(keyword.toLowerCase())) {
        const id = disciplineMap.get(dslug)
        if (id && !disciplineIds.includes(id)) disciplineIds.push(id)
      }
    }

    try {
      await prisma.school.create({
        data: {
          slug,
          name,
          email: row.email || null,
          phone: row.phone ? String(row.phone).substring(0, 30) : null,
          website: row.website || null,
          instagram: row.instagram || null,
          facebook: row.facebook || null,
          address: row.address || null,
          postcode: row.postcode ? String(row.postcode) : null,
          city: city || null,
          country,
          lat: row.latitude ? parseFloat(row.latitude) : null,
          lng: row.longitude ? parseFloat(row.longitude) : null,
          description: row.description || null,
          tagline: row.tagline || null,
          logoUrl: row.logo_url || null,
          coverUrl: row.cover_url || null,
          googlePlaceId: row.google_place_id || null,
          googleRating: row.google_rating ? parseFloat(row.google_rating) : null,
          googleReviews: row.google_reviews ? parseInt(row.google_reviews) : null,
          hasFreeTrialCls: row.free_trial === true || row.free_trial === 'true' || row.free_trial === 1,
          status: 'UNVERIFIED',
          source: 'VONSEL',
          disciplines: disciplineIds.length > 0 ? {
            create: disciplineIds.map(disciplineId => ({ disciplineId })),
          } : undefined,
        },
      })
      created++
      if (created % 100 === 0) console.log(`  ✓ ${created} imported...`)
    } catch (err: any) {
      console.error(`  ✗ Error importing "${name}": ${err.message}`)
      errors++
    }
  }

  console.log(`\n✅ Done: ${created} created, ${skipped} skipped, ${errors} errors`)
}

main().finally(() => prisma.$disconnect())
