/**
 * Shorter acceptance on /claim/[token] (2026-11-23, option A): "Accept and
 * continue" → confirmation email → one click signs in AND accepts → dashboard.
 * The server routes are unchanged (covered by claimOwnershipFlow.test.ts);
 * this pins the page-level guarantees the shortcut must keep.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { translations } from '@/lib/i18n/translations'

const page = readFileSync(join(__dirname, '../app/claim/[token]/page.tsx'), 'utf8')
const fn = (name: string) => {
  const start = page.indexOf(`async function ${name}(`)
  expect(start, name).toBeGreaterThan(-1)
  const next = page.indexOf('\n  async function ', start + 1)
  return page.slice(start, next === -1 ? undefined : next)
}

describe('claim page · short acceptance', () => {
  it('opening the page or the email link never redeems or accepts on its own', () => {
    // The only effects on mount read the URL and GET the invitation.
    const effects = page.match(/useEffect\(\(\) => \{[\s\S]*?\}, \[[^\]]*\]\)/g) ?? []
    for (const e of effects) {
      expect(e).not.toMatch(/\/session|\/complete|confirmEmail|accept\(|complete\(/)
    }
    // Both are reached only from buttons.
    expect(page).toMatch(/onClick=\{confirmEmail\}/)
    expect(page).toMatch(/onClick=\{accept\}/)
  })

  it('confirm click: session first, then complete — and only when the session succeeded', () => {
    const body = fn('confirmEmail')
    const session = body.indexOf('/session')
    const okGuard = body.indexOf('if (!res.ok)')
    const complete = body.indexOf('await complete()')
    expect(session).toBeGreaterThan(-1)
    expect(okGuard).toBeGreaterThan(session)
    expect(complete).toBeGreaterThan(okGuard)
  })

  it('a successful grant goes straight to the dashboard with a full navigation; no "done" screen', () => {
    const body = fn('complete')
    expect(body).toMatch(/res\.ok && data\.ok[\s\S]*window\.location\.assign\('\/dashboard'\)/)
    expect(page).not.toMatch(/kind: 'done'/)
  })

  it('copy exists in all four languages and the removed keys are gone', () => {
    for (const lang of ['en', 'es', 'pt', 'fr'] as const) {
      const c = (translations as Record<string, any>)[lang].claimFlow // eslint-disable-line @typescript-eslint/no-explicit-any
      for (const k of ['sendLink', 'accept', 'confirmContinue', 'confirmIntro', 'stepVerify', 'linkSent', 'entering']) {
        expect(typeof c[k], `${lang}.${k}`).toBe('string')
      }
      for (const k of ['doneTitle', 'doneBody', 'goDashboard']) expect(c[k], `${lang}.${k}`).toBeUndefined()
    }
    expect((translations as Record<string, any>).es.claimFlow.sendLink).toBe('Aceptar y entrar') // eslint-disable-line @typescript-eslint/no-explicit-any
  })
})
