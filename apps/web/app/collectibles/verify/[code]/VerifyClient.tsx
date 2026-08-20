'use client'

import { useState, useEffect } from 'react'
import { ShieldCheck, ShieldAlert, ShieldX, Archive } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageContext'

interface VerificationPayload {
  displayNumber: string
  editionNumber: number
  totalUnits: number
  status: string
  signed: boolean
  signedAt: string | null
  signedLocation: string | null
  collectionName: string
  athleteName: string | null
  brandName: string | null
  collectionYear: number
  productName: string
  imageUrl: string | null
  authenticationStatement: string | null
  tierName: string
  primaryColor: string
  secondaryColor: string
  ownerDisplayName: string | null
}

type VerifyState = 'loading' | 'valid' | 'archived' | 'invalid' | 'unpublished' | 'error'

export default function VerifyClient({ code }: { code: string }) {
  const t = useT()
  const [state, setState] = useState<VerifyState>('loading')
  const [data, setData] = useState<VerificationPayload | null>(null)

  useEffect(() => {
    fetch(`/api/public/collectibles/verify/${code}`)
      .then(async res => {
        const body = await res.json()
        setState(body.state ?? 'error')
        setData(body.data ?? null)
      })
      .catch(() => setState('error'))
  }, [code])

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {state === 'loading' && <p style={{ color: '#6B7280' }}>…</p>}

      {state === 'invalid' && <StatePanel icon={<ShieldX size={40} style={{ color: '#F87171' }} />} title={t.collections.verifyInvalid} />}
      {state === 'unpublished' && <StatePanel icon={<ShieldAlert size={40} style={{ color: '#FBBF24' }} />} title={t.collections.verifyUnpublished} />}
      {state === 'error' && <StatePanel icon={<ShieldAlert size={40} style={{ color: '#F87171' }} />} title={t.collections.verifyError} />}

      {(state === 'valid' || state === 'archived') && data && (
        <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
          {state === 'archived' && (
            <div className="flex items-center justify-center gap-2 mb-4" style={{ color: '#9CA3AF' }}>
              <Archive size={14} /><span style={{ fontSize: 12 }}>{t.collections.verifyArchived}</span>
            </div>
          )}
          <div className="flex items-center justify-center gap-2 mb-2">
            <ShieldCheck size={20} style={{ color: data.primaryColor }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: data.primaryColor, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{t.collections.verifyValid}</p>
          </div>

          {data.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.imageUrl} alt={data.productName} style={{ maxWidth: '100%', maxHeight: 220, objectFit: 'contain', margin: '20px auto', borderRadius: 16 }} />
          )}

          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{data.collectionName}</h1>
          {data.athleteName && <p style={{ fontSize: 15, color: '#D1D5DB', marginTop: 6 }}>{data.athleteName}</p>}

          <div className="flex items-center justify-center gap-3 mt-6">
            <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: `${data.primaryColor}22`, color: data.primaryColor, border: `1px solid ${data.primaryColor}55` }}>{data.tierName}</span>
            <span style={{ fontSize: 20, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{data.displayNumber}</span>
          </div>

          <div style={{ marginTop: 24, borderTop: '1px solid #27272A', paddingTop: 20, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Row label="Year" value={String(data.collectionYear)} />
            {data.signed && <Row label="Signed" value={data.signedAt ? new Date(data.signedAt).toLocaleDateString() : 'Yes'} />}
            {data.signedLocation && <Row label="Location" value={data.signedLocation} />}
            {data.ownerDisplayName && <Row label="Owner" value={data.ownerDisplayName} />}
          </div>

          {data.authenticationStatement && (
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 20, lineHeight: 1.6 }}>{data.authenticationStatement}</p>
          )}
        </div>
      )}
    </div>
  )
}

function StatePanel({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div className="flex items-center justify-center mb-4">{icon}</div>
      <p style={{ fontSize: 15, color: '#D1D5DB' }}>{title}</p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ fontSize: 12, color: '#6B7280' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{value}</span>
    </div>
  )
}
