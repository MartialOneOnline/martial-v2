'use client'

import React, { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ChevronDown, Search } from 'lucide-react'
import { createClient } from '../lib/supabase/client'

type UserRole = 'student' | 'school'

// ── Country codes ─────────────────────────────────────────────────────────────
const COUNTRIES = [
  { code: 'GB', flag: '🇬🇧', dial: '+44',  name: 'United Kingdom' },
  { code: 'US', flag: '🇺🇸', dial: '+1',   name: 'United States' },
  { code: 'ES', flag: '🇪🇸', dial: '+34',  name: 'Spain' },
  { code: 'PT', flag: '🇵🇹', dial: '+351', name: 'Portugal' },
  { code: 'FR', flag: '🇫🇷', dial: '+33',  name: 'France' },
  { code: 'DE', flag: '🇩🇪', dial: '+49',  name: 'Germany' },
  { code: 'IT', flag: '🇮🇹', dial: '+39',  name: 'Italy' },
  { code: 'NL', flag: '🇳🇱', dial: '+31',  name: 'Netherlands' },
  { code: 'BE', flag: '🇧🇪', dial: '+32',  name: 'Belgium' },
  { code: 'CH', flag: '🇨🇭', dial: '+41',  name: 'Switzerland' },
  { code: 'AT', flag: '🇦🇹', dial: '+43',  name: 'Austria' },
  { code: 'PL', flag: '🇵🇱', dial: '+48',  name: 'Poland' },
  { code: 'SE', flag: '🇸🇪', dial: '+46',  name: 'Sweden' },
  { code: 'NO', flag: '🇳🇴', dial: '+47',  name: 'Norway' },
  { code: 'DK', flag: '🇩🇰', dial: '+45',  name: 'Denmark' },
  { code: 'FI', flag: '🇫🇮', dial: '+358', name: 'Finland' },
  { code: 'IE', flag: '🇮🇪', dial: '+353', name: 'Ireland' },
  { code: 'AU', flag: '🇦🇺', dial: '+61',  name: 'Australia' },
  { code: 'CA', flag: '🇨🇦', dial: '+1',   name: 'Canada' },
  { code: 'NZ', flag: '🇳🇿', dial: '+64',  name: 'New Zealand' },
  { code: 'BR', flag: '🇧🇷', dial: '+55',  name: 'Brazil' },
  { code: 'AR', flag: '🇦🇷', dial: '+54',  name: 'Argentina' },
  { code: 'MX', flag: '🇲🇽', dial: '+52',  name: 'Mexico' },
  { code: 'CO', flag: '🇨🇴', dial: '+57',  name: 'Colombia' },
  { code: 'CL', flag: '🇨🇱', dial: '+56',  name: 'Chile' },
  { code: 'JP', flag: '🇯🇵', dial: '+81',  name: 'Japan' },
  { code: 'KR', flag: '🇰🇷', dial: '+82',  name: 'South Korea' },
  { code: 'CN', flag: '🇨🇳', dial: '+86',  name: 'China' },
  { code: 'IN', flag: '🇮🇳', dial: '+91',  name: 'India' },
  { code: 'PH', flag: '🇵🇭', dial: '+63',  name: 'Philippines' },
  { code: 'TH', flag: '🇹🇭', dial: '+66',  name: 'Thailand' },
  { code: 'SG', flag: '🇸🇬', dial: '+65',  name: 'Singapore' },
  { code: 'MY', flag: '🇲🇾', dial: '+60',  name: 'Malaysia' },
  { code: 'ID', flag: '🇮🇩', dial: '+62',  name: 'Indonesia' },
  { code: 'AE', flag: '🇦🇪', dial: '+971', name: 'UAE' },
  { code: 'SA', flag: '🇸🇦', dial: '+966', name: 'Saudi Arabia' },
  { code: 'ZA', flag: '🇿🇦', dial: '+27',  name: 'South Africa' },
  { code: 'NG', flag: '🇳🇬', dial: '+234', name: 'Nigeria' },
  { code: 'MA', flag: '🇲🇦', dial: '+212', name: 'Morocco' },
  { code: 'EG', flag: '🇪🇬', dial: '+20',  name: 'Egypt' },
  { code: 'RU', flag: '🇷🇺', dial: '+7',   name: 'Russia' },
  { code: 'UA', flag: '🇺🇦', dial: '+380', name: 'Ukraine' },
  { code: 'TR', flag: '🇹🇷', dial: '+90',  name: 'Turkey' },
  { code: 'GR', flag: '🇬🇷', dial: '+30',  name: 'Greece' },
  { code: 'RO', flag: '🇷🇴', dial: '+40',  name: 'Romania' },
  { code: 'CZ', flag: '🇨🇿', dial: '+420', name: 'Czech Republic' },
  { code: 'HU', flag: '🇭🇺', dial: '+36',  name: 'Hungary' },
  { code: 'SK', flag: '🇸🇰', dial: '+421', name: 'Slovakia' },
  { code: 'HR', flag: '🇭🇷', dial: '+385', name: 'Croatia' },
  { code: 'RS', flag: '🇷🇸', dial: '+381', name: 'Serbia' },
]

// ── Country Picker Component ───────────────────────────────────────────────────
function CountryPicker({ value, onChange }: { value: typeof COUNTRIES[0]; onChange: (c: typeof COUNTRIES[0]) => void }) {
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 })
  const btnRef                = useRef<HTMLButtonElement>(null)
  const ref                   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setDropPos({ top: rect.bottom + 4, left: rect.left, width: 256 })
    }
    setOpen(v => !v)
    setQuery('')
  }

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.dial.includes(query) ||
    c.code.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-1 px-2 h-full border-r border-[#e0e0e0] cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <span className="text-[15px]">{value.flag}</span>
        <span className="text-[13px] font-semibold text-black">{value.dial}</span>
        <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={ref}
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999 }}
            className="bg-white border border-[#e0e0e0] rounded-[10px] shadow-2xl overflow-hidden"
          >
            {/* Search */}
            <div className="p-2 border-b border-[#f0f0f0]">
              <div className="flex items-center gap-2 bg-[#f5f5f5] rounded-[7px] px-2.5 py-1.5">
                <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <input
                  autoFocus
                  suppressHydrationWarning
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search country..."
                  className="flex-1 bg-transparent text-[12px] text-[#4f4f4f] placeholder:text-[#b0b0b0] focus:outline-none"
                />
              </div>
            </div>
            {/* List */}
            <div className="max-h-52 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-[12px] text-[#9ca3af] text-center py-4">No results</p>
              ) : filtered.map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => { onChange(c); setOpen(false); setQuery('') }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[#f0f8ff] transition-colors cursor-pointer ${value.code === c.code ? 'bg-[#f0f8ff]' : ''}`}
                >
                  <span className="text-[15px] shrink-0">{c.flag}</span>
                  <span className="text-[12px] text-[#4f4f4f] flex-1 truncate">{c.name}</span>
                  <span className="text-[12px] font-semibold text-[#006197] shrink-0">{c.dial}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function UserIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] shrink-0"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}
function EmailIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] shrink-0"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
}
function LockIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] shrink-0"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
}
function SchoolIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] shrink-0"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
}
function PhoneIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] shrink-0"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2.5" strokeLinecap="round"/></svg>
}
function EyeIcon({ open }: { open: boolean }) {
  if (open) return <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
  return <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
}

// ── SSO icons ─────────────────────────────────────────────────────────────────
function GoogleIcon() {
  return <svg viewBox="0 0 24 24" className="w-6 h-6"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
}
function AppleIcon() {
  return <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#000"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.14-2.15 1.26-2.13 3.75.03 2.99 2.62 3.99 2.65 4l-.07.27zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
}
function MicrosoftIcon() {
  return <svg viewBox="0 0 21 21" className="w-6 h-6"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>
}

// ── Field ─────────────────────────────────────────────────────────────────────
function Field({ label, placeholder, value, onChange, error, type = 'text', leftIcon, rightSlot, optional }: {
  label: string; placeholder: string; value: string
  onChange: (v: string) => void; error?: string; type?: string
  leftIcon?: React.ReactNode; rightSlot?: React.ReactNode; optional?: boolean
}) {
  return (
    <div>
      <label className="block text-[14px] font-semibold text-[#061229] mb-1.5">
        {label}{optional && <span className="text-[#9ca3af] font-normal"> (optional)</span>}
      </label>
      <div className="relative">
        {leftIcon && <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">{leftIcon}</div>}
        <input
          type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className={`w-full h-[46px] ${leftIcon ? 'pl-10' : 'pl-4'} ${rightSlot ? 'pr-12' : 'pr-4'}
                      border rounded-[8px] text-[14px] text-[#4f4f4f] placeholder:text-[#b0b0b0]
                      bg-white focus:outline-none focus:border-[#3d86af] transition-colors
                      ${error ? 'border-[#e43535]' : 'border-[#e0e0e0]'}`}
        />
        {rightSlot && <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{rightSlot}</div>}
      </div>
      {error && <p className="text-[12px] text-[#e43535] mt-1 text-right">{error}</p>}
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface RegisterModalProps {
  onClose: () => void
  onOpenLogin: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function RegisterModal({ onClose, onOpenLogin }: RegisterModalProps) {
  const supabase = createClient()
  const [role, setRole]               = useState<UserRole>('student')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [showPass, setShowPass]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [rememberMe, setRememberMe]   = useState(false)
  const [fullName, setFullName]       = useState('')
  const [username, setUsername]       = useState('')
  const [phone, setPhone]             = useState('')
  const [schoolName, setSchoolName]   = useState('')
  const [contactName, setContactName] = useState('')
  const [schoolPhone, setSchoolPhone] = useState('')
  const [city, setCity]               = useState('')
  type Country = typeof COUNTRIES[number]
  const GB = COUNTRIES.find(c => c.code === 'GB')!
  const [dialCode, setDialCode]             = useState<Country>(GB)
  const [schoolDialCode, setSchoolDialCode] = useState<Country>(GB)
  const [errors, setErrors]           = useState<Record<string, string>>({})
  const [loading, setLoading]         = useState(false)
  const [success, setSuccess]         = useState(false)
  const [apiError, setApiError]       = useState('')

  const clearError = (f: string) => setErrors(p => { const n = { ...p }; delete n[f]; return n })

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (role === 'student') {
      if (!fullName.trim())    e.fullName  = 'Full name is required.'
      if (!username.trim())    e.username  = 'Username is required.'
    } else {
      if (!schoolName.trim())  e.schoolName  = 'School name is required.'
      if (!contactName.trim()) e.contactName = 'Contact name is required.'
      if (!city.trim())        e.city        = 'City is required.'
    }
    if (!email || !emailRe.test(email)) e.email    = 'Please provide a valid email address.'
    if (password.length < 8)            e.password = 'Password must be at least 8 characters.'
    if (confirm !== password)           e.confirm  = 'Passwords do not match.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setApiError('')

    const metadata = role === 'student'
      ? { name: fullName, username, phone: phone ? `${dialCode?.dial}${phone}` : '', role: 'student' }
      : { name: contactName, school_name: schoolName, city, phone: schoolPhone ? `${schoolDialCode?.dial}${schoolPhone}` : '', role: 'school' }

    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: metadata },
    })

    setLoading(false)
    if (error) { setApiError(error.message); return }
    setSuccess(true)
    setTimeout(() => { onClose(); onOpenLogin() }, 2000)
  }

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="register-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50"
        onClick={onClose}
      />

      {/* Card — scrollable */}
      <motion.div
        key="register-card"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: 'spring', damping: 26, stiffness: 340 }}
        className="fixed inset-0 flex items-center justify-center z-50 px-4 py-6 pointer-events-none"
      >
        <div
          className="relative w-full max-w-[500px] max-h-[90vh] overflow-y-auto bg-white rounded-[20px]
                     shadow-[0_20px_60px_rgba(0,0,0,0.18)] pointer-events-auto px-7 pt-8 pb-8"
          onClick={e => e.stopPropagation()}
        >
          {/* Back to login */}
          <button type="button" onClick={() => { onClose(); onOpenLogin() }}
            className="absolute top-5 left-5 w-9 h-9 rounded-full bg-[#f5f5f5] hover:bg-[#e8e8e8] flex items-center justify-center cursor-pointer transition-colors"
            aria-label="Back to login">
            <ArrowLeft className="w-5 h-5 text-[#061229]" />
          </button>

          {/* Close */}
          <button type="button" onClick={onClose}
            className="absolute top-5 right-5 flex items-center gap-1.5 text-[12px] font-semibold text-[#9ca3af] hover:text-[#006197] transition-colors cursor-pointer"
            aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Home
          </button>

          {/* Logo */}
          <div className="flex flex-col items-center gap-2.5 mb-5">
            <div className="w-14 h-14 overflow-hidden rounded-2xl shrink-0">
              <Image src="/martial-logo.png" alt="Martial App" width={56} height={56} className="object-contain" />
            </div>
            <p className="text-[20px] font-black tracking-wider text-slate-800 leading-none">MARTIAL</p>
          </div>

          {/* Title */}
          <h1 className="text-[20px] font-bold text-[#061229] text-center mb-1">Register to Martial App</h1>
          <p className="text-[13px] text-[#6b7280] text-center mb-5 leading-snug">
            Sign in with a social login or use your email to continue with Martial App.
          </p>

          {/* Role toggle */}
          <div className="flex rounded-[10px] border border-[#e0e0e0] overflow-hidden mb-6">
            {(['student', 'school'] as UserRole[]).map(r => (
              <button key={r} type="button" onClick={() => { setRole(r); setErrors({}) }}
                className={`flex-1 py-3.5 text-[13px] font-black uppercase tracking-widest transition-all cursor-pointer relative ${
                  role === r ? 'bg-white text-[#006197]' : 'bg-[#fafafa] text-[#9ca3af] hover:text-[#6b7280]'
                }`}>
                {role === r && (
                  <motion.div layoutId="role-indicator" className="absolute inset-x-0 bottom-0 h-[2.5px] bg-[#0092ff] rounded-full" />
                )}
                {r === 'student' ? '🥋  Student' : '🏛️  Academy'}
              </button>
            ))}
          </div>

          {/* SSO */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[{ label: 'Google', icon: <GoogleIcon /> }, { label: 'Apple', icon: <AppleIcon /> }, { label: 'Microsoft', icon: <MicrosoftIcon /> }].map(({ label, icon }) => (
              <button key={label} type="button" aria-label={`Register with ${label}`}
                className="h-[52px] bg-white border border-[#e0e0e0] rounded-[10px] flex items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-all">
                {icon}
              </button>
            ))}
          </div>

          {/* OR */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-[#e0e0e0]" />
            <span className="text-[13px] font-semibold text-[#9ca3af]">Or</span>
            <div className="flex-1 h-px bg-[#e0e0e0]" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-3">
            <AnimatePresence mode="wait">
              {role === 'student' ? (
                <motion.div key="student" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="space-y-3">
                  <Field label="Full Name" placeholder="Full Name" value={fullName} leftIcon={<UserIcon />}
                    onChange={v => { setFullName(v); clearError('fullName') }} error={errors.fullName} />
                  <Field label="Username" placeholder="Enter username" value={username} leftIcon={<UserIcon />}
                    onChange={v => { setUsername(v); clearError('username') }} error={errors.username} />
                  {/* Phone */}
                  <div>
                    <label className="block text-[14px] font-semibold text-[#061229] mb-1.5">Mobile <span className="text-[#9ca3af] font-normal">(optional)</span></label>
                    <div className="flex items-center h-[46px] border rounded-[8px] overflow-hidden bg-white focus-within:border-[#3d86af] transition-colors border-[#e0e0e0]">
                      <div className="pl-3 pr-1 pointer-events-none shrink-0"><PhoneIcon /></div>
                      <CountryPicker value={dialCode} onChange={setDialCode} />
                      <input suppressHydrationWarning type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="786 786004"
                        className="flex-1 h-full px-3 text-[14px] text-[#4f4f4f] placeholder:text-[#b0b0b0] bg-transparent focus:outline-none" />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="school" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="space-y-3">
                  <Field label="Academy Name" placeholder="e.g. Roger Gracie Academy" value={schoolName}
                    leftIcon={<SchoolIcon />} onChange={v => { setSchoolName(v); clearError('schoolName') }} error={errors.schoolName} />
                  <Field label="Owner / Contact Name" placeholder="Full name" value={contactName}
                    leftIcon={<UserIcon />} onChange={v => { setContactName(v); clearError('contactName') }} error={errors.contactName} />
                  <Field label="City" placeholder="e.g. Málaga, London, New York" value={city}
                    leftIcon={<SchoolIcon />} onChange={v => { setCity(v); clearError('city') }} error={errors.city} />
                  <div>
                    <label className="block text-[14px] font-semibold text-[#061229] mb-1.5">Phone <span className="text-[#9ca3af] font-normal">(optional)</span></label>
                    <div className="flex items-center h-[46px] border rounded-[8px] overflow-hidden bg-white focus-within:border-[#3d86af] transition-colors border-[#e0e0e0]">
                      <div className="pl-3 pr-1 pointer-events-none shrink-0"><PhoneIcon /></div>
                      <CountryPicker value={schoolDialCode} onChange={setSchoolDialCode} />
                      <input suppressHydrationWarning type="tel" value={schoolPhone} onChange={e => setSchoolPhone(e.target.value)} placeholder="Contact number"
                        className="flex-1 h-full px-3 text-[14px] text-[#4f4f4f] placeholder:text-[#b0b0b0] bg-transparent focus:outline-none" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Shared fields */}
            <Field label="Email Address" placeholder="Enter email" value={email} type="email" leftIcon={<EmailIcon />}
              onChange={v => { setEmail(v); clearError('email') }} error={errors.email} />
            <Field label="Password" placeholder="Password" value={password} type={showPass ? 'text' : 'password'}
              leftIcon={<LockIcon />} onChange={v => { setPassword(v); clearError('password') }} error={errors.password}
              rightSlot={<button type="button" onClick={() => setShowPass(!showPass)} className="cursor-pointer" tabIndex={-1}><EyeIcon open={showPass} /></button>} />
            <p className="text-[12px] text-[#9ca3af] -mt-1 leading-snug">
              <span className="text-[#e8a000] font-semibold">Note:</span> 8 characters or longer. Combine upper and lowercase letters, numbers and any special character.
            </p>
            <Field label="Confirm Password" placeholder="Confirm password" value={confirm} type={showConfirm ? 'text' : 'password'}
              leftIcon={<LockIcon />} onChange={v => { setConfirm(v); clearError('confirm') }} error={errors.confirm}
              rightSlot={<button type="button" onClick={() => setShowConfirm(!showConfirm)} className="cursor-pointer" tabIndex={-1}><EyeIcon open={showConfirm} /></button>} />

            {/* Remember me */}
            <div className="flex items-center gap-2 pt-1">
              <button type="button" onClick={() => setRememberMe(!rememberMe)} className="cursor-pointer shrink-0">
                <div className={`w-5 h-5 rounded-[4px] border flex items-center justify-center transition-colors ${rememberMe ? 'bg-[#3d86af] border-[#3d86af]' : 'bg-white border-[#d0d0d0] hover:border-[#3d86af]'}`}>
                  {rememberMe && <svg viewBox="0 0 12 10" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-2.5"><path d="M1 5l3.5 3.5L11 1"/></svg>}
                </div>
              </button>
              <span className="text-[13px] text-[#061229] cursor-pointer select-none" onClick={() => setRememberMe(!rememberMe)}>Remember Me</span>
            </div>

            {apiError && <p className="text-[13px] text-[#e43535] text-center">{apiError}</p>}

            {success ? (
              <div className="w-full h-[48px] bg-emerald-100 text-emerald-700 font-black text-[13px] rounded-[10px] flex items-center justify-center gap-2">
                ✅ Account created! Redirecting to login...
              </div>
            ) : (
              <button type="submit" disabled={loading}
                className="w-full h-[48px] bg-[#c0e9f9] hover:bg-[#a8dff7] active:scale-[0.99] rounded-[10px] text-[13px] font-black uppercase tracking-widest text-[#061229] cursor-pointer transition-all mt-1 disabled:opacity-60 disabled:cursor-not-allowed">
                {loading ? 'Creating account...' : 'REGISTER'}
              </button>
            )}
          </form>

          {/* Terms */}
          <p className="text-[12px] text-[#6b7280] text-center mt-4 leading-snug">
            By continuing, you agree to Martial App&apos;s{' '}
            <span className="text-[#006197] underline cursor-pointer hover:text-[#004e7c]">Terms of Use</span>.{' '}
            Read our{' '}
            <span className="text-[#006197] underline cursor-pointer hover:text-[#004e7c]">Privacy Policy</span>.
          </p>

          {/* Login link */}
          <p className="text-[13px] text-[#6b7280] text-center mt-3">
            Already have an account?{' '}
            <span onClick={() => { onClose(); onOpenLogin() }} className="text-[#006197] font-semibold underline cursor-pointer hover:text-[#004e7c] transition-colors">
              Login
            </span>
          </p>

        </div>
      </motion.div>
    </AnimatePresence>
  )
}
