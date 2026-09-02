'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, Users as UsersIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import NotificationBell from '../../../components/NotificationBell'
import DashboardLanguageSelector from '../../../components/DashboardLanguageSelector'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { useT } from '../../../lib/i18n/LanguageContext'
import { matchesSearch } from '../../../lib/search'
import type { StudentListItem } from './data'

const ITEMS_PER_PAGE = 8

function getPaginationLabel(current: number, total: number, count: number) {
  return { from: (current - 1) * ITEMS_PER_PAGE + 1, to: Math.min(current * ITEMS_PER_PAGE, count) }
}

type FilterType = 'All' | 'Active' | 'Inactive' | 'Pending' | 'Invited' | 'Archived'
const STATUS_DISPLAY: Record<string, FilterType> = {
  ACTIVE: 'Active', INACTIVE: 'Inactive', PENDING: 'Pending', ARCHIVED: 'Archived', LEAD: 'Invited',
}
const FILTERS: FilterType[] = ['All', 'Active', 'Inactive', 'Pending', 'Invited', 'Archived']

export default function StudentListPanel({ students }: { students: StudentListItem[] }) {
  const t = useT()
  const router = useRouter()
  const pathname = usePathname()
  const selectedId = pathname.startsWith('/dashboard/users/') ? pathname.split('/dashboard/users/')[1] : null

  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('All')
  const [currentPage, setCurrentPage] = useState(1)

  // Parity with UsersClient: seed search from the dashboard's global-search
  // deep link (/dashboard/users?search=X) so it still works when the full
  // list page never mounts (desktop split view).
  const searchParams = useSearchParams()
  useEffect(() => {
    const q = searchParams.get('search')
    if (q) setSearch(q)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = students.filter(s => {
    const displayStatus = STATUS_DISPLAY[s.status] ?? s.status
    const matchStatusTab = activeFilter === 'All' || displayStatus === activeFilter
      || (activeFilter === 'Invited' && s.status === 'PENDING')
    const matchSearch = matchesSearch(s.name, search) || matchesSearch(s.email, search)
    return matchStatusTab && matchSearch
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)
  const { from, to } = getPaginationLabel(safePage, totalPages, filtered.length)

  return (
    <div className="flex flex-col" style={{ width: 340, flexShrink: 0, borderRight: '1px solid #E5E7EB', background: '#fff', height: '100vh', position: 'sticky', top: 0 }}>

      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6', flexShrink: 0 }}>
        <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <Search size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
            <input type="text" placeholder={t.users.searchPlaceholder} value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', width: '100%' }} />
          </div>
          <DashboardLanguageSelector />
          <NotificationBell />
        </div>
        <div className="flex items-center gap-1.5" style={{ overflowX: 'auto' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => { setActiveFilter(f); setCurrentPage(1) }}
              className="cursor-pointer"
              style={{ fontSize: 11, fontWeight: activeFilter === f ? 600 : 400, padding: '4px 9px', borderRadius: 999,
                whiteSpace: 'nowrap', border: '1px solid ' + (activeFilter === f ? '#111827' : '#E5E7EB'),
                background: activeFilter === f ? '#111827' : '#fff', color: activeFilter === f ? '#fff' : '#6B7280' }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {paginated.length === 0 ? (
          <div className="flex flex-col items-center" style={{ padding: '40px 16px', gap: 8 }}>
            <UsersIcon size={24} style={{ color: '#E5E7EB' }} />
            <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0, textAlign: 'center' }}>{t.users.noStudents}</p>
          </div>
        ) : paginated.map(s => {
          const isSelected = s.id === selectedId
          return (
            <button key={s.id} onClick={() => router.push('/dashboard/users/' + s.id)}
              className="w-full flex items-center gap-2.5 cursor-pointer text-left"
              style={{ padding: '10px 16px', border: 'none', borderBottom: '1px solid #F9FAFB',
                background: isSelected ? '#EFF6FF' : 'transparent' }}>
              {s.avatarUrl ? (
                <img src={s.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{s.name.charAt(0).toUpperCase()}</span>
                </div>
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: isSelected ? 700 : 600, color: '#111827', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</p>
                <p style={{ fontSize: 11, color: '#9CA3AF', margin: '1px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.email}</p>
              </div>
              <StatusBadge status={s.status} size="sm" showDot={false} />
            </button>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between" style={{ padding: '10px 16px', borderTop: '1px solid #F3F4F6', flexShrink: 0 }}>
          <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
            {from}–{to} {t.common.of} {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6,
                border: '1px solid #E5E7EB', background: '#fff', color: safePage === 1 ? '#D1D5DB' : '#374151',
                cursor: safePage === 1 ? 'not-allowed' : 'pointer' }}>
              <ChevronLeft size={13} />
            </button>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6,
                border: '1px solid #E5E7EB', background: '#fff', color: safePage === totalPages ? '#D1D5DB' : '#374151',
                cursor: safePage === totalPages ? 'not-allowed' : 'pointer' }}>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
