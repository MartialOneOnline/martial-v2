// Decides where to send a request that lands on the homepage carrying a Supabase
// auth hash — happens when redirect_to isn't allow-listed in Supabase and it falls
// back to the Site URL instead of /auth/accept-invite. Kept as a standalone pure
// function so it can run inline (via .toString()) in <head>, before any JS bundle
// loads, and be unit-tested directly. Must stay serializable — no closures.
export function resolveAuthHashRedirect(hash: string): string | null {
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
