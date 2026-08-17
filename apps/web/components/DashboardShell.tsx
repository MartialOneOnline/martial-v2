'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import DashboardSidebar from './DashboardSidebar'

const SIDEBAR_COLLAPSED_KEY = 'dashboard-sidebar-collapsed'

// ── Context ────────────────────────────────────────────────────────────────────
interface DashboardCtx {
  menuOpen: boolean
  setMenuOpen: (v: boolean) => void
  collapsed: boolean
  setCollapsed: (v: boolean) => void
}

const DashboardContext = createContext<DashboardCtx>({
  menuOpen: false,
  setMenuOpen: () => {},
  collapsed: false,
  setCollapsed: () => {},
})

export function useDashboard() {
  return useContext(DashboardContext)
}

// ── Shell ──────────────────────────────────────────────────────────────────────
export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [collapsed, setCollapsedState] = useState(false)

  useEffect(() => {
    setCollapsedState(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1')
  }, [])

  const setCollapsed = (v: boolean) => {
    setCollapsedState(v)
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, v ? '1' : '0')
  }

  return (
    <DashboardContext.Provider value={{ menuOpen, setMenuOpen, collapsed, setCollapsed }}>
      <div
        className="min-h-screen flex"
        style={{
          background: '#F9FAFB',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
          ['--sidebar-width' as string]: collapsed ? '72px' : '232px',
        }}
      >
        <style>{`@media (min-width: 768px) { .dashboard-content { margin-left: var(--sidebar-width); transition: margin-left 0.2s ease; } }`}</style>

        <DashboardSidebar menuOpen={menuOpen} setMenuOpen={setMenuOpen} collapsed={collapsed} setCollapsed={setCollapsed} />

        {/* Main content — offset by sidebar width on desktop/tablet */}
        <div className="dashboard-content flex flex-1 min-w-0">
          {children}
        </div>
      </div>
    </DashboardContext.Provider>
  )
}
