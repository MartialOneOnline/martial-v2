'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, ExternalLink, AlertCircle } from 'lucide-react'
import { adminFetch } from '@/lib/api/adminFetch'
import DigitalCard from '@/components/collectibles/DigitalCard'
import UnitsTable from '@/components/collectibles/UnitsTable'

interface Tier {
  id?: string
  name: string
  code: string
  description?: string | null
  startNumber: number
  endNumber: number
  price?: number | null
  currency?: string | null
  primaryColor: string
  secondaryColor: string
  visualStyle?: string | null
  benefits: string[]
  packagingDescription?: string | null
  displayOrder: number
}

interface Collection {
  id: string
  productId: string
  name: string
  slug: string
  status: string
  athleteName: string | null
  brandName: string | null
  collectionYear: number
  totalUnits: number
  skuPrefix: string
  numberSelectionEnabled: boolean
  automaticAssignmentEnabled: boolean
  sizeSelectionEnabled: boolean
  authenticityEnabled: boolean
  publicRegistryEnabled: boolean
  authenticationStatement: string | null
  heroImageUrl: string | null
  story: string | null
  product: { name: string; description: string | null; price: number; currency: string; imageUrl: string | null }
  tiers: Tier[]
  _count: { units: number }
}

const inputStyle: React.CSSProperties = { width: '100%', border: '1px solid #E5E7EB', borderRadius: 10, padding: '9px 12px', fontSize: 13, background: '#fff', outline: 'none' }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }
const sectionStyle: React.CSSProperties = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 24 }

export default function CollectionBuilderClient({
  apiBase, collectionId, backHref, marketplaceBaseUrl, verifyBaseUrl,
}: {
  apiBase: string
  collectionId: string
  backHref: string
  marketplaceBaseUrl: string
  verifyBaseUrl: string
}) {
  const [collection, setCollection] = useState<Collection | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishErrors, setPublishErrors] = useState<string[] | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await adminFetch(`${apiBase}/collections/${collectionId}`)
    if (res.ok) setCollection(await res.json())
    setLoading(false)
  }, [apiBase, collectionId])

  useEffect(() => { load() }, [load])

  const [form, setForm] = useState<Partial<Collection> | null>(null)
  useEffect(() => { if (collection) setForm(collection) }, [collection])

  const [tiers, setTiers] = useState<Tier[]>([])
  useEffect(() => { if (collection) setTiers(collection.tiers) }, [collection])

  if (loading || !collection || !form) {
    return <main className="p-8"><p style={{ fontSize: 13, color: '#9CA3AF' }}>Loading…</p></main>
  }

  async function saveGeneral() {
    setSaving(true)
    try {
      await adminFetch(`${apiBase}/collections/${collectionId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: {
            name: form!.product?.name, price: form!.product?.price, currency: form!.product?.currency,
            description: form!.product?.description, imageUrl: form!.product?.imageUrl,
          },
          name: form!.name,
          athleteName: form!.athleteName,
          brandName: form!.brandName,
          collectionYear: form!.collectionYear,
          heroImageUrl: form!.heroImageUrl,
          story: form!.story,
          authenticationStatement: form!.authenticationStatement,
          numberSelectionEnabled: form!.numberSelectionEnabled,
          automaticAssignmentEnabled: form!.automaticAssignmentEnabled,
          sizeSelectionEnabled: form!.sizeSelectionEnabled,
          authenticityEnabled: form!.authenticityEnabled,
          publicRegistryEnabled: form!.publicRegistryEnabled,
        }),
      })
      setToast('Saved')
      load()
    } finally {
      setSaving(false)
    }
  }

  async function saveTiers() {
    setSaving(true)
    try {
      const res = await adminFetch(`${apiBase}/collections/${collectionId}/tiers`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tiers }),
      })
      const data = await res.json()
      if (!res.ok) { setToast(`Tiers: ${(data.details ?? [data.error]).join('; ')}`); return }
      setToast('Tiers saved')
      load()
    } finally {
      setSaving(false)
    }
  }

  async function checkPublish() {
    const res = await adminFetch(`${apiBase}/collections/${collectionId}/publish`)
    const data = await res.json()
    setPublishErrors(data.ok ? [] : data.errors)
    return data.ok
  }

  async function handlePublish() {
    const ok = await checkPublish()
    if (!ok) return
    const res = await adminFetch(`${apiBase}/collections/${collectionId}/publish`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) { setPublishErrors(data.details ?? [data.error]); return }
    setToast('Published')
    load()
  }

  async function handleUnpublish() {
    await adminFetch(`${apiBase}/collections/${collectionId}/publish`, { method: 'DELETE' })
    load()
  }

  const unitsGenerated = collection._count.units > 0

  return (
    <main style={{ flex: 1, minWidth: 0, width: '100%', overflow: 'auto' }}>
      <div className="px-4 md:px-8 py-6 flex flex-col gap-6" style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link href={backHref} className="w-9 h-9 flex items-center justify-center rounded-xl" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}><ArrowLeft size={16} /></Link>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{collection.name}</h1>
              <p style={{ fontSize: 12, color: '#9CA3AF' }}>{collection.slug} · {collection.status}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {collection.status === 'LIVE' && (
              <a href={`${marketplaceBaseUrl}/${collection.slug}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ fontSize: 13, fontWeight: 600, background: '#F3F4F6', color: '#111827', textDecoration: 'none' }}>
                <ExternalLink size={13} />View public page
              </a>
            )}
            {collection.status === 'LIVE' ? (
              <button onClick={handleUnpublish} className="px-4 py-2 rounded-xl cursor-pointer" style={{ fontSize: 13, fontWeight: 600, background: '#FEF2F2', color: '#DC2626', border: 'none' }}>Unpublish</button>
            ) : (
              <button onClick={handlePublish} className="px-4 py-2 rounded-xl cursor-pointer" style={{ fontSize: 13, fontWeight: 600, background: '#16A34A', color: '#fff', border: 'none' }}>Publish</button>
            )}
          </div>
        </div>

        {publishErrors && publishErrors.length > 0 && (
          <div className="flex items-start gap-2 p-4 rounded-xl" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
            <AlertCircle size={16} style={{ color: '#DC2626', marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#DC2626' }}>Cannot publish:</p>
              <ul style={{ fontSize: 12, color: '#991B1B', marginTop: 4, paddingLeft: 16 }}>
                {publishErrors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
          <div className="flex flex-col gap-6">
            <section style={sectionStyle}>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>General</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label style={labelStyle}>Product name</label><input style={inputStyle} value={form.product?.name ?? ''} onChange={e => setForm(f => ({ ...f!, product: { ...f!.product!, name: e.target.value } }))} /></div>
                <div><label style={labelStyle}>Collection name</label><input style={inputStyle} value={form.name ?? ''} onChange={e => setForm(f => ({ ...f!, name: e.target.value }))} /></div>
                <div><label style={labelStyle}>Athlete name</label><input style={inputStyle} value={form.athleteName ?? ''} onChange={e => setForm(f => ({ ...f!, athleteName: e.target.value }))} /></div>
                <div><label style={labelStyle}>Brand name</label><input style={inputStyle} value={form.brandName ?? ''} onChange={e => setForm(f => ({ ...f!, brandName: e.target.value }))} /></div>
                <div><label style={labelStyle}>Collection year</label><input type="number" style={inputStyle} value={form.collectionYear ?? ''} onChange={e => setForm(f => ({ ...f!, collectionYear: Number(e.target.value) }))} /></div>
                <div><label style={labelStyle}>Base price</label><input type="number" style={inputStyle} value={form.product?.price ?? ''} onChange={e => setForm(f => ({ ...f!, product: { ...f!.product!, price: Number(e.target.value) } }))} /></div>
                <div><label style={labelStyle}>Product image URL</label><input style={inputStyle} value={form.product?.imageUrl ?? ''} onChange={e => setForm(f => ({ ...f!, product: { ...f!.product!, imageUrl: e.target.value } }))} /></div>
                <div><label style={labelStyle}>Hero image URL</label><input style={inputStyle} value={form.heroImageUrl ?? ''} onChange={e => setForm(f => ({ ...f!, heroImageUrl: e.target.value }))} /></div>
              </div>
              <div className="mt-4"><label style={labelStyle}>Story</label><textarea rows={3} style={{ ...inputStyle, resize: 'vertical' }} value={form.story ?? ''} onChange={e => setForm(f => ({ ...f!, story: e.target.value }))} /></div>
              <div className="mt-4"><label style={labelStyle}>Authentication statement (supports {'{{displayNumber}}'}, {'{{athleteName}}'}, {'{{collectionYear}}'}, {'{{tierName}}'}, {'{{collectionName}}'})</label><textarea rows={2} style={{ ...inputStyle, resize: 'vertical' }} value={form.authenticationStatement ?? ''} onChange={e => setForm(f => ({ ...f!, authenticationStatement: e.target.value }))} /></div>

              <div className="grid sm:grid-cols-2 gap-3 mt-4">
                {([
                  ['numberSelectionEnabled', 'Number selection'],
                  ['automaticAssignmentEnabled', 'Automatic assignment'],
                  ['sizeSelectionEnabled', 'Size selection'],
                  ['authenticityEnabled', 'Authenticity features'],
                  ['publicRegistryEnabled', 'Public registry (reserved)'],
                ] as [string, string][]).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2" style={{ fontSize: 13 }}>
                    <input type="checkbox" checked={Boolean((form as Record<string, unknown>)[key])} onChange={e => setForm(f => ({ ...f!, [key]: e.target.checked }))} />
                    {label}
                  </label>
                ))}
              </div>
              <button onClick={saveGeneral} disabled={saving} className="mt-4 px-5 py-2.5 rounded-xl cursor-pointer" style={{ fontSize: 13, fontWeight: 600, background: '#0071E3', color: '#fff', border: 'none' }}>Save</button>
            </section>

            <section style={sectionStyle}>
              <div className="flex items-center justify-between mb-4">
                <h2 style={{ fontSize: 15, fontWeight: 700 }}>Tiers</h2>
                {!unitsGenerated && (
                  <button onClick={() => setTiers(t => [...t, { name: '', code: '', startNumber: 1, endNumber: 1, primaryColor: '#111827', secondaryColor: '#6B7280', benefits: [], displayOrder: t.length }])}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer" style={{ fontSize: 12, fontWeight: 600, background: '#F3F4F6', border: 'none' }}>
                    <Plus size={12} />Add tier
                  </button>
                )}
              </div>
              {unitsGenerated && <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>Tier ranges are locked once units have been generated.</p>}
              <div className="flex flex-col gap-3">
                {tiers.map((tier, i) => (
                  <div key={i} className="grid sm:grid-cols-6 gap-2 items-end p-3 rounded-xl" style={{ background: '#F9FAFB' }}>
                    <div className="sm:col-span-2"><label style={labelStyle}>Name</label><input disabled={unitsGenerated} style={inputStyle} value={tier.name} onChange={e => setTiers(ts => ts.map((t, j) => j === i ? { ...t, name: e.target.value } : t))} /></div>
                    <div><label style={labelStyle}>Code</label><input disabled={unitsGenerated} style={inputStyle} value={tier.code} onChange={e => setTiers(ts => ts.map((t, j) => j === i ? { ...t, code: e.target.value } : t))} /></div>
                    <div><label style={labelStyle}>Start</label><input disabled={unitsGenerated} type="number" style={inputStyle} value={tier.startNumber} onChange={e => setTiers(ts => ts.map((t, j) => j === i ? { ...t, startNumber: Number(e.target.value) } : t))} /></div>
                    <div><label style={labelStyle}>End</label><input disabled={unitsGenerated} type="number" style={inputStyle} value={tier.endNumber} onChange={e => setTiers(ts => ts.map((t, j) => j === i ? { ...t, endNumber: Number(e.target.value) } : t))} /></div>
                    <div><label style={labelStyle}>Price</label><input type="number" style={inputStyle} value={tier.price ?? ''} onChange={e => setTiers(ts => ts.map((t, j) => j === i ? { ...t, price: e.target.value ? Number(e.target.value) : null } : t))} /></div>
                    <div><label style={labelStyle}>Color</label><input type="color" style={{ ...inputStyle, padding: 2, height: 34 }} value={tier.primaryColor} onChange={e => setTiers(ts => ts.map((t, j) => j === i ? { ...t, primaryColor: e.target.value } : t))} /></div>
                    <div><label style={labelStyle}>Accent</label><input type="color" style={{ ...inputStyle, padding: 2, height: 34 }} value={tier.secondaryColor} onChange={e => setTiers(ts => ts.map((t, j) => j === i ? { ...t, secondaryColor: e.target.value } : t))} /></div>
                    {!unitsGenerated && (
                      <button onClick={() => setTiers(ts => ts.filter((_, j) => j !== i))} className="w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer" style={{ background: 'transparent', border: 'none', color: '#DC2626' }}><Trash2 size={14} /></button>
                    )}
                  </div>
                ))}
              </div>
              {!unitsGenerated && (
                <button onClick={saveTiers} disabled={saving} className="mt-4 px-5 py-2.5 rounded-xl cursor-pointer" style={{ fontSize: 13, fontWeight: 600, background: '#0071E3', color: '#fff', border: 'none' }}>Save tiers</button>
              )}
            </section>

            <section style={sectionStyle}>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Units ({collection._count.units}/{collection.totalUnits})</h2>
              <UnitsTable apiBase={apiBase} collectionId={collectionId} totalUnits={collection.totalUnits} skuPrefix={collection.skuPrefix} verifyBaseUrl={verifyBaseUrl} />
            </section>
          </div>

          <div className="flex flex-col gap-4 lg:sticky lg:top-6">
            <p style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Card preview</p>
            <DigitalCard data={{
              productName: form.product?.name ?? '',
              productImageUrl: form.product?.imageUrl,
              athleteName: form.athleteName,
              brandName: form.brandName,
              collectionName: form.name ?? '',
              collectionYear: form.collectionYear ?? new Date().getFullYear(),
              displayNumber: `01/${collection.totalUnits}`,
              tierName: tiers[0]?.name ?? '—',
              primaryColor: tiers[0]?.primaryColor ?? '#111827',
              secondaryColor: tiers[0]?.secondaryColor ?? '#6B7280',
              signed: true,
              authenticationStatement: form.authenticationStatement,
              verificationUrl: `${verifyBaseUrl}/PREVIEW`,
            }} />
          </div>
        </div>
      </div>

      {toast && <div className="fixed bottom-6 right-6 px-5 py-3 rounded-xl" style={{ background: '#111827', color: '#fff', fontSize: 13 }}>{toast}</div>}
    </main>
  )
}
