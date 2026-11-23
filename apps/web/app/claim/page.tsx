'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Loader2, ShieldCheck } from 'lucide-react'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import LoginModal from '../../components/LoginModal'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-[#101828] outline-none focus:border-[#0870E2] transition-colors'

export default function ClaimPage() {
  const { t, locale } = useLanguage()
  const c = t.claimFlow
  const [showLogin, setShowLogin] = useState(false)

  const [schoolName, setSchoolName] = useState('')
  const [schoolSlug, setSchoolSlug] = useState('')
  const [fromSchoolName, setFromSchoolName] = useState('')
  const [city, setCity] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  // Started from a school page: /claim?school=<slug>&name=<name>. The slug is
  // re-validated by the server; the name is only a display hint.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const slug = params.get('school')?.slice(0, 200) ?? ''
    const name = params.get('name')?.slice(0, 160) ?? ''
    if (slug) { setSchoolSlug(slug); setFromSchoolName(name) }
    if (name) setSchoolName(name)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting || !schoolName.trim() || !contactName.trim() || !contactEmail.trim()) return
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/claim/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolName, city, contactName, contactEmail, phone, message, schoolSlug: schoolSlug || undefined, locale }),
      })
      if (res.status === 429) { setError(c.errorRate); return }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(typeof data.error === 'string' && data.error.includes('contactEmail') ? c.errorEmail : c.errorGeneric)
        return
      }
      setDone(true)
    } catch {
      setError(c.errorGeneric)
    } finally {
      setSubmitting(false)
    }
  }

  const label = 'text-xs font-semibold text-gray-500 mb-1 block'

  return (
    <>
      <Header onOpenLoginModal={() => setShowLogin(true)} />

      <main className="min-h-screen bg-[#F9FAFB]">
        <div className="max-w-xl mx-auto px-4 sm:px-5 pt-12 sm:pt-16 pb-24">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-6 h-6 text-[#0870E2]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#101828] tracking-tight">{c.title}</h1>
            <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">{c.intro}</p>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 sm:p-6">
            {done ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="text-sm font-bold text-[#101828] mb-1">{c.sentTitle}</p>
                <p className="text-xs text-gray-500">{c.sentBody}</p>
                <Link href="/explore" className="inline-block mt-5 text-sm font-semibold text-[#0870E2]">{c.backExplore}</Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                {fromSchoolName && (
                  <p className="text-xs text-[#0E3A7A] bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                    {c.fromSchool.replace('{school}', fromSchoolName)}
                  </p>
                )}
                <div>
                  <label className={label}>{c.schoolName}</label>
                  <input value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder={c.schoolNamePh} maxLength={160} className={inputClass} />
                </div>
                <div>
                  <label className={label}>{c.city}</label>
                  <input value={city} onChange={e => setCity(e.target.value)} placeholder={c.cityPh} maxLength={120} className={inputClass} />
                </div>
                <div className="h-px bg-gray-100 my-1" />
                <div>
                  <label className={label}>{c.yourName}</label>
                  <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder={c.yourNamePh} maxLength={120} autoComplete="name" className={inputClass} />
                </div>
                <div>
                  <label className={label}>{c.yourEmail}</label>
                  <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="you@example.com" maxLength={254} autoComplete="email" className={inputClass} />
                </div>
                <div>
                  <label className={label}>{c.phone}</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder={c.optional} maxLength={40} autoComplete="tel" className={inputClass} />
                </div>
                <div>
                  <label className={label}>{c.message}</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={c.optional} rows={3} maxLength={2000} className={`${inputClass} resize-none`} />
                </div>

                {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting || !schoolName.trim() || !contactName.trim() || !contactEmail.trim()}
                  className="w-full h-11 mt-1 rounded-xl bg-[#0870E2] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
                >
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />{c.sending}</> : c.submit}
                </button>
              </form>
            )}
          </div>

          <p className="text-xs text-gray-400 text-center mt-6">{c.haveLink}</p>
          <p className="text-xs text-gray-400 text-center mt-2">
            {c.notListed}{' '}
            <Link href="/register?type=school" className="text-[#0870E2] font-semibold">{c.registerSchool}</Link>
            {c.instead ? ` ${c.instead}` : ''}
          </p>
        </div>
      </main>

      <Footer />
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  )
}
