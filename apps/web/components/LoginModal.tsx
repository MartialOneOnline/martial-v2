'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowLeft } from 'lucide-react'
import { createClient } from '../lib/supabase/client'
import SchoolPicker from './SchoolPicker'
import type { SchoolContext } from '@/lib/auth/contexts'

// ── Icons ─────────────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}
function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="#000000">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.14-2.15 1.26-2.13 3.75.03 2.99 2.62 3.99 2.65 4l-.07.27zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  )
}
function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  )
}
function EyeIcon({ open }: { open: boolean }) {
  if (open) return <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
  return <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
}

function SSOButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full h-[52px] flex items-center gap-4 px-5 border border-[#e8e8e8] rounded-[12px] bg-white hover:bg-[#fafafa] hover:border-[#d0d0d0] text-[14px] font-semibold text-[#1a1a1a] cursor-pointer transition-all">
      {icon}
      <span className="flex-1 text-center pr-5">{label}</span>
    </button>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface LoginModalProps {
  onClose: () => void
  onOpenRegister?: () => void
  redirectTo?: string
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function LoginModal({ onClose, onOpenRegister, redirectTo }: LoginModalProps) {
  const router   = useRouter()
  const supabase = createClient()

  const [view, setView]             = useState<'sso' | 'email'>('sso')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [showPass, setShowPass]     = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [emailErr, setEmailErr]     = useState('')
  const [passErr, setPassErr]       = useState('')
  const [pickerSchools, setPickerSchools] = useState<SchoolContext[] | null>(null)

  const resolveRedirect = async () => {
    try {
      // If an explicit redirect was requested (e.g. from /admin), honour it
      if (redirectTo) {
        router.push(redirectTo)
        return
      }

      const res = await fetch('/api/auth/me')
      const json = await res.json()

      // 1. SUPERADMIN → /admin
      if (json.user?.globalRole === 'SUPERADMIN') {
        router.push('/admin')
        return
      }

      const schools: SchoolContext[] = json.contexts?.schools ?? []
      const staffSchools = schools.filter(
        s => s.role !== 'STUDENT'
      )

      // 2. Has staff/owner access to schools
      if (staffSchools.length === 1 && staffSchools[0]) {
        await fetch('/api/auth/context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schoolId: staffSchools[0].schoolId }),
        })
        router.push('/dashboard')
        return
      }

      if (staffSchools.length > 1) {
        // Show school picker — includes personal option
        setPickerSchools(staffSchools)
        return
      }

      // 3. Student or no context → /my
      router.push('/my')
    } catch {
      router.push('/my')
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailErr(''); setPassErr(''); setError('')
    let valid = true
    if (!email) { setEmailErr('Please provide a valid email address.'); valid = false }
    if (!password) { setPassErr('Password field cannot be left blank.'); valid = false }
    if (!valid) return

    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) { setError(err.message); return }
    onClose()
    await resolveRedirect()
  }

  // School picker shown after login when user has multiple staff roles
  if (pickerSchools) {
    return (
      <SchoolPicker
        schools={pickerSchools}
        onSelect={(schoolId) => {
          router.push('/dashboard')
        }}
        onPersonal={() => {
          router.push('/explore')
        }}
      />
    )
  }

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50"
        onClick={onClose}
      />

      {/* Card */}
      <motion.div key="card"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: 'spring', damping: 26, stiffness: 340 }}
        className="fixed inset-0 flex items-center justify-center z-50 px-4 pointer-events-none"
      >
        <div className="relative w-full max-w-[460px] bg-white rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.18)] pointer-events-auto px-8 pt-10 pb-8"
          onClick={e => e.stopPropagation()}>

          {/* Back button (email view only) */}
          {view === 'email' && (
            <button onClick={() => { setView('sso'); setError(''); setEmailErr(''); setPassErr('') }}
              className="absolute top-4 left-4 w-9 h-9 flex items-center justify-center rounded-full bg-[#f5f5f5] hover:bg-[#ebebeb] text-[#667085] cursor-pointer transition-colors"
              aria-label="Back">
              <ArrowLeft className="w-[18px] h-[18px]" />
            </button>
          )}

          {/* Close */}
          <button onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-[#f5f5f5] hover:bg-[#ebebeb] text-[#667085] hover:text-[#101828] cursor-pointer transition-colors"
            aria-label="Close">
            <X className="w-[18px] h-[18px]" />
          </button>

          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 overflow-hidden rounded-xl shrink-0">
              <Image src="/martial-logo.png" alt="Martial App" width={56} height={56} className="object-contain" />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* ── SSO view ───────────────────────────────────────────────────── */}
            {view === 'sso' && (
              <motion.div key="sso"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

                <h2 className="text-[22px] font-bold text-[#061229] text-center mb-1">Welcome to Martial</h2>
                <p className="text-[14px] text-[#6b7280] text-center mb-7">Your martial journey starts here</p>

                <div className="flex flex-col gap-3">
                  <SSOButton icon={<GoogleIcon />}   label="Continue with Google"   onClick={() => {}} />
                  <SSOButton icon={<FacebookIcon />} label="Continue with Facebook" onClick={() => {}} />
                  <SSOButton icon={<AppleIcon />}    label="Continue with Apple"    onClick={() => {}} />
                </div>

                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-[#e8e8e8]" />
                  <span className="text-[12px] font-bold text-[#9ca3af] uppercase tracking-wider">or</span>
                  <div className="flex-1 h-px bg-[#e8e8e8]" />
                </div>

                <SSOButton icon={<EmailIcon />} label="Continue with Email" onClick={() => setView('email')} />

                <p className="text-[13px] text-[#6b7280] text-center mt-6">
                  Don&apos;t have an account?{' '}
                  <span onClick={() => { onClose(); onOpenRegister?.() }}
                    className="text-[#0870E2] font-semibold underline cursor-pointer hover:text-[#004e7c] transition-colors">
                    Register
                  </span>
                </p>
              </motion.div>
            )}

            {/* ── Email view ─────────────────────────────────────────────────── */}
            {view === 'email' && (
              <motion.div key="email"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>

                <h2 className="text-[22px] font-bold text-[#061229] text-center mb-1">Welcome Back</h2>
                <p className="text-[14px] text-[#6b7280] text-center mb-6">Login to continue your martial journey</p>

                <form onSubmit={handleLogin} noValidate className="space-y-4">
                  {/* Email */}
                  <div>
                    <label className="block text-[14px] font-semibold text-[#061229] mb-1.5">Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="Enter Email"
                      className={`w-full h-[52px] px-4 rounded-[10px] border text-[16px] text-[#4f4f4f] outline-none focus:border-[#3d86af] transition-colors ${emailErr ? 'border-[#e43535]' : 'border-[#e0e0e0]'}`} />
                    {emailErr && <p className="text-[#e43535] text-[13px] mt-1">{emailErr}</p>}
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-[14px] font-semibold text-[#061229] mb-1.5">Password</label>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                        placeholder="Enter Password"
                        className={`w-full h-[52px] px-4 pr-12 rounded-[10px] border text-[16px] text-[#4f4f4f] outline-none focus:border-[#3d86af] transition-colors ${passErr ? 'border-[#e43535]' : 'border-[#e0e0e0]'}`} />
                      <button type="button" onClick={() => setShowPass(!showPass)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer">
                        <EyeIcon open={showPass} />
                      </button>
                    </div>
                    {passErr && <p className="text-[#e43535] text-[13px] mt-1">{passErr}</p>}
                  </div>

                  {/* Forgot password */}
                  <div className="flex justify-end -mt-1">
                    <span className="text-[13px] font-medium text-[#0870E2] cursor-pointer hover:underline">
                      Forgot Password?
                    </span>
                  </div>

                  {error && <p className="text-[#e43535] text-[13px] text-center">{error}</p>}

                  <button type="submit" disabled={loading}
                    className="w-full h-[52px] bg-[#c1eafa] hover:bg-[#a8dff7] rounded-[10px] text-[16px] font-semibold text-[#061229] transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer mt-1">
                    {loading ? 'Logging in...' : 'Login'}
                  </button>
                </form>

                <p className="text-[13px] text-[#6b7280] text-center mt-5">
                  Don&apos;t have an account?{' '}
                  <span onClick={() => { onClose(); onOpenRegister?.() }}
                    className="text-[#0870E2] font-semibold underline cursor-pointer hover:text-[#004e7c] transition-colors">
                    Register
                  </span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </motion.div>
    </AnimatePresence>
  )
}
