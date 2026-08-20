'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Check, X, Copy, ExternalLink, MoreHorizontal, Download } from 'lucide-react'
import { adminFetch } from '@/lib/api/adminFetch'
import { downloadCsv } from '@/lib/csvExport'
import RowMenu from '@/components/RowMenu'

interface Unit {
  id: string
  editionNumber: number
  sku: string
  size: string | null
  specificPrice: number | null
  currency: string | null
  status: string
  signed: boolean
  signedAt: string | null
  signedLocation: string | null
  videoUrl: string | null
  certificateUrl: string | null
  publicVerificationCode: string
  tier: { id: string; name: string }
  owner: { id: string; name: string | null; email: string } | null
  order: { id: string; status: string; total: number; currency: string } | null
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  DRAFT: { bg: '#F3F4F6', color: '#6B7280' },
  AVAILABLE: { bg: '#F0FDF4', color: '#16A34A' },
  RESERVED: { bg: '#FFFBEB', color: '#D97706' },
  SOLD: { bg: '#EFF6FF', color: '#0071E3' },
  AUTHENTICATED: { bg: '#F5F3FF', color: '#6D28D9' },
  ARCHIVED: { bg: '#FEF2F2', color: '#DC2626' },
}

export default function UnitsTable({
  apiBase, collectionId, totalUnits, skuPrefix, verifyBaseUrl,
}: {
  apiBase: string
  collectionId: string
  totalUnits: number
  skuPrefix: string
  verifyBaseUrl: string
}) {
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generateSummary, setGenerateSummary] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [tierFilter, setTierFilter] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkOpen, setBulkOpen] = useState(false)
  const [qrUnit, setQrUnit] = useState<Unit | null>(null)
  const [editUnit, setEditUnit] = useState<Unit | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (tierFilter) params.set('tierId', tierFilter)
      const res = await adminFetch(`${apiBase}/collections/${collectionId}/units?${params}`)
      if (res.ok) { const data = await res.json(); setUnits(data.units ?? []) }
    } finally {
      setLoading(false)
    }
  }, [apiBase, collectionId, statusFilter, tierFilter])

  useEffect(() => { load() }, [load])

  const tiers = useMemo(() => {
    const map = new Map<string, string>()
    units.forEach(u => map.set(u.tier.id, u.tier.name))
    return Array.from(map.entries())
  }, [units])

  async function handleGenerate() {
    setGenerating(true)
    setGenerateSummary(null)
    try {
      const res = await adminFetch(`${apiBase}/collections/${collectionId}/units/generate`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setGenerateSummary(`Created ${data.createdCount}, already existed ${data.existingCount}. By tier: ${Object.entries(data.byTier).map(([k, v]) => `${k}=${v}`).join(', ') || '—'}`)
        load()
      } else {
        setGenerateSummary(`Failed: ${(data.details ?? [data.error]).join('; ')}`)
      }
    } finally {
      setGenerating(false)
    }
  }

  async function patchUnit(id: string, patch: Record<string, unknown>) {
    await adminFetch(`${apiBase}/collections/${collectionId}/units/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    })
    load()
  }

  async function handleAction(id: string, action: 'archive' | 'reserve') {
    await adminFetch(`${apiBase}/collections/${collectionId}/units/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
    })
    load()
  }

  async function handleBulkSubmit(patch: Record<string, unknown>) {
    await adminFetch(`${apiBase}/collections/${collectionId}/units/bulk`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unitIds: Array.from(selected), ...patch }),
    })
    setBulkOpen(false)
    setSelected(new Set())
    load()
  }

  function exportCsv() {
    downloadCsv(
      `${skuPrefix}-units`,
      ['Number', 'Tier', 'Size', 'SKU', 'Price', 'Status', 'Signed', 'Owner', 'Verification Code'],
      units.map(u => [
        u.editionNumber, u.tier.name, u.size ?? '', u.sku,
        u.specificPrice != null ? `${u.specificPrice} ${u.currency ?? ''}` : '',
        u.status, u.signed ? 'Yes' : 'No', u.owner?.email ?? '', u.publicVerificationCode,
      ]),
    )
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={handleGenerate} disabled={generating}
            className="px-4 py-2 rounded-xl cursor-pointer"
            style={{ fontSize: 13, fontWeight: 600, background: '#0071E3', color: '#fff', border: 'none' }}>
            {generating ? 'Generating…' : `Generate units (${units.length}/${totalUnits})`}
          </button>
          <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-2 rounded-xl cursor-pointer"
            style={{ fontSize: 13, fontWeight: 600, background: '#fff', border: '1px solid #E5E7EB', color: '#374151' }}>
            <Download size={13} />Export CSV
          </button>
          {selected.size > 0 && (
            <button onClick={() => setBulkOpen(true)} className="px-3 py-2 rounded-xl cursor-pointer"
              style={{ fontSize: 13, fontWeight: 600, background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#111827' }}>
              Bulk edit ({selected.size})
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ fontSize: 12, border: '1px solid #E5E7EB', borderRadius: 8, padding: '6px 10px' }}>
            <option value="">All statuses</option>
            {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={tierFilter} onChange={e => setTierFilter(e.target.value)} style={{ fontSize: 12, border: '1px solid #E5E7EB', borderRadius: 8, padding: '6px 10px' }}>
            <option value="">All tiers</option>
            {tiers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </div>
      </div>

      {generateSummary && <p style={{ fontSize: 12, color: '#6B7280', background: '#F9FAFB', padding: '8px 12px', borderRadius: 8 }}>{generateSummary}</p>}

      <div className="rounded-2xl overflow-x-auto" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
              <th className="px-3 py-3"><input type="checkbox" checked={selected.size > 0 && selected.size === units.length} onChange={e => setSelected(e.target.checked ? new Set(units.map(u => u.id)) : new Set())} /></th>
              {['#', 'Tier', 'Size', 'SKU', 'Price', 'Status', 'Signed', 'Owner', 'Actions'].map(h => (
                <th key={h} className="px-3 py-3 text-left" style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={10} style={{ textAlign: 'center', padding: 32, color: '#9CA3AF', fontSize: 13 }}>Loading…</td></tr>}
            {!loading && units.map(u => {
              const sc = STATUS_COLORS[u.status] ?? STATUS_COLORS.DRAFT!
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid #F9FAFB' }}>
                  <td className="px-3 py-2.5"><input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} /></td>
                  <td className="px-3 py-2.5" style={{ fontSize: 13, fontWeight: 700 }}>{u.editionNumber}</td>
                  <td className="px-3 py-2.5" style={{ fontSize: 12 }}>{u.tier.name}</td>
                  <td className="px-3 py-2.5" style={{ fontSize: 12 }}>{u.size ?? '—'}</td>
                  <td className="px-3 py-2.5" style={{ fontSize: 11, fontFamily: 'monospace', color: '#6B7280' }}>{u.sku}</td>
                  <td className="px-3 py-2.5" style={{ fontSize: 12 }}>{u.specificPrice != null ? `${u.specificPrice} ${u.currency ?? ''}` : '—'}</td>
                  <td className="px-3 py-2.5">
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: sc.bg, color: sc.color }}>{u.status}</span>
                  </td>
                  <td className="px-3 py-2.5">{u.signed ? <Check size={14} style={{ color: '#16A34A' }} /> : <X size={14} style={{ color: '#D1D5DB' }} />}</td>
                  <td className="px-3 py-2.5" style={{ fontSize: 12 }}>{u.owner?.email ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setQrUnit(u)} title="Show QR" className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer" style={{ background: 'transparent', border: 'none', color: '#9CA3AF' }}>
                        <ExternalLink size={13} />
                      </button>
                      <RowMenu trigger={({ onClick }) => (
                        <button onClick={onClick} className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer" style={{ background: 'transparent', border: 'none', color: '#9CA3AF' }}>
                          <MoreHorizontal size={15} />
                        </button>
                      )}>
                        <div className="rounded-xl py-1 overflow-hidden" style={{ background: '#fff', border: '1px solid #E5E7EB', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 180 }}>
                          <button onClick={() => setEditUnit(u)} className="w-full text-left px-4 py-2.5 cursor-pointer" style={{ fontSize: 13, background: 'transparent', border: 'none' }}>Edit</button>
                          <button onClick={() => patchUnit(u.id, { signed: !u.signed })} className="w-full text-left px-4 py-2.5 cursor-pointer" style={{ fontSize: 13, background: 'transparent', border: 'none' }}>{u.signed ? 'Mark unsigned' : 'Mark signed'}</button>
                          <button onClick={() => navigator.clipboard.writeText(`${verifyBaseUrl}/${u.publicVerificationCode}`)} className="w-full text-left px-4 py-2.5 cursor-pointer" style={{ fontSize: 13, background: 'transparent', border: 'none' }}>Copy verification URL</button>
                          {u.status === 'AVAILABLE' && (
                            <button onClick={() => handleAction(u.id, 'reserve')} className="w-full text-left px-4 py-2.5 cursor-pointer" style={{ fontSize: 13, background: 'transparent', border: 'none' }}>Reserve (admin)</button>
                          )}
                          {u.status !== 'ARCHIVED' && (
                            <button onClick={() => handleAction(u.id, 'archive')} className="w-full text-left px-4 py-2.5 cursor-pointer" style={{ fontSize: 13, color: '#DC2626', background: 'transparent', border: 'none' }}>Archive</button>
                          )}
                        </div>
                      </RowMenu>
                    </div>
                  </td>
                </tr>
              )
            })}
            {!loading && units.length === 0 && (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: 32, color: '#9CA3AF', fontSize: 13 }}>No units generated yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {qrUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setQrUnit(null)}>
          <div onClick={e => e.stopPropagation()} className="rounded-2xl p-6 flex flex-col items-center gap-3" style={{ background: '#fff' }}>
            <QRCodeSVG value={`${verifyBaseUrl}/${qrUnit.publicVerificationCode}`} size={200} level="M" />
            <p style={{ fontSize: 12, color: '#6B7280', fontFamily: 'monospace' }}>{qrUnit.publicVerificationCode}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => navigator.clipboard.writeText(`${verifyBaseUrl}/${qrUnit.publicVerificationCode}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer" style={{ fontSize: 12, background: '#F3F4F6', border: 'none' }}>
                <Copy size={12} />Copy URL
              </button>
              <button onClick={() => setQrUnit(null)} className="px-3 py-1.5 rounded-lg cursor-pointer" style={{ fontSize: 12, background: '#111827', color: '#fff', border: 'none' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {editUnit && (
        <UnitEditModal unit={editUnit} onClose={() => setEditUnit(null)} onSave={patch => { patchUnit(editUnit.id, patch); setEditUnit(null) }} />
      )}
      {bulkOpen && (
        <BulkEditModal count={selected.size} onClose={() => setBulkOpen(false)} onSave={handleBulkSubmit} />
      )}
    </div>
  )
}

function UnitEditModal({ unit, onClose, onSave }: { unit: Unit; onClose: () => void; onSave: (patch: Record<string, unknown>) => void }) {
  const [size, setSize] = useState(unit.size ?? '')
  const [specificPrice, setSpecificPrice] = useState(unit.specificPrice != null ? String(unit.specificPrice) : '')
  const [signedAt, setSignedAt] = useState(unit.signedAt ? unit.signedAt.slice(0, 10) : '')
  const [signedLocation, setSignedLocation] = useState(unit.signedLocation ?? '')
  const [videoUrl, setVideoUrl] = useState(unit.videoUrl ?? '')
  const [certificateUrl, setCertificateUrl] = useState(unit.certificateUrl ?? '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="rounded-2xl p-6 flex flex-col gap-3" style={{ background: '#fff', width: 420, maxWidth: '100%' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700 }}>Edit unit #{unit.editionNumber}</h3>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Size<input value={size} onChange={e => setSize(e.target.value)} style={{ display: 'block', width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '7px 10px', marginTop: 4 }} /></label>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Specific price (overrides tier/product)<input type="number" value={specificPrice} onChange={e => setSpecificPrice(e.target.value)} style={{ display: 'block', width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '7px 10px', marginTop: 4 }} /></label>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Signed date<input type="date" value={signedAt} onChange={e => setSignedAt(e.target.value)} style={{ display: 'block', width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '7px 10px', marginTop: 4 }} /></label>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Signed location<input value={signedLocation} onChange={e => setSignedLocation(e.target.value)} style={{ display: 'block', width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '7px 10px', marginTop: 4 }} /></label>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Video URL (private)<input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} style={{ display: 'block', width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '7px 10px', marginTop: 4 }} /></label>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Certificate URL<input value={certificateUrl} onChange={e => setCertificateUrl(e.target.value)} style={{ display: 'block', width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '7px 10px', marginTop: 4 }} /></label>
        <div className="flex items-center justify-end gap-2 mt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg cursor-pointer" style={{ fontSize: 13, background: '#fff', border: '1px solid #E5E7EB' }}>Cancel</button>
          <button onClick={() => onSave({
            size: size || null,
            specificPrice: specificPrice ? Number(specificPrice) : null,
            signedAt: signedAt || null,
            signedLocation: signedLocation || null,
            videoUrl: videoUrl || null,
            certificateUrl: certificateUrl || null,
          })} className="px-4 py-2 rounded-lg cursor-pointer" style={{ fontSize: 13, background: '#0071E3', color: '#fff', border: 'none' }}>Save</button>
        </div>
      </div>
    </div>
  )
}

function BulkEditModal({ count, onClose, onSave }: { count: number; onClose: () => void; onSave: (patch: Record<string, unknown>) => void }) {
  const [size, setSize] = useState('')
  const [specificPrice, setSpecificPrice] = useState('')
  const [signed, setSigned] = useState<'' | 'yes' | 'no'>('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="rounded-2xl p-6 flex flex-col gap-3" style={{ background: '#fff', width: 380, maxWidth: '100%' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700 }}>Bulk edit {count} units</h3>
        <p style={{ fontSize: 12, color: '#9CA3AF' }}>Only fields you fill in will be changed.</p>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Size<input value={size} onChange={e => setSize(e.target.value)} style={{ display: 'block', width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '7px 10px', marginTop: 4 }} /></label>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Specific price<input type="number" value={specificPrice} onChange={e => setSpecificPrice(e.target.value)} style={{ display: 'block', width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '7px 10px', marginTop: 4 }} /></label>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Signed
          <select value={signed} onChange={e => setSigned(e.target.value as typeof signed)} style={{ display: 'block', width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '7px 10px', marginTop: 4 }}>
            <option value="">Don&apos;t change</option><option value="yes">Signed</option><option value="no">Not signed</option>
          </select>
        </label>
        <div className="flex items-center justify-end gap-2 mt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg cursor-pointer" style={{ fontSize: 13, background: '#fff', border: '1px solid #E5E7EB' }}>Cancel</button>
          <button onClick={() => {
            const patch: Record<string, unknown> = {}
            if (size) patch.size = size
            if (specificPrice) patch.specificPrice = Number(specificPrice)
            if (signed) patch.signed = signed === 'yes'
            onSave(patch)
          }} className="px-4 py-2 rounded-lg cursor-pointer" style={{ fontSize: 13, background: '#0071E3', color: '#fff', border: 'none' }}>Apply</button>
        </div>
      </div>
    </div>
  )
}
