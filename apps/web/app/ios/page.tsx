import type { Metadata } from 'next'

const APP_STORE_URL = 'https://apps.apple.com/app/id6443845277'

export const metadata: Metadata = {
  title: 'Martial on the App Store',
  description: 'Find schools, book classes, manage your academy — download Martial for iOS.',
  openGraph: {
    title: 'Martial on the App Store',
    description: 'Find schools, book classes, manage your academy — download Martial for iOS.',
    images: ['/martial-logo.png'],
    url: 'https://martialapp.com/ios',
  },
  twitter: {
    card: 'summary',
    title: 'Martial on the App Store',
    description: 'Find schools, book classes, manage your academy — download Martial for iOS.',
    images: ['/martial-logo.png'],
  },
}

// Same reasoning as app/android/page.tsx — store link-preview crawlers don't
// reliably read og:tags directly off apps.apple.com either, so this page
// gives them a martialapp.com URL to scrape, then bounces real visitors on
// with a client-side redirect. Not a server redirect() — that would send
// crawlers straight past these og:tags before they ever read them.
export default function IosRedirectPage() {
  return (
    <>
      <meta httpEquiv="refresh" content={`0; url=${APP_STORE_URL}`} />
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
        <p style={{ color: '#444', fontSize: 16 }}>Taking you to the App Store…</p>
        <a href={APP_STORE_URL} style={{ color: '#0870E2', fontSize: 16 }}>
          Tap here if you&apos;re not redirected
        </a>
      </div>
      <script dangerouslySetInnerHTML={{ __html: `window.location.replace(${JSON.stringify(APP_STORE_URL)});` }} />
    </>
  )
}
