/**
 * Sets Roger Gracie Málaga's per-grading class counts to match V1's grading
 * table (Edit – JIU JITSU, "Total Classes" per belt/grado row):
 *
 *   Blanco: 8 → 1st stripe, 16 → 2nd, 24 → 3rd, 24 → 4th, 24 → Azul
 *   Azul / Morado: 30 per grading · Marrón: 40 · Negro: 120
 *
 * Only Blanco differs between stripes; the others already have the right
 * single `totalClassesRequired`, so their classesByDegree stays empty.
 * Requires migration 20261026120000_belt_rank_classes_by_degree.
 *
 * Usage (from the repo root):
 *   node scripts/set-rgm-classes-by-degree.mjs           # dry run, no writes
 *   node scripts/set-rgm-classes-by-degree.mjs --apply
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const APPLY = process.argv.includes('--apply')
const SCHOOL_ID = 'cmq6k2n5t0000x4o0rcvlmhmv'
const TARGET = { Blanco: [8, 16, 24, 24, 24] }

const envPath = path.resolve(process.cwd(), 'apps/web/.env.local')
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8').split('\n')
    .filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] })
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY)

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`)
  const { data: systems, error: sErr } = await db.from('grading_systems').select('id, name').eq('schoolId', SCHOOL_ID)
  if (sErr) throw sErr
  const { data: ranks, error } = await db.from('belt_ranks')
    .select('id, name, "order", "maxDegrees", "totalClassesRequired", "classesByDegree", "systemId"')
    .in('systemId', systems.map(s => s.id))
    .order('order')
  if (error) throw error

  for (const r of ranks) {
    const target = TARGET[r.name]
    console.log(`${r.name.padEnd(8)} total=${r.totalClassesRequired ?? '—'} byDegree=${JSON.stringify(r.classesByDegree)}${target ? ` → ${JSON.stringify(target)}` : ''}`)
    if (!target) continue
    if (target.length !== r.maxDegrees + 1) throw new Error(`${r.name}: expected ${r.maxDegrees + 1} entries`)
    if (JSON.stringify(r.classesByDegree) === JSON.stringify(target)) { console.log('  already set'); continue }
    if (APPLY) {
      const { error: uErr } = await db.from('belt_ranks').update({ classesByDegree: target }).eq('id', r.id)
      if (uErr) throw uErr
      console.log('  updated')
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) })
