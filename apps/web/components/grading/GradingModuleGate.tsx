'use client'

import Link from 'next/link'
import { Award, Menu } from 'lucide-react'
import { useDashboard, useGradingEnabled } from '../DashboardShell'
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

export const offActionStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 999, border: '1px solid #E5E7EB', background: '#fff',
  color: '#111827', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none',
}

/**
 * Wraps a whole grading page (report, gradings list). With the module off —
 * e.g. an old bookmark — it shows why there's nothing here instead of an
 * empty page; while the school context loads it shows nothing.
 */
export default function GradingModuleGate({ children }: { children: React.ReactNode }) {
  const enabled = useGradingEnabled()
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
      {enabled === false && (
        <div className="px-4 md:px-8 py-8">
          <GradingOffCard action={<Link href="/dashboard/settings?tab=modules" style={offActionStyle}>{gm.offAction}</Link>} />
        </div>
      )}
    </main>
  )
}
