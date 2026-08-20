'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Award, ShieldCheck, Play, FileText } from 'lucide-react'

// A single reusable, config-driven digital card — composed from collection +
// tier + unit data, never from stored HTML. The same component renders in
// the admin preview, "My Collection", and (front + a reduced set of back
// fields) the public verification page — visual identity per drop comes
// entirely from the tier's primaryColor/secondaryColor/visualStyle, so a
// future athlete/brand collection reuses this without any code change.
export interface DigitalCardData {
  productName: string
  productImageUrl?: string | null
  athleteName?: string | null
  brandName?: string | null
  collectionName: string
  collectionYear: number
  displayNumber: string // "07/50"
  tierName: string
  primaryColor: string
  secondaryColor: string
  signed: boolean
  signedAt?: string | null
  signedLocation?: string | null
  authenticationStatement?: string | null
  verificationUrl?: string | null
  // Private fields — pass only when the viewer is authorized (owner/admin);
  // the component itself has no access-control logic, it just doesn't
  // render a section if the field is absent.
  videoUrl?: string | null
  certificateUrl?: string | null
}

export default function DigitalCard({ data }: { data: DigitalCardData }) {
  const [flipped, setFlipped] = useState(false)
  const { primaryColor, secondaryColor } = data

  return (
    <div style={{ perspective: 1200, width: '100%', maxWidth: 380 }}>
      <div
        onClick={() => setFlipped(f => !f)}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setFlipped(f => !f) }}
        style={{
          position: 'relative', width: '100%', aspectRatio: '5 / 8',
          transformStyle: 'preserve-3d', transition: 'transform 0.6s cubic-bezier(0.4,0,0.2,1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)', cursor: 'pointer',
        }}
      >
        {/* FRONT */}
        <div style={{
          position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
          borderRadius: 20, overflow: 'hidden',
          background: `linear-gradient(160deg, #0A0A0A 0%, #111827 60%, ${primaryColor}22 100%)`,
          border: `1px solid ${primaryColor}55`, boxShadow: `0 20px 60px rgba(0,0,0,0.45)`,
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '20px 22px 0' }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: secondaryColor, margin: 0 }}>
              {data.brandName ?? 'Martial'}
            </p>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '4px 0 0', letterSpacing: '-0.01em' }}>{data.collectionName}</p>
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 22px' }}>
            {data.productImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.productImageUrl} alt={data.productName} style={{ maxWidth: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 12 }} />
            ) : (
              <Award size={64} style={{ color: primaryColor, opacity: 0.6 }} />
            )}
          </div>

          <div style={{ padding: '0 22px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.athleteName && (
              <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>{data.athleteName}</p>
            )}
            <div className="flex items-center justify-between">
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
                background: `${primaryColor}22`, color: primaryColor, border: `1px solid ${primaryColor}55`,
              }}>{data.tierName}</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                {data.displayNumber}
              </span>
            </div>
            {data.signed && (
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={13} style={{ color: secondaryColor }} />
                <span style={{ fontSize: 11, color: secondaryColor, fontWeight: 600 }}>Signed piece</span>
              </div>
            )}
          </div>
        </div>

        {/* BACK */}
        <div style={{
          position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)',
          borderRadius: 20, overflow: 'hidden', background: '#0A0A0A',
          border: `1px solid ${primaryColor}55`, boxShadow: `0 20px 60px rgba(0,0,0,0.45)`,
          display: 'flex', flexDirection: 'column', padding: 22, gap: 12, color: '#fff',
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: secondaryColor, margin: 0 }}>
            {data.displayNumber} · {data.tierName} · {data.collectionYear}
          </p>

          {data.authenticationStatement && (
            <p style={{ fontSize: 12, lineHeight: 1.6, color: '#D1D5DB', margin: 0 }}>{data.authenticationStatement}</p>
          )}

          {(data.signedAt || data.signedLocation) && (
            <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>
              Signed {data.signedAt ? new Date(data.signedAt).toLocaleDateString() : ''}{data.signedLocation ? ` — ${data.signedLocation}` : ''}
            </p>
          )}

          <div className="flex-1 flex items-center justify-center">
            {data.verificationUrl ? (
              <div style={{ background: '#fff', padding: 10, borderRadius: 12 }}>
                <QRCodeSVG value={data.verificationUrl} size={110} level="M" fgColor="#0A0A0A" bgColor="#fff" />
              </div>
            ) : (
              <p style={{ fontSize: 11, color: '#6B7280' }}>QR unavailable</p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {data.videoUrl && (
              <a href={data.videoUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                style={{ fontSize: 11, fontWeight: 600, background: `${primaryColor}22`, color: primaryColor, textDecoration: 'none' }}>
                <Play size={11} />Exclusive video
              </a>
            )}
            {data.certificateUrl && (
              <a href={data.certificateUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                style={{ fontSize: 11, fontWeight: 600, background: '#ffffff15', color: '#fff', textDecoration: 'none' }}>
                <FileText size={11} />Certificate
              </a>
            )}
          </div>
        </div>
      </div>
      <p style={{ textAlign: 'center', fontSize: 11, color: '#9CA3AF', marginTop: 10 }}>Tap card to flip</p>
    </div>
  )
}
