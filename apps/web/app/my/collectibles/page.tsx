'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Award } from 'lucide-react'
import { useT } from '../../../lib/i18n/LanguageContext'
import { myFetch } from '../../../lib/api/myFetch'

interface Item {
  ownershipId: string
  unitId: string
  displayNumber: string
  status: string
  signed: boolean
  tierName: string
  primaryColor: string
  collectionName: string
  athleteName: string | null
  productName: string
  imageUrl: string | null
  acquiredAt: string
}

export default function MyCollectionPage() {
  const t = useT()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    myFetch('/api/my/collectibles')
      .then(r => r.json())
      .then(d => setItems(d.items ?? []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen pb-4" style={{ background: '#F2F2F7' }}>
      <div className="max-w-lg mx-auto px-4 pt-6">
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>{t.collections.myCollectionTitle}</h1>

        {loading && <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 24 }}>…</p>}

        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center" style={{ marginTop: 64 }}>
            <Award size={40} style={{ color: '#D1D5DB' }} />
            <p style={{ fontSize: 14, color: '#9CA3AF', marginTop: 12 }}>{t.collections.myCollectionEmpty}</p>
          </div>
        )}

        <div className="flex flex-col gap-3 mt-6">
          {items.map(item => (
            <Link key={item.ownershipId} href={`/my/collectibles/${item.unitId}`}
              className="flex items-center gap-4 p-4 rounded-2xl" style={{ background: '#fff', textDecoration: 'none' }}>
              <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#F3F4F6' }}>
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <Award size={20} style={{ color: item.primaryColor }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{item.collectionName}</p>
                <p style={{ fontSize: 12, color: '#9CA3AF' }}>{item.athleteName ?? item.productName} · {item.tierName}</p>
              </div>
              <span style={{ fontSize: 16, fontWeight: 800, color: item.primaryColor, fontVariantNumeric: 'tabular-nums' }}>{item.displayNumber}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
