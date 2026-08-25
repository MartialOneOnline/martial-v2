'use client'

import { useDashboard } from '../../../components/DashboardShell'
import NotificationBell from '../../../components/NotificationBell'
import { useMemo, useState } from 'react'
import { Menu, Search, Mail, ChevronRight, ChevronDown } from 'lucide-react'
import { useT } from '../../../lib/i18n/LanguageContext'
import { matchesSearch } from '../../../lib/search'

const FAQ_SECTIONS = [
  {
    title: 'Getting Started',
    items: [
      { q: 'How do I add my first members?', a: 'Go to Users → click "Add student". Fill in their details, assign a membership, and save.' },
      { q: 'How do I set up Stripe payments?', a: 'Go to Settings → Payments and connect Stripe. Once connected, memberships with a price become billable.' },
    ],
  },
  {
    title: 'Memberships & Payments',
    items: [
      { q: 'How do recurring subscriptions work?', a: 'When a member signs up for a recurring membership, Martial creates a Stripe subscription that auto-charges on each billing cycle. You\'ll see the status in Payments → Subscriptions.' },
      { q: 'How do I issue a refund?', a: 'Refunds aren\'t automated yet — process the refund directly in your Stripe or Revolut dashboard, then update the transaction\'s status in Payments → Transactions so your records match.' },
      { q: 'Can members pay in cash?', a: 'Yes. Go to Payments → Transactions and click "Add Payment" to record a manual payment (cash, bank transfer, etc.) for any member. It doesn\'t go through Stripe.' },
    ],
  },
  {
    title: 'Classes & Bookings',
    items: [
      { q: 'How do I set up a class schedule?', a: 'Go to Classes → Timetable to create a recurring schedule, or Classes → Events for one-off sessions.' },
      { q: 'Can members book online?', a: 'Yes — members book through their student portal or your academy\'s public page. Bookings appear in real time on your Calendar.' },
    ],
  },
  {
    title: 'Grading',
    items: [
      { q: 'How do I record a belt promotion?', a: 'Go to School → Gradings, click "Record Promotion", search for the member, and enter the belt/stripe, date, and any notes.' },
    ],
  },
  {
    title: 'Account & Billing',
    items: [
      { q: 'How do I upgrade my Martial plan?', a: 'Go to Settings → Billing and subscribe to the billing cycle that fits your needs.' },
      { q: 'Can I cancel my subscription?', a: 'Yes. Go to Settings → Billing → Manage billing. You can cancel anytime and you\'ll retain access until the end of your billing period.' },
    ],
  },
]

function FaqSection({ title, items, forceOpen }: { title: string; items: { q: string; a: string }[]; forceOpen: boolean }) {
  const [manualOpen, setManualOpen] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)
  const open = forceOpen || manualOpen
  return (
    <div style={{ borderBottom: '1px solid #F3F4F6' }}>
      <button onClick={() => setManualOpen(v => !v)}
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

  // Real filtering: a section only survives if its title or one of its Q/A
  // pairs matches, and it auto-expands so results are visible without a click.
  const filteredSections = useMemo(() => {
    if (!search.trim()) return FAQ_SECTIONS
    return FAQ_SECTIONS
      .map(section => ({
        ...section,
        items: matchesSearch(section.title, search)
          ? section.items
          : section.items.filter(item => matchesSearch(item.q, search) || matchesSearch(item.a, search)),
      }))
      .filter(section => section.items.length > 0)
  }, [search])

  return (
        <main style={{ flex: 1, minWidth: 0, width: "100%", overflow: "auto" }}>
          <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="md:hidden" onClick={() => setMenuOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <Menu size={20} style={{ color: '#374151' }} />
            </button>
            <span style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>{t.support.title}</span>
            <div style={{ flex: 1 }} />
            <NotificationBell />
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

            {/* Contact — the only support channel that's actually live */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Mail size={20} style={{ color: '#D97706' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{t.support.emailUs}</div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>{t.support.emailUsDesc}</div>
              </div>
              <a href="mailto:support@martialapp.com"
                style={{ padding: '9px 18px', borderRadius: 9, background: '#D97706', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', flexShrink: 0 }}>
                {t.support.sendEmail}
              </a>
            </div>

            {/* FAQ */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #F3F4F6' }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{t.support.faqTitle}</div>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{t.support.faqSubtitle}</div>
              </div>
              <div style={{ padding: '0 24px' }}>
                {filteredSections.length === 0 ? (
                  <p style={{ padding: '20px 0', fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>
                    No results for &ldquo;{search}&rdquo;
                  </p>
                ) : filteredSections.map(section => (
                  <FaqSection key={section.title} title={section.title} items={section.items} forceOpen={!!search.trim()} />
                ))}
                <div style={{ height: 8 }} />
              </div>
            </div>

          </div>
        </main>
  )
}
