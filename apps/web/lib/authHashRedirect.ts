// Decides where to send a request that lands on the homepage carrying a Supabase
// auth hash — happens when redirect_to isn't allow-listed in Supabase and it falls
// back to the Site URL instead of /auth/accept-invite. Kept as a standalone pure
// function so it can run inline (via .toString()) in <head>, before any JS bundle
// loads, and be unit-tested directly. Must stay serializable — no closures.
//
// Scoped to pathname === '/': this runs in the root layout, so it fires on every
// page load, not just the homepage. Pages that legitimately receive an auth hash
// (/auth/confirm, /auth/accept-invite, ...) already handle it themselves via
// onAuthStateChange — this heuristic must not override them. Without the pathname
// check, a page like /auth/confirm (type=magiclink, used for self-serve email
// confirmation — see app/api/auth/register/route.ts) gets wrongly redirected to
// /auth/set-password before its own logic ever runs.
export function resolveAuthHashRedirect(hash: string, pathname: string): string | null {
  if (pathname !== '/') return null
  if (hash.indexOf('access_token') !== -1 && (hash.indexOf('type=magiclink') !== -1 || hash.indexOf('type=invite') !== -1)) {
    return '/auth/set-password' + hash
  }
  if (hash.indexOf('access_token') !== -1 && hash.indexOf('type=recovery') !== -1) {
    return '/auth/reset-password' + hash
  }
  if (hash.indexOf('error=') !== -1 || hash.indexOf('error_code=') !== -1) {
    return '/login'
  }
  return null
}
