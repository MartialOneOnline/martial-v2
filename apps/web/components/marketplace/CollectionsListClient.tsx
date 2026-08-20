'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Star } from 'lucide-react'
import { adminFetch } from '@/lib/api/adminFetch'
import { useT } from '@/lib/i18n/LanguageContext'

interface CollectionRow {
  id: string
  name: string
  slug: string
  status: string
  totalUnits: number
  _count: { units: number }
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  DRAFT: { bg: '#F3F4F6', color: '#6B7280' },
  SCHEDULED: { bg: '#EFF6FF', color: '#0071E3' },
  LIVE: { bg: '#F0FDF4', color: '#16A34A' },
  SOLD_OUT: { bg: '#FFFBEB', color: '#D97706' },
  ENDED: { bg: '#F3F4F6', color: '#6B7280' },
  ARCHIVED: { bg: '#FEF2F2', color: '#DC2626' },
}

export default function CollectionsListClient({ apiBase, itemHref, backHref }: { apiBase: string; itemHref: (id: string) => string; backHref: string }) {
  const t = useT()
  const [collections, setCollections] = useState<CollectionRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const res = await adminFetch(`${apiBase}/collections`)
    if (res.ok) { const data = await res.json(); setCollections(data.collections ?? []) }
    setLoading(false)
  }, [apiBase])

  useEffect(() => { load() }, [load])

  return (
    <main style={{ flex: 1, minWidth: 0, width: '100%', overflow: 'auto' }}>
      <div className="px-4 md:px-8 py-6 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Link href={backHref} className="w-9 h-9 flex items-center justify-center rounded-xl" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}><ArrowLeft size={16} /></Link>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{t.collections.collectionsTitle}</h1>
            <p style={{ fontSize: 13, color: '#9CA3AF' }}>{t.collections.collectionsSubtitle}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map(c => {
            const sc = STATUS_COLORS[c.status] ?? STATUS_COLORS.DRAFT!
            return (
              <Link key={c.id} href={itemHref(c.id)} className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: '#fff', border: '1px solid #E5E7EB', textDecoration: 'none', color: 'inherit' }}>
                <div className="flex items-center justify-between">
                  <Star size={18} style={{ color: '#D97706' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: sc.bg, color: sc.color }}>{c.status}</span>
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{c.name}</p>
                <p style={{ fontSize: 12, color: '#9CA3AF' }}>{c._count.units}/{c.totalUnits} units generated</p>
              </Link>
            )
          })}
          {!loading && collections.length === 0 && (
            <p style={{ fontSize: 13, color: '#9CA3AF', gridColumn: '1/-1', textAlign: 'center', padding: 32 }}>{t.collections.noCollections}</p>
          )}
        </div>
      </div>
    </main>
  )
}
