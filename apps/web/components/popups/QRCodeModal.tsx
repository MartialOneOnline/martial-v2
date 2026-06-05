'use client'

import { X, Download, Share2, QrCode } from 'lucide-react'

interface Props {
  schoolName?: string
  onClose: () => void
}

export default function QRCodeModal({ schoolName = 'Roger Gracie Malaga', onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden" style={{ background: '#fff' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #E5E7EB' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#EEF2FF' }}>
              <QrCode size={15} style={{ color: '#6366F1' }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>QR Code</p>
              <p style={{ fontSize: 11, color: '#9CA3AF' }}>Share your academy profile</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
            <X size={18} />
          </button>
        </div>

        {/* QR Body */}
        <div className="px-5 py-6 flex flex-col items-center gap-5">
          {/* QR Code placeholder — SVG grid */}
          <div className="relative p-4 rounded-2xl" style={{ background: '#fff', border: '2px solid #E5E7EB' }}>
            <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Simulated QR pattern */}
              <rect width="200" height="200" fill="white" />
              {/* Top-left finder */}
              <rect x="10" y="10" width="60" height="60" rx="4" fill="#111827" />
              <rect x="20" y="20" width="40" height="40" rx="2" fill="white" />
              <rect x="28" y="28" width="24" height="24" rx="1" fill="#111827" />
              {/* Top-right finder */}
              <rect x="130" y="10" width="60" height="60" rx="4" fill="#111827" />
              <rect x="140" y="20" width="40" height="40" rx="2" fill="white" />
              <rect x="148" y="28" width="24" height="24" rx="1" fill="#111827" />
              {/* Bottom-left finder */}
              <rect x="10" y="130" width="60" height="60" rx="4" fill="#111827" />
              <rect x="20" y="140" width="40" height="40" rx="2" fill="white" />
              <rect x="28" y="148" width="24" height="24" rx="1" fill="#111827" />
              {/* Data dots */}
              {[80,88,96,104,112,120].flatMap(x =>
                [10,18,26,34,42,50,58,66,74,82,90,98,106,114,122,130,138,146,154,162,170,178,186].map(y => {
                  const hash = (x * 7 + y * 13) % 3
                  return hash === 0 ? <rect key={`${x}-${y}`} x={x} y={y} width="6" height="6" fill="#111827" /> : null
                })
              )}
              {/* Center logo area */}
              <rect x="86" y="86" width="28" height="28" rx="6" fill="white" />
              <rect x="90" y="90" width="20" height="20" rx="4" fill="#0071E3" />
              <text x="100" y="104" textAnchor="middle" fontSize="10" fontWeight="bold" fill="white">M</text>
            </svg>
          </div>

          <div className="text-center">
            <p style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{schoolName}</p>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>martial.app/school/roger-gracie-malaga</p>
          </div>

          <p style={{ fontSize: 12, color: '#6B7280', textAlign: 'center', lineHeight: 1.5, maxWidth: 260 }}>
            Students can scan this code to find your academy and book classes directly.
          </p>

          {/* Actions */}
          <div className="flex gap-3 w-full">
            <button
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer flex items-center justify-center gap-1.5"
              style={{ border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}
            >
              <Download size={13} /> Download
            </button>
            <button
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer flex items-center justify-center gap-1.5"
              style={{ background: '#6366F1', border: 'none' }}
            >
              <Share2 size={13} /> Share
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
