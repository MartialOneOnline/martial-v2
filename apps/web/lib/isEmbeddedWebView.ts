// Heuristic detection for "in-app" WebViews (the V1 mobile app's wrapper,
// or similar) — these often can't open new windows, so google.accounts.id's
// button-click popup (window.open under the hood) silently does nothing.
export function isEmbeddedWebView(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent

  // Modern Android WebViews tag themselves with a "wv" token right after
  // the OS version.
  if (/android/i.test(ua) && /; ?wv\)/i.test(ua)) return true

  // iOS WKWebView mimics Safari's UA but sometimes — unlike real Safari,
  // and unlike Chrome/Firefox for iOS, which keep their own browser token —
  // omits the trailing "Safari/" token unless the embedding app sets it
  // explicitly. Not fully reliable on its own (kept as a secondary signal).
  if (/iphone|ipad|ipod/i.test(ua) && !/safari/i.test(ua)) return true

  // Frozen/very old Chrome version: real browsers auto-update, so a UA
  // reporting a release this old can only be a static, never-updated
  // embedded WebView, not an actual visitor. Confirmed live 2026-08-16: the
  // V1 app's WebView hardcodes "Chrome/62.0.3202.94" (a 2017 release) on a
  // "Nexus 5" (discontinued 2015) — it lacks the "wv" token above, so this
  // catch-all is what actually flags it.
  const chromeVersion = ua.match(/Chrome\/(\d+)/)
  if (chromeVersion && Number(chromeVersion[1]) < 90) return true

  return false
}
