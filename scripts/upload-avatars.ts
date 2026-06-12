/**
 * Upload V1 profile photos to Supabase Storage (avatars bucket)
 * and update User.avatarUrl in the DB.
 *
 * Run: npx tsx scripts/upload-avatars.ts
 */

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '../apps/web/lib/prisma-client/client'
import { PrismaPg } from '@prisma/adapter-pg'

const SUPABASE_URL = 'https://fixipigqxebxferfxlsv.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SECRET_KEY!
const PHOTOS_DIR = '/Users/pablocabo/Downloads/profile_photo 2'
const CSV_PATH = '/Users/pablocabo/Downloads/userdetails (4).csv'
const STUDENTS_JSON = path.join(__dirname, '../prisma/rgm-students.json')

if (!SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_SECRET_KEY env var')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

function parseCSV(content: string): { photo: string; v1UserId: string }[] {
  const lines = content.trim().split('\n')
  const headers = lines[0].replace(/"/g, '').split(',')
  const photoIdx = headers.indexOf('profile_photo')
  const userIdIdx = headers.indexOf('user_id')

  const rows: { photo: string; v1UserId: string }[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols: string[] = []
    let col = ''
    let inQuotes = false
    for (const ch of lines[i]) {
      if (ch === '"') { inQuotes = !inQuotes; continue }
      if (ch === ',' && !inQuotes) { cols.push(col); col = ''; continue }
      col += ch
    }
    cols.push(col)

    const photo = cols[photoIdx]?.trim()
    const v1UserId = cols[userIdIdx]?.trim()
    if (photo && photo !== 'NULL' && photo !== '' && v1UserId) {
      rows.push({ photo, v1UserId })
    }
  }
  return rows
}

async function main() {
  console.log('Reading CSV...')
  const csv = fs.readFileSync(CSV_PATH, 'utf8')
  const rows = parseCSV(csv)
  console.log(`Found ${rows.length} users with photos in CSV`)

  const students: { v1_id: string; email: string }[] = JSON.parse(
    fs.readFileSync(STUDENTS_JSON, 'utf8')
  )
  const v1IdToEmail = new Map(students.map(s => [String(s.v1_id), s.email]))
  console.log(`Loaded ${v1IdToEmail.size} students from JSON`)

  const emails = [...new Set([...v1IdToEmail.values()])]
  const dbUsers = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true, avatarUrl: true },
  })
  console.log(`Found ${dbUsers.length} DB users matching emails`)

  const emailToDbUser = new Map(dbUsers.map(u => [u.email, u]))

  let uploaded = 0
  let skipped = 0
  let notFound = 0
  let errors = 0

  for (const { photo, v1UserId } of rows) {
    const email = v1IdToEmail.get(v1UserId)
    if (!email) { notFound++; continue }
    const dbUser = emailToDbUser.get(email)
    if (!dbUser) { notFound++; continue }
    if (dbUser.avatarUrl) { skipped++; continue }

    const localPath = path.join(PHOTOS_DIR, photo)
    if (!fs.existsSync(localPath)) { notFound++; continue }

    const ext = path.extname(photo).toLowerCase()
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg'
    const storagePath = `${dbUser.id}${ext}`

    try {
      const fileBuffer = fs.readFileSync(localPath)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(storagePath, fileBuffer, {
          contentType: mimeType,
          upsert: true,
        })

      if (uploadError) {
        console.error(`Upload error for ${v1UserId}:`, uploadError.message)
        errors++
        continue
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(storagePath)

      await prisma.user.update({
        where: { id: dbUser.id },
        data: { avatarUrl: publicUrl },
      })

      uploaded++
      if (uploaded % 50 === 0) console.log(`  Uploaded ${uploaded}...`)
    } catch (err: any) {
      console.error(`Error for v1UserId ${v1UserId}:`, err.message)
      errors++
    }
  }

  console.log('\n--- Done ---')
  console.log(`Uploaded: ${uploaded}`)
  console.log(`Skipped (already had avatar): ${skipped}`)
  console.log(`Not found (no file or no DB user): ${notFound}`)
  console.log(`Errors: ${errors}`)

  await prisma.$disconnect()
}

main()
