// Preloaded into the dev server (NODE_OPTIONS=--import …) by dev.mjs.
// Every request to the Resend API is inspected; if any recipient (to, cc,
// bcc — also inside batch sends) is not one of the two test inboxes, the
// request never leaves the machine and Resend's own 422 shape is returned,
// so the app records "not sent". A dedicated API key on the real domain does
// not stop the app from emailing real students; this does.
const allowed = new Set((process.env.CLAIMS_E2E_ALLOWED_RECIPIENTS ?? '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean))
const realFetch = globalThis.fetch

const addr = v => { const m = /<([^>]+)>/.exec(v); return (m ? m[1] : v).trim().toLowerCase() }
const list = v => (v == null ? [] : Array.isArray(v) ? v : [v]).map(String).map(addr)
const mask = a => a.replace(/^(.{2}).*(@.*)$/, '$1***$2')

export function blockedRecipients(url, body) {
  if (!/^https:\/\/api\.resend\.com\/emails(\/batch)?\/?$/.test(url)) return []
  let payload
  try { payload = typeof body === 'string' ? JSON.parse(body) : body } catch { return ['<unparseable body>'] }
  const mails = Array.isArray(payload) ? payload : [payload]
  return mails.flatMap(m => [...list(m?.to), ...list(m?.cc), ...list(m?.bcc)]).filter(a => !allowed.has(a))
}

if (allowed.size === 0) throw new Error('[claims-e2e] CLAIMS_E2E_ALLOWED_RECIPIENTS is empty — refusing to start without a recipient allowlist')

globalThis.fetch = async function claimsE2eFetch(input, init) {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url
  if (typeof url === 'string' && url.startsWith('https://api.resend.com/')) {
    let body = init?.body
    if (body === undefined && input && typeof input === 'object' && 'clone' in input) body = await input.clone().text()
    const bad = blockedRecipients(url.split('?')[0], body)
    if (bad.length) {
      console.warn(`[claims-e2e] BLOCKED email to non-test recipient(s): ${bad.map(mask).join(', ')}`)
      return new Response(JSON.stringify({ statusCode: 422, name: 'validation_error', message: 'Blocked by the claims E2E recipient allowlist (not sent)' }), { status: 422, headers: { 'content-type': 'application/json' } })
    }
  }
  return realFetch(input, init)
}
globalThis.__claimsE2eAllowlist = allowed.size
console.log(`[claims-e2e] recipient allowlist active (${allowed.size} inboxes) in pid ${process.pid}`)
