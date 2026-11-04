import { describe, it, expect } from 'vitest'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — plain JS config
import nextConfig from '../next.config.js'

// Mirrors how Next turns the `source` param pattern into a regex.
async function wwwSourceRegex() {
  const rule = (await nextConfig.redirects!())[0]!
  const inner = rule.source.match(/^\/:path\((.*)\)$/)![1]
  return { rule, re: new RegExp(`^/(?:${inner})$`) }
}

describe('www → apex redirect', () => {
  it('only applies to the www host and is permanent', async () => {
    const { rule } = await wwwSourceRegex()
    expect(rule.has).toEqual([{ type: 'host', value: 'www.martialapp.com' }])
    expect(rule.permanent).toBe(true)
    expect(rule.destination).toBe('https://martialapp.com/:path*')
  })

  it('redirects pages and normal API routes', async () => {
    const { re } = await wwwSourceRegex()
    for (const p of ['/', '/login', '/my/classes', '/api/auth/me', '/api/webhooksx', '/api/cronjob']) {
      expect(re.test(p), p).toBe(true)
    }
  })

  it('leaves webhooks and crons on www untouched', async () => {
    const { re } = await wwwSourceRegex()
    for (const p of ['/api/webhooks', '/api/webhooks/stripe', '/api/webhooks/stripe-platform', '/api/webhooks/revolut', '/api/webhooks/mux', '/api/cron/expire-memberships']) {
      expect(re.test(p), p).toBe(false)
    }
  })
})
