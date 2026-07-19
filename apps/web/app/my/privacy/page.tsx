'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Eye, Trash2, Download } from 'lucide-react'
import { useT } from '../../../lib/i18n/LanguageContext'
import { createClient } from '../../../lib/supabase/client'

function Toggle({ on, onChange, disabled = false }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => onChange(!on)}
      disabled={disabled}
      className="relative shrink-0 transition-colors"
      style={{
        width: 51, height: 31, borderRadius: 15.5,
        background: on ? '#34C759' : '#E5E5EA',
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', padding: 0,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <span
        className="absolute top-0.5 transition-transform"
        style={{
          width: 27, height: 27, borderRadius: '50%', background: '#fff',
          boxShadow: '0 2px 6px rgba(0,0,0,.20)',
          transform: on ? 'translateX(21px)' : 'translateX(2px)',
          display: 'block',
        }}
      />
    </button>
  )
}

export default function MyPrivacyPage() {
  const t = useT()
  const [analytics,  setAnalytics]  = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [actionError, setActionError] = useState(false)

  async function downloadData() {
    setDownloading(true)
    setActionError(false)
    try {
      const res = await fetch('/api/my/export')
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'my-data.json'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      setActionError(true)
    } finally {
      setDownloading(false)
    }
  }

  async function deleteAccount() {
    setDeleting(true)
    setActionError(false)
    try {
      const res = await fetch('/api/my/account', { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      await createClient().auth.signOut()
      window.location.href = '/login'
    } catch {
      setActionError(true)
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen pb-4" style={{ background: '#F2F2F7' }}>
      <div className="max-w-lg mx-auto">

        <div className="px-4 md:px-6 pt-4 md:pt-7 pb-4">
          <p className="text-xs" style={{ color: '#6B6B70' }}>{t.my.navDashboard}</p>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#1C1C1E', letterSpacing: '-0.5px' }}>{t.my.navPrivacy}</h1>
        </div>

        {/* Data controls */}
        <p className="px-4 md:px-6 pb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B6B70' }}>{t.my.privacyDataPermissions}</p>
        <div className="mx-4 md:mx-6 mb-4 rounded-2xl overflow-hidden" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)' }}>
          <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '0.5px solid rgba(60,60,67,.12)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(88,86,214,.10)' }}>
                <Eye className="w-4 h-4" style={{ color: '#5856D6' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: '#1C1C1E' }}>{t.my.privacyAnalytics}</p>
                <p className="text-[11px]" style={{ color: '#6B6B70' }}>{t.my.privacyAnalyticsSub}</p>
              </div>
            </div>
            <Toggle on={analytics} onChange={setAnalytics} disabled />
          </div>

          <button
            type="button"
            onClick={downloadData}
            disabled={downloading}
            className="flex items-center gap-4 px-4 py-3.5"
            style={{ width: '100%', borderBottom: '0.5px solid rgba(60,60,67,.12)', opacity: downloading ? 0.65 : 1 }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(50,173,230,.10)' }}>
              <Download className="w-4 h-4" style={{ color: '#32ADE6' }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-left" style={{ color: '#1C1C1E' }}>{downloading ? `${t.common.loading}…` : t.my.privacyDownload}</p>
              <p className="text-[11px]" style={{ color: '#6B6B70' }}>{t.my.privacyDownloadSub}</p>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0" style={{ color: '#C7C7CC' }} />
          </button>

          <button
            onClick={() => setShowDelete(true)}
            className="w-full flex items-center gap-4 px-4 py-3.5"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,59,48,.10)' }}>
              <Trash2 className="w-4 h-4" style={{ color: '#FF3B30' }} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium" style={{ color: '#FF3B30' }}>{t.my.privacyDeleteAccount}</p>
              <p className="text-[11px]" style={{ color: '#6B6B70' }}>{t.my.privacyDeleteSub}</p>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0" style={{ color: '#C7C7CC' }} />
          </button>
        </div>

        {/* Policy links */}
        <p className="px-4 md:px-6 pb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B6B70' }}>{t.my.privacyLegal}</p>
        <div className="mx-4 md:mx-6 mb-4 rounded-2xl overflow-hidden" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)' }}>
          {[
            { label: t.my.privacyPolicy,  sub: t.my.privacyPolicySub, href: '/legal/privacy' },
            { label: t.my.privacyTerms,   sub: t.my.privacyTermsSub, href: '/legal/terms' },
            { label: t.my.privacyCookies, sub: t.my.privacyCookiesSub, href: '/legal/cookies' },
          ].map(({ label, sub, href }, i) => (
            <Link
              key={label}
              href={href}
              className="flex items-center justify-between px-4 py-3.5"
              style={i < 2 ? { borderBottom: '0.5px solid rgba(60,60,67,.12)' } : {}}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: '#1C1C1E' }}>{label}</p>
                <p className="text-[11px]" style={{ color: '#6B6B70' }}>{sub}</p>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0" style={{ color: '#C7C7CC' }} />
            </Link>
          ))}
        </div>

        <p className="text-center text-xs pb-4 px-6" style={{ color: '#AEAEB2' }}>
          {t.my.privacyFooter}
        </p>
        {actionError && <p className="text-center text-xs pb-4 px-6" style={{ color: '#FF3B30' }}>{t.common.error}</p>}

        {/* Delete confirm modal */}
        {showDelete && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowDelete(false)}
          >
            <div
              className="w-full max-w-lg bg-white rounded-t-3xl p-6 pb-28 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-center mb-4">
                <div className="w-10 h-1 rounded-full" style={{ background: '#E5E5EA' }} />
              </div>
              <h2 className="text-base font-semibold mb-1" style={{ color: '#1C1C1E' }}>{t.my.privacyDeleteTitle}</h2>
              <p className="text-sm mb-6" style={{ color: '#6B6B70' }}>
                {t.my.privacyDeleteDesc}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDelete(false)}
                  className="flex-1 py-3 rounded-2xl text-sm font-semibold"
                  style={{ border: '1px solid #E5E5EA', color: '#6B6B70', background: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
                >
                  {t.common.cancel}
                </button>
                <button
                  onClick={deleteAccount}
                  disabled={deleting}
                  className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white"
                  style={{ background: '#FF3B30', border: 'none', fontFamily: 'inherit', cursor: deleting ? 'wait' : 'pointer', opacity: deleting ? 0.65 : 1 }}
                >
                  {deleting ? `${t.common.loading}…` : t.my.privacyDeleteBtn}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
