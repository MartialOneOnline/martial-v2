'use client'

import { useDashboard } from '../../../components/DashboardShell'
import { useState } from 'react'
import Link from 'next/link'
import {Users, Calendar, CreditCard, BarChart2, Settings, Bell, ChevronRight, ChevronDown, Menu, X, Check, Download} from 'lucide-react'
import { useT } from '../../../lib/i18n/LanguageContext'
import type { Translations } from '../../../lib/i18n/translations'

const INVOICES = [
  { id: 'INV-006', date: 'Jun 1, 2026',  desc: 'Starter Plan — Monthly',   amount: '€49.00', status: 'Paid' },
  { id: 'INV-005', date: 'May 1, 2026',  desc: 'Starter Plan — Monthly',   amount: '€49.00', status: 'Paid' },
  { id: 'INV-004', date: 'Apr 1, 2026',  desc: 'Starter Plan — Monthly',   amount: '€49.00', status: 'Paid' },
  { id: 'INV-003', date: 'Mar 1, 2026',  desc: 'Starter Plan — Monthly',   amount: '€49.00', status: 'Paid' },
  { id: 'INV-002', date: 'Feb 1, 2026',  desc: 'Starter Plan — Monthly',   amount: '€49.00', status: 'Paid' },
  { id: 'INV-001', date: 'Jan 1, 2026',  desc: 'Starter Plan — Monthly',   amount: '€49.00', status: 'Paid' },
]

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    monthly: 0,
    yearly: 0,
    features: ['Up to 30 members', '1 instructor', 'Basic booking', 'Email support'],
    badge: null,
    current: false,
  },
  {
    key: 'starter',
    name: 'Starter',
    monthly: 49,
    yearly: 39,
    features: ['Up to 150 members', '5 instructors', 'Payments + Stripe', 'Basic reports', 'Priority email'],
    badge: 'current',
    current: true,
  },
  {
    key: 'pro',
    name: 'Pro',
    monthly: 99,
    yearly: 79,
    features: ['Up to 500 members', 'Unlimited instructors', 'Full reports + charts', 'Grading system', 'Custom branding', 'Chat support'],
    badge: 'popular',
    current: false,
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    monthly: 249,
    yearly: 199,
    features: ['Unlimited everything', 'White-label', 'API access', 'Dedicated account manager', 'SLA guarantee', 'Phone support'],
    badge: null,
    current: false,
  },
]

export default function SubscriptionClient() {
  const { setMenuOpen } = useDashboard()
  const t = useT()
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')

  return (
        <main style={{ flex: 1, minWidth: 0, width: "100%", overflow: "auto" }}>
          <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="md:hidden" onClick={() => setMenuOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <Menu size={20} style={{ color: '#374151' }} />
            </button>
            <span style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>{t.subscription.title}</span>
          </div>

          <div className="px-4 md:px-8 py-6 flex flex-col gap-6">

            {/* Current Plan Card */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '20px 24px' }}>
              <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: '#EFF6FF', color: '#0071E3', border: '1px solid #BFDBFE' }}>STARTER</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{t.subscription.academy}</span>
                  </div>
                  <span style={{ fontSize: 13, color: '#6B7280' }}>{t.subscription.billedMonthly}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button style={{ padding: '8px 18px', borderRadius: 10, background: '#0071E3', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {t.subscription.upgrade}
                  </button>
                  <Link href="#" style={{ fontSize: 13, color: '#0071E3', fontWeight: 500, textDecoration: 'none' }}>{t.subscription.manageBilling}</Link>
                </div>
              </div>
            </div>

            {/* Billing Toggle */}
            <div className="flex justify-center">
              <div className="flex items-center gap-1" style={{ background: '#F3F4F6', borderRadius: 12, padding: 4 }}>
                <button onClick={() => setBilling('monthly')}
                  style={{ padding: '6px 18px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: billing === 'monthly' ? '#fff' : 'transparent',
                    color: billing === 'monthly' ? '#111827' : '#6B7280',
                    boxShadow: billing === 'monthly' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                  {t.subscription.monthly}
                </button>
                <button onClick={() => setBilling('yearly')}
                  style={{ padding: '6px 18px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                    background: billing === 'yearly' ? '#fff' : 'transparent',
                    color: billing === 'yearly' ? '#111827' : '#6B7280',
                    boxShadow: billing === 'yearly' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                  {t.subscription.yearly}
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: '#ECFDF5', color: '#16A34A', border: '1px solid #BBF7D0' }}>-20%</span>
                </button>
              </div>
            </div>

            {/* Plan Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {PLANS.map(plan => {
                const price = billing === 'monthly' ? plan.monthly : plan.yearly
                const isCurrent = plan.current
                const isPopular = plan.badge === 'popular'
                return (
                  <div key={plan.key} style={{
                    background: '#fff', borderRadius: 16,
                    border: isCurrent ? '2px solid #0071E3' : '1px solid #E5E7EB',
                    padding: '20px 20px 20px',
                    display: 'flex', flexDirection: 'column', gap: 16, position: 'relative',
                  }}>
                    {(isCurrent || isPopular) && (
                      <span style={{
                        position: 'absolute', top: 14, right: 14,
                        fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
                        background: isCurrent ? '#EFF6FF' : '#F5F3FF',
                        color: isCurrent ? '#0071E3' : '#6D28D9',
                        border: `1px solid ${isCurrent ? '#BFDBFE' : '#DDD6FE'}`,
                      }}>
                        {isCurrent ? t.subscription.current : t.subscription.popular}
                      </span>
                    )}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 8 }}>{plan.name}</div>
                      <div className="flex items-baseline gap-1">
                        <span style={{ fontSize: 28, fontWeight: 800, color: '#111827', letterSpacing: '-1px' }}>
                          {price === 0 ? t.subscription.free : `€${price}`}
                        </span>
                        {price > 0 && <span style={{ fontSize: 13, color: '#9CA3AF' }}>{t.subscription.perMonth}</span>}
                      </div>
                      {price === 0 && <span style={{ fontSize: 13, color: '#9CA3AF' }}>{t.subscription.foreverFree}</span>}
                    </div>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                      {plan.features.map(f => (
                        <li key={f} className="flex items-start gap-2">
                          <Check size={14} style={{ color: '#16A34A', flexShrink: 0, marginTop: 1 }} />
                          <span style={{ fontSize: 13, color: '#374151' }}>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <button disabled={isCurrent} style={{
                      padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: isCurrent ? 'default' : 'pointer',
                      background: isCurrent ? '#F3F4F6' : plan.key === 'enterprise' ? 'transparent' : '#0071E3',
                      color: isCurrent ? '#9CA3AF' : plan.key === 'enterprise' ? '#111827' : '#fff',
                      border: plan.key === 'enterprise' ? '1px solid #E5E7EB' : 'none',
                      width: '100%',
                    }}>
                      {isCurrent ? t.subscription.currentPlan : plan.key === 'enterprise' ? t.subscription.contactSales : t.subscription.upgrade}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Invoice History */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #F3F4F6' }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{t.subscription.invoiceHistory}</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB' }}>
                    {[t.common.date, t.common.description, t.common.amount, t.common.status, t.subscription.colDownload].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6B7280', letterSpacing: '0.05em', borderBottom: '1px solid #E5E7EB' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {INVOICES.map((inv, i) => (
                    <tr key={inv.id} style={{ borderBottom: i < INVOICES.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#6B7280' }}>{inv.date}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#111827', fontWeight: 500 }}>{inv.desc}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#111827', fontWeight: 600 }}>{inv.amount}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>{t.common.paid}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: 8, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#6B7280', fontSize: 12 }}>
                          <Download size={13} />
                          PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </main>
  )
}
