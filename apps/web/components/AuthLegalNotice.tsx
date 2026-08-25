'use client'

import { useT } from '@/lib/i18n/LanguageContext'

const MUTED = '#6B7280'
const NAVY = '#0E3A7A'

function renderLine(template: string, terms: string, privacy: string) {
  const parts = template.split(/(\{terms\}|\{privacy\})/g)
  return parts.map((part, i) => {
    if (part === '{terms}') {
      return <a key={i} href="/legal/terms" target="_blank" rel="noopener noreferrer" style={{ color: NAVY, fontWeight: 600, textDecoration: 'underline', whiteSpace: 'nowrap' }}>{terms}</a>
    }
    if (part === '{privacy}') {
      return <a key={i} href="/legal/privacy" target="_blank" rel="noopener noreferrer" style={{ color: NAVY, fontWeight: 600, textDecoration: 'underline', whiteSpace: 'nowrap' }}>{privacy}</a>
    }
    return <span key={i}>{part}</span>
  })
}

// Airbnb/Amazon-style consent notice shown next to auth CTAs (social login,
// "Continue with email", final submit) — signing up or logging in implies
// acceptance of /legal/terms and /legal/privacy, which otherwise have no
// explicit checkbox in these flows. Rendered as two fixed lines (not one
// flowing paragraph) so the browser can't wrap mid-sentence and orphan
// "Policy." alone on its own line.
export function AuthLegalNotice({ style }: { style?: React.CSSProperties }) {
  const t = useT()
  const { noticeLine1, noticeLine2, terms, privacy } = t.authLegal

  return (
    <p style={{ margin: '16px 0 0', fontSize: 12, color: MUTED, textAlign: 'center', lineHeight: 1.6, ...style }}>
      {renderLine(noticeLine1, terms, privacy)}
      <br />
      {renderLine(noticeLine2, terms, privacy)}
    </p>
  )
}
