'use client'

import { useDashboard } from '../../../components/DashboardShell'
import { useState } from 'react'
import {Users, Calendar, CreditCard, BarChart2, Settings, Bell, ChevronRight, ChevronDown, Menu, Search, MessageSquare, MessageCircle, BookOpen, Mail, Check, Plus, ExternalLink} from 'lucide-react'
import { useT } from '../../../lib/i18n/LanguageContext'
import type { Translations } from '../../../lib/i18n/translations'

const FAQ_SECTIONS = [
  {
    title: 'Getting Started',
    items: [
      { q: 'How do I add my first members?', a: 'Go to Users → click "New member". Fill in their details, assign a membership, and save. They\'ll receive a welcome email automatically.' },
      { q: 'How do I set up Stripe payments?', a: 'Go to Settings → Integrations → Stripe. Click "Connect Stripe" and follow the OAuth flow. Once connected, all memberships with a price will be billable.' },
      { q: 'Can I import members from another system?', a: 'Yes. Go to Users → Import and upload a CSV file. Download our template first to ensure the columns match correctly.' },
    ],
  },
  {
    title: 'Memberships & Payments',
    items: [
      { q: 'How do recurring subscriptions work?', a: 'When a member signs up for a recurring membership, Martial creates a Stripe subscription that auto-charges on each billing cycle. You\'ll see the status in Payments → Subscriptions.' },
      { q: 'What payment methods do you support?', a: 'We support all major credit and debit cards via Stripe. Bank debits (SEPA, ACH) are also supported depending on your Stripe account region.' },
      { q: 'How do I issue a refund?', a: 'Go to Payments → Transactions, find the payment, and click the three-dot menu → Refund. Refunds are processed via Stripe and typically take 5–10 business days.' },
      { q: 'Can members pay in cash?', a: 'Yes. You can record a manual payment from the member\'s profile under Payments → Record payment. This does not go through Stripe.' },
    ],
  },
  {
    title: 'Classes & Bookings',
    items: [
      { q: 'How do I set up a class schedule?', a: 'Go to Classes → Timetable. Click "Add class" to create a recurring schedule, or Classes → Events for one-off sessions.' },
      { q: 'Can members book online?', a: 'Yes — members access the booking portal via their member app or the public link for your academy. Bookings appear in real time on your Calendar.' },
      { q: 'How do I handle waitlists?', a: 'When a class reaches capacity, further bookings go to the waitlist automatically. Members are notified if a spot opens up.' },
    ],
  },
  {
    title: 'Grading & Curriculum',
    items: [
      { q: 'How do I record a belt promotion?', a: 'Go to Users → select the member → Grading tab. Click "Add grading", choose the new belt/stripe, date, and any notes. The member\'s profile updates instantly.' },
      { q: 'Can I set minimum attendance requirements?', a: 'Yes. In School → Curriculum, you can define minimum class attendance per belt level. Members below threshold are flagged automatically.' },
      { q: 'How do I export grading certificates?', a: 'From School → Gradings, select one or more records and click "Export". PDFs are generated with your academy branding.' },
    ],
  },
  {
    title: 'Account & Billing',
    items: [
      { q: 'How do I upgrade my Martial plan?', a: 'Go to Subscription in the left nav. Choose the plan that fits your needs and click "Upgrade". Your new features activate immediately.' },
      { q: 'Can I cancel my subscription?', a: 'Yes. Go to Subscription → Manage billing. You can cancel anytime and you\'ll retain access until the end of your billing period.' },
      { q: 'How do I export my data?', a: 'Go to Settings → Data & Privacy → Export data. You\'ll receive a download link with all your academy data in CSV format within a few minutes.' },
    ],
  },
]

type TicketStatus = 'Open' | 'In Progress' | 'Resolved'

const TICKETS = [
  { id: 'TK-0012', subject: 'Stripe payments not syncing', category: 'Billing',      status: 'Open' as TicketStatus,        updated: 'Jun 4, 2026' },
  { id: 'TK-0011', subject: 'Member import CSV error',     category: 'Members',      status: 'In Progress' as TicketStatus,  updated: 'Jun 3, 2026' },
  { id: 'TK-0010', subject: 'Calendar not showing events', category: 'Classes',      status: 'In Progress' as TicketStatus,  updated: 'Jun 1, 2026' },
  { id: 'TK-0009', subject: 'How to set up SEPA debits',   category: 'Billing',      status: 'Resolved' as TicketStatus,     updated: 'May 28, 2026' },
  { id: 'TK-0008', subject: 'Belt certificate PDF blank',  category: 'Gradings',     status: 'Resolved' as TicketStatus,     updated: 'May 22, 2026' },
]

const TICKET_STATUS_STYLE: Record<TicketStatus, { bg: string; color: string }> = {
  'Open':        { bg: '#EFF6FF', color: '#0071E3' },
  'In Progress': { bg: '#FFFBEB', color: '#D97706' },
  'Resolved':    { bg: '#F0FDF4', color: '#16A34A' },
}

const CATEGORY_CHIP_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  'Billing':  { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
  'Members':  { bg: '#EFF6FF', color: '#0071E3', border: '#BFDBFE' },
  'Classes':  { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
  'Gradings': { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
}

function FaqSection({ title, items }: { title: string; items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)
  return (
    <div style={{ borderBottom: '1px solid #F3F4F6' }}>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-4"
        style={{ padding: '14px 0', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{title}</span>
        {open ? <ChevronDown size={16} style={{ color: '#9CA3AF', flexShrink: 0 }} /> : <ChevronRight size={16} style={{ color: '#9CA3AF', flexShrink: 0 }} />}
      </button>
      {open && (
        <div style={{ paddingBottom: 8 }}>
          {items.map((item, i) => (
            <div key={i} style={{ borderTop: '1px solid #F3F4F6' }}>
              <button onClick={() => setExpanded(expanded === i ? null : i)}
                className="w-full flex items-center justify-between gap-4"
                style={{ padding: '11px 0', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{item.q}</span>
                {expanded === i
                  ? <ChevronDown size={14} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                  : <ChevronRight size={14} style={{ color: '#9CA3AF', flexShrink: 0 }} />}
              </button>
              {expanded === i && (
                <div style={{ fontSize: 13, color: '#6B7280', paddingBottom: 12, lineHeight: 1.6 }}>{item.a}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SupportClient() {
  const { setMenuOpen } = useDashboard()
  const t = useT()
  const [search, setSearch] = useState('')

  return (
        <main style={{ flex: 1, minWidth: 0, width: "100%", overflow: "auto" }}>
          <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="md:hidden" onClick={() => setMenuOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <Menu size={20} style={{ color: '#374151' }} />
            </button>
            <span style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>{t.support.title}</span>
          </div>

          <div className="px-4 md:px-8 py-6 flex flex-col gap-6">

            {/* Hero Search */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '32px 28px', textAlign: 'center' }}>
              <h1 style={{ fontWeight: 800, fontSize: 22, color: '#111827', margin: '0 0 6px' }}>{t.support.heroTitle}</h1>
              <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 20px' }}>{t.support.heroSubtitle}</p>
              <div style={{ maxWidth: 480, margin: '0 auto', position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                <input
                  type="text"
                  placeholder={t.support.searchPlaceholder}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: '100%', paddingLeft: 40, paddingRight: 16, paddingTop: 10, paddingBottom: 10, borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box', background: '#F9FAFB' }}
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageSquare size={20} style={{ color: '#0071E3' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 4 }}>{t.support.submitTicket}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{t.support.submitTicketDesc}</div>
                </div>
                <button style={{ marginTop: 'auto', padding: '8px 0', borderRadius: 9, background: '#0071E3', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {t.support.openTicket}
                </button>
              </div>

              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageCircle size={20} style={{ color: '#16A34A' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 4 }}>{t.support.liveChat}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{t.support.liveChatDesc}</div>
                </div>
                <button style={{ marginTop: 'auto', padding: '8px 0', borderRadius: 9, background: '#16A34A', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#86EFAC', display: 'inline-block' }} />
                  {t.support.startChat}
                </button>
              </div>

              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BookOpen size={20} style={{ color: '#6D28D9' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 4 }}>{t.support.documentation}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{t.support.documentationDesc}</div>
                </div>
                <button style={{ marginTop: 'auto', padding: '8px 0', borderRadius: 9, background: '#6D28D9', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  {t.support.browseDocs}
                  <ExternalLink size={12} />
                </button>
              </div>

              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mail size={20} style={{ color: '#D97706' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 4 }}>{t.support.emailUs}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{t.support.emailUsDesc}</div>
                </div>
                <a href="mailto:support@martial.app" style={{ marginTop: 'auto', padding: '8px 0', borderRadius: 9, background: '#D97706', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'center', textDecoration: 'none', display: 'block' }}>
                  {t.support.sendEmail}
                </a>
              </div>

            </div>

            {/* FAQ */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #F3F4F6' }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{t.support.faqTitle}</div>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{t.support.faqSubtitle}</div>
              </div>
              <div style={{ padding: '0 24px' }}>
                {FAQ_SECTIONS.map(section => (
                  <FaqSection key={section.title} title={section.title} items={section.items} />
                ))}
                <div style={{ height: 8 }} />
              </div>
            </div>

            {/* Open Tickets */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{t.support.yourTickets}</span>
                <button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, background: '#0071E3', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  <Plus size={14} />
                  {t.support.newTicket}
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                  <thead>
                    <tr style={{ background: '#F9FAFB' }}>
                      {[t.support.colId, t.support.colSubject, t.common.category, t.common.status, t.support.colLastUpdated, t.common.actions].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6B7280', letterSpacing: '0.05em', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TICKETS.map((tk, i) => {
                      const statusStyle = TICKET_STATUS_STYLE[tk.status]
                      const catStyle = CATEGORY_CHIP_STYLE[tk.category] ?? { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' }
                      return (
                        <tr key={tk.id} style={{ borderBottom: i < TICKETS.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                          <td style={{ padding: '12px 16px', fontSize: 12, color: '#9CA3AF', fontWeight: 600, fontFamily: 'monospace' }}>{tk.id}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: '#111827', fontWeight: 500, maxWidth: 240 }}>{tk.subject}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: catStyle.bg, color: catStyle.color, border: `1px solid ${catStyle.border}` }}>
                              {tk.category}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: statusStyle.bg, color: statusStyle.color }}>
                              {tk.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: '#6B7280' }}>{tk.updated}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <button style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                              {t.common.view}
                              <ChevronRight size={12} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </main>
  )
}
