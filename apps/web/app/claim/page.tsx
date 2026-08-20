'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Loader2, ShieldCheck } from 'lucide-react'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import LoginModal from '../../components/LoginModal'

const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-[#101828] outline-none focus:border-[#0870E2] transition-colors'

export default function ClaimPage() {
  const [showLogin, setShowLogin] = useState(false)

  const [schoolName, setSchoolName] = useState('')
  const [city, setCity] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!schoolName.trim() || !contactName.trim() || !contactEmail.trim()) return
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/claim/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolName, city, contactName, contactEmail, phone, message }),
      })
      if (!res.ok) { setError('Something went wrong. Please try again.'); return }
      setDone(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Header onOpenLoginModal={() => setShowLogin(true)} />

      <main className="min-h-screen bg-[#F9FAFB]">
        <div className="max-w-xl mx-auto px-5 pt-16 pb-24">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-6 h-6 text-[#0870E2]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#101828] tracking-tight">Claim Your School</h1>
            <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
              Already running a martial arts academy? Tell us which one is yours and
              we&apos;ll verify ownership and send you a link to take control of your listing —
              bookings, students, payments and more.
            </p>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            {done ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="text-sm font-bold text-[#101828] mb-1">Request sent!</p>
                <p className="text-xs text-gray-400">
                  We&apos;ll verify your ownership and email you a claim link shortly.
                </p>
                <Link href="/explore" className="inline-block mt-5 text-sm font-semibold text-[#0870E2]">
                  ← Back to Explore
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">School name *</label>
                  <input value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="e.g. Roger Gracie Academy" className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">City</label>
                  <input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. London, GB" className={inputClass} />
                </div>
                <div className="h-px bg-gray-100 my-1" />
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Your name *</label>
                  <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Your full name" className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Your email *</label>
                  <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="you@example.com" className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Phone</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Optional" className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Anything else?</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Optional" rows={3} className={`${inputClass} resize-none`} />
                </div>

                {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting || !schoolName.trim() || !contactName.trim() || !contactEmail.trim()}
                  className="w-full h-11 mt-1 rounded-xl bg-[#0870E2] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
                >
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Sending…</> : 'Request to claim'}
                </button>
              </form>
            )}
          </div>

          <p className="text-xs text-gray-400 text-center mt-6">
            Already received an invitation link from us? Use that link directly — no need to submit this form.
          </p>
          <p className="text-xs text-gray-400 text-center mt-2">
            Not listed with us yet?{' '}
            <Link href="/register?type=school" className="text-[#0870E2] font-semibold">
              Register your school
            </Link>{' '}
            instead.
          </p>
        </div>
      </main>

      <Footer />
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  )
}
