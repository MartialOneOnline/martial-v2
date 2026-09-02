'use client'

import { useLayoutEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Users as UsersIcon } from 'lucide-react'
import { useT } from '../../../lib/i18n/LanguageContext'
import NotificationBell from '../../../components/NotificationBell'
import DashboardLanguageSelector from '../../../components/DashboardLanguageSelector'
import StudentListPanel from './StudentListPanel'
import type { StudentListItem } from './data'

// Desktop split view needs enough room for sidebar + a ~340px list column +
// a usable detail column at once — see the plan doc for the width math.
const DESKTOP_SPLIT_MIN_WIDTH = 1280

function useIsDesktopSplit() {
  const [isDesktop, setIsDesktop] = useState(false) // SSR/first-paint default: mobile layout
  useLayoutEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DESKTOP_SPLIT_MIN_WIDTH}px)`)
    setIsDesktop(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isDesktop
}

// Mirrors StudentProfileClient's own topbar (sticky, same padding/border) so
// the bell + language selector sit in the same spot whether or not a student
// is currently selected — this is the one and only copy of those controls
// for the whole right column, desktop split view only.
function EmptyDetailState() {
  const t = useT()
  return (
    <>
      <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20"
        style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
        <div className="flex-1" />
        <DashboardLanguageSelector />
        <NotificationBell />
      </div>
      <div className="flex flex-col items-center justify-center" style={{ gap: 10, padding: 24, textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <UsersIcon size={22} style={{ color: '#9CA3AF' }} />
        </div>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>{t.users.selectStudentTitle}</p>
        <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0, maxWidth: 280 }}>{t.users.selectStudentBody}</p>
      </div>
    </>
  )
}

export default function UsersSplitShell({
  listStudents, children,
}: {
  listStudents: StudentListItem[] | null
  children: React.ReactNode
}) {
  const isDesktop = useIsDesktopSplit()
  const pathname = usePathname()
  const isListRoute = pathname === '/dashboard/users'

  if (listStudents === null || !isDesktop) {
    // Mobile, or desktop without list-view permission (e.g. an INSTRUCTOR
    // direct-linking a profile) — exactly today's full-width behavior.
    // {children} is referenced here and nowhere else in this render path.
    return <>{children}</>
  }

  // Desktop split view. {children} is referenced here and nowhere else in
  // this render path (never both branches at once — see plan doc Context
  // for why that matters: StudentProfileClient owns real component state).
  const detail = isListRoute ? <EmptyDetailState /> : children

  return (
    <div className="flex flex-1 min-w-0">
      <StudentListPanel students={listStudents} />
      <div className="flex-1 min-w-0">{detail}</div>
    </div>
  )
}
