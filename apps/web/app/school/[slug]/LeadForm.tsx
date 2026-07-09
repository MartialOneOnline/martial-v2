'use client'

import { useState } from 'react'
import { CheckCircle, ChevronDown, Loader2 } from 'lucide-react'

export default function LeadForm({ slug, schoolName, disciplines }: {
  slug: string
  schoolName: string
  disciplines: string[]
}) {
  const [name,       setName]       = useState('')
  const [email,      setEmail]      = useState('')
  const [phone,      setPhone]      = useState('')
  const [message,    setMessage]    = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done,       setDone]       = useState(false)
  const [error,      setError]      = useState('')
  const [open,       setOpen]       = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true); setError('')
    try {
      const res = await fetch(`/api/public/schools/${slug}/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, message }),
      })
      if (res.status === 409) { setError('Ya tienes una solicitud registrada.'); return }
      if (!res.ok) { setError('Algo salió mal. Inténtalo de nuevo.'); return }
      setDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-8 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
          <CheckCircle className="w-6 h-6 text-emerald-500" />
        </div>
        <p className="text-sm font-bold text-[#101828] mb-1">¡Solicitud enviada!</p>
        <p className="text-xs text-gray-400">{schoolName} se pondrá en contacto contigo pronto.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div>
          <p className="text-sm font-bold text-[#101828]">Contactar</p>
          <p className="text-xs text-gray-400 mt-0.5">Te responderemos lo antes posible</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className="grid transition-[grid-template-rows] duration-200 ease-out" style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
        <div className="overflow-hidden">
          <form onSubmit={handleSubmit} className="px-5 pb-5 pt-1 flex flex-col gap-3 border-t border-gray-50">
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Tu nombre *"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-[#101828] outline-none focus:border-[#0870E2] transition-colors"
            />
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-[#101828] outline-none focus:border-[#0870E2] transition-colors"
            />
            <input
              type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="Teléfono / WhatsApp"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-[#101828] outline-none focus:border-[#0870E2] transition-colors"
            />
            <textarea
              value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Mensaje (opcional)"
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-[#101828] outline-none focus:border-[#0870E2] transition-colors resize-none"
            />
            {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button
              type="submit" disabled={submitting || !name.trim()}
              className="w-full h-11 rounded-xl bg-[#0870E2] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Enviando…</> : 'Enviar mensaje'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
