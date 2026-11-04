'use client'

import type { Translations } from '@/lib/i18n/translations'

// Shared fallback for app/error.tsx and app/global-error.tsx. Without these,
// any server/render error showed Next's bare "Application error" text with no
// way out — users just saw "the app won't load". This gives a retry (which
// re-renders the failed segment) plus a hard reload fallback.
export function AppErrorScreen({ t, onRetry }: { t: Translations['appErrors']; onRetry: () => void }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: '#F9FAFB', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 380, width: '100%', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 28, textAlign: 'center' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#101828' }}>{t.pageTitle}</h1>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: '#6B7280', lineHeight: 1.5 }}>{t.pageBody}</p>
        <button
          type="button"
          onClick={onRetry}
          style={{ width: '100%', height: 48, border: 'none', borderRadius: 999, background: '#0870E2', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          {t.retry}
        </button>
        {/* Plain <a>: a full reload still works when the client router is what broke. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" style={{ display: 'inline-block', marginTop: 16, fontSize: 14, color: '#6B7280' }}>{t.home}</a>
      </div>
    </div>
  )
}
