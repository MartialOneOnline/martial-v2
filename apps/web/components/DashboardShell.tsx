'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import DashboardSidebar from './DashboardSidebar'
import { useSchoolContext } from '../lib/auth/useSchoolContext'
import { resolveGradingEnabled, gradingFromSchoolContext } from '../lib/school-modules'

const SIDEBAR_COLLAPSED_KEY = 'dashboard-sidebar-collapsed'

// ── Context ────────────────────────────────────────────────────────────────────
type SchoolCtx = ReturnType<typeof useSchoolContext>

interface DashboardCtx {
  menuOpen: boolean
  setMenuOpen: (v: boolean) => void
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  /** The signed-in user's school context, fetched once for the whole dashboard */
  school: SchoolCtx | null
}

const DashboardContext = createContext<DashboardCtx>({
  menuOpen: false,
  setMenuOpen: () => {},
  collapsed: false,
  setCollapsed: () => {},
  school: null,
})

export function useDashboard() {
  return useContext(DashboardContext)
}

/**
 * Belts & gradings module for the current school: true / false, or null while
 * it's still loading — callers render nothing then, so a school without belts
 * never sees them flash in, and one with belts doesn't see them flash out.
 */
export function useGradingEnabled(): boolean | null {
  const fromServer = useContext(GradingEnabledContext)
  const { school } = useContext(DashboardContext)
  return resolveGradingEnabled(gradingFromSchoolContext(school), fromServer)
}

// A page that already knows the answer from the server (Users, Users report)
// wraps itself in this, so its table and exports never see the loading state.
// Only a starting value: once the shared context loads it takes over.
const GradingEnabledContext = createContext<boolean | null>(null)

export function GradingEnabledProvider({ value, children }: { value: boolean | null | undefined; children: React.ReactNode }) {
  return <GradingEnabledContext.Provider value={value ?? null}>{children}</GradingEnabledContext.Provider>
}

// ── Shell ──────────────────────────────────────────────────────────────────────
export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [collapsed, setCollapsedState] = useState(false)
  const school = useSchoolContext()

  useEffect(() => {
    setCollapsedState(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1')
  }, [])

  const setCollapsed = (v: boolean) => {
    setCollapsedState(v)
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, v ? '1' : '0')
  }

  return (
    <DashboardContext.Provider value={{ menuOpen, setMenuOpen, collapsed, setCollapsed, school }}>
      <div
        className="min-h-screen flex"
        style={{
          background: '#F9FAFB',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
          ['--sidebar-width' as string]: collapsed ? '72px' : '232px',
        }}
      >
        <style>{`@media (min-width: 768px) { .dashboard-content { margin-left: var(--sidebar-width); transition: margin-left 0.2s ease; } }`}</style>

        <DashboardSidebar menuOpen={menuOpen} setMenuOpen={setMenuOpen} collapsed={collapsed} setCollapsed={setCollapsed} school={school} />

        {/* Main content — offset by sidebar width on desktop/tablet */}
        <div className="dashboard-content flex flex-1 min-w-0">
          {children}
        </div>
      </div>
    </DashboardContext.Provider>
  )
}
