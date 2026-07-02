'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { CheckCircle, Loader2 } from 'lucide-react'

interface SchoolInfo {
  name: string
  city: string | null
  logoUrl: string | null
  tagline: string | null
  disciplines: string[]
}

export default function JoinPage() {
  const { slug } = useParams<{ slug: string }>()
  const [school, setSchool] = useState<SchoolInfo | null>(null)
  const [notFound, setNotFound] = useState(false)

  const [name,         setName]         = useState('')
  const [email,        setEmail]        = useState('')
  const [phone,        setPhone]        = useState('')
  const [interestedIn, setInterestedIn] = useState('')
  const [message,      setMessage]      = useState('')
  const [submitting,   setSubmitting]   = useState(false)
  const [done,         setDone]         = useState(false)
  const [error,        setError]        = useState('')

  useEffect(() => {
    fetch(`/api/public/schools/${slug}/info`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => setSchool(d.school))
      .catch(() => setNotFound(true))
  }, [slug])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Por favor, introduce tu nombre.'); return }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/public/schools/${slug}/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, interestedIn, message }),
      })
      if (res.status === 409) { setError('Ya tienes una solicitud registrada con este email.'); return }
      if (!res.ok) { setError('Algo salió mal. Inténtalo de nuevo.'); return }
      setDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <p style={{ color: '#6B7280', fontSize: 15 }}>School not found.</p>
      </div>
    )
  }

  if (!school) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={24} style={{ color: '#0870E2', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: 'sans-serif' }}>
        <div style={{ maxWidth: 420, width: '100%', background: '#fff', borderRadius: 20, padding: 40, textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle size={32} style={{ color: '#22C55E' }} />
          </div>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            ¡Solicitud enviada!
          </p>
          <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 24px', lineHeight: 1.6 }}>
            El equipo de <strong>{school.name}</strong> se pondrá en contacto contigo pronto.
          </p>
          {email && (
            <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>
              Hemos enviado una confirmación a <strong>{email}</strong>
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #F3F4F6', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
        {school.logoUrl ? (
          <Image src={school.logoUrl} alt={school.name} width={44} height={44} style={{ borderRadius: 12, objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#0870E2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18 }}>
            {school.name.charAt(0)}
          </div>
        )}
        <div>
          <p style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>{school.name}</p>
          {school.city && <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>{school.city}</p>}
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 16px' }}>
        {/* Hero text */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <p style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '0 0 8px', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
            Únete a {school.name}
          </p>
          <p style={{ fontSize: 14, color: '#6B7280', margin: 0, lineHeight: 1.6 }}>
            {school.tagline ?? 'Rellena el formulario y nos ponemos en contacto contigo.'}
          </p>
          {school.disciplines.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 12 }}>
              {school.disciplines.map(d => (
                <span key={d} style={{ fontSize: 11, fontWeight: 600, background: '#EFF6FF', color: '#0870E2', borderRadius: 999, padding: '3px 10px', border: '1px solid #BFDBFE' }}>{d}</span>
              ))}
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 20, padding: 28, boxShadow: '0 2px 16px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              Nombre completo <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Teléfono / WhatsApp</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+34 600 000 000"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>¿Qué te interesa?</label>
            <select value={interestedIn} onChange={e => setInterestedIn(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 14, color: '#374151', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
              <option value="">Selecciona una opción</option>
              {school.disciplines.length > 0
                ? school.disciplines.map(d => <option key={d} value={d}>{d}</option>)
                : <>
                    <option value="Clase de prueba">Clase de prueba</option>
                    <option value="Membresía">Membresía</option>
                    <option value="Más información">Más información</option>
                  </>}
              <option value="Clase de prueba">Clase de prueba gratuita</option>
              <option value="Más información">Solo quiero información</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Mensaje (opcional)</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
              placeholder="Cuéntanos algo sobre ti o lo que buscas…"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 14, color: '#111827', outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>

          {error && (
            <p style={{ fontSize: 13, color: '#EF4444', margin: 0, background: '#FEF2F2', borderRadius: 8, padding: '8px 12px' }}>{error}</p>
          )}

          <button type="submit" disabled={submitting || !name.trim()}
            style={{ padding: '12px 0', borderRadius: 12, background: '#0870E2', color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', opacity: (submitting || !name.trim()) ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {submitting ? <><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Enviando…</> : 'Enviar solicitud'}
          </button>

          <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', margin: 0 }}>
            Tu información es privada y solo se comparte con {school.name}.
          </p>
        </form>
      </div>
    </div>
  )
}
