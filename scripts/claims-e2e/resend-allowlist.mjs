// Preloaded into the dev server (NODE_OPTIONS=--import …) by dev.mjs.
// Every request to the Resend API is inspected before it leaves the machine:
//   • POST /emails and /emails/batch: the JSON body is read whatever its form
//     (string, Buffer/Uint8Array/any typed array, ArrayBuffer, DataView, Blob,
//     or a Request object); every to/cc/bcc of every email must be one of the
//     two test inboxes, otherwise the request is blocked;
//   • a body that cannot be read or parsed (stream, form data, URL params,
//     invalid JSON, no recipients) is blocked;
//   • any other non-GET call to Resend (broadcasts, audiences…) is blocked.
// Blocked requests get Resend's own 422 shape, so the app records "not sent".
// A dedicated API key on the real domain does not stop the app from emailing
// real students; this does. (It covers fetch, which the Resend SDK uses.)
const allowed = new Set((process.env.CLAIMS_E2E_ALLOWED_RECIPIENTS ?? '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean))
if (allowed.size === 0) throw new Error('[claims-e2e] CLAIMS_E2E_ALLOWED_RECIPIENTS is empty — refusing to start without a recipient allowlist')
const realFetch = globalThis.fetch

const addr = v => { const m = /<([^>]+)>/.exec(v); return (m ? m[1] : v).trim().toLowerCase() }
const list = v => (v == null ? [] : Array.isArray(v) ? v : [v]).map(String).map(addr)
const mask = a => a.replace(/^(.{2}).*(@.*)$/, '$1***$2')
const decoder = new TextDecoder('utf-8', { fatal: true })

const UNREADABLE = Symbol('unreadable')
async function bodyText(input, init) {
  let body = init?.body
  if (body === undefined && typeof Request !== 'undefined' && input instanceof Request) {
    try { return await input.clone().text() } catch { return UNREADABLE }
  }
  if (body == null) return ''
  try {
    if (typeof body === 'string') return body
    if (body instanceof ArrayBuffer) return decoder.decode(new Uint8Array(body))
    if (ArrayBuffer.isView(body)) return decoder.decode(new Uint8Array(body.buffer, body.byteOffset, body.byteLength)) // Buffer, Uint8Array, DataView…
    if (typeof Blob !== 'undefined' && body instanceof Blob) return await body.text()
  } catch { return UNREADABLE }
  return UNREADABLE // ReadableStream, FormData, URLSearchParams, async iterables…
}

/** Returns null if allowed, or the reason it is blocked. */
export async function checkResendRequest(input, init) {
  const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url
  let url
  try { url = new URL(rawUrl) } catch { return null } // not a URL we can judge: not Resend
  if (url.hostname.toLowerCase() !== 'api.resend.com') return null
  const method = (init?.method ?? (typeof input === 'object' && input && 'method' in input ? input.method : 'GET') ?? 'GET').toUpperCase()
  if (method === 'GET' || method === 'HEAD') return null
  if (!/^\/emails(\/batch)?\/?$/.test(url.pathname)) return `non-GET Resend call ${method} ${url.pathname}`
  const text = await bodyText(input, init)
  if (text === UNREADABLE) return 'email body in a form that cannot be inspected'
  let payload
  try { payload = JSON.parse(text) } catch { return 'email body is not valid JSON' }
  const mails = Array.isArray(payload) ? payload : [payload]
  const rcpts = mails.flatMap(m => [...list(m?.to), ...list(m?.cc), ...list(m?.bcc)])
  if (mails.length === 0 || rcpts.length === 0) return 'email without recipients'
  const bad = rcpts.filter(a => !allowed.has(a))
  return bad.length ? `non-test recipient(s): ${bad.map(mask).join(', ')}` : null
}

globalThis.fetch = async function claimsE2eFetch(input, init) {
  const reason = await checkResendRequest(input, init)
  if (reason) {
    console.warn(`[claims-e2e] BLOCKED Resend request — ${reason}`)
    return new Response(JSON.stringify({ statusCode: 422, name: 'validation_error', message: `Blocked by the claims E2E recipient allowlist (not sent): ${reason}` }), { status: 422, headers: { 'content-type': 'application/json' } })
  }
  return realFetch(input, init)
}
globalThis.__claimsE2eAllowlist = allowed.size
console.error(`[claims-e2e] recipient allowlist active (${allowed.size} inboxes) in pid ${process.pid}`)
