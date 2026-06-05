'use client'

import { createContext, useContext, useState } from 'react'
import DashboardSidebar from './DashboardSidebar'

// ── Context ────────────────────────────────────────────────────────────────────
interface DashboardCtx {
  menuOpen: boolean
  setMenuOpen: (v: boolean) => void
}

const DashboardContext = createContext<DashboardCtx>({
  menuOpen: false,
  setMenuOpen: () => {},
})

export function useDashboard() {
  return useContext(DashboardContext)
}

// ── Shell ──────────────────────────────────────────────────────────────────────
export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <DashboardContext.Provider value={{ menuOpen, setMenuOpen }}>
      <div
        className="min-h-screen flex"
        style={{ background: '#F9FAFB', fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" }}
      >
        <DashboardSidebar menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

        {/* Main content — offset by sidebar width on desktop */}
        <div className="flex flex-1 min-w-0 md:ml-[232px]">
          {children}
        </div>
      </div>
    </DashboardContext.Provider>
  )
}
