'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Copy } from 'lucide-react'
import { useT } from '../../../../lib/i18n/LanguageContext'
import { myFetch } from '../../../../lib/api/myFetch'
import DigitalCard from '@/components/collectibles/DigitalCard'

interface UnitDetail {
  id: string
  editionNumber: number
  displayNumber: string
  size: string | null
  status: string
  signed: boolean
  signedAt: string | null
  signedLocation: string | null
  videoUrl: string | null
  certificateUrl: string | null
  publicVerificationCode: string
  tier: { name: string; primaryColor: string; secondaryColor: string }
  collection: { name: string; athleteName: string | null; brandName: string | null; collectionYear: number; story: string | null; authenticationStatement: string | null }
  product: { name: string; imageUrl: string | null }
  order: { id: string; status: string; total: number; currency: string; createdAt: string } | null
  ownership: { ownerDisplayName: string | null; showOwnerPublicly: boolean; acquiredAt: string } | null
  isOwner: boolean
}

export default function MyCollectibleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = useT()
  const [unit, setUnit] = useState<UnitDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPublicly, setShowPublicly] = useState(false)
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    myFetch(`/api/my/collectibles/${id}`)
      .then(r => r.json())
      .then(d => {
        setUnit(d)
        setShowPublicly(d.ownership?.showOwnerPublicly ?? false)
        setDisplayName(d.ownership?.ownerDisplayName ?? '')
      })
      .finally(() => setLoading(false))
  }, [id])

  async function savePrivacy() {
    await myFetch(`/api/my/collectibles/${id}/privacy`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ showOwnerPublicly: showPublicly, ownerDisplayName: displayName }),
    })
  }

  if (loading) return <div className="min-h-screen" style={{ background: '#F2F2F7' }} />
  if (!unit) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#F2F2F7' }}><p>Not found</p></div>

  const verificationUrl = typeof window !== 'undefined' ? `${window.location.origin}/collectibles/verify/${unit.publicVerificationCode}` : ''

  return (
    <div className="min-h-screen pb-10" style={{ background: '#0A0A0A' }}>
      <div className="max-w-lg mx-auto px-4 pt-6">
        <Link href="/my/collectibles" className="inline-flex items-center gap-2" style={{ color: '#9CA3AF', fontSize: 13, textDecoration: 'none' }}>
          <ArrowLeft size={14} />{t.collections.myCollectionTitle}
        </Link>

        <div className="flex justify-center mt-6">
          <DigitalCard data={{
            productName: unit.product.name,
            productImageUrl: unit.product.imageUrl,
            athleteName: unit.collection.athleteName,
            brandName: unit.collection.brandName,
            collectionName: unit.collection.name,
            collectionYear: unit.collection.collectionYear,
            displayNumber: unit.displayNumber,
            tierName: unit.tier.name,
            primaryColor: unit.tier.primaryColor,
            secondaryColor: unit.tier.secondaryColor,
            signed: unit.signed,
            signedAt: unit.signedAt,
            signedLocation: unit.signedLocation,
            authenticationStatement: unit.collection.authenticationStatement,
            verificationUrl,
            videoUrl: unit.videoUrl,
            certificateUrl: unit.certificateUrl,
          }} />
        </div>

        {unit.collection.story && (
          <p style={{ fontSize: 13, color: '#9CA3AF', lineHeight: 1.6, marginTop: 24 }}>{unit.collection.story}</p>
        )}

        <div className="flex items-center gap-2 mt-6">
          <a href={verificationUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ fontSize: 12, fontWeight: 600, background: '#1F2937', color: '#fff', textDecoration: 'none' }}>
            <ExternalLink size={12} />Public verification page
          </a>
          <button onClick={() => navigator.clipboard.writeText(verificationUrl)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl cursor-pointer" style={{ fontSize: 12, fontWeight: 600, background: '#1F2937', color: '#fff', border: 'none' }}>
            <Copy size={12} />Copy link
          </button>
        </div>

        {unit.order && (
          <div className="mt-6 p-4 rounded-xl" style={{ background: '#111827' }}>
            <p style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order</p>
            <p style={{ fontSize: 13, color: '#fff', marginTop: 4 }}>{unit.order.total} {unit.order.currency} — {new Date(unit.order.createdAt).toLocaleDateString()}</p>
          </div>
        )}

        {unit.isOwner && (
          <div className="mt-6 p-4 rounded-xl flex flex-col gap-3" style={{ background: '#111827' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>Privacy</p>
            <label className="flex items-center gap-2" style={{ fontSize: 12, color: '#D1D5DB' }}>
              <input type="checkbox" checked={showPublicly} onChange={e => setShowPublicly(e.target.checked)} />
              {t.collections.showOwnerPublicly}
            </label>
            {showPublicly && (
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Display name"
                style={{ background: '#000', color: '#fff', border: '1px solid #27272A', borderRadius: 8, padding: '8px 12px', fontSize: 13 }} />
            )}
            <button onClick={savePrivacy} className="px-4 py-2 rounded-lg cursor-pointer self-start" style={{ fontSize: 12, fontWeight: 600, background: '#fff', color: '#000', border: 'none' }}>Save</button>
          </div>
        )}
      </div>
    </div>
  )
}
