'use client'

import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { CheckCircle } from 'lucide-react'
import { useT } from '../../../lib/i18n/LanguageContext'

export default function MyQRPage() {
  const t = useT()
  const [userId, setUserId]   = useState<string | null>(null)
  const [name, setName]       = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/my')
      .then(r => r.json())
      .then(d => {
        setUserId(d.user?.id ?? null)
        setName(d.user?.name ?? d.user?.email ?? '')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const qrValue = userId ? `martial:checkin:${userId}` : ''

  return (
    <div className="min-h-screen pb-4" style={{ background: '#F2F2F7' }}>
      <div className="max-w-lg mx-auto">

        <div className="px-4 md:px-6 pt-4 md:pt-7 pb-4">
          <p className="text-xs" style={{ color: '#6B6B70' }}>{t.my.navDashboard}</p>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#1C1C1E', letterSpacing: '-0.5px' }}>{t.my.navQrScanner}</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-60">
            <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#007AFF', borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <>
            {/* QR card */}
            <div className="mx-4 md:mx-6 mb-4 rounded-3xl p-8 flex flex-col items-center" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)' }}>
              <p className="text-xs font-medium uppercase tracking-widest mb-6" style={{ color: '#6B6B70', letterSpacing: '1.2px' }}>{t.my.qrScanToCheckIn}</p>

              {qrValue ? (
                <div className="p-4 rounded-2xl mb-6" style={{ background: '#F2F2F7' }}>
                  <QRCodeSVG value={qrValue} size={200} level="M" fgColor="#1C1C1E" bgColor="transparent" />
                </div>
              ) : (
                <div className="w-52 h-52 rounded-2xl flex items-center justify-center mb-6" style={{ background: '#F2F2F7' }}>
                  <p className="text-sm" style={{ color: '#AEAEB2' }}>{t.my.qrNotAvailable}</p>
                </div>
              )}

              <p className="text-base font-semibold mb-1" style={{ color: '#1C1C1E' }}>{name}</p>
              <p className="text-xs text-center" style={{ color: '#6B6B70' }}>
                {t.my.qrShowToInstructor}
              </p>
            </div>

            {/* Steps */}
            <div className="mx-4 md:mx-6 mb-4 rounded-2xl overflow-hidden" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)' }}>
              <p className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B6B70' }}>{t.my.qrHowItWorks}</p>
              {[
                t.my.qrStep1,
                t.my.qrStep2,
                t.my.qrStep3,
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3" style={i < 2 ? { borderBottom: '0.5px solid rgba(60,60,67,.12)' } : {}}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(0,122,255,.10)' }}>
                    <span className="text-xs font-semibold" style={{ color: '#007AFF' }}>{i + 1}</span>
                  </div>
                  <p className="text-sm" style={{ color: '#1C1C1E' }}>{text}</p>
                </div>
              ))}
            </div>

            {/* Tip */}
            <div className="mx-4 md:mx-6 mb-4 rounded-2xl p-4 flex items-start gap-3" style={{ background: 'rgba(0,122,255,.06)', border: '1px solid rgba(0,122,255,.12)' }}>
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#007AFF' }} />
              <p className="text-xs leading-relaxed" style={{ color: '#007AFF' }}>
                {t.my.qrTip}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
