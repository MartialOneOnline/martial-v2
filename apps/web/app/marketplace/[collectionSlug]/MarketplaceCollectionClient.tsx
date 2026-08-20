'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShieldCheck, Award, Package, PenTool, Check } from 'lucide-react'
import Header from '@/components/Header'
import { useT } from '@/lib/i18n/LanguageContext'

interface TierData {
  id: string
  name: string
  code: string
  description: string | null
  startNumber: number
  endNumber: number
  primaryColor: string
  secondaryColor: string
  benefits: string[]
  packagingDescription: string | null
  totalUnits: number
  availableUnits: number
  soldOut: boolean
  price: number
  currency: string
}

interface CollectionData {
  id: string
  name: string
  slug: string
  status: string
  sellerType: string
  sellerName: string | null
  athleteName: string | null
  brandName: string | null
  collectionYear: number
  totalUnits: number
  totalGenerated: number
  totalAvailable: number
  soldOut: boolean
  numberSelectionEnabled: boolean
  sizeSelectionEnabled: boolean
  authenticityEnabled: boolean
  heroImageUrl: string | null
  story: string | null
  product: { name: string; description: string | null; imageUrl: string | null }
  tiers: TierData[]
  sizesAvailable: string[]
  availableNumbers: number[]
}

export default function MarketplaceCollectionClient({ slug }: { slug: string }) {
  const t = useT()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [data, setData] = useState<CollectionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFoundState, setNotFoundState] = useState(false)
  const [selectedTier, setSelectedTier] = useState<TierData | null>(null)
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedNumber, setSelectedNumber] = useState<number | ''>('')
  const [buying, setBuying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/public/marketplace/collections/${slug}`)
    if (!res.ok) { setNotFoundState(true); setLoading(false); return }
    setData(await res.json())
    setLoading(false)
  }, [slug])

  useEffect(() => { load() }, [load])

  const checkoutStatus = searchParams.get('checkout')

  async function handleBuy() {
    if (!selectedTier) return
    setBuying(true)
    setError(null)
    try {
      const res = await fetch('/api/my/collectibles/reserve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionSlug: slug,
          tierId: selectedTier.id,
          size: selectedSize || undefined,
          editionNumber: selectedNumber !== '' ? Number(selectedNumber) : undefined,
        }),
      })
      if (res.status === 401) {
        router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
        return
      }
      const body = await res.json()
      if (!res.ok) { setError(body.error ?? 'Could not start checkout'); return }
      window.location.href = body.url
    } finally {
      setBuying(false)
    }
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#0A0A0A' }} />
  if (notFoundState || !data) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Collection not found</p>
      </div>
    )
  }

  const heroImage = data.heroImageUrl ?? data.product.imageUrl

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff' }}>
      <Header />

      {checkoutStatus === 'success' && (
        <div style={{ background: '#052e16', color: '#86EFAC', padding: '12px 20px', textAlign: 'center', fontSize: 13 }}>
          Payment confirmed — check &ldquo;My Collection&rdquo; for your piece.
        </div>
      )}

      {/* Hero */}
      <section style={{
        position: 'relative', padding: '72px 24px 56px',
        background: heroImage ? `linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.85) 100%), url(${heroImage}) center/cover` : 'radial-gradient(circle at 30% 20%, #1a1a1a, #000)',
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: 12 }}>
            {data.sellerName} · {data.collectionYear} · Limited Edition
          </p>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>{data.name}</h1>
          {data.athleteName && <p style={{ fontSize: 18, color: '#D1D5DB', marginTop: 12 }}>{data.athleteName}</p>}
          {data.story && <p style={{ fontSize: 14, color: '#9CA3AF', marginTop: 20, lineHeight: 1.7 }}>{data.story}</p>}

          <div className="flex items-center justify-center gap-4 mt-8 flex-wrap">
            <Badge icon={<Award size={13} />} label="Individually numbered" />
            <Badge icon={<PenTool size={13} />} label="Signed" />
            <Badge icon={<ShieldCheck size={13} />} label="Certificate of authenticity" />
            <Badge icon={<Package size={13} />} label="Digital Legacy Card" />
          </div>

          <p style={{ fontSize: 13, color: data.soldOut ? '#F87171' : '#9CA3AF', marginTop: 24 }}>
            {data.soldOut ? t.collections.soldOut : `${data.totalAvailable} ${t.collections.available} ${t.collections.ofTotal} ${data.totalUnits}`}
          </p>
        </div>
      </section>

      {/* Tiers */}
      <section style={{ padding: '0 24px 64px', maxWidth: 1000, margin: '0 auto' }}>
        <div className="grid md:grid-cols-3 gap-5">
          {data.tiers.map(tier => {
            const isSelected = selectedTier?.id === tier.id
            return (
              <button key={tier.id} onClick={() => { setSelectedTier(tier); setSelectedSize(''); setSelectedNumber('') }} disabled={tier.soldOut}
                style={{
                  textAlign: 'left', borderRadius: 20, padding: 24, cursor: tier.soldOut ? 'not-allowed' : 'pointer',
                  background: `linear-gradient(160deg, #111827 0%, ${tier.primaryColor}18 100%)`,
                  border: `1.5px solid ${isSelected ? tier.primaryColor : '#27272A'}`,
                  opacity: tier.soldOut ? 0.5 : 1,
                }}>
                <div className="flex items-center justify-between mb-3">
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: tier.primaryColor }}>{tier.name}</span>
                  {isSelected && <Check size={16} style={{ color: tier.primaryColor }} />}
                </div>
                <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>#{tier.startNumber}–{tier.endNumber}</p>
                {tier.description && <p style={{ fontSize: 13, color: '#D1D5DB', marginBottom: 12, lineHeight: 1.5 }}>{tier.description}</p>}
                {tier.benefits.length > 0 && (
                  <ul style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 14, paddingLeft: 16 }}>
                    {tier.benefits.map((b, i) => <li key={i}>{b}</li>)}
                  </ul>
                )}
                <p style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{tier.price ? `${tier.price} ${tier.currency}` : '—'}</p>
                <p style={{ fontSize: 11, color: tier.soldOut ? '#F87171' : '#6B7280', marginTop: 4 }}>
                  {tier.soldOut ? t.collections.soldOut : `${tier.availableUnits} ${t.collections.available}`}
                </p>
              </button>
            )
          })}
        </div>

        {selectedTier && (
          <div className="mt-8 p-6 rounded-2xl" style={{ background: '#111827', border: '1px solid #27272A' }}>
            {data.sizeSelectionEnabled && data.sizesAvailable.length > 0 && (
              <div className="mb-4">
                <p style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF', marginBottom: 8 }}>{t.collections.selectSize}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {data.sizesAvailable.map(size => (
                    <button key={size} onClick={() => setSelectedSize(size)}
                      style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        background: selectedSize === size ? '#fff' : 'transparent', color: selectedSize === size ? '#000' : '#fff',
                        border: '1px solid #3F3F46' }}>
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {data.numberSelectionEnabled ? (
              <div className="mb-4">
                <p style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF', marginBottom: 8 }}>{t.collections.selectNumber}</p>
                <select value={selectedNumber} onChange={e => setSelectedNumber(e.target.value ? Number(e.target.value) : '')}
                  style={{ background: '#000', color: '#fff', border: '1px solid #3F3F46', borderRadius: 10, padding: '9px 14px', fontSize: 13 }}>
                  <option value="">Choose…</option>
                  {data.availableNumbers.filter(n => n >= selectedTier.startNumber && n <= selectedTier.endNumber).map(n => (
                    <option key={n} value={n}>#{n}</option>
                  ))}
                </select>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>{t.collections.automaticNumber}</p>
            )}

            {error && <p style={{ fontSize: 12, color: '#F87171', marginBottom: 12 }}>{error}</p>}

            <button onClick={handleBuy} disabled={buying || (data.sizeSelectionEnabled && data.sizesAvailable.length > 0 && !selectedSize)}
              style={{ width: '100%', padding: '14px', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer',
                background: selectedTier.primaryColor, color: '#000', border: 'none', marginTop: 8 }}>
              {buying ? '…' : `${t.collections.buyNow} — ${selectedTier.price} ${selectedTier.currency}`}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

function Badge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ fontSize: 11, fontWeight: 600, color: '#D1D5DB', border: '1px solid #27272A' }}>
      {icon}{label}
    </span>
  )
}
