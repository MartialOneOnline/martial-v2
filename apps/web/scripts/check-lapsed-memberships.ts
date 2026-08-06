#!/usr/bin/env tsx
/**
 * check-lapsed-memberships.ts — Read-only preview of what the
 * expire-memberships cron (apps/web/app/api/cron/expire-memberships) would
 * do on its next run: every ACTIVE membership whose endDate has already
 * passed, grouped by school, with whether each would become EXPIRED
 * (never cancelled, simply lapsed) or CANCELLED (student had already
 * requested cancellation, access was kept until endDate).
 *
 * Never writes anything — always calls expireLapsedMemberships with
 * dryRun: true. Run this before the cron is enabled in production to see
 * the real blast radius, since the first run is retroactive over every
 * historically-lapsed membership in the database at once.
 *
 * Usage:
 *   npx tsx apps/web/scripts/check-lapsed-memberships.ts
 */
import { expireLapsedMemberships } from '../lib/services/membership'

async function main() {
  const { expiredCount, cancelledCount, preview = [] } = await expireLapsedMemberships({ dryRun: true })

  console.log(`\nLapsed ACTIVE memberships found: ${preview.length}`)
  console.log(`  -> would become EXPIRED (never cancelled, just lapsed): ${expiredCount}`)
  console.log(`  -> would become CANCELLED (already had cancelledAt):    ${cancelledCount}\n`)

  if (preview.length === 0) {
    console.log('Nothing would change on the next cron run.')
    return
  }

  const bySchool = new Map<string, typeof preview>()
  for (const m of preview) {
    const list = bySchool.get(m.schoolName || '(unknown school)') ?? []
    list.push(m)
    bySchool.set(m.schoolName || '(unknown school)', list)
  }

  for (const [school, members] of [...bySchool.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`── ${school} (${members.length}) ──`)
    for (const m of members.sort((a, b) => a.endDate.getTime() - b.endDate.getTime())) {
      const daysOverdue = Math.floor((Date.now() - m.endDate.getTime()) / 86_400_000)
      const who = m.userName ?? m.userEmail
      console.log(`  ${who.padEnd(28)} ${m.planName.padEnd(24)} expired ${m.endDate.toISOString().slice(0, 10)} (${daysOverdue}d ago) -> ${m.willBecome}`)
    }
    console.log('')
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1) })
