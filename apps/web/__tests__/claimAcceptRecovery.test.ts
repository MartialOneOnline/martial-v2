/**
 * Project Audit P2 on PR #75: after "Confirm and continue" signs the person in,
 * /complete may grant access but its response can be lost. The invitation then
 * reads 410 USED, so the flow must offer to repeat /complete (idempotent for the
 * same person) instead of reloading into "already accepted". These tests drive
 * the real client steps against a simulated server.
 */
import { describe, it, expect } from 'vitest'
import { confirmAndComplete, postComplete } from '@/lib/claims/acceptClient'

const VERIFY = { tokenHash: 'hashed', type: 'magiclink' }

// Tiny stand-in for the three claim routes, with the server-side state that
// matters here: whether the OTP was redeemed and whether OWNER was granted.
function server(opts: { loseFirstCompleteResponse?: boolean; completeStatus?: number } = {}) {
  const state = { sessionRedeemed: false, granted: false, cookie: null as string | null, calls: [] as string[] }
  let completes = 0
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    const path = String(url).replace('/api/claim/tok', '') || '/'
    state.calls.push(`${init?.method ?? 'GET'} ${path}`)
    if (path === '/session') {
      if (state.sessionRedeemed) return json(410, { error: 'verify_expired' })
      state.sessionRedeemed = true
      return json(200, { ok: true })
    }
    if (path === '/complete') {
      completes++
      if (!state.sessionRedeemed) return json(401, { error: 'NOT_AUTHENTICATED' })
      if (opts.completeStatus && completes === 1) return json(opts.completeStatus, { error: 'server_error' })
      state.granted = true
      state.cookie = 'school-1'
      if (opts.loseFirstCompleteResponse && completes === 1) throw new TypeError('Failed to fetch')
      return json(200, { ok: true, schoolId: 'school-1', already: completes > 1 })
    }
    if (path === '/') return state.granted ? json(410, { error: 'USED' }) : json(200, { session: 'match' })
    return json(404, {})
  }) as unknown as typeof fetch
  return { state, fetchImpl }
}

describe('claim acceptance · recovery when /complete is uncertain', () => {
  it('lost response after the grant → uncertain; retrying /complete succeeds without a new OTP or email', async () => {
    const { state, fetchImpl } = server({ loseFirstCompleteResponse: true })

    const first = await confirmAndComplete('tok', VERIFY, fetchImpl)
    expect(first).toEqual({ step: 'complete', result: { kind: 'uncertain' } })
    expect(state.granted).toBe(true) // the server did grant it

    // This is what the page must NOT rely on: the invitation now reads USED.
    const view = await fetchImpl('/api/claim/tok')
    expect(view.status).toBe(410)

    // The retry button repeats /complete only.
    const retry = await postComplete('tok', fetchImpl)
    expect(retry).toEqual({ kind: 'ok' })
    expect(state.cookie).toBe('school-1')
    expect(state.calls.filter(c => c === 'POST /session')).toHaveLength(1)
    expect(state.calls.some(c => c.includes('/verify'))).toBe(false)
  })

  it('a 500 from /complete is uncertain too, and a retry recovers', async () => {
    const { fetchImpl } = server({ completeStatus: 500 })
    expect((await confirmAndComplete('tok', VERIFY, fetchImpl)).result).toEqual({ kind: 'uncertain' })
    expect(await postComplete('tok', fetchImpl)).toEqual({ kind: 'ok' })
  })

  it('session failure never reaches /complete', async () => {
    const { state, fetchImpl } = server()
    state.sessionRedeemed = true // OTP already used → verify_expired
    const out = await confirmAndComplete('tok', VERIFY, fetchImpl)
    expect(out).toEqual({ step: 'session', result: { kind: 'error', code: 'verify_expired' } })
    expect(state.calls).toEqual(['POST /session'])
    expect(state.granted).toBe(false)
  })

  it('definite refusals stay definite (no retry offered)', async () => {
    const res = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch
    expect(await postComplete('tok', res(409, { error: 'OWNER_CONFLICT' }))).toEqual({ kind: 'error', code: 'OWNER_CONFLICT' })
    expect(await postComplete('tok', res(403, { error: 'WRONG_ACCOUNT' }))).toEqual({ kind: 'reload' })
    expect(await postComplete('tok', res(410, { error: 'INVALID_LINK', reason: 'EXPIRED' }))).toEqual({ kind: 'invalid', reason: 'EXPIRED' })
  })
})
