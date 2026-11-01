'use client'

import Link from 'next/link'
import { Award, Menu, WifiOff } from 'lucide-react'
import { useState } from 'react'
import { useDashboard, useGradingEnabled, useSchoolContextFailure } from '../DashboardShell'
import { useT } from '../../lib/i18n/LanguageContext'

/** "Belts & gradings is off" — explains it and links to where it's turned on */
export function GradingOffCard({ action }: { action: React.ReactNode }) {
  const gm = useT().gradingModule
  return (
    <div className="flex flex-col items-start gap-3" style={{ maxWidth: 480, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 24 }}>
      <div className="flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 12, background: '#F3F4F6' }}>
        <Award size={18} style={{ color: '#6B7280' }} aria-hidden />
      </div>
      <div>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>{gm.offTitle}</p>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>{gm.offBody}</p>
      </div>
      {action}
    </div>
  )
}

/** The school context couldn't load, so we don't know if belts are on — say so and retry */
export function GradingLoadError() {
  const gm = useT().gradingModule
  const { retry } = useSchoolContextFailure()
  const [retrying, setRetrying] = useState(false)
  async function onRetry() {
    setRetrying(true)
    try { await retry() } finally { setRetrying(false) }
  }
  return (
    <div role="alert" className="flex flex-col items-start gap-3" style={{ maxWidth: 480, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 24 }}>
      <div className="flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 12, background: '#FEF2F2' }}>
        <WifiOff size={18} style={{ color: '#B91C1C' }} aria-hidden />
      </div>
      <div>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>{gm.loadFailedTitle}</p>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>{gm.loadFailedBody}</p>
      </div>
      <button onClick={onRetry} disabled={retrying} style={{ ...offActionStyle, cursor: retrying ? 'default' : 'pointer', opacity: retrying ? 0.6 : 1 }}>
        {retrying ? '…' : gm.syncRetry}
      </button>
    </div>
  )
}

export const offActionStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 999, border: '1px solid #E5E7EB', background: '#fff',
  color: '#111827', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none',
}

/**
 * Wraps a whole grading page (report, gradings list). With the module off —
 * e.g. an old bookmark — it shows why there's nothing here instead of an
 * empty page; while the school context loads it shows nothing, and if that
 * load fails it shows an error with a retry.
 */
export default function GradingModuleGate({ children }: { children: React.ReactNode }) {
  const enabled = useGradingEnabled()
  const { failed } = useSchoolContextFailure()
  const { menuOpen, setMenuOpen } = useDashboard()
  const gm = useT().gradingModule
  if (enabled) return <>{children}</>
  return (
    <main style={{ flex: 1, minWidth: 0 }}>
      <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20 md:hidden"
        style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
        <button className="flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0" aria-label="Menu"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(!menuOpen)}>
          <Menu size={16} style={{ color: '#374151' }} />
        </button>
      </div>
      {enabled === null && failed && (
        <div className="px-4 md:px-8 py-8"><GradingLoadError /></div>
      )}
      {enabled === false && (
        <div className="px-4 md:px-8 py-8">
          <GradingOffCard action={<Link href="/dashboard/settings?tab=modules" style={offActionStyle}>{gm.offAction}</Link>} />
        </div>
      )}
    </main>
  )
}
