// Only allow same-origin, relative redirect targets — blocks open redirects
// via `?redirect=` (e.g. `//evil.com` or `https://evil.com` would otherwise
// be handed straight to router.push()).
export function safeRedirect(path: string | null | undefined): string | undefined {
  if (!path) return undefined
  if (!path.startsWith('/') || path.startsWith('//')) return undefined
  return path
}
