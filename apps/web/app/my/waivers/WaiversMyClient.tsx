'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { FileSignature, CheckCircle2, X, Check } from 'lucide-react'
import { useT } from '../../../lib/i18n/LanguageContext'
import { isStudentContextRequired, chooseProfileUrl } from '../../../lib/studentContext'
import { myFetch } from '../../../lib/api/myFetch'
import SignaturePad, { type SignaturePadHandle } from '../../../components/SignaturePad'

type Waiver = {
  id: string
  title: string
  content: string
  version: string
  schoolName: string
  signedAt: string | null
  revoked: boolean
  pending: boolean
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function SignModal({ waiver, onClose, onSigned }: { waiver: Waiver; onClose: () => void; onSigned: () => void }) {
  const t = useT()
  const [agreed, setAgreed] = useState(false)
  const [typedName, setTypedName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const padRef = useRef<SignaturePadHandle>(null)

  async function handleSubmit() {
    if (!agreed) { setError(t.my.agreementRequiredError); return }
    if (!typedName.trim()) return
    setSaving(true); setError('')
    let res: Response
    try {
      res = await myFetch(`/api/my/waivers/${waiver.id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ typedName: typedName.trim(), signatureDataUrl: padRef.current?.toDataURL() ?? null }),
      })
    } catch {
      setSaving(false)
      setError(t.my.networkError)
      return
    }
    setSaving(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Error')
      return
    }
    onSigned()
  }

  const canSubmit = agreed && typedName.trim() && !saving

  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div onClick={e => e.stopPropagation()}
        className="relative w-full md:w-[520px] bg-white rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden">
        <div className="shrink-0 flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-[#111827]">{waiver.title}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{waiver.schoolName} · v{waiver.version}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100">
            <X size={14} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50 p-4">
            {waiver.content}
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#0870E2]" />
            <span className="text-sm font-medium text-[#111827]">{t.my.agreeToWaiverLabel}</span>
          </label>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t.my.yourFullName}</label>
            <input type="text" value={typedName} onChange={e => setTypedName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0870E2]" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t.my.drawSignatureLabel}</label>
            <SignaturePad ref={padRef} />
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-[11px] text-gray-400">{t.my.orTypeYourName}</p>
              <button onClick={() => padRef.current?.clear()} className="text-[11px] font-semibold text-[#0870E2]">
                {t.my.clearSignature}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="shrink-0 px-6 py-4 border-t border-gray-100">
          <button onClick={handleSubmit} disabled={!canSubmit}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white"
            style={{ background: canSubmit ? '#0870E2' : '#93C5FD' }}>
            {saving ? t.my.signingInProgress : t.my.submitSignature}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function WaiversMyClient() {
  const t = useT()
  const router = useRouter()
  const pathname = usePathname()
  const [waivers, setWaivers] = useState<Waiver[]>([])
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState<Waiver | null>(null)
  const [toast, setToast] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    myFetch('/api/my/waivers').then(r => r.json()).then(d => {
      if (isStudentContextRequired(d)) { router.replace(chooseProfileUrl(pathname)); return }
      setWaivers(d.waivers ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [router, pathname])

  useEffect(() => { load() }, [load])

  const pending = waivers.filter(w => w.pending)
  const signed = waivers.filter(w => !w.pending)

  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-[#101828]">{t.my.waiversTitleMy}</h1>
        <p className="text-xs text-gray-400">{t.my.waiversSubtitleMy}</p>
      </div>

      <div className="p-6 space-y-6 max-w-2xl">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-[#0870E2] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : waivers.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-10 shadow-sm text-center">
            <FileSignature className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">{t.my.noWaiversToSign}</p>
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <div className="space-y-2.5">
                {pending.map(w => (
                  <div key={w.id} className="bg-white border rounded-2xl p-4 shadow-sm flex items-center gap-3"
                    style={{ borderColor: '#FDE68A' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#FFFBEB' }}>
                      <FileSignature size={17} style={{ color: '#D97706' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#111827] truncate">{w.title}</p>
                      <p className="text-[11px] text-gray-400">{w.schoolName} · {t.my.pendingWaiverBadge}</p>
                    </div>
                    <button onClick={() => setSigning(w)}
                      className="shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: '#0870E2' }}>
                      {t.my.signWaiverCta}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {signed.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="divide-y divide-gray-50">
                  {signed.map(w => (
                    <div key={w.id} className="flex items-center gap-3 px-5 py-3.5">
                      <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#101828] truncate">{w.title}</p>
                        <p className="text-[11px] text-gray-400">{w.schoolName}{w.signedAt ? ` · ${fmtDate(w.signedAt)}` : ''}</p>
                      </div>
                      <span className="text-[11px] font-semibold text-green-600">{t.my.signedWaiverBadge}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {signing && (
        <SignModal
          waiver={signing}
          onClose={() => setSigning(null)}
          onSigned={() => { setSigning(null); load(); setToast(true); setTimeout(() => setToast(false), 3000) }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[210] flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-white shadow-xl border border-green-100">
          <div className="w-7 h-7 rounded-full flex items-center justify-center bg-green-50">
            <Check size={14} className="text-green-600" strokeWidth={3} />
          </div>
          <p className="text-sm font-semibold text-[#111827]">{t.my.waiverSignedToast}</p>
        </div>
      )}
    </div>
  )
}
