'use client'

import { useDashboard } from '../../../../components/DashboardShell'
import { useState } from 'react'
import {Users, Calendar, CreditCard, BarChart2, Settings, Bell, ChevronRight, ChevronDown, Menu, X, Search, Check, TrendingUp, TrendingDown, Plus, BookOpen, Award} from 'lucide-react'
import { useT } from '../../../../lib/i18n/LanguageContext'

type Belt = 'White' | 'Blue' | 'Purple' | 'Brown' | 'Black'
type TechniqueStatus = 'Published' | 'Draft'
type TechniqueCategory = 'Guard' | 'Mount' | 'Back' | 'Takedown' | 'Submission' | 'Defense'

interface Technique {
  id: number
  belt: Belt
  name: string
  category: TechniqueCategory
  description: string
  status: TechniqueStatus
}

const TECHNIQUES: Technique[] = [
  { id:1,  belt:'White',  name:'Closed Guard Break',         category:'Guard',      description:'Break opponent posture and open closed guard to pass.', status:'Published' },
  { id:2,  belt:'White',  name:'Basic Armbar from Guard',    category:'Submission', description:'Classic submission from closed guard control.', status:'Published' },
  { id:3,  belt:'White',  name:'Hip Escape (Shrimp)',        category:'Defense',    description:'Fundamental movement drill to create space.', status:'Published' },
  { id:4,  belt:'White',  name:'Double Leg Takedown',        category:'Takedown',   description:'Level change and drive through to complete the takedown.', status:'Published' },
  { id:5,  belt:'White',  name:'Mount Escape (Bridge)',      category:'Mount',      description:'Bridge and roll to escape bottom mount position.', status:'Draft' },
  { id:6,  belt:'White',  name:'Back Mount Escape',          category:'Back',       description:'Seat belt grip removal and turn to guard.', status:'Draft' },
  { id:7,  belt:'Blue',   name:'Triangle Choke',             category:'Submission', description:'Leg triangle applied from guard or top positions.', status:'Published' },
  { id:8,  belt:'Blue',   name:'Omoplata',                   category:'Submission', description:'Shoulder lock using legs from open guard.', status:'Published' },
  { id:9,  belt:'Blue',   name:'X-Guard Sweep',              category:'Guard',      description:'Elevate and sweep using X-guard leg entanglement.', status:'Published' },
  { id:10, belt:'Blue',   name:'Single Leg X Entry',         category:'Guard',      description:'Entry sequence into single leg X position.', status:'Published' },
  { id:11, belt:'Blue',   name:'Scissor Sweep',              category:'Guard',      description:'Classic sweep from closed guard using hip movement.', status:'Draft' },
  { id:12, belt:'Purple', name:'Berimbolo',                  category:'Back',       description:'Inversion-based back take from de la Riva guard.', status:'Published' },
  { id:13, belt:'Purple', name:'Leg Drag Pass',              category:'Guard',      description:'Control and drag leg to achieve side control.', status:'Published' },
  { id:14, belt:'Purple', name:'Kneebar',                    category:'Submission', description:'Knee hyperextension attack from various positions.', status:'Published' },
  { id:15, belt:'Purple', name:'Torreando Pass',             category:'Guard',      description:'Bullfighter pass using grip on ankles.', status:'Draft' },
  { id:16, belt:'Purple', name:'Clock Choke',                category:'Back',       description:'Collar choke applied from turtle position.', status:'Published' },
  { id:17, belt:'Brown',  name:'Heel Hook (Outside)',        category:'Submission', description:'Rotational heel hook targeting the knee.', status:'Published' },
  { id:18, belt:'Brown',  name:'50/50 Guard',                category:'Guard',      description:'Symmetric leg entanglement position and attacks.', status:'Published' },
  { id:19, belt:'Brown',  name:'Lapel Guard',                category:'Guard',      description:'Gi-based guard using lapel wrapping techniques.', status:'Draft' },
  { id:20, belt:'Brown',  name:'Back Take from Turtle',      category:'Back',       description:'Seatbelt and hooks in from turtle position.', status:'Published' },
  { id:21, belt:'Brown',  name:'Armbar from Side Control',   category:'Submission', description:'Transition to armbar from dominant side control.', status:'Published' },
  { id:22, belt:'Black',  name:'Worm Guard',                 category:'Guard',      description:'Complex lapel guard with deep entanglements.', status:'Published' },
  { id:23, belt:'Black',  name:'Inside Heel Hook',           category:'Submission', description:'High percentage leg attack from ashi garami.', status:'Published' },
  { id:24, belt:'Black',  name:'Calf Slicer',                category:'Submission', description:'Compression lock targeting the calf muscle.', status:'Published' },
  { id:25, belt:'Black',  name:'High Elbow Guillotine',      category:'Submission', description:'Arm-in guillotine with high elbow for tight finish.', status:'Draft' },
  { id:26, belt:'Black',  name:'Back Control System',        category:'Back',       description:'Complete system for maintaining back control and finishing.', status:'Published' },
]

const BELT_CONFIG: Record<Belt, { dot: string; bg: string; color: string }> = {
  White:  { dot: '#9CA3AF', bg: '#F9FAFB', color: '#374151' },
  Blue:   { dot: '#2563EB', bg: '#EFF6FF', color: '#1D4ED8' },
  Purple: { dot: '#7C3AED', bg: '#F5F3FF', color: '#6D28D9' },
  Brown:  { dot: '#92400E', bg: '#FEF3C7', color: '#92400E' },
  Black:  { dot: '#111827', bg: '#F3F4F6', color: '#111827' },
}

const CAT_MAP: Record<TechniqueCategory, { bg: string; color: string }> = {
  Guard:      { bg: '#EFF6FF', color: '#2563EB' },
  Mount:      { bg: '#FFFBEB', color: '#D97706' },
  Back:       { bg: '#FDF2F8', color: '#9D174D' },
  Takedown:   { bg: '#FEF2F2', color: '#DC2626' },
  Submission: { bg: '#F5F3FF', color: '#6D28D9' },
  Defense:    { bg: '#F0FDF4', color: '#15803D' },
}

const STATUS_MAP: Record<TechniqueStatus, { bg: string; color: string; border: string }> = {
  Published: { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
  Draft:     { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' },
}

function AddTechniqueDrawer({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [name, setName]         = useState('')
  const [belt, setBelt]         = useState<Belt | ''>('')
  const [category, setCategory] = useState<TechniqueCategory | ''>('')
  const [description, setDesc]  = useState('')
  const [status, setStatus]     = useState<TechniqueStatus>('Published')

  function reset() { setName(''); setBelt(''); setCategory(''); setDesc(''); setStatus('Published') }
  function handleClose() { reset(); onClose() }
  function handleSuccess() { reset(); onSuccess() }

  const canSubmit = name && belt && category

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1px solid #E5E7EB', borderRadius: 10,
    padding: '9px 12px', fontSize: 13, color: '#111827', background: '#fff', outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5,
  }

  return (
    <>
      <div className="fixed inset-0 z-40 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.35)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
        onClick={handleClose} />
      <div className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-hidden"
        style={{ width: 'min(560px,96vw)', background: '#F9FAFB',
          boxShadow: '-4px 0 32px rgba(0,0,0,0.12)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)' }}>
        <div className="flex items-center justify-between px-6 py-5 shrink-0"
          style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>Add Technique</h2>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Add a new technique to the curriculum</p>
          </div>
          <button onClick={handleClose} className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <X size={15} style={{ color: '#6B7280' }} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">
          <div>
            <label style={labelStyle}>Technique Name</label>
            <input type="text" placeholder="e.g. Triangle Choke" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Belt Level</label>
              <select value={belt} onChange={e => setBelt(e.target.value as Belt)} style={inputStyle}>
                <option value="">Select belt…</option>
                {(['White','Blue','Purple','Brown','Black'] as Belt[]).map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value as TechniqueCategory)} style={inputStyle}>
                <option value="">Select category…</option>
                {(['Guard','Mount','Back','Takedown','Submission','Defense'] as TechniqueCategory[]).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Description <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span></label>
            <textarea rows={3} placeholder="Brief description of the technique…" value={description} onChange={e => setDesc(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as TechniqueStatus)} style={inputStyle}>
              <option value="Published">Published</option>
              <option value="Draft">Draft</option>
            </select>
          </div>
        </div>
        <div className="px-6 py-4 flex items-center gap-3 justify-end shrink-0"
          style={{ background: '#fff', borderTop: '1px solid #E5E7EB' }}>
          <button onClick={handleClose} className="px-5 py-2.5 rounded-xl cursor-pointer"
            style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>
            Cancel
          </button>
          <button onClick={handleSuccess} disabled={!canSubmit} className="px-6 py-2.5 rounded-xl cursor-pointer flex items-center gap-2"
            style={{ fontSize: 13, fontWeight: 600, border: 'none',
              background: canSubmit ? '#0071E3' : '#93C5FD', color: '#fff',
              cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
            <Plus size={14} />Add Technique
          </button>
        </div>
      </div>
    </>
  )
}

function SuccessToast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[70] flex items-center gap-3 px-5 py-3.5 rounded-2xl"
      style={{ background: '#fff', border: '1px solid #BBF7D0', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: '#F0FDF4' }}>
        <Check size={14} style={{ color: '#16A34A' }} strokeWidth={3} />
      </div>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{message}</p>
      <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', marginLeft: 4 }}>
        <X size={13} style={{ color: '#9CA3AF' }} />
      </button>
    </div>
  )
}

const BELTS: Belt[] = ['White', 'Blue', 'Purple', 'Brown', 'Black']

export default function CurriculumClient() {
  const { setMenuOpen } = useDashboard()
  const t = useT()
  const [selectedBelt, setSelectedBelt] = useState<Belt>('White')
  const [drawerOpen, setDrawerOpen]   = useState(false)
  const [toast, setToast]             = useState(false)

  const techniques = TECHNIQUES.filter(t => t.belt === selectedBelt)

  const totalTechniques = TECHNIQUES.length
  const published       = TECHNIQUES.filter(t => t.status === 'Published').length
  const drafts          = TECHNIQUES.filter(t => t.status === 'Draft').length
  const beltsCovered    = BELTS.length

  const STATS = [
    { label: t.school.totalModules,  value: String(totalTechniques), icon: BookOpen,   color: '#0071E3', bg: '#EFF6FF', trend: '+3', trendUp: true  },
    { label: t.common.active,        value: String(published),       icon: Check,      color: '#16A34A', bg: '#F0FDF4', trend: '+2', trendUp: true  },
    { label: 'Drafts',               value: String(drafts),          icon: TrendingDown, color: '#D97706', bg: '#FFFBEB', trend: String(drafts), trendUp: false },
    { label: t.school.techniques,    value: String(beltsCovered),    icon: Award,      color: '#6D28D9', bg: '#F5F3FF', trend: '5', trendUp: true  },
  ]

  return (
    <main style={{ flex: 1, minWidth: 0, width: "100%", overflow: "auto" }}>
          <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20 flex-wrap"
            style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
            <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(true)}>
              <Menu size={16} style={{ color: '#374151' }} />
            </button>
            <div className="flex-1" />
            <button className="relative w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <Bell size={15} style={{ color: '#374151' }} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: '#DC2626' }} />
            </button>
            <button onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer"
              style={{ background: '#0071E3', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600 }}>
              <Plus size={15} />{t.school.addModule}
            </button>
          </div>

          <div className="px-4 md:px-8 py-6 flex flex-col gap-6">
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>{t.school.curriculumTitle}</h1>
              <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>{t.school.curriculumSubtitle}</p>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {STATS.map(s => (
                <div key={s.label} className="rounded-2xl"
                  style={{ background: '#fff', border: '1px solid #E5E7EB', padding: '18px 20px' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: s.bg }}>
                      <s.icon size={16} style={{ color: s.color }} />
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 600,
                      background: s.trendUp ? '#F0FDF4' : '#FEF2F2',
                      color: s.trendUp ? '#16A34A' : '#DC2626',
                      padding: '2px 7px', borderRadius: 999 }}>
                      {s.trendUp ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                      {s.trend}
                    </span>
                  </div>
                  <p style={{ fontSize: 26, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 4 }}>{s.value}</p>
                  <p style={{ fontSize: 12, fontWeight: 500, color: '#6B7280' }}>{s.label}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-6">
              <div className="flex flex-col gap-1 shrink-0" style={{ width: 160 }}>
                {BELTS.map(belt => {
                  const cfg = BELT_CONFIG[belt]
                  const count = TECHNIQUES.filter(t => t.belt === belt).length
                  const isSelected = selectedBelt === belt
                  return (
                    <button key={belt} onClick={() => setSelectedBelt(belt)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-left"
                      style={{ border: isSelected ? '1px solid ' + cfg.dot : '1px solid transparent',
                        background: isSelected ? cfg.bg : 'transparent' }}>
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: cfg.dot }} />
                      <span style={{ fontSize: 13, fontWeight: isSelected ? 600 : 400, color: isSelected ? cfg.color : '#374151', flex: 1 }}>{belt}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: isSelected ? cfg.color : '#9CA3AF' }}>{count}</span>
                    </button>
                  )
                })}
              </div>

              <div className="flex-1 rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
                <div className="px-5 py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: BELT_CONFIG[selectedBelt].dot }} />
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>{selectedBelt} Belt</h2>
                    <span style={{ fontSize: 12, color: '#9CA3AF' }}>{techniques.length} techniques</span>
                  </div>
                </div>
                <div className="flex flex-col divide-y" style={{ borderColor: '#F9FAFB' }}>
                  {techniques.map(tech => {
                    const cat = CAT_MAP[tech.category]
                    const st  = STATUS_MAP[tech.status]
                    return (
                      <div key={tech.id} className="px-5 py-4 flex items-start gap-4 hover:bg-[#FAFAFA] transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{tech.name}</p>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 999,
                              background: cat.bg, color: cat.color }}>
                              {tech.category}
                            </span>
                          </div>
                          <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>{tech.description}</p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 shrink-0"
                          style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
                            background: st.bg, color: st.color, border: '1px solid ' + st.border }}>
                          {tech.status}
                        </span>
                      </div>
                    )
                  })}
                  {techniques.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '48px 0' }}>
                      <BookOpen size={28} style={{ color: '#E5E7EB', margin: '0 auto 10px' }} />
                      <p style={{ fontSize: 14, color: '#9CA3AF' }}>{t.school.noCurriculum}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
      <AddTechniqueDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => { setDrawerOpen(false); setToast(true); setTimeout(() => setToast(false), 3500) }}
      />
      {toast && <SuccessToast message="Technique added successfully" onClose={() => setToast(false)} />}
    </main>
  )
}
