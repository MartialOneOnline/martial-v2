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

  it('confirm click goes through confirmAndComplete; a successful grant navigates, no "done" screen', () => {
    expect(fn('confirmEmail')).toMatch(/confirmAndComplete\(token, verify\)/)
    expect(fn('afterComplete')).toMatch(/case 'ok':[\s\S]*window\.location\.assign\('\/dashboard'\)/)
    expect(page).not.toMatch(/kind: 'done'/)
  })

  it('an uncertain /complete never reloads the invitation and keeps a retry button', () => {
    const after = fn('afterComplete')
    const uncertain = after.slice(after.indexOf("case 'uncertain':"))
    expect(uncertain).not.toMatch(/load\(\)/)
    expect(uncertain).toMatch(/kind: 'retry'/)
    // confirmEmail only reloads on a definite refusal.
    expect(fn('confirmEmail')).toMatch(/if \(out\.result\.kind === 'error'\) await load\(\)/)
    // The retry screen repeats /complete (accept), not /session or /verify.
    const retry = page.slice(page.indexOf("phase.kind === 'retry' && ("))
    expect(retry.slice(0, retry.indexOf(')}'))).toMatch(/onClick=\{accept\}/)
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
