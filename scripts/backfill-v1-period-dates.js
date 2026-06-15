/**
 * Backfill periodStart / periodEnd on already-imported V1 transactions.
 * Reads subscription_bookings CSV, matches by notes = 'v1_booking:{id}', updates in batches.
 * Safe to re-run.
 */

const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fixipigqxebxferfxlsv.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY
const SCHOOL_ID    = 'cmq6k2n5t0000x4o0rcvlmhmv'
const V1_SCHOOL_ID = '798'

const db = createClient(SUPABASE_URL, SUPABASE_KEY)

function parseCSV(filePath) {
  const text    = fs.readFileSync(filePath, 'utf8')
  const lines   = text.trim().split('\n')
  const headers = lines[0].replace(/\r/g, '').split(',').map(h => h.replace(/"/g, ''))
  return lines.slice(1).map(line => {
    line = line.replace(/\r/g, '')
    const cols = []; let cur = '', inQ = false
    for (const ch of line) {
      if (ch === '"') inQ = !inQ
      else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
      else cur += ch
    }
    cols.push(cur.trim())
    return Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? '']))
  })
}

function parseDate(val) {
  return val && val !== 'NULL' && val !== '' ? new Date(val).toISOString() : null
}

async function main() {
  console.log('📥 Reading CSV…')
  const bookings = parseCSV('/Users/pablocabo/Downloads/subscription_bookings (3).csv')
  const rga = bookings.filter(b => b.school_id === V1_SCHOOL_ID && parseFloat(b.price) > 0)
  console.log(`📋 RGA paid bookings: ${rga.length}`)

  // Build map: notes key → { periodStart, periodEnd }
  const periodMap = {}
  for (const b of rga) {
    periodMap[`v1_booking:${b.id}`] = {
      periodStart: parseDate(b.activated_at),
      periodEnd:   parseDate(b.expires_at),
    }
  }

  const notes = Object.keys(periodMap)
  const now   = new Date().toISOString()
  const CHUNK = 50
  let updated = 0

  for (let i = 0; i < notes.length; i += CHUNK) {
    const chunk = notes.slice(i, i + CHUNK)
    // Update each individually because Supabase doesn't support per-row upsert by notes easily
    await Promise.all(chunk.map(noteKey => {
      const { periodStart, periodEnd } = periodMap[noteKey]
      return db
        .schema('public')
        .from('transactions')
        .update({ periodStart, periodEnd, updatedAt: now })
        .eq('schoolId', SCHOOL_ID)
        .eq('notes', noteKey)
    }))
    updated += chunk.length
    process.stdout.write(`\r   Updated ${Math.min(updated, notes.length)}/${notes.length}…`)
  }

  console.log(`\n🎉 Done! ${notes.length} transactions backfilled.`)
}

main().catch(e => { console.error(e); process.exit(1) })
