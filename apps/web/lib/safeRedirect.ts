// Only allow same-origin, relative redirect targets — blocks open redirects
// via `?redirect=`. Plain prefix checks aren't enough: browsers treat `\` like
// `/` and strip tabs/newlines, so `/\evil.com` or `/\t/evil.com` would pass a
// "starts with one slash" test yet navigate off-site. So: reject backslashes
// and control characters outright, then resolve the URL and require that it
// stays on our own origin.
const PROBE_ORIGIN = 'https://martial.invalid'

export function safeRedirect(path: string | null | undefined): string | undefined {
  if (!path) return undefined
  if (!path.startsWith('/') || path.startsWith('//')) return undefined
  // eslint-disable-next-line no-control-regex
  if (/[\\\u0000-\u001F\u007F]/.test(path)) return undefined
  let url: URL
  try {
    url = new URL(path, PROBE_ORIGIN)
  } catch {
    return undefined
  }
  if (url.origin !== PROBE_ORIGIN) return undefined
  return path
}
