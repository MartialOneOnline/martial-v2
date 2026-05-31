'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

// ── SSO Button ────────────────────────────────────────────────────────────────
function SSOButton({ icon, label, onClick }: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full h-[52px] flex items-center gap-4 px-5
                 border border-[#e8e8e8] rounded-[12px] bg-white
                 hover:bg-[#fafafa] hover:border-[#d0d0d0]
                 text-[14px] font-semibold text-[#1a1a1a]
                 cursor-pointer transition-all"
    >
      {icon}
      <span className="flex-1 text-center pr-5">{label}</span>
    </button>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface LoginModalProps {
  onClose: () => void
  onOpenRegister?: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function LoginModal({ onClose, onOpenRegister }: LoginModalProps) {
  const router = useRouter()

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50"
        onClick={onClose}
      />

      {/* Card */}
      <motion.div
        key="modal-card"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: 'spring', damping: 26, stiffness: 340 }}
        className="fixed inset-0 flex items-center justify-center z-50 px-4 pointer-events-none"
      >
        <div
          className="relative w-full max-w-[460px] bg-white rounded-[24px]
                     shadow-[0_20px_60px_rgba(0,0,0,0.18)] pointer-events-auto
                     px-8 pt-10 pb-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center
                       rounded-full bg-[#f5f5f5] hover:bg-[#ebebeb]
                       text-slate-600 hover:text-slate-900 cursor-pointer transition-colors"
            aria-label="Close"
          >
            <X className="w-[18px] h-[18px]" />
          </button>

          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 overflow-hidden rounded-xl shrink-0">
              <Image src="/martial-logo.png" alt="Martial App" width={56} height={56} className="object-contain" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-[22px] font-bold text-[#061229] text-center mb-1">
            Welcome to Martial
          </h2>
          <p className="text-[14px] text-[#6b7280] text-center mb-7">
            Your martial journey starts here
          </p>

          {/* SSO buttons */}
          <div className="flex flex-col gap-3">
            <SSOButton icon={<GoogleIcon />}   label="Continue with Google"   onClick={() => {}} />
            <SSOButton icon={<FacebookIcon />} label="Continue with Facebook" onClick={() => {}} />
            <SSOButton icon={<AppleIcon />}    label="Continue with Apple"    onClick={() => {}} />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#e8e8e8]" />
            <span className="text-[12px] font-bold text-[#9ca3af] uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-[#e8e8e8]" />
          </div>

          {/* Email */}
          <SSOButton
            icon={<EmailIcon />}
            label="Continue with Email"
            onClick={() => { onClose(); router.push('/login') }}
          />

          {/* Register link */}
          <p className="text-[13px] text-[#6b7280] text-center mt-6">
            Don&apos;t have an account?{' '}
            <span
              onClick={() => { onClose(); onOpenRegister?.() }}
              className="text-[#006197] font-semibold underline cursor-pointer hover:text-[#004e7c] transition-colors"
            >
              Register
            </span>
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
