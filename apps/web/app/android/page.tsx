import type { Metadata } from 'next'

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.martial.app'

export const metadata: Metadata = {
  title: 'Martial on Google Play',
  description: 'Find schools, book classes, manage your academy — download Martial for Android.',
  openGraph: {
    title: 'Martial on Google Play',
    description: 'Find schools, book classes, manage your academy — download Martial for Android.',
    images: ['/martial-logo.png'],
    url: 'https://martialapp.com/android',
  },
  twitter: {
    card: 'summary',
    title: 'Martial on Google Play',
    description: 'Find schools, book classes, manage your academy — download Martial for Android.',
    images: ['/martial-logo.png'],
  },
}

// Google Play blocks link-preview crawlers (WhatsApp, iMessage, etc.) from
// reading its own og:tags, even though the page serves them fine to a plain
// fetch — see the debugging session that found this. This page exists purely
// so those crawlers have a martialapp.com URL to scrape instead, with a
// client-side redirect for real visitors. Deliberately not a server redirect
// (next/navigation's redirect()) — that would send crawlers straight to the
// blocked Play Store URL before they ever see these og:tags.
export default function AndroidRedirectPage() {
  return (
    <>
      <meta httpEquiv="refresh" content={`0; url=${PLAY_STORE_URL}`} />
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        fontFamily: 'system-ui, sans-serif',
        background: '#F5F7FA',
      }}>
        <img src="/martial-logo.png" alt="Martial" width={96} height={96} style={{ borderRadius: 20 }} />
        <p style={{ color: '#444', fontSize: 16 }}>Taking you to Google Play…</p>
        <a href={PLAY_STORE_URL} style={{ color: '#0870E2', fontSize: 16 }}>
          Tap here if you&apos;re not redirected
        </a>
      </div>
      <script dangerouslySetInnerHTML={{ __html: `window.location.replace(${JSON.stringify(PLAY_STORE_URL)});` }} />
    </>
  )
}
