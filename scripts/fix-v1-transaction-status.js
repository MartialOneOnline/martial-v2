/**
 * Fix Transaction.status for all V1-imported records.
 * Matches by notes = 'v1_booking:{id}' and updates status based on V1 status code.
 * Safe to re-run.
 */

const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fixipigqxebxferfxlsv.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY
const V1_SCHOOL_ID = '798'

const db = createClient(SUPABASE_URL, SUPABASE_KEY)

// V1 status → TransactionStatus
function mapStatus(v1Status) {
  switch (String(v1Status)) {
    case '1': return 'PENDING'
    case '3': return 'FAILED'
    case '4': return 'REFUNDED'
    default:  return 'PAID'   // 2, 6, 7, 8
  }
}

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

async function main() {
  console.log('📥 Reading CSV…')
  const bookings = parseCSV('/Users/pablocabo/Downloads/subscription_bookings (3).csv')
  const rga = bookings.filter(b => b.school_id === V1_SCHOOL_ID && parseFloat(b.price) > 0)
  console.log(`📋 RGA paid bookings: ${rga.length}`)

  // Build map: v1 booking id → desired status
  const statusMap = {}
  for (const b of rga) statusMap[b.id] = mapStatus(b.status)

  // Breakdown
  const counts = {}
  for (const s of Object.values(statusMap)) counts[s] = (counts[s] || 0) + 1
  console.log('Status breakdown:', counts)

  // Group by status to batch-update
  const byStatus = { PAID: [], PENDING: [], FAILED: [], REFUNDED: [] }
  for (const [id, status] of Object.entries(statusMap)) byStatus[status].push(`v1_booking:${id}`)

  let updated = 0
  for (const [status, notes] of Object.entries(byStatus)) {
    if (notes.length === 0) continue
    // Update in chunks of 500
    const CHUNK = 500
    for (let i = 0; i < notes.length; i += CHUNK) {
      const chunk = notes.slice(i, i + CHUNK)
      const { error, count } = await db
        .schema('public')
        .from('transactions')
        .update({ status, updatedAt: new Date().toISOString() })
        .in('notes', chunk)
      if (error) { console.error(`Error updating ${status}:`, error.message); process.exit(1) }
      updated += chunk.length
      process.stdout.write(`\r   Updated ${updated}/${rga.length}…`)
    }
  }

  console.log(`\n🎉 Done! ${updated} transactions updated.`)
}

main().catch(e => { console.error(e); process.exit(1) })
