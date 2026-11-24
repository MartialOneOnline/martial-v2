// Requeue campaign recipients that the old sender marked FAILED after a Resend
// 429 rate-limit response, so the new reliable sender delivers them.
//
// DRY-RUN BY DEFAULT — it only reads. Nothing is sent by this script: requeued
// rows go back to PENDING and are sent by the normal path (/process from the
// campaign page's "Continue sending", or the campaign-send cron), paced and
// idempotent. Run --apply only after the campaign_reliable_delivery migration
// and the new code are deployed.
//
// Identify the campaign (must match exactly one):
//   npx tsx scripts/recover-campaign-rate-limited.ts \
//     --school-slug=roger-gracie-malaga --campaign-name="Libre — 20/11/2026" \
//     --expect-total=49 --expect-sent=24 --expect-failed=25 [--check-resend]
//
// Apply (needs the id printed by the dry-run, and the Resend check or an
// explicit opt-out):
//   npx tsx scripts/recover-campaign-rate-limited.ts --campaign-id=<id> \
//     --expect-total=49 --expect-sent=24 --expect-failed=25 --check-resend --apply
//
// Safe to re-run: only FAILED + confirmed rate-limit + no resendEmailId rows
// are touched, SENT rows never are, counters are recomputed from the rows.

import { PrismaPg } from '@prisma/adapter-pg'
import { Resend } from 'resend'
import { PrismaClient } from '../apps/web/lib/prisma-client/client.js'
import { planRecovery } from '../apps/web/lib/campaignRecovery'
import { renderCampaignTokens } from '../apps/web/lib/email/templates/campaign'

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/)
    return m ? [m[1], m[2] ?? 'true'] : [a, 'true']
  }),
) as Record<string, string>

const APPLY = args.apply === 'true'
const CHECK_RESEND = args['check-resend'] === 'true'
const SKIP_RESEND = args['skip-resend-check'] === 'true'

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })

function fail(msg: string): never {
  console.error(`✖ ${msg}`)
  process.exit(1)
}

async function findCampaign() {
  if (args['campaign-id']) {
    const c = await prisma.campaign.findUnique({ where: { id: args['campaign-id'] }, include: { school: { select: { id: true, name: true, slug: true } } } })
    if (!c) fail(`campaign ${args['campaign-id']} not found`)
    if (args['school-slug'] && c.school.slug !== args['school-slug']) fail(`campaign belongs to ${c.school.slug}, not ${args['school-slug']}`)
    return c
  }
  if (APPLY) fail('--apply requires --campaign-id (take it from the dry-run output)')
  if (!args['school-slug'] || !args['campaign-name']) fail('pass --campaign-id, or --school-slug and --campaign-name')
  const school = await prisma.school.findMany({ where: { slug: args['school-slug'] }, select: { id: true } })
  if (school.length !== 1) fail(`school slug ${args['school-slug']} matched ${school.length} schools`)
  const matches = await prisma.campaign.findMany({
    where: { schoolId: school[0].id, name: args['campaign-name'] },
    include: { school: { select: { id: true, name: true, slug: true } } },
  })
  if (matches.length !== 1) fail(`campaign name matched ${matches.length} campaigns in that school: ${matches.map(m => m.id).join(', ')}`)
  return matches[0]
}

// Read-only scan of Resend's sent log for emails that would prove acceptance.
async function resendEvidence(since: Date, wanted: Map<string, { email: string; subject: string }>) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const found = new Map<string, string>()
  const byEmail = new Map<string, string[]>()
  for (const [id, w] of wanted) byEmail.set(w.email.toLowerCase(), [...(byEmail.get(w.email.toLowerCase()) ?? []), id])
  let after: string | undefined
  let pages = 0
  let scanned = 0
  let reachedStart = false
  let exhausted = false
  for (; pages < 200; pages++) {
    const res = await resend.emails.list({ limit: 100, ...(after ? { after } : {}) })
    if (res.error) fail(`Resend list failed: ${res.error.name} ${res.error.message}`)
    const items = res.data?.data ?? []
    for (const e of items) {
      scanned++
      if (new Date(e.created_at) < since) { reachedStart = true; continue }
      for (const to of e.to ?? []) {
        for (const rid of byEmail.get(to.toLowerCase()) ?? []) {
          if ((e.subject ?? '').trim() === wanted.get(rid)!.subject.trim()) found.set(rid, `Resend log has email ${e.id} (${e.created_at}, last_event ${e.last_event ?? '?'})`)
        }
      }
    }
    if (!res.data?.has_more || items.length === 0) exhausted = true
    if (reachedStart || exhausted) break
    after = items[items.length - 1].id
    await new Promise(r => setTimeout(r, 600)) // stay far below the team rate limit
  }
  return { found, pages: pages + 1, scanned, covered: reachedStart || exhausted }
}

async function main() {
  const campaign = await findCampaign()
  const rows = await prisma.campaignRecipient.findMany({
    where: { campaignId: campaign.id },
    select: {
      id: true, status: true, failedReason: true, resendEmailId: true, sentAt: true,
      schoolMember: { select: { schoolId: true, user: { select: { email: true, name: true } } } },
    },
  })
  // Tenant guard: every recipient must belong to the campaign's school.
  const foreign = rows.filter(r => r.schoolMember.schoolId !== campaign.schoolId)
  if (foreign.length) fail(`${foreign.length} recipients belong to another school — aborting`)

  const count = (s: string) => rows.filter(r => r.status === s).length
  console.log(`School:   ${campaign.school.name} (${campaign.school.slug}, ${campaign.school.id})`)
  console.log(`Campaign: ${campaign.name} (${campaign.id}) status=${campaign.status}`)
  console.log(`Subject:  ${campaign.subject}`)
  console.log(`Rows:     total=${rows.length} SENT=${count('SENT')} FAILED=${count('FAILED')} PENDING=${count('PENDING')} SKIPPED=${count('SKIPPED')}`)
  console.log(`Counters: sentCount=${campaign.sentCount} failedCount=${campaign.failedCount} totalRecipients=${campaign.totalRecipients}`)

  const expect = (flag: string, actual: number) => {
    if (args[flag] !== undefined && Number(args[flag]) !== actual) fail(`--${flag}=${args[flag]} but found ${actual}`)
  }
  expect('expect-total', rows.length)
  expect('expect-sent', count('SENT'))
  // A re-run after --apply sees fewer FAILED rows and stops here without writing.
  expect('expect-failed', count('FAILED'))

  const accepted = new Map<string, string>()
  const failedRows = rows.filter(r => r.status === 'FAILED')
  if (CHECK_RESEND) {
    if (!process.env.RESEND_API_KEY) fail('--check-resend needs RESEND_API_KEY')
    const since = new Date((campaign.sentAt ?? campaign.createdAt).getTime() - 60 * 60_000)
    const wanted = new Map(failedRows.filter(r => r.schoolMember.user.email).map(r => [r.id, {
      email: r.schoolMember.user.email!,
      subject: renderCampaignTokens(campaign.subject, { nombre: r.schoolMember.user.name ?? '', escuela: campaign.school.name }),
    }]))
    const ev = await resendEvidence(since, wanted)
    console.log(`Resend log: scanned ${ev.scanned} emails in ${ev.pages} page(s) back to ${since.toISOString()}; evidence for ${ev.found.size} FAILED recipient(s)`)
    if (!ev.covered) fail('Resend log scan did not reach the campaign start (200 pages); not safe to conclude')
    for (const [k, v] of ev.found) accepted.set(k, v)
  } else if (APPLY && !SKIP_RESEND) {
    fail('--apply needs --check-resend (or an explicit --skip-resend-check)')
  } else {
    console.log('Resend log: not checked (pass --check-resend to look for acceptance evidence)')
  }

  const plan = planRecovery(failedRows.map(r => ({
    id: r.id, status: r.status, failedReason: r.failedReason, resendEmailId: r.resendEmailId, email: r.schoolMember.user.email,
  })), accepted)

  console.log('\nFAILED by reason:')
  for (const [group, g] of Object.entries(plan.groups)) console.log(`  ${group.padEnd(20)} ${String(g.count).padStart(3)}  e.g. "${g.sampleReason ?? ''}"`)
  if (plan.excludedWithEvidence.length) {
    console.log('\nNot requeued (evidence of acceptance or no email):')
    for (const e of plan.excludedWithEvidence) console.log(`  ${e.id}: ${e.why}`)
  }
  console.log(`\nWould requeue ${plan.recover.length} recipient(s) (confirmed rate-limit, no acceptance evidence). SENT rows untouched: ${count('SENT')}.`)

  if (!APPLY) {
    console.log('\nDry-run only. Nothing was written.')
    return
  }
  if (plan.recover.length === 0) {
    console.log('Nothing to requeue (already recovered?). Recomputing counters only.')
  }

  const now = new Date()
  await prisma.$transaction(async tx => {
    if (plan.recover.length > 0) {
      const res = await tx.campaignRecipient.updateMany({
        where: { id: { in: plan.recover }, campaignId: campaign.id, status: 'FAILED', resendEmailId: null },
        data: {
          status: 'PENDING', attempts: 0, nextAttemptAt: null, claimToken: null, claimedUntil: null,
          uncertainSince: null, idempotencyGen: { increment: 1 },
          lastErrorCode: 'rate_limit_exceeded', lastStatusCode: 429,
        },
      })
      console.log(`Requeued ${res.count} row(s).`)
    }
    const groups = await tx.campaignRecipient.groupBy({ by: ['status'], where: { campaignId: campaign.id }, _count: { _all: true } })
    const by = Object.fromEntries(groups.map(g => [g.status, g._count._all])) as Record<string, number>
    const open = (by.PENDING ?? 0) + (by.SENDING ?? 0)
    await tx.campaign.update({
      where: { id: campaign.id },
      data: {
        sentCount: by.SENT ?? 0,
        failedCount: (by.FAILED ?? 0) + (by.UNCERTAIN ?? 0),
        ...(open > 0 && campaign.status === 'COMPLETED' ? { status: 'SENDING', completedAt: null } : {}),
      },
    })
    console.log(`Counters now: SENT=${by.SENT ?? 0} FAILED=${by.FAILED ?? 0} PENDING=${by.PENDING ?? 0}; campaign ${open > 0 ? 'SENDING (resume from the campaign page or wait for the cron)' : 'unchanged'}.`)
  })
  console.log(`Done at ${now.toISOString()}. No email was sent by this script.`)
}

main().finally(() => prisma.$disconnect())
