'use client'

import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, Users as UsersIcon } from 'lucide-react'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { useLanguage } from '../../../lib/i18n/LanguageContext'
import { matchesSearch } from '../../../lib/search'
import { alphabetFor, groupAlphabetically, groupByMonth, type Section } from '../../../lib/alphaIndex'
import { createListScrollController } from '../../../lib/listScrollIntent'
import type { StudentListItem } from './data'

// One continuous list (no pages): every student is already loaded client-side.
// Below this many results the A–Z rail adds nothing, so it's hidden.
const RAIL_MIN_RESULTS = 20
const SORT_STORAGE_KEY = 'martial_users_list_sort'

type SortMode = 'az' | 'recent'

type FilterType = 'All' | 'Active' | 'Inactive' | 'Pending' | 'Invited' | 'Archived'
const STATUS_DISPLAY: Record<string, FilterType> = {
  ACTIVE: 'Active', INACTIVE: 'Inactive', PENDING: 'Pending', ARCHIVED: 'Archived', LEAD: 'Invited',
}
const FILTERS: FilterType[] = ['All', 'Active', 'Inactive', 'Pending', 'Invited', 'Archived']

export default function StudentListPanel({ students }: { students: StudentListItem[] }) {
  const { t, locale } = useLanguage()
  const router = useRouter()
  const pathname = usePathname()
  const selectedId = pathname.startsWith('/dashboard/users/') ? pathname.split('/dashboard/users/')[1] : null

  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('All')
  const [sort, setSort] = useState<SortMode>('az')
  const [currentKey, setCurrentKey] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  // Where the list scrolls after the next render (top vs. selected row).
  const scrollRef = useRef(createListScrollController())
  const [, setReady] = useState(false)

  // Parity with UsersClient: seed search from the dashboard's global-search
  // deep link (/dashboard/users?search=X) so it still works when the full
  // list page never mounts (desktop split view).
  const searchParams = useSearchParams()
  useEffect(() => {
    const q = searchParams.get('search')
    if (q) setSearch(q)
    try {
      const saved = localStorage.getItem(SORT_STORAGE_KEY)
      if (saved === 'az' || saved === 'recent') setSort(saved)
    } catch { /* storage blocked: keep the default */ }
    // The URL search and saved order are in: a deep-linked student can be
    // revealed in the list they will actually see.
    scrollRef.current.markReady()
    setReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => students.filter(s => {
    const displayStatus = STATUS_DISPLAY[s.status] ?? s.status
    const matchStatusTab = activeFilter === 'All' || displayStatus === activeFilter
      || (activeFilter === 'Invited' && s.status === 'PENDING')
    const matchSearch = matchesSearch(s.name, search) || matchesSearch(s.email, search)
    return matchStatusTab && matchSearch
  }), [students, activeFilter, search])

  const sections: Section<StudentListItem>[] = useMemo(
    () => (sort === 'az' ? groupAlphabetically(filtered, locale) : groupByMonth(filtered, locale)),
    [filtered, sort, locale],
  )
  const showRail = sort === 'az' && filtered.length >= RAIL_MIN_RESULTS
  const presentKeys = useMemo(() => new Set(sections.map(s => s.key)), [sections])

  // Apply the pending scroll once the new list is on screen. Explicit filter,
  // search and order changes request 'top' in their handlers; opening a
  // student (deep link, global search, another row) requests 'reveal' here —
  // a row clicked in this list is already visible, so that's a no-op.
  const lastSelectedRef = useRef(selectedId)
  useLayoutEffect(() => {
    if (selectedId !== lastSelectedRef.current) {
      lastSelectedRef.current = selectedId
      scrollRef.current.request('reveal')
    }
    const intent = scrollRef.current.consume()
    const list = listRef.current
    if (!intent || !list) return
    if (intent === 'top') { list.scrollTop = 0; return }
    if (!selectedId) return
    const row = list.querySelector<HTMLElement>(`[data-student-id="${CSS.escape(selectedId)}"]`)
    row?.scrollIntoView({ block: 'nearest' })
  })

  // Which section the top of the list is in — highlighted on the rail.
  const updateCurrentKey = useCallback(() => {
    const list = listRef.current
    if (!list) return
    let key: string | null = null
    for (const el of list.querySelectorAll<HTMLElement>('[data-section-key]')) {
      if (el.offsetTop <= list.scrollTop + 4) key = el.dataset.sectionKey ?? null
      else break
    }
    setCurrentKey(key ?? sections[0]?.key ?? null)
  }, [sections])
  useEffect(() => { updateCurrentKey() }, [updateCurrentKey])

  const jumpTo = (key: string) => {
    const list = listRef.current
    const el = list?.querySelector<HTMLElement>(`[data-section-key="${CSS.escape(key)}"]`)
    if (list && el) list.scrollTop = el.offsetTop
  }

  const changeSearch = (next: string) => {
    scrollRef.current.request('top')
    setSearch(next)
  }

  const changeFilter = (next: FilterType) => {
    scrollRef.current.request('top')
    setActiveFilter(next)
  }

  const changeSort = (next: SortMode) => {
    scrollRef.current.request('top')
    setSort(next)
    try { localStorage.setItem(SORT_STORAGE_KEY, next) } catch { /* ignore */ }
  }

  const sortBtn = (mode: SortMode, label: string) => (
    <button key={mode} type="button" onClick={() => changeSort(mode)} aria-pressed={sort === mode}
      className="cursor-pointer"
      style={{ border: 'none', fontSize: 11, padding: '3px 9px', borderRadius: 6,
        background: sort === mode ? '#fff' : 'transparent', color: sort === mode ? '#111827' : '#6B7280',
        fontWeight: sort === mode ? 600 : 400, boxShadow: sort === mode ? '0 1px 2px rgba(17,24,39,0.08)' : 'none' }}>
      {label}
    </button>
  )

  return (
    <div className="flex flex-col" style={{ width: 340, flexShrink: 0, borderRight: '1px solid #E5E7EB', background: '#fff', height: '100vh', position: 'sticky', top: 0 }}>

      {/* Header */}
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #F3F4F6', flexShrink: 0 }}>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', marginBottom: 10 }}>
          <Search size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
          <input type="text" placeholder={t.users.searchPlaceholder} value={search}
            onChange={e => changeSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', width: '100%' }} />
        </div>
        <div className="flex items-center gap-1.5" style={{ overflowX: 'auto' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => changeFilter(f)}
              className="cursor-pointer"
              style={{ fontSize: 11, fontWeight: activeFilter === f ? 600 : 400, padding: '4px 9px', borderRadius: 999,
                whiteSpace: 'nowrap', border: '1px solid ' + (activeFilter === f ? '#111827' : '#E5E7EB'),
                background: activeFilter === f ? '#111827' : '#fff', color: activeFilter === f ? '#fff' : '#6B7280' }}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between" style={{ marginTop: 10, gap: 8 }}>
          <p style={{ fontSize: 12, color: '#6B7280', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ fontWeight: 600, color: '#111827' }}>{filtered.length}</span>{' '}
            {filtered.length === 1 ? t.users.student : t.users.students}
          </p>
          <div role="group" aria-label={t.users.sortLabel} className="inline-flex"
            style={{ background: '#F3F4F6', borderRadius: 8, padding: 2 }}>
            {sortBtn('az', t.users.sortAz)}
            {sortBtn('recent', t.users.sortRecent)}
          </div>
        </div>
      </div>

      {/* Rows */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex' }}>
        <div ref={listRef} onScroll={showRail ? updateCurrentKey : undefined}
          style={{ position: 'relative', flex: 1, minWidth: 0, overflowY: 'auto', paddingRight: showRail ? 18 : 0 }}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center" style={{ padding: '40px 16px', gap: 8 }}>
              <UsersIcon size={24} style={{ color: '#E5E7EB' }} />
              <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0, textAlign: 'center' }}>{t.users.noStudents}</p>
            </div>
          ) : sections.map(section => (
            <div key={section.key} data-section-key={section.key}>
              <div style={{ position: 'sticky', top: 0, zIndex: 1, background: 'rgba(249,250,251,0.96)', backdropFilter: 'blur(4px)',
                fontSize: 11, fontWeight: 700, color: '#6B7280', letterSpacing: '0.06em', padding: '5px 16px', borderBottom: '1px solid #F3F4F6' }}>
                {section.label}
              </div>
              {section.items.map(s => {
                const isSelected = s.id === selectedId
                return (
                  <button key={s.id} data-student-id={s.id} onClick={() => router.push('/dashboard/users/' + s.id)}
                    className="w-full flex items-center gap-2.5 cursor-pointer text-left"
                    style={{ padding: '10px 16px', border: 'none', borderBottom: '1px solid #F9FAFB',
                      background: isSelected ? '#EFF6FF' : 'transparent' }}>
                    {s.avatarUrl ? (
                      <img src={s.avatarUrl} alt="" loading="lazy" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
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
          ))}
        </div>

        {/* A–Z rail */}
        {showRail && (
          <nav aria-label={t.users.alphaIndex}
            style={{ position: 'absolute', right: 2, top: 6, bottom: 6, width: 16, zIndex: 2,
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center' }}>
            {alphabetFor(locale).map(letter => {
              const present = presentKeys.has(letter)
              const current = letter === currentKey
              return (
                <button key={letter} type="button" disabled={!present} onClick={() => jumpTo(letter)}
                  aria-label={t.users.jumpToLetter.replace('{l}', letter)}
                  className={present ? 'cursor-pointer' : undefined}
                  style={{ flex: 1, maxHeight: 22, width: 16, padding: 0, border: 'none', borderRadius: 4, lineHeight: 1,
                    fontSize: 9.5, fontWeight: 600,
                    background: current ? '#0870E2' : 'transparent',
                    color: current ? '#fff' : present ? '#0870E2' : '#D1D5DB' }}>
                  {letter}
                </button>
              )
            })}
          </nav>
        )}
      </div>
    </div>
  )
}
