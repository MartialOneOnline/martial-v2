// Heuristic detection for "in-app" WebViews (the V1 mobile app's wrapper,
// or similar) — these often can't open new windows, so google.accounts.id's
// button-click popup (window.open under the hood) silently does nothing.
// Android WebViews add a "wv" token right after the OS version; iOS
// WKWebView mimics Safari's UA but — unlike real Safari, and unlike Chrome/
// Firefox for iOS, which keep their own browser token — never appends the
// "Safari/" token unless the embedding app sets it explicitly.
export function isEmbeddedWebView(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/android/i.test(ua) && /; ?wv\)/i.test(ua)) return true
  if (/iphone|ipad|ipod/i.test(ua) && !/safari/i.test(ua)) return true
  return false
}
