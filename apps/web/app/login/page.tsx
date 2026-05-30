'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '../../lib/supabase/client'

const imgIcGoogle = "https://www.figma.com/api/mcp/asset/1334d288-8654-4630-8d5a-43724958c5a8"
const imgIcFacebook = "https://www.figma.com/api/mcp/asset/7b61b80b-4871-4470-8fe2-ff806bd1740b"
const imgIcApple = "https://www.figma.com/api/mcp/asset/5454bacf-92b3-42f0-aebf-2e01a2a4f172"

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin() {
    setEmailError('')
    setPasswordError('')
    setError('')

    let valid = true
    if (!email) { setEmailError('Please provide a valid email address.'); valid = false }
    if (!password) { setPasswordError('Password field cannot be left blank.'); valid = false }
    if (!valid) return

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4">
      <div className="bg-white rounded-[20px] w-full max-w-[485px] px-6 py-10 shadow-md">

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-[22px] font-semibold text-[#061229] mb-2">Welcome Back</h1>
          <p className="text-[14px] text-[#333] leading-snug">
            Login to access your account and continue your journey with us
          </p>
        </div>

        {/* Email */}
        <div className="mb-4">
          <label className="block text-[16px] font-medium text-[#061229] mb-1">Email</label>
          <input
            type="email"
            placeholder="Enter Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full h-[52px] px-4 rounded-[10px] border text-[16px] text-[#4f4f4f] outline-none focus:border-[#3d86af] transition-colors ${emailError ? 'border-[#e43535]' : 'border-[#e0e0e0]'}`}
          />
          {emailError && <p className="text-[#e43535] text-[14px] mt-1">{emailError}</p>}
        </div>

        {/* Password */}
        <div className="mb-4">
          <label className="block text-[16px] font-medium text-[#061229] mb-1">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full h-[52px] px-4 pr-12 rounded-[10px] border text-[16px] text-[#4f4f4f] outline-none focus:border-[#3d86af] transition-colors ${passwordError ? 'border-[#e43535]' : 'border-[#e0e0e0]'}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4f4f4f]"
            >
              {showPassword ? '🙈' : '👁'}
            </button>
          </div>
          {passwordError && <p className="text-[#e43535] text-[14px] mt-1">{passwordError}</p>}
        </div>

        {/* Remember me + Forgot password */}
        <div className="flex items-center justify-between mb-5">
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => setRememberMe(!rememberMe)}
              className={`w-5 h-5 rounded-[4px] flex items-center justify-center cursor-pointer ${rememberMe ? 'bg-[#3d86af]' : 'bg-white border border-[#cfc8c8]'}`}
            >
              {rememberMe && <svg width="12" height="9" viewBox="0 0 12 9" fill="none"><path d="M1 4L4.5 7.5L11 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
            <span className="text-[14px] text-[#061229]">Remember Me</span>
          </label>
          <Link href="/forgot-password" className="text-[16px] font-medium text-[#006197]">
            Forgot Password?
          </Link>
        </div>

        {/* Login button */}
        {error && <p className="text-[#e43535] text-[14px] mb-3 text-center">{error}</p>}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full h-[52px] bg-[#c1eafa] rounded-[10px] text-[16px] font-medium text-[#061229] hover:bg-[#a8dff5] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>

        {/* Or divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-[#e0e0e0]" />
          <span className="text-[16px] font-medium text-[#061229]">Or</span>
          <div className="flex-1 h-px bg-[#e0e0e0]" />
        </div>

        {/* Social buttons */}
        <div className="flex items-center justify-center gap-3 mb-5">
          {[
            { src: imgIcGoogle, alt: 'Google' },
            { src: imgIcFacebook, alt: 'Facebook' },
            { src: imgIcApple, alt: 'Apple' },
          ].map((s) => (
            <button key={s.alt} className="w-[80px] h-[52px] bg-white border border-[#eaeaea] rounded-[10px] flex items-center justify-center hover:bg-[#f5f5f5] transition-colors">
              <img src={s.src} alt={s.alt} className="w-6 h-6 object-contain" />
            </button>
          ))}
        </div>

        {/* Terms */}
        <label className="flex items-start gap-2 mb-3 cursor-pointer">
          <div
            onClick={() => setAgreed(!agreed)}
            className={`mt-0.5 w-5 h-5 rounded-[5px] flex-shrink-0 flex items-center justify-center cursor-pointer ${agreed ? 'bg-[#3d86af]' : 'bg-white border border-[#cfc8c8]'}`}
          >
            {agreed && <svg width="12" height="9" viewBox="0 0 12 9" fill="none"><path d="M1 4L4.5 7.5L11 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
          <span className="text-[14px] text-[#061229]">
            Agree to Martial App&apos;s{' '}
            <Link href="/terms" className="text-[#006197] underline font-medium">Terms of Use</Link>
            {'. & '}
            <Link href="/privacy" className="text-[#006197] underline font-medium">Privacy Policy</Link>.
          </span>
        </label>

        {/* Register link */}
        <p className="text-center text-[14px] text-[#061229]">
          If you already have an account we&apos;ll log you in. If not{' '}
          <Link href="/register" className="text-[#006197] underline font-medium">register</Link>.
        </p>
      </div>
    </div>
  )
}
