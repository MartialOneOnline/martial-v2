'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Flame, Users, Calendar, CreditCard, Award,
  BarChart2, Settings, Bell, HelpCircle, LogOut,
  School, ShoppingBag, ChevronRight, ChevronDown,
  Menu, X, Search, Check, TrendingUp, TrendingDown,
  MoreHorizontal, Eye, Plus, ArrowRight,
} from 'lucide-react'

type GradingStatus = 'Scheduled' | 'Completed' | 'Cancelled'
type Belt = 'White' | 'Blue' | 'Purple' | 'Brown' | 'Black'

interface GradingEvent {
  id: number
  date: string
  title: string
  instructor: string
  location: string
  candidates: number
  status: GradingStatus
}

interface GradingResult {
  id: number
  avatar: string
  name: string
  email: string
  fromBelt: Belt
  toBelt: Belt
  stripes: number
  date: string
  instructor: string
  notes: string
}

const GRADING_EVENTS: GradingEvent[] = [
  { id:1, date:'15 Jun 2026', title:'Summer Grading 2026',       instructor:'Carlos Silva',    location:'Main Mat',    candidates:12, status:'Scheduled'  },
  { id:2, date:'20 Mar 2026', title:'Spring Grading 2026',       instructor:'Carlos Silva',    location:'Main Mat',    candidates:9,  status:'Completed'  },
  { id:3, date:'10 Dec 2025', title:'End of Year Grading 2025',  instructor:'Ana Rodrigues',   location:'Main Mat',    candidates:15, status:'Completed'  },
  { id:4, date:'18 Sep 2025', title:'Autumn Grading 2025',       instructor:'Carlos Silva',    location:'Main Mat',    candidates:8,  status:'Completed'  },
  { id:5, date:'22 Jun 2025', title:'Summer Grading 2025',       instructor:'Carlos Silva',    location:'External Gym',candidates:11, status:'Completed'  },
  { id:6, date:'05 Apr 2025', title:'Spring Grading 2025',       instructor:'Ana Rodrigues',   location:'Main Mat',    candidates:7,  status:'Cancelled'  },
]

const GRADING_RESULTS: GradingResult[] = [
  { id:1,  avatar:'https://i.pravatar.cc/32?u=fn',  name:'Fernanda Neves',    email:'fernanda@mail.com',  fromBelt:'White',  toBelt:'Blue',   stripes:0, date:'20 Mar 2026', instructor:'Carlos Silva',  notes:''  },
  { id:2,  avatar:'https://i.pravatar.cc/32?u=pm',  name:'Patricia Mancera',  email:'patricia@mail.com',  fromBelt:'Blue',   toBelt:'Blue',   stripes:2, date:'20 Mar 2026', instructor:'Carlos Silva',  notes:'Great progress'  },
  { id:3,  avatar:'https://i.pravatar.cc/32?u=mt',  name:'Matias Toloza',     email:'matias@mail.com',    fromBelt:'White',  toBelt:'White',  stripes:3, date:'20 Mar 2026', instructor:'Carlos Silva',  notes:''  },
  { id:4,  avatar:'https://i.pravatar.cc/32?u=fw',  name:'Florian Walter',    email:'florian@mail.com',   fromBelt:'Blue',   toBelt:'Purple', stripes:0, date:'10 Dec 2025', instructor:'Ana Rodrigues', notes:'Exceptional performance'  },
  { id:5,  avatar:'https://i.pravatar.cc/32?u=ad',  name:'Alejandro DB',      email:'alejandro@mail.com', fromBelt:'White',  toBelt:'Blue',   stripes:0, date:'10 Dec 2025', instructor:'Ana Rodrigues', notes:''  },
  { id:6,  avatar:'https://i.pravatar.cc/32?u=rg',  name:'Rafael Gonzalez',   email:'rafael@mail.com',    fromBelt:'Purple', toBelt:'Brown',  stripes:0, date:'10 Dec 2025', instructor:'Carlos Silva',  notes:'Long overdue'  },
  { id:7,  avatar:'https://i.pravatar.cc/32?u=ma',  name:'Miguel Ángel Ruiz', email:'miguel@mail.com',    fromBelt:'Blue',   toBelt:'Blue',   stripes:4, date:'18 Sep 2025', instructor:'Carlos Silva',  notes:''  },
  { id:8,  avatar:'https://i.pravatar.cc/32?u=ls',  name:'Laura Sánchez',     email:'laura@mail.com',     fromBelt:'White',  toBelt:'White',  stripes:2, date:'18 Sep 2025', instructor:'Carlos Silva',  notes:''  },
  { id:9,  avatar:'https://i.pravatar.cc/32?u=jk',  name:'James Kim',         email:'james@mail.com',     fromBelt:'Brown',  toBelt:'Black',  stripes:0, date:'22 Jun 2025', instructor:'Carlos Silva',  notes:'First black belt of the academy'  },
  { id:10, avatar:'https://i.pravatar.cc/32?u=sg',  name:'Sara García',       email:'sara@mail.com',      fromBelt:'White',  toBelt:'Blue',   stripes:0, date:'22 Jun 2025', instructor:'Carlos Silva',  notes:''  },
  { id:11, avatar:'https://i.pravatar.cc/32?u=dt',  name:'Diego Torres',      email:'diego@mail.com',     fromBelt:'Blue',   toBelt:'Blue',   stripes:3, date:'22 Jun 2025', instructor:'Ana Rodrigues', notes:''  },
  { id:12, avatar:'https://i.pravatar.cc/32?u=ab',  name:'Ana Belén López',   email:'ana@mail.com',       fromBelt:'White',  toBelt:'White',  stripes:4, date:'20 Mar 2026', instructor:'Carlos Silva',  notes:''  },
  { id:13, avatar:'https://i.pravatar.cc/32?u=cr',  name:'Carlos Romero',     email:'carlos@mail.com',    fromBelt:'Purple', toBelt:'Purple', stripes:2, date:'10 Dec 2025', instructor:'Ana Rodrigues', notes:''  },
  { id:14, avatar:'https://i.pravatar.cc/32?u=vp',  name:'Valeria Pérez',     email:'valeria@mail.com',   fromBelt:'Blue',   toBelt:'Blue',   stripes:1, date:'18 Sep 2025', instructor:'Carlos Silva',  notes:''  },
]

const EVENT_STATUS_MAP: Record<GradingStatus, { bg: string; color: string; border: string }> = {
  Scheduled: { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  Completed: { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
  Cancelled: { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' },
}

const BELT_MAP: Record<Belt, { bg: string; color: string; dot: string }> = {
  White:  { bg: '#F9FAFB', color: '#374151', dot: '#9CA3AF' },
  Blue:   { bg: '#EFF6FF', color: '#1D4ED8', dot: '#2563EB' },
  Purple: { bg: '#F5F3FF', color: '#6D28D9', dot: '#7C3AED' },
  Brown:  { bg: '#FEF3C7', color: '#92400E', dot: '#92400E' },
  Black:  { bg: '#F3F4F6', color: '#111827', dot: '#111827' },
}

const MEMBERS = [
  { id:1,  avatar:'https://i.pravatar.cc/32?u=fn',  name:'Fernanda Neves',    email:'fernanda@mail.com'  },
  { id:2,  avatar:'https://i.pravatar.cc/32?u=pm',  name:'Patricia Mancera',  email:'patricia@mail.com'  },
  { id:3,  avatar:'https://i.pravatar.cc/32?u=mt',  name:'Matias Toloza',     email:'matias@mail.com'    },
  { id:4,  avatar:'https://i.pravatar.cc/32?u=fw',  name:'Florian Walter',    email:'florian@mail.com'   },
  { id:5,  avatar:'https://i.pravatar.cc/32?u=ad',  name:'Alejandro DB',      email:'alejandro@mail.com' },
  { id:6,  avatar:'https://i.pravatar.cc/32?u=rg',  name:'Rafael Gonzalez',   email:'rafael@mail.com'    },
  { id:7,  avatar:'https://i.pravatar.cc/32?u=ma',  name:'Miguel Ángel Ruiz', email:'miguel@mail.com'    },
  { id:8,  avatar:'https://i.pravatar.cc/32?u=ls',  name:'Laura Sánchez',     email:'laura@mail.com'     },
]

function AddGradingDrawer({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [gradingType, setGradingType] = useState<'Event' | 'Result'>('Event')

  const [title, setTitle]             = useState('')
  const [eventDate, setEventDate]     = useState('')
  const [location, setLocation]       = useState('')
  const [eventInstructor, setEventInstructor] = useState('')

  const [memberQuery, setMemberQuery]       = useState('')
  const [selectedMember, setSelectedMember] = useState<typeof MEMBERS[0] | null>(null)
  const [showDropdown, setShowDropdown]     = useState(false)
  const [fromBelt, setFromBelt]             = useState<Belt | ''>('')
  const [toBelt, setToBelt]                 = useState<Belt | ''>('')
  const [stripes, setStripes]               = useState('0')
  const [resultDate, setResultDate]         = useState('')
  const [resultInstructor, setResultInstructor] = useState('')

  const [notes, setNotes] = useState('')

  const filteredMembers = MEMBERS.filter(m =>
    memberQuery === '' ||
    m.name.toLowerCase().includes(memberQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(memberQuery.toLowerCase())
  )

  function reset() {
    setTitle(''); setEventDate(''); setLocation(''); setEventInstructor('')
    setMemberQuery(''); setSelectedMember(null); setShowDropdown(false)
    setFromBelt(''); setToBelt(''); setStripes('0'); setResultDate(''); setResultInstructor('')
    setNotes('')
  }
  function handleClose() { reset(); onClose() }
  function handleSuccess() { reset(); onSuccess() }

  const canSubmit = gradingType === 'Event'
    ? title && eventDate && location && eventInstructor
    : selectedMember && fromBelt && toBelt && resultDate && resultInstructor

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1px solid #E5E7EB', borderRadius: 10,
    padding: '9px 12px', fontSize: 13, color: '#111827', background: '#fff', outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5,
  }

  const BELTS: Belt[] = ['White', 'Blue', 'Purple', 'Brown', 'Black']

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
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>Add Grading</h2>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Record a grading event or promotion result</p>
          </div>
          <button onClick={handleClose} className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <X size={15} style={{ color: '#6B7280' }} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">
          <div>
            <label style={labelStyle}>Type</label>
            <div className="flex gap-2">
              {(['Event','Result'] as const).map(t => (
                <button key={t} onClick={() => setGradingType(t)}
                  className="flex-1 py-2 rounded-xl cursor-pointer"
                  style={{ fontSize: 13, fontWeight: 600, border: '1px solid',
                    borderColor: gradingType === t ? '#0071E3' : '#E5E7EB',
                    background: gradingType === t ? '#EFF6FF' : '#fff',
                    color: gradingType === t ? '#0071E3' : '#374151' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {gradingType === 'Event' ? (
            <>
              <div>
                <label style={labelStyle}>Event Title</label>
                <input type="text" placeholder="e.g. Summer Grading 2026" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>Date</label>
                  <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Location</label>
                  <input type="text" placeholder="Main Mat" value={location} onChange={e => setLocation(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Instructor</label>
                <input type="text" placeholder="Carlos Silva" value={eventInstructor} onChange={e => setEventInstructor(e.target.value)} style={inputStyle} />
              </div>
            </>
          ) : (
            <>
              <div className="relative">
                <label style={labelStyle}>Member</label>
                {selectedMember ? (
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                    style={{ border: '1px solid #0071E3', background: '#EFF6FF' }}>
                    <div className="flex items-center gap-2.5">
                      <img src={selectedMember.avatar} alt={selectedMember.name}
                        className="rounded-full shrink-0" style={{ width: 28, height: 28 }} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{selectedMember.name}</p>
                        <p style={{ fontSize: 11, color: '#6B7280' }}>{selectedMember.email}</p>
                      </div>
                    </div>
                    <button onClick={() => { setSelectedMember(null); setMemberQuery('') }}
                      className="w-6 h-6 flex items-center justify-center rounded-lg cursor-pointer"
                      style={{ background: 'transparent', border: 'none' }}>
                      <X size={13} style={{ color: '#6B7280' }} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                      style={{ border: '1px solid #E5E7EB', background: '#fff' }}>
                      <Search size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                      <input type="text" placeholder="Search member…"
                        value={memberQuery}
                        onChange={e => { setMemberQuery(e.target.value); setShowDropdown(true) }}
                        onFocus={() => setShowDropdown(true)}
                        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', width: '100%' }} />
                    </div>
                    {showDropdown && filteredMembers.length > 0 && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                        <div className="absolute left-0 right-0 rounded-xl z-20 overflow-hidden mt-1"
                          style={{ background: '#fff', border: '1px solid #E5E7EB',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.1)', maxHeight: 220, overflowY: 'auto' }}>
                          {filteredMembers.map(m => (
                            <button key={m.id}
                              onClick={() => { setSelectedMember(m); setMemberQuery(''); setShowDropdown(false) }}
                              className="w-full text-left flex items-center gap-3 px-4 py-2.5 cursor-pointer"
                              style={{ background: 'transparent', border: 'none' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                              <img src={m.avatar} alt={m.name} className="rounded-full shrink-0" style={{ width: 28, height: 28 }} />
                              <div>
                                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{m.name}</p>
                                <p style={{ fontSize: 11, color: '#9CA3AF' }}>{m.email}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>From Belt</label>
                  <select value={fromBelt} onChange={e => setFromBelt(e.target.value as Belt)} style={inputStyle}>
                    <option value="">Select…</option>
                    {BELTS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>To Belt</label>
                  <select value={toBelt} onChange={e => setToBelt(e.target.value as Belt)} style={inputStyle}>
                    <option value="">Select…</option>
                    {BELTS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>Stripes</label>
                  <select value={stripes} onChange={e => setStripes(e.target.value)} style={inputStyle}>
                    {[0,1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Date</label>
                  <input type="date" value={resultDate} onChange={e => setResultDate(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Instructor</label>
                <input type="text" placeholder="Carlos Silva" value={resultInstructor} onChange={e => setResultInstructor(e.target.value)} style={inputStyle} />
              </div>
            </>
          )}

          <div>
            <label style={labelStyle}>Notes <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span></label>
            <textarea rows={3} placeholder="Additional notes…" value={notes} onChange={e => setNotes(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
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
            <Plus size={14} />Add Grading
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

const ITEMS_PER_PAGE = 10
function getPaginationPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}

type NavItem = { label: string; icon: React.ElementType; href?: string; children?: { label: string; href: string }[] }
const ACTIVE_HREF = '/dashboard/school/gradings'

const NAV_MAIN: NavItem[] = [
  { label: 'Dashboard',   icon: Flame,      href: '/dashboard' },
  { label: 'Users',       icon: Users,      href: '/dashboard/users' },
  { label: 'Classes',     icon: Calendar,   children: [
    { label: 'Classes',   href: '/dashboard/classes' },
    { label: 'Events',    href: '/dashboard/classes/events' },
    { label: 'Calendar',  href: '/dashboard/classes/calendar' },
    { label: 'Timetable', href: '/dashboard/classes/timetable' },
  ]},
  { label: 'Memberships', icon: Award,      href: '/dashboard/memberships' },
  { label: 'Payments',    icon: CreditCard, children: [
    { label: 'Transactions',  href: '/dashboard/payments/transactions' },
    { label: 'Subscriptions', href: '/dashboard/payments/subscriptions' },
  ]},
  { label: 'School',      icon: School,     children: [
    { label: 'Leads',       href: '/dashboard/school/leads' },
    { label: 'Store',       href: '/dashboard/school/store' },
    { label: 'Curriculum',  href: '/dashboard/school/curriculum' },
    { label: 'Affiliates',  href: '/dashboard/school/affiliates' },
    { label: 'Staff',       href: '/dashboard/school/staff' },
    { label: 'Waivers',     href: '/dashboard/school/waivers' },
    { label: 'Gradings',    href: '/dashboard/school/gradings' },
  ]},
  { label: 'Reports',     icon: BarChart2,  children: [
    { label: 'Bookings', href: '#' }, { label: 'Gradings', href: '#' },
    { label: 'Payments', href: '#' }, { label: 'Balance', href: '#' },
    { label: 'Absents', href: '#' }, { label: 'Users', href: '#' },
  ]},
  { label: 'Settings', icon: Settings, href: '/dashboard/settings' },
]
const NAV_BOTTOM: NavItem[] = [
  { label: 'Subscription',  icon: ShoppingBag, href: '#' },
  { label: 'Notifications', icon: Bell,        href: '#' },
  { label: 'Support',       icon: HelpCircle,  href: '#' },
]

function NavGroup({ item }: { item: NavItem }) {
  const isActive = item.href === ACTIVE_HREF || item.children?.some(c => c.href === ACTIVE_HREF)
  const [open, setOpen] = useState(isActive ?? false)
  if (!item.children) return (
    <Link href={item.href ?? '#'}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl no-underline transition-colors"
      style={{ color: '#374151', fontSize: 14, background: item.href === ACTIVE_HREF ? '#EFF6FF' : 'transparent' }}
      onMouseEnter={e => { if (item.href !== ACTIVE_HREF) (e.currentTarget as HTMLElement).style.background = '#F9FAFB' }}
      onMouseLeave={e => { if (item.href !== ACTIVE_HREF) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
      <item.icon size={16} style={{ color: item.href === ACTIVE_HREF ? '#0071E3' : '#9CA3AF', flexShrink: 0 }} />
      {item.label}
    </Link>
  )
  return (
    <div>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-left"
        style={{ color: '#374151', fontSize: 14, background: isActive ? '#EFF6FF' : 'transparent', border: 'none' }}
        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#F9FAFB' }}
        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = isActive ? '#EFF6FF' : 'transparent' }}>
        <item.icon size={16} style={{ color: isActive ? '#0071E3' : '#9CA3AF', flexShrink: 0 }} />
        <span className="flex-1">{item.label}</span>
        {open ? <ChevronDown size={13} style={{ color: '#9CA3AF' }} /> : <ChevronRight size={13} style={{ color: '#9CA3AF' }} />}
      </button>
      {open && (
        <div className="ml-7 mt-0.5 space-y-0.5">
          {item.children!.map(child => (
            <Link key={child.label} href={child.href}
              className="flex items-center px-3 py-2 rounded-lg no-underline transition-colors"
              style={{ fontSize: 13, color: child.href === ACTIVE_HREF ? '#0071E3' : '#6B7280', fontWeight: child.href === ACTIVE_HREF ? 600 : 400 }}
              onMouseEnter={e => { if (child.href !== ACTIVE_HREF) { (e.currentTarget as HTMLElement).style.background = '#F9FAFB'; (e.currentTarget as HTMLElement).style.color = '#111827' }}}
              onMouseLeave={e => { if (child.href !== ACTIVE_HREF) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#6B7280' }}}
            >{child.label}</Link>
          ))}
        </div>
      )}
    </div>
  )
}

type MainTab = 'Events' | 'Results'
const BELTS: Belt[] = ['White', 'Blue', 'Purple', 'Brown', 'Black']

export default function GradingsClient() {
  const [menuOpen, setMenuOpen]         = useState(false)
  const [mainTab, setMainTab]           = useState<MainTab>('Events')
  const [search, setSearch]             = useState('')
  const [beltFilter, setBeltFilter]     = useState<Belt | 'All'>('All')
  const [currentPage, setCurrentPage]   = useState(1)
  const [openMenuId, setOpenMenuId]     = useState<number | null>(null)
  const [drawerOpen, setDrawerOpen]     = useState(false)
  const [toast, setToast]               = useState(false)

  const filteredEvents = GRADING_EVENTS.filter(e => {
    const q = search.toLowerCase()
    return search === '' || e.title.toLowerCase().includes(q) || e.instructor.toLowerCase().includes(q)
  })

  const filteredResults = GRADING_RESULTS.filter(r => {
    const matchBelt = beltFilter === 'All' || r.toBelt === beltFilter
    const q = search.toLowerCase()
    const matchSearch = search === '' || r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
    return matchBelt && matchSearch
  })

  const totalGradings    = GRADING_EVENTS.length
  const thisYear         = GRADING_EVENTS.filter(e => e.date.includes('2026')).length
  const totalPromotions  = GRADING_RESULTS.length
  const upcoming         = GRADING_EVENTS.filter(e => e.status === 'Scheduled').length

  const activeData       = mainTab === 'Events' ? filteredEvents : filteredResults
  const totalPages       = Math.max(1, Math.ceil(activeData.length / ITEMS_PER_PAGE))
  const safePage         = Math.min(currentPage, totalPages)
  const paginatedEvents  = filteredEvents.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE) as GradingEvent[]
  const paginatedResults = filteredResults.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE) as GradingResult[]
  const pages            = getPaginationPages(safePage, totalPages)

  const STATS = [
    { label: 'Total Gradings',    value: String(totalGradings),   icon: Award,       color: '#0071E3', bg: '#EFF6FF', trend: '+2',  trendUp: true  },
    { label: 'This Year',         value: String(thisYear),        icon: TrendingUp,  color: '#16A34A', bg: '#F0FDF4', trend: '+2',  trendUp: true  },
    { label: 'Total Promotions',  value: String(totalPromotions), icon: Check,       color: '#6D28D9', bg: '#F5F3FF', trend: '+5',  trendUp: true  },
    { label: 'Upcoming',          value: String(upcoming),        icon: TrendingDown, color: '#D97706', bg: '#FFFBEB', trend: String(upcoming), trendUp: true },
  ]

  return (
    <>
    <div className="min-h-screen flex"
      style={{ background: '#F9FAFB', fontFamily: "-apple-system,BlinkMacSystemFont,'Inter',sans-serif" }}>
      <style>{`@media(min-width:768px){.dashboard-sidebar{transform:translateX(0)!important}}`}</style>

      {menuOpen && <div className="fixed inset-0 z-40 md:hidden" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setMenuOpen(false)} />}

      <aside className="dashboard-sidebar fixed top-0 left-0 h-full flex flex-col z-50"
        style={{ width: 232, background: '#fff', borderRight: '1px solid #E5E7EB',
          transform: menuOpen ? 'translateX(0)' : 'translateX(-232px)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)' }}>
        <div className="flex items-center justify-between px-5 py-5" style={{ borderBottom: '1px solid #E5E7EB' }}>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0">
              <Image src="/martial-logo.png" alt="Martial" width={28} height={28} className="object-contain" />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', letterSpacing: '-0.01em' }}>MARTIAL</p>
              <p style={{ fontSize: 10, fontWeight: 500, color: '#9CA3AF', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Academy</p>
            </div>
          </div>
          <button className="md:hidden flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(false)}>
            <X size={14} style={{ color: '#6B7280' }} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {NAV_MAIN.map(item => <NavGroup key={item.label} item={item} />)}
        </nav>
        <div style={{ borderTop: '1px solid #E5E7EB' }} className="px-3 py-3 space-y-0.5">
          {NAV_BOTTOM.map(item => (
            <Link key={item.label} href={item.href ?? '#'}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl no-underline"
              style={{ color: '#374151', fontSize: 14 }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
              <item.icon size={16} style={{ color: '#9CA3AF' }} />{item.label}
            </Link>
          ))}
          <form action="/auth/logout" method="post">
            <button type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left cursor-pointer"
              style={{ color: '#374151', fontSize: 14, background: 'transparent', border: 'none' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
              <LogOut size={16} style={{ color: '#9CA3AF' }} />Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex flex-1 min-w-0 md:ml-[232px]">
        <main style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20 flex-wrap"
            style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
            <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(o => !o)}>
              <Menu size={16} style={{ color: '#374151' }} />
            </button>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 max-w-xs"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <Search size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
              <input type="text" placeholder="Search gradings…" value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', width: '100%' }} />
            </div>
            <div className="flex-1" />
            <button className="relative w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <Bell size={15} style={{ color: '#374151' }} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: '#DC2626' }} />
            </button>
            <button onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer"
              style={{ background: '#0071E3', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600 }}>
              <Plus size={15} />Add Grading
            </button>
          </div>

          <div className="px-4 md:px-8 py-6 flex flex-col gap-6">
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>Gradings</h1>
              <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>Manage belt promotions and grading events</p>
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

            <div style={{ borderBottom: '1px solid #E5E7EB' }}>
              <div className="flex items-center gap-1">
                {(['Events','Results'] as MainTab[]).map(tab => {
                  const isActive = mainTab === tab
                  return (
                    <button key={tab} onClick={() => { setMainTab(tab); setCurrentPage(1); setBeltFilter('All') }}
                      className="flex items-center gap-2 px-4 py-3 cursor-pointer relative"
                      style={{ fontSize: 14, fontWeight: isActive ? 600 : 400, border: 'none',
                        background: 'transparent', color: isActive ? '#111827' : '#6B7280' }}>
                      {tab}
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 999,
                        background: isActive ? '#EFF6FF' : '#F3F4F6',
                        color: isActive ? '#2563EB' : '#9CA3AF' }}>
                        {tab === 'Events' ? GRADING_EVENTS.length : GRADING_RESULTS.length}
                      </span>
                      {isActive && (
                        <div className="absolute bottom-0 left-0 right-0"
                          style={{ height: 2, background: '#0071E3', borderRadius: '2px 2px 0 0' }} />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {mainTab === 'Results' && (
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Filter by belt:</span>
                {(['All', ...BELTS] as (Belt | 'All')[]).map(b => {
                  const isActive = beltFilter === b
                  const cfg = b !== 'All' ? BELT_MAP[b as Belt] : null
                  return (
                    <button key={b} onClick={() => { setBeltFilter(b); setCurrentPage(1) }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl cursor-pointer"
                      style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, border: '1px solid',
                        borderColor: isActive && cfg ? cfg.dot : isActive ? '#0071E3' : '#E5E7EB',
                        background: isActive && cfg ? cfg.bg : isActive ? '#EFF6FF' : '#fff',
                        color: isActive && cfg ? cfg.color : isActive ? '#0071E3' : '#374151' }}>
                      {b !== 'All' && (
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg!.dot }} />
                      )}
                      {b}
                    </button>
                  )
                })}
              </div>
            )}

            <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
              {mainTab === 'Events' ? (
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                      {[
                        { label: 'Date',       cls: '' },
                        { label: 'Event',      cls: '' },
                        { label: 'Instructor', cls: 'hidden md:table-cell' },
                        { label: 'Location',   cls: 'hidden lg:table-cell' },
                        { label: 'Candidates', cls: '' },
                        { label: 'Status',     cls: '' },
                        { label: 'Actions',    cls: '' },
                      ].map(h => (
                        <th key={h.label} className={`px-5 py-3 text-left ${h.cls}`}
                          style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {h.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedEvents.map((ev, idx) => {
                      const sc = EVENT_STATUS_MAP[ev.status]
                      return (
                        <tr key={ev.id} className="hover:bg-[#FAFAFA] transition-colors cursor-pointer"
                          style={{ borderBottom: idx < paginatedEvents.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                          <td className="px-5 py-3">
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{ev.date}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{ev.title}</span>
                          </td>
                          <td className="hidden md:table-cell px-5 py-3">
                            <span style={{ fontSize: 13, color: '#374151' }}>{ev.instructor}</span>
                          </td>
                          <td className="hidden lg:table-cell px-5 py-3">
                            <span style={{ fontSize: 13, color: '#6B7280' }}>{ev.location}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>{ev.candidates}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center gap-1.5"
                              style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
                                background: sc.bg, color: sc.color, border: '1px solid ' + sc.border, whiteSpace: 'nowrap' }}>
                              {ev.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 relative">
                            <div className="flex items-center gap-1">
                              <button className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                                style={{ color: '#9CA3AF', background: 'transparent', border: 'none' }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                                <Eye size={14} />
                              </button>
                              <button onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === ev.id ? null : ev.id) }}
                                className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                                style={{ color: '#9CA3AF', background: 'transparent', border: 'none' }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                                <MoreHorizontal size={15} />
                              </button>
                            </div>
                            {openMenuId === ev.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                                <div className="absolute right-4 rounded-xl z-20 py-1 overflow-hidden"
                                  style={{ background: '#fff', border: '1px solid #E5E7EB',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 160, top: '100%' }}>
                                  {['View event','Edit event','Cancel event'].map((label, i) => (
                                    <button key={label} onClick={() => setOpenMenuId(null)}
                                      className="w-full text-left px-4 py-2.5 cursor-pointer"
                                      style={{ fontSize: 13, color: i === 2 ? '#DC2626' : '#374151',
                                        background: 'transparent', border: 'none' }}
                                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = i === 2 ? '#FEF2F2' : '#F9FAFB'}
                                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                                      {label}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    {paginatedEvents.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '48px 0' }}>
                          <Award size={28} style={{ color: '#E5E7EB', margin: '0 auto 10px' }} />
                          <p style={{ fontSize: 14, color: '#9CA3AF' }}>No grading events found</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                      {[
                        { label: 'Member',     cls: '' },
                        { label: 'Promotion',  cls: '' },
                        { label: 'Stripes',    cls: 'hidden sm:table-cell' },
                        { label: 'Date',       cls: 'hidden md:table-cell' },
                        { label: 'Instructor', cls: 'hidden lg:table-cell' },
                        { label: 'Actions',    cls: '' },
                      ].map(h => (
                        <th key={h.label} className={`px-5 py-3 text-left ${h.cls}`}
                          style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {h.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedResults.map((result, idx) => {
                      const from = BELT_MAP[result.fromBelt]
                      const to   = BELT_MAP[result.toBelt]
                      return (
                        <tr key={result.id} className="hover:bg-[#FAFAFA] transition-colors cursor-pointer"
                          style={{ borderBottom: idx < paginatedResults.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <img src={result.avatar} alt={result.name} className="rounded-full shrink-0" style={{ width: 32, height: 32 }} />
                              <div className="min-w-0">
                                <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{result.name}</p>
                                <p style={{ fontSize: 11, color: '#9CA3AF' }}>{result.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 999,
                                background: from.bg, color: from.color }}>
                                {result.fromBelt}
                              </span>
                              <ArrowRight size={12} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 999,
                                background: to.bg, color: to.color }}>
                                {result.toBelt}
                              </span>
                            </div>
                          </td>
                          <td className="hidden sm:table-cell px-5 py-3">
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{result.stripes}</span>
                          </td>
                          <td className="hidden md:table-cell px-5 py-3">
                            <span style={{ fontSize: 13, color: '#6B7280' }}>{result.date}</span>
                          </td>
                          <td className="hidden lg:table-cell px-5 py-3">
                            <span style={{ fontSize: 13, color: '#374151' }}>{result.instructor}</span>
                          </td>
                          <td className="px-5 py-3 relative">
                            <div className="flex items-center gap-1">
                              <button className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                                style={{ color: '#9CA3AF', background: 'transparent', border: 'none' }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                                <Eye size={14} />
                              </button>
                              <button onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === (result.id + 1000) ? null : (result.id + 1000)) }}
                                className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                                style={{ color: '#9CA3AF', background: 'transparent', border: 'none' }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                                <MoreHorizontal size={15} />
                              </button>
                            </div>
                            {openMenuId === (result.id + 1000) && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                                <div className="absolute right-4 rounded-xl z-20 py-1 overflow-hidden"
                                  style={{ background: '#fff', border: '1px solid #E5E7EB',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 160, top: '100%' }}>
                                  {['View result','Edit result','Delete result'].map((label, i) => (
                                    <button key={label} onClick={() => setOpenMenuId(null)}
                                      className="w-full text-left px-4 py-2.5 cursor-pointer"
                                      style={{ fontSize: 13, color: i === 2 ? '#DC2626' : '#374151',
                                        background: 'transparent', border: 'none' }}
                                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = i === 2 ? '#FEF2F2' : '#F9FAFB'}
                                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                                      {label}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    {paginatedResults.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '48px 0' }}>
                          <Award size={28} style={{ color: '#E5E7EB', margin: '0 auto 10px' }} />
                          <p style={{ fontSize: 14, color: '#9CA3AF' }}>No grading results found</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
              <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
                <p style={{ fontSize: 13, color: '#6B7280' }}>
                  Showing{' '}
                  <span style={{ fontWeight: 600, color: '#111827' }}>
                    {activeData.length === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, activeData.length)}
                  </span>
                  {' of '}
                  <span style={{ fontWeight: 600, color: '#111827' }}>{activeData.length}</span>
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                    style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff',
                      color: safePage === 1 ? '#D1D5DB' : '#374151', cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                      borderRadius: 8, padding: '6px 12px' }}>Prev</button>
                  <div className="flex items-center gap-1 mx-1">
                    {pages.map((p, i) =>
                      p === '...'
                        ? <span key={'e'+i} style={{ fontSize: 13, color: '#9CA3AF', padding: '0 4px' }}>…</span>
                        : (
                          <button key={p} onClick={() => setCurrentPage(p as number)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer"
                            style={{ fontSize: 13, fontWeight: p === safePage ? 600 : 400, border: 'none',
                              background: p === safePage ? '#F3F4F6' : 'transparent',
                              color: p === safePage ? '#111827' : '#6B7280' }}>
                            {p}
                          </button>
                        )
                    )}
                  </div>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                    style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff',
                      color: safePage === totalPages ? '#D1D5DB' : '#374151', cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                      borderRadius: 8, padding: '6px 12px' }}>Next</button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>

    <AddGradingDrawer
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      onSuccess={() => { setDrawerOpen(false); setToast(true); setTimeout(() => setToast(false), 3500) }}
    />
    {toast && <SuccessToast message="Grading added successfully" onClose={() => setToast(false)} />}
    </>
  )
}
