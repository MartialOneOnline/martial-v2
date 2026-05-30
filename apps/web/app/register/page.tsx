'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../../lib/supabase/client'

const imgIcGoogle = "https://www.figma.com/api/mcp/asset/1334d288-8654-4630-8d5a-43724958c5a8"
const imgIcFacebook = "https://www.figma.com/api/mcp/asset/7b61b80b-4871-4470-8fe2-ff806bd1740b"
const imgIcApple = "https://www.figma.com/api/mcp/asset/5454bacf-92b3-42f0-aebf-2e01a2a4f172"

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleRegister() {
    const newErrors: Record<string, string> = {}
    if (!firstName) newErrors.firstName = 'First name is required.'
    if (!lastName) newErrors.lastName = 'Surname is required.'
    if (!email) newErrors.email = 'Please provide a valid email address.'
    if (!password) newErrors.password = 'Password field cannot be left blank.'
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match.'
    if (Object.keys(newErrors).length) { setErrors(newErrors); return }

    setErrors({})
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: `${firstName} ${lastName}`, phone } },
    })
    if (error) {
      setErrors({ general: error.message })
      setLoading(false)
      return
    }
    router.push('/dashboard')
  }

  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    key: string,
    placeholder: string,
    type = 'text',
    extra?: React.ReactNode
  ) => (
    <div className="mb-4">
      <label className="block text-[16px] font-medium text-[#061229] mb-1">{label}</label>
      <div className="relative">
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full h-[52px] px-4 rounded-[10px] border text-[16px] text-[#4f4f4f] outline-none focus:border-[#3d86af] transition-colors ${errors[key] ? 'border-[#e43535]' : 'border-[#eaeaea]'}`}
        />
        {extra}
      </div>
      {errors[key] && <p className="text-[#e43535] text-[14px] mt-1">{errors[key]}</p>}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-[20px] w-full max-w-[498px] mx-4 px-8 py-10 shadow-md">

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-[20px] font-semibold text-[#061229] mb-2">Create Your Account</h1>
          <p className="text-[16px] text-[#333] leading-snug">
            Please fill in the required information to complete your registration and join us.
          </p>
        </div>

        {/* Fields */}
        {field('First Name', firstName, setFirstName, 'firstName', 'Enter First Name')}
        {field('Surname Name', lastName, setLastName, 'lastName', 'Enter Surname Name')}
        {field('Email', email, setEmail, 'email', 'Enter Email', 'email')}

        {/* Phone */}
        <div className="mb-4">
          <label className="block text-[16px] font-medium text-[#061229] mb-1">Phone</label>
          <div className="flex items-center h-[52px] border border-[#eaeaea] rounded-[10px] px-3 gap-2">
            <span className="text-[16px]">🇬🇧</span>
            <span className="text-[16px] font-medium text-black">+44</span>
            <input
              type="tel"
              placeholder="786 786004"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1 text-[16px] text-[#4f4f4f] outline-none bg-transparent"
            />
          </div>
        </div>

        {/* Password */}
        <div className="mb-4">
          <label className="block text-[16px] font-medium text-[#061229] mb-1">Passcode</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter 6 Digit Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full h-[52px] px-4 pr-12 rounded-[10px] border text-[16px] text-[#4f4f4f] outline-none focus:border-[#3d86af] transition-colors ${errors.password ? 'border-[#e43535]' : 'border-[#eaeaea]'}`}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2">
              {showPassword ? '🙈' : '👁'}
            </button>
          </div>
          {errors.password && <p className="text-[#e43535] text-[14px] mt-1">{errors.password}</p>}
        </div>

        {/* Confirm Password */}
        <div className="mb-4">
          <label className="block text-[16px] font-medium text-[#061229] mb-1">Confirm Password</label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder="Enter Confirm 6 Digit Passcode"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full h-[52px] px-4 pr-12 rounded-[10px] border text-[16px] text-[#4f4f4f] outline-none focus:border-[#3d86af] transition-colors ${errors.confirmPassword ? 'border-[#e43535]' : 'border-[#eaeaea]'}`}
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2">
              {showConfirm ? '🙈' : '👁'}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-[#e43535] text-[14px] mt-1">{errors.confirmPassword}</p>}
        </div>

        {/* Remember me */}
        <label className="flex items-center gap-2 cursor-pointer mb-5">
          <div
            onClick={() => setRememberMe(!rememberMe)}
            className={`w-5 h-5 rounded-[5px] flex items-center justify-center cursor-pointer ${rememberMe ? 'bg-[#3d86af]' : 'bg-white border border-[#cfc8c8]'}`}
          >
            {rememberMe && <svg width="12" height="9" viewBox="0 0 12 9" fill="none"><path d="M1 4L4.5 7.5L11 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
          <span className="text-[14px] text-[#061229]">Remember Me</span>
        </label>

        {/* Register button */}
        {errors.general && <p className="text-[#e43535] text-[14px] mb-3 text-center">{errors.general}</p>}
        <button
          onClick={handleRegister}
          disabled={loading}
          className="w-full h-[52px] bg-[#c0e9f9] rounded-[10px] text-[16px] font-medium text-[#061229] hover:bg-[#a8dff5] transition-colors disabled:opacity-60 disabled:cursor-not-allowed mb-5"
        >
          {loading ? 'Registering...' : 'Register'}
        </button>

        {/* Or divider */}
        <div className="flex items-center gap-3 mb-5">
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
            className={`mt-0.5 w-5 h-5 rounded-[5px] flex-shrink-0 flex items-center justify-center cursor-pointer ${agreed ? 'bg-[#3d86af]' : 'bg-white border border-[#e0e0e0]'}`}
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

        {/* Login link */}
        <p className="text-center text-[14px] text-[#061229]">
          If you already have an account.{' '}
          <Link href="/login" className="text-[#006197] underline font-medium">Login</Link>
        </p>
      </div>
    </div>
  )
}
