'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Plus, Upload, Search, CheckCircle2, Clock, Mail, XCircle, Building2, ChevronDown, MoreHorizontal, Send, Camera, Globe, Link } from 'lucide-react'
import * as xlsx from 'xlsx'

const DISCIPLINES = [
  { slug: 'bjj', label: 'BJJ' },
  { slug: 'mma', label: 'MMA' },
  { slug: 'boxing', label: 'Boxing' },
  { slug: 'muay-thai', label: 'Muay Thai' },
  { slug: 'wrestling', label: 'Wrestling' },
  { slug: 'judo', label: 'Judo' },
  { slug: 'kickboxing', label: 'Kickboxing' },
  { slug: 'karate', label: 'Karate' },
  { slug: 'taekwondo', label: 'Taekwondo' },
  { slug: 'nogi', label: 'No-Gi' },
  { slug: 'sambo', label: 'Sambo' },
  { slug: 'capoeira', label: 'Capoeira' },
]

const COUNTRIES = [
  'United Kingdom', 'Spain', 'Portugal', 'France', 'Germany', 'Italy',
  'United States', 'Brazil', 'Australia', 'Japan', 'Netherlands', 'Belgium',
  'Sweden', 'Norway', 'Denmark', 'Ireland', 'Canada', 'Mexico', 'Argentina',
  'Colombia', 'Chile', 'South Africa', 'UAE', 'Singapore', 'Other',
]

// ── Types ─────────────────────────────────────────────────────────────────────

type Invitation = {
  id: string
  name: string
  email: string
  phone: string | null
  city: string | null
  country: string | null
  activities: string | null
  status: 'PENDING' | 'SENT' | 'OPENED' | 'REGISTERED' | 'DECLINED'
  source: 'MANUAL' | 'IMPORT'
  sentAt: string | null
  createdAt: string
  school: { id: string; slug: string; name: string; status: string } | null
  invitedBy: { name: string; email: string } | null
}

type ImportRow = {
  name: string
  email: string
  phone?: string
  city?: string
  country?: string
  activities?: string
  website?: string
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  PENDING:    { label: 'Pending',    color: 'bg-gray-100 text-gray-600',    icon: Clock },
  SENT:       { label: 'Sent',       color: 'bg-blue-50 text-blue-700',     icon: Mail },
  OPENED:     { label: 'Opened',     color: 'bg-amber-50 text-amber-700',   icon: Mail },
  REGISTERED: { label: 'Registered', color: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
  DECLINED:   { label: 'Declined',   color: 'bg-red-50 text-red-600',       icon: XCircle },
}

// ── Invite Modal ──────────────────────────────────────────────────────────────

function SchoolInvitationsModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [tab, setTab] = useState<'invite' | 'import' | 'add'>('invite')

  // Invite tab state
  const [inviteName, setInviteName]   = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting]       = useState(false)
  const [inviteError, setInviteError] = useState('')

  // Import tab state
  const [importRows, setImportRows]     = useState<ImportRow[]>([])
  const [importFile, setImportFile]     = useState<string>('')
  const [importing, setImporting]       = useState(false)
  const [importError, setImportError]   = useState('')
  const [importResult, setImportResult] = useState<{ created: number; skipped: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  // Add School tab state
  const [addForm, setAddForm] = useState({
    name: '', email: '', phone: '', website: '',
    address: '', postcode: '', city: '', country: '',
    instagram: '', facebook: '', youtube: '', tiktok: '',
    description: '', tagline: '',
    status: 'UNVERIFIED',
    foundedYear: '', priceFrom: '', hasFreeTrialCls: false,
  })
  const [addDisciplines, setAddDisciplines] = useState<string[]>([])
  const [logoPreview, setLogoPreview]   = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const logoInputRef  = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [adding, setAdding]       = useState(false)
  const [addError, setAddError]   = useState('')
  const [addSuccess, setAddSuccess] = useState(false)

  function handlePhotoInput(e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover') {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const url = ev.target?.result as string
      if (type === 'logo') setLogoPreview(url)
      else setCoverPreview(url)
    }
    reader.readAsDataURL(file)
  }

  function toggleDiscipline(slug: string) {
    setAddDisciplines(prev =>
      prev.includes(slug) ? prev.filter(d => d !== slug) : [...prev, slug]
    )
  }

  async function handleAdd() {
    if (!addForm.name.trim()) { setAddError('Business name is required'); return }
    setAdding(true)
    setAddError('')
    const res = await fetch('/api/admin/schools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...addForm,
        disciplines: addDisciplines,
        logoUrl: logoPreview,
        coverUrl: coverPreview,
      }),
    })
    const data = await res.json()
    setAdding(false)
    if (!res.ok) { setAddError(data.error || 'Something went wrong'); return }
    setAddSuccess(true)
    onSuccess()
    setTimeout(() => { onClose() }, 1200)
  }

  // ── Invite handler ──────────────────────────────────────────────────────────
  async function handleInvite() {
    if (!inviteName.trim() || !inviteEmail.trim()) {
      setInviteError('Business name and email are required.')
      return
    }
    setInviting(true)
    setInviteError('')
    const res = await fetch('/api/admin/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: inviteName, email: inviteEmail }),
    })
    const data = await res.json()
    setInviting(false)
    if (!res.ok) { setInviteError(data.error || 'Something went wrong'); return }
    onSuccess()
    onClose()
  }

  // ── File parsing ────────────────────────────────────────────────────────────
  const parseFile = useCallback((file: File) => {
    setImportError('')
    setImportRows([])
    setImportResult(null)
    setImportFile(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const wb = xlsx.read(data, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]!]!
        const rows = xlsx.utils.sheet_to_json<any>(ws)
        // Normalize column names (lowercase, trim)
        const normalized: ImportRow[] = rows.map(r => {
          const lower: any = {}
          for (const k of Object.keys(r)) lower[k.toLowerCase().trim()] = r[k]
          return {
            name: lower.name || lower['business name'] || lower['school name'] || '',
            email: lower.email || lower['email address'] || '',
            phone: lower.phone || lower['phone number'] || '',
            city: lower.city || '',
            country: lower.country || '',
            activities: lower.activities || lower['disciplines'] || lower['martial arts'] || '',
            website: lower.website || '',
          }
        }).filter(r => r.name && r.email)
        setImportRows(normalized)
        if (!normalized.length) setImportError('No valid rows found. Make sure columns include "name" and "email".')
      } catch {
        setImportError('Failed to parse file. Please upload a valid .xlsx or .csv file.')
      }
    }
    reader.readAsBinaryString(file)
  }, [])

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
  }

  // ── Import handler ──────────────────────────────────────────────────────────
  async function handleImport() {
    if (!importRows.length) return
    setImporting(true)
    const res = await fetch('/api/admin/invitations/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: importRows }),
    })
    const data = await res.json()
    setImporting(false)
    if (!res.ok) { setImportError(data.error || 'Import failed'); return }
    setImportResult(data)
    onSuccess()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        onClick={e => e.stopPropagation()}
        className={`relative w-full bg-white rounded-2xl shadow-2xl overflow-hidden ${tab === 'add' ? 'max-w-2xl' : 'max-w-lg'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-xl font-bold text-[#0D1B2A]">School Invitations</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          {([
            { key: 'invite', label: 'Invite School' },
            { key: 'import', label: 'Import CSV / Excel' },
            { key: 'add',    label: 'Add Manually' },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 px-1 mr-6 text-sm font-semibold border-b-2 transition-colors ${
                tab === t.key ? 'border-[#006197] text-[#006197]' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* ── Invite Tab ── */}
          {tab === 'invite' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#0D1B2A] mb-1.5">Business Name</label>
                <input
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  placeholder="Enter the invitee name"
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#006197] focus:ring-2 focus:ring-[#006197]/10"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0D1B2A] mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="Enter the invitee email address"
                  onKeyDown={e => e.key === 'Enter' && handleInvite()}
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#006197] focus:ring-2 focus:ring-[#006197]/10"
                />
              </div>
              {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleInvite}
                  disabled={inviting}
                  className="flex-1 h-11 rounded-xl text-white text-sm font-bold uppercase tracking-wide flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                  style={{ background: '#006197' }}
                >
                  <Send className="w-4 h-4" />
                  {inviting ? 'Sending…' : 'Send Invite'}
                </button>
              </div>
            </div>
          )}

          {/* ── Import Tab ── */}
          {tab === 'import' && (
            <div className="space-y-4">
              {/* Drop zone */}
              <div
                ref={dropRef}
                onDragOver={e => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileRef.current?.click()}
                className="relative border-2 border-dashed border-[#006197]/30 bg-[#F0F7FB] rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-[#006197]/60 hover:bg-[#E8F3FA] transition-colors"
              >
                <input ref={fileRef} type="file" accept=".xlsx,.csv,.xls" className="hidden" onChange={handleFileInput} />
                <div className="text-4xl">📁</div>
                <div>
                  <p className="text-sm font-bold text-[#0D1B2A] text-center">
                    {importFile ? importFile : 'Drop your file here'}
                  </p>
                  <p className="text-xs text-gray-500 text-center mt-1">
                    {importRows.length > 0
                      ? `${importRows.length} valid rows found`
                      : 'Upload a CSV or Excel file with your school data.\nWe\'ll map the columns automatically.'}
                  </p>
                </div>
                {!importFile && (
                  <>
                    <button
                      onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
                      className="px-5 py-2 rounded-lg text-white text-sm font-semibold"
                      style={{ background: '#006197' }}
                    >
                      Browse file
                    </button>
                    <div className="flex gap-3 text-xs font-semibold" style={{ color: '#006197' }}>
                      <span>.XLSX</span><span>.CSV</span><span>Max 5MB</span>
                    </div>
                  </>
                )}
                {importRows.length > 0 && (
                  <div className="w-full mt-1 max-h-28 overflow-y-auto rounded-lg border border-[#006197]/20 bg-white">
                    {importRows.slice(0, 5).map((r, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-50 last:border-0 text-xs">
                        <span className="font-medium text-[#0D1B2A] truncate">{r.name}</span>
                        <span className="text-gray-400 truncate">{r.email}</span>
                        {r.city && <span className="text-gray-400 shrink-0">{r.city}</span>}
                      </div>
                    ))}
                    {importRows.length > 5 && (
                      <div className="px-3 py-1.5 text-xs text-gray-400">+{importRows.length - 5} more rows</div>
                    )}
                  </div>
                )}
              </div>

              {/* Column guide */}
              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600">
                <p><span className="font-semibold">Required columns:</span> name, email</p>
                <p><span className="font-semibold">Optional:</span> phone, website, address, city, country, activities</p>
              </div>

              {importError && <p className="text-sm text-red-600">{importError}</p>}

              {importResult && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700">
                  ✅ <span className="font-semibold">{importResult.created} schools imported</span>
                  {importResult.skipped > 0 && <span className="text-emerald-600"> · {importResult.skipped} skipped (duplicates)</span>}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importRows.length || importing || !!importResult}
                  className="flex-1 h-11 rounded-xl text-white text-sm font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
                  style={{ background: importResult ? '#10B981' : '#006197' }}
                >
                  <Upload className="w-4 h-4" />
                  {importing ? 'Importing…' : importResult ? 'Imported ✓' : 'Import Schools'}
                </button>
              </div>
            </div>
          )}

          {/* ── Add School Tab ── */}
          {tab === 'add' && (
            <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">

              {/* Photos */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Photos</label>
                <div className="flex gap-4">
                  {/* Profile photo */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      onClick={() => logoInputRef.current?.click()}
                      className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center cursor-pointer hover:border-[#006197]/50 hover:bg-[#F0F7FB] transition-colors overflow-hidden"
                    >
                      {logoPreview
                        ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                        : <Camera className="w-6 h-6 text-gray-300" />
                      }
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium">Profile Photo</span>
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={e => handlePhotoInput(e, 'logo')} />
                  </div>
                  {/* Cover photo */}
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div
                      onClick={() => coverInputRef.current?.click()}
                      className="h-20 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center cursor-pointer hover:border-[#006197]/50 hover:bg-[#F0F7FB] transition-colors overflow-hidden"
                    >
                      {coverPreview
                        ? <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                        : <div className="flex flex-col items-center gap-1"><Camera className="w-6 h-6 text-gray-300" /><span className="text-[10px] text-gray-400">Cover Photo</span></div>
                      }
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium">Public page cover image</span>
                    <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={e => handlePhotoInput(e, 'cover')} />
                  </div>
                </div>
              </div>

              {/* Basic info */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">School Info</label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <input value={addForm.name} onChange={e => setAddForm(f => ({...f, name: e.target.value}))}
                      placeholder="Business Name *" className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#006197]" />
                  </div>
                  <input value={addForm.email} onChange={e => setAddForm(f => ({...f, email: e.target.value}))}
                    placeholder="Email" type="email" className="h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#006197]" />
                  <input value={addForm.phone} onChange={e => setAddForm(f => ({...f, phone: e.target.value}))}
                    placeholder="Phone Number" className="h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#006197]" />
                  <input value={addForm.tagline} onChange={e => setAddForm(f => ({...f, tagline: e.target.value}))}
                    placeholder="Tagline" className="h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#006197]" />
                  <input value={addForm.foundedYear} onChange={e => setAddForm(f => ({...f, foundedYear: e.target.value}))}
                    placeholder="Founded Year" type="number" className="h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#006197]" />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Location</label>
                <div className="grid grid-cols-2 gap-3">
                  <input value={addForm.address} onChange={e => setAddForm(f => ({...f, address: e.target.value}))}
                    placeholder="Address" className="col-span-2 h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#006197]" />
                  <input value={addForm.city} onChange={e => setAddForm(f => ({...f, city: e.target.value}))}
                    placeholder="City" className="h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#006197]" />
                  <input value={addForm.postcode} onChange={e => setAddForm(f => ({...f, postcode: e.target.value}))}
                    placeholder="Post Code" className="h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#006197]" />
                  <select value={addForm.country} onChange={e => setAddForm(f => ({...f, country: e.target.value}))}
                    className="col-span-2 h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#006197] bg-white">
                    <option value="">Select Country</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Disciplines */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Disciplines</label>
                <div className="flex flex-wrap gap-2">
                  {DISCIPLINES.map(d => (
                    <button
                      key={d.slug}
                      type="button"
                      onClick={() => toggleDiscipline(d.slug)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        addDisciplines.includes(d.slug)
                          ? 'bg-[#006197] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Social */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Social & Web</label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <Link className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input value={addForm.instagram} onChange={e => setAddForm(f => ({...f, instagram: e.target.value}))}
                      placeholder="Instagram" className="w-full h-10 pl-8 pr-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#006197]" />
                  </div>
                  <div className="relative">
                    <Globe className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input value={addForm.facebook} onChange={e => setAddForm(f => ({...f, facebook: e.target.value}))}
                      placeholder="Facebook" className="w-full h-10 pl-8 pr-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#006197]" />
                  </div>
                  <div className="relative">
                    <Link className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input value={addForm.youtube} onChange={e => setAddForm(f => ({...f, youtube: e.target.value}))}
                      placeholder="YouTube" className="w-full h-10 pl-8 pr-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#006197]" />
                  </div>
                  <div className="relative">
                    <Globe className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input value={addForm.website} onChange={e => setAddForm(f => ({...f, website: e.target.value}))}
                      placeholder="Website" className="w-full h-10 pl-8 pr-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#006197]" />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <textarea value={addForm.description} onChange={e => setAddForm(f => ({...f, description: e.target.value}))}
                  placeholder="Description (optional)"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#006197] resize-none" />
              </div>

              {/* Status + Pricing */}
              <div className="grid grid-cols-3 gap-3">
                <select value={addForm.status} onChange={e => setAddForm(f => ({...f, status: e.target.value}))}
                  className="h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#006197] bg-white">
                  <option value="UNVERIFIED">Unverified</option>
                  <option value="CLAIMED">Claimed</option>
                  <option value="VERIFIED">Verified</option>
                </select>
                <input value={addForm.priceFrom} onChange={e => setAddForm(f => ({...f, priceFrom: e.target.value}))}
                  placeholder="Price from (£)" type="number" className="h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#006197]" />
                <label className="flex items-center gap-2 h-10 px-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" checked={addForm.hasFreeTrialCls} onChange={e => setAddForm(f => ({...f, hasFreeTrialCls: e.target.checked}))} className="rounded" />
                  <span className="text-xs font-medium text-gray-600">Free Trial</span>
                </label>
              </div>

              {addError && <p className="text-sm text-red-600">{addError}</p>}
              {addSuccess && <p className="text-sm text-emerald-600 font-semibold">✅ School created successfully!</p>}

              <div className="flex gap-3 pt-1 pb-1">
                <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={adding || addSuccess}
                  className="flex-1 h-11 rounded-xl text-white text-sm font-bold uppercase tracking-wide flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                  style={{ background: addSuccess ? '#10B981' : '#006197' }}
                >
                  <Plus className="w-4 h-4" />
                  {adding ? 'Saving…' : addSuccess ? 'Saved ✓' : 'Save School'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Client ───────────────────────────────────────────────────────────────

export default function SchoolsAdminClient() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading]         = useState(true)
  const [showModal, setShowModal]     = useState(false)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/invitations')
    const data = await res.json()
    setInvitations(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = invitations.filter(inv => {
    const matchSearch = !search || inv.name.toLowerCase().includes(search.toLowerCase()) || inv.email.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'ALL' || inv.status === statusFilter
    return matchSearch && matchStatus
  })

  // Stats
  const stats = {
    total:      invitations.length,
    sent:       invitations.filter(i => i.status === 'SENT').length,
    registered: invitations.filter(i => i.status === 'REGISTERED').length,
    pending:    invitations.filter(i => i.status === 'PENDING').length,
  }

  return (
    <div className="p-8">
      {showModal && (
        <SchoolInvitationsModal
          onClose={() => setShowModal(false)}
          onSuccess={load}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0D1B2A]">Schools</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage school invitations and onboarding pipeline</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 h-10 px-4 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          style={{ background: '#006197' }}
        >
          <Plus className="w-4 h-4" />
          Invite School
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Invites',  value: stats.total,      color: '#006197' },
          { label: 'Sent',           value: stats.sent,       color: '#3B82F6' },
          { label: 'Pending',        value: stats.pending,    color: '#F59E0B' },
          { label: 'Registered',     value: stats.registered, color: '#10B981' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{s.label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-[#006197]"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-10 pl-3 pr-8 rounded-xl border border-gray-200 bg-white text-sm font-medium appearance-none focus:outline-none focus:border-[#006197] cursor-pointer"
          >
            <option value="ALL">All statuses</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">School</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Activities</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Source</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td colSpan={7} className="px-5 py-4">
                    <div className="h-4 bg-gray-100 rounded-full animate-pulse w-3/4" />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center">
                  <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="font-semibold text-gray-400">No invitations yet</p>
                  <p className="text-xs text-gray-400 mt-1">Click "Invite School" to get started</p>
                </td>
              </tr>
            ) : filtered.map(inv => {
              const sc = STATUS_CONFIG[inv.status]
              const Icon = sc.icon
              return (
                <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-[#0D1B2A]">{inv.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{inv.email}</p>
                    {inv.phone && <p className="text-xs text-gray-400">{inv.phone}</p>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">
                    {[inv.city, inv.country].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 text-xs max-w-[140px] truncate">
                    {inv.activities || '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${sc.color}`}>
                      <Icon className="w-3 h-3" />
                      {sc.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${inv.source === 'IMPORT' ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>
                      {inv.source}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-400">
                    {new Date(inv.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3.5">
                    <button className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
