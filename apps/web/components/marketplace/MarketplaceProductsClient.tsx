'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Package, ShoppingBag, Check, X, MoreHorizontal, Search, Star } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageContext'
import { adminFetch } from '@/lib/api/adminFetch'
import { matchesSearch } from '@/lib/search'
import { fmtPrice } from '@/lib/format'
import RowMenu from '@/components/RowMenu'

interface ProductRow {
  id: string
  name: string
  description: string | null
  price: number
  currency: string
  stock: number | null
  imageUrl: string | null
  isActive: boolean
  isLimitedEdition: boolean
  limitedCollection: { id: string; status: string; slug: string } | null
  category: { id: string; name: string } | null
}

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #E5E7EB', borderRadius: 10,
  padding: '9px 12px', fontSize: 13, color: '#111827', background: '#fff', outline: 'none',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5,
}

// Shared between /dashboard/school/store (SCHOOL seller) and
// /admin/marketplace (MARTIAL seller) — only apiBase/basePath differ.
export default function MarketplaceProductsClient({
  apiBase,
  collectionsBasePath,
  title,
  subtitle,
  mobileMenuButton,
  topBarExtra,
}: {
  apiBase: string
  collectionsBasePath: string
  title: string
  subtitle: string
  // Each host shell (DashboardShell vs AdminLayoutClient) has its own
  // sidebar-toggle context — passed in rather than hardcoded so this
  // component stays usable from both /dashboard/school/store and
  // /admin/marketplace without depending on either shell's hook.
  mobileMenuButton?: React.ReactNode
  topBarExtra?: React.ReactNode
}) {
  const t = useT()
  const router = useRouter()
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminFetch(`${apiBase}/products`)
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [apiBase])

  useEffect(() => { load() }, [load])

  const filtered = products.filter(p => matchesSearch(p.name, search))
  const activeCount = products.filter(p => p.isActive).length
  const limitedCount = products.filter(p => p.isLimitedEdition).length

  async function handleArchive(id: string) {
    await adminFetch(`${apiBase}/products/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: false }),
    })
    setToast('Product archived')
    load()
  }

  async function handleDelete(id: string) {
    const res = await adminFetch(`${apiBase}/products/${id}`, { method: 'DELETE' })
    if (res.ok) { setToast('Product deleted'); load() }
    else { const err = await res.json().catch(() => ({})); setToast(err.error ?? 'Delete failed') }
  }

  return (
    <main style={{ flex: 1, minWidth: 0, width: '100%', overflow: 'auto' }}>
      {(mobileMenuButton || topBarExtra) && (
        <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20" style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
          {mobileMenuButton}
          <div className="flex-1" />
          {topBarExtra}
        </div>
      )}
      <div className="px-4 md:px-8 py-6 flex flex-col gap-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>{title}</h1>
            <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={collectionsBasePath}
              className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer"
              style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#111827', fontSize: 13, fontWeight: 600 }}>
              <Star size={14} />{t.collections.navCollections}
            </Link>
            <button onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer"
              style={{ background: '#0071E3', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600 }}>
              <Plus size={15} />{t.school.addProduct}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: t.school.totalProducts, value: products.length, icon: Package, color: '#0071E3', bg: '#EFF6FF' },
            { label: t.common.active, value: activeCount, icon: Check, color: '#16A34A', bg: '#F0FDF4' },
            { label: t.collections.navCollections, value: limitedCount, icon: Star, color: '#D97706', bg: '#FFFBEB' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl" style={{ background: '#fff', border: '1px solid #E5E7EB', padding: '18px 20px' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: s.bg }}>
                <s.icon size={16} style={{ color: s.color }} />
              </div>
              <p style={{ fontSize: 26, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 4 }}>{s.value}</p>
              <p style={{ fontSize: 12, fontWeight: 500, color: '#6B7280' }}>{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-xl max-w-xs" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
          <Search size={13} style={{ color: '#9CA3AF' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.school.searchProducts}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, width: '100%' }} />
        </div>

        <div className="rounded-2xl overflow-x-auto" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                {['Product', 'Price', 'Type', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left" style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '48px 0', color: '#9CA3AF', fontSize: 13 }}>Loading…</td></tr>
              )}
              {!loading && filtered.map(p => (
                <tr key={p.id} className="hover:bg-[#FAFAFA]" style={{ borderBottom: '1px solid #F9FAFB' }}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
                        <ShoppingBag size={16} style={{ color: '#9CA3AF' }} />
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{p.name}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3"><span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{fmtPrice(p.price, p.currency)}</span></td>
                  <td className="px-5 py-3">
                    {p.isLimitedEdition ? (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: '#FFFBEB', color: '#D97706' }}>Limited edition</span>
                    ) : (
                      <span style={{ fontSize: 11, color: '#9CA3AF' }}>Standard</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
                      background: p.isActive ? '#F0FDF4' : '#F3F4F6', color: p.isActive ? '#16A34A' : '#6B7280' }}>
                      {p.isActive ? t.common.active : t.common.archived}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      {p.isLimitedEdition && p.limitedCollection && (
                        <Link href={`${collectionsBasePath}/${p.limitedCollection.id}`}
                          className="px-3 py-1.5 rounded-lg cursor-pointer"
                          style={{ fontSize: 12, fontWeight: 600, background: '#EFF6FF', color: '#0071E3' }}>
                          Manage
                        </Link>
                      )}
                      <RowMenu trigger={({ onClick }) => (
                        <button onClick={onClick} className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer" style={{ color: '#9CA3AF', background: 'transparent', border: 'none' }}>
                          <MoreHorizontal size={15} />
                        </button>
                      )}>
                        <div className="rounded-xl py-1 overflow-hidden" style={{ background: '#fff', border: '1px solid #E5E7EB', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 160 }}>
                          <button onClick={() => handleArchive(p.id)} className="w-full text-left px-4 py-2.5 cursor-pointer" style={{ fontSize: 13, color: '#374151', background: 'transparent', border: 'none' }}>Archive</button>
                          <button onClick={() => handleDelete(p.id)} className="w-full text-left px-4 py-2.5 cursor-pointer" style={{ fontSize: 13, color: '#DC2626', background: 'transparent', border: 'none' }}>Delete</button>
                        </div>
                      </RowMenu>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '48px 0' }}>
                  <Package size={28} style={{ color: '#E5E7EB', margin: '0 auto 10px' }} />
                  <p style={{ fontSize: 14, color: '#9CA3AF' }}>{t.school.noProducts}</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddProductDrawer
        open={drawerOpen}
        apiBase={apiBase}
        onClose={() => setDrawerOpen(false)}
        onCreated={(product, isLimited) => {
          setDrawerOpen(false)
          if (isLimited && product.limitedCollectionId) {
            router.push(`${collectionsBasePath}/${product.limitedCollectionId}`)
          } else {
            setToast('Product created')
            load()
          }
        }}
      />
      {toast && (
        <div className="fixed bottom-6 right-6 z-[70] flex items-center gap-3 px-5 py-3.5 rounded-2xl" style={{ background: '#fff', border: '1px solid #BBF7D0', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
          <Check size={14} style={{ color: '#16A34A' }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{toast}</p>
          <button onClick={() => setToast(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={13} style={{ color: '#9CA3AF' }} /></button>
        </div>
      )}
    </main>
  )
}

function AddProductDrawer({
  open, apiBase, onClose, onCreated,
}: {
  open: boolean
  apiBase: string
  onClose: () => void
  onCreated: (product: { id: string; limitedCollectionId?: string }, isLimited: boolean) => void
}) {
  const t = useT()
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [isLimited, setIsLimited] = useState(false)
  const [totalUnits, setTotalUnits] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() { setName(''); setPrice(''); setDescription(''); setImageUrl(''); setIsLimited(false); setTotalUnits(''); setError(null) }
  function handleClose() { reset(); onClose() }

  const canSubmit = name.trim() && Number(price) >= 0 && (!isLimited || Number(totalUnits) > 0)

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      if (!isLimited) {
        const res = await adminFetch(`${apiBase}/products`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, price: Number(price), description: description || undefined, imageUrl: imageUrl || undefined }),
        })
        if (!res.ok) { const err = await res.json(); setError(err.error ?? 'Failed'); return }
        const product = await res.json()
        onCreated(product, false)
      } else {
        const total = Number(totalUnits)
        const skuPrefix = name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'ITEM'
        const res = await adminFetch(`${apiBase}/collections`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product: { name, price: Number(price), description: description || undefined, imageUrl: imageUrl || undefined },
            collection: { name, collectionYear: new Date().getFullYear(), totalUnits: total, skuPrefix },
            tiers: [{ name: 'Standard', code: 'STD', startNumber: 1, endNumber: total, primaryColor: '#111827', secondaryColor: '#6B7280', displayOrder: 0 }],
          }),
        })
        if (!res.ok) { const err = await res.json(); setError(err.details?.join('; ') ?? err.error ?? 'Failed'); return }
        const collection = await res.json()
        onCreated({ id: collection.productId, limitedCollectionId: collection.id }, true)
      }
      reset()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 transition-opacity" style={{ background: 'rgba(0,0,0,0.35)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }} onClick={handleClose} />
      <div className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-hidden" style={{ width: 'min(560px,96vw)', background: '#F9FAFB', boxShadow: '-4px 0 32px rgba(0,0,0,0.12)', transform: open ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)' }}>
        <div className="flex items-center justify-between px-6 py-5 shrink-0" style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0 }}>{t.school.addProduct}</h2>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Add a new item to your store</p>
          </div>
          <button onClick={handleClose} className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <X size={15} style={{ color: '#6B7280' }} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">
          <div>
            <label style={labelStyle}>Product Name</label>
            <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="Fuji BJJ Gi White" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Price</label>
              <input type="number" min={0} step={0.01} value={price} onChange={e => setPrice(e.target.value)} style={inputStyle} placeholder="49.00" />
            </div>
            <div>
              <label style={labelStyle}>Image URL <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span></label>
              <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} style={inputStyle} placeholder="https://…" />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Description <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span></label>
            <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          <label className="flex items-start gap-3 p-4 rounded-xl cursor-pointer" style={{ background: isLimited ? '#FFFBEB' : '#fff', border: `1px solid ${isLimited ? '#FDE68A' : '#E5E7EB'}` }}>
            <input type="checkbox" checked={isLimited} onChange={e => setIsLimited(e.target.checked)} style={{ marginTop: 3 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{t.collections.limitedEditionLabel}</p>
              <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{t.collections.limitedEditionHint}</p>
            </div>
          </label>

          {isLimited && (
            <div>
              <label style={labelStyle}>Total units</label>
              <input type="number" min={1} value={totalUnits} onChange={e => setTotalUnits(e.target.value)} style={inputStyle} placeholder="50" />
              <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 6 }}>You&apos;ll configure tiers, generate numbered units and publish next.</p>
            </div>
          )}

          {error && <p style={{ fontSize: 12, color: '#DC2626' }}>{error}</p>}
        </div>
        <div className="px-6 py-4 flex items-center gap-3 justify-end shrink-0" style={{ background: '#fff', borderTop: '1px solid #E5E7EB' }}>
          <button onClick={handleClose} className="px-5 py-2.5 rounded-xl cursor-pointer" style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={!canSubmit || submitting} className="px-6 py-2.5 rounded-xl cursor-pointer flex items-center gap-2"
            style={{ fontSize: 13, fontWeight: 600, border: 'none', background: canSubmit && !submitting ? '#0071E3' : '#93C5FD', color: '#fff' }}>
            <Plus size={14} />{submitting ? '…' : (isLimited ? 'Create collection' : t.school.addProduct)}
          </button>
        </div>
      </div>
    </>
  )
}
