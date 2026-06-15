'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CreditCard, Building2, Zap, Clock, CalendarCheck,
  ChevronDown, ChevronUp, RefreshCw, CheckCircle2,
} from 'lucide-react'
import { fmtPrice } from '../../../lib/format'

// ── Types ──────────────────────────────────────────────────────────────────────

type ClassAccessConfig = {
  classRules?: { classId: string; included: boolean; unlimited: boolean; limit?: string; limitType?: string }[]
  globalLimit?: string
  globalLimitType?: string
}

type Membership = {
  id: string
  planName: string
  planType: 'SUBSCRIPTION' | 'SINGLE_PASS' | 'TRIAL'
  billingCycle: string | null
  validityDays: number | null
  imageUrl: string | null
  classAccess: ClassAccessConfig
  price: number
  currency: string
  paymentMethod: string
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED'
  startDate: string
  endDate: string | null
  cancelledAt: string | null
  consumed: number
  notes: string | null
  school: { id: string; name: string; slug: string; logoUrl: string | null; city: string | null }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  ACTIVE:    { label: 'Active',    bg: '#F0FDF4', color: '#16A34A' },
  PAUSED:    { label: 'Paused',    bg: '#FFFBEB', color: '#D97706' },
  CANCELLED: { label: 'Cancelled', bg: '#F3F4F6', color: '#6B7280' },
  EXPIRED:   { label: 'Expired',   bg: '#FEF2F2', color: '#EF4444' },
}

const PLAN_TYPE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  SUBSCRIPTION: { label: 'Subscription', bg: '#EFF6FF', color: '#1D4ED8' },
  SINGLE_PASS:  { label: 'Single Pass',  bg: '#F5F3FF', color: '#7C3AED' },
  TRIAL:        { label: 'Trial',        bg: '#FFF7ED', color: '#C2410C' },
}

const BILLING_LABELS: Record<string, string> = {
  monthly:    'month',
  quarterly:  '3 months',
  annual:     'year',
  'two-weekly': '2 weeks',
  'one-off':  'once',
}

const PAYMENT_LABELS: Record<string, string> = {
  STRIPE: 'Card',
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank transfer',
  DIRECT_DEBIT: 'Direct debit',
  OTHER: 'Other',
}

function sym(currency: string) {
  return currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : currency
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function daysLeft(iso: string) {
  const diff = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86400000))
}

function billingLabel(m: Membership): string {
  if (m.planType === 'SUBSCRIPTION' && m.billingCycle) {
    const l = BILLING_LABELS[m.billingCycle]
    return l ? `/${l}` : `/${m.billingCycle}`
  }
  if (m.validityDays) return `${m.validityDays}-day pass`
  return ''
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: '#F3F4F6', color: '#6B7280' }
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
      background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

function PlanTypeBadge({ planType }: { planType: string }) {
  const cfg = PLAN_TYPE_CONFIG[planType] ?? { label: planType, bg: '#F3F4F6', color: '#6B7280' }
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
      background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

function ActiveMembershipCard({ m }: { m: Membership }) {
  const days = m.endDate ? daysLeft(m.endDate) : null
  const isExpiringSoon = days !== null && days <= 14
  const billing = billingLabel(m)
  const isSubscription = m.planType === 'SUBSCRIPTION'

  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20,
      overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>

      {/* Plan image or gradient header */}
      {m.imageUrl ? (
        <div style={{ position: 'relative', height: 120 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.imageUrl} alt={m.planName}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)' }} />
          <div style={{ position: 'absolute', bottom: 12, left: 16, right: 16,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 17, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>{m.planName}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', margin: '1px 0 0' }}>{m.school.name}</p>
            </div>
            <StatusBadge status={m.status} />
          </div>
        </div>
      ) : (
        <div style={{ background: 'linear-gradient(135deg, #0870E2 0%, #0E3A7A 100%)',
          padding: '20px 20px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
              <PlanTypeBadge planType={m.planType} />
            </div>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>{m.planName}</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', margin: '3px 0 0' }}>{m.school.name}</p>
          </div>
          <Zap size={22} style={{ color: 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
        </div>
      )}

      {/* Body */}
      <div style={{ padding: '16px 20px 20px' }}>

        {/* Price + status row */}
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <div>
            <span style={{ fontSize: 26, fontWeight: 800, color: '#111827', letterSpacing: '-0.03em' }}>
              {fmtPrice(m.price, m.currency)}
            </span>
            {billing && (
              <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 3 }}>{billing}</span>
            )}
          </div>
          <StatusBadge status={m.status} />
        </div>

        {/* Date grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '10px 12px' }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase',
              letterSpacing: '0.06em', margin: '0 0 3px' }}>Started</p>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', margin: 0 }}>{fmtDate(m.startDate)}</p>
          </div>
          {m.endDate && (
            <div style={{ background: isExpiringSoon ? '#FFFBEB' : '#F9FAFB',
              borderRadius: 12, padding: '10px 12px',
              border: isExpiringSoon ? '1px solid #FDE68A' : '1px solid transparent' }}>
              <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.06em', margin: '0 0 3px',
                color: isExpiringSoon ? '#D97706' : '#9CA3AF' }}>
                {isSubscription ? 'Renews' : 'Expires'}
              </p>
              <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 2px',
                color: isExpiringSoon ? '#92400E' : '#374151' }}>
                {fmtDate(m.endDate)}
              </p>
              {days !== null && (
                <p style={{ fontSize: 10, margin: 0,
                  color: isExpiringSoon ? '#D97706' : '#9CA3AF' }}>
                  {days === 0 ? 'Today' : `${days} day${days === 1 ? '' : 's'} left`}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Payment method */}
        <div className="flex items-center gap-2" style={{ marginBottom: 14 }}>
          <CreditCard size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#6B7280' }}>
            Paid by {PAYMENT_LABELS[m.paymentMethod] ?? m.paymentMethod}
          </span>
        </div>

        {/* Expiring soon warning */}
        {isExpiringSoon && (
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10,
            padding: '10px 12px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={13} style={{ color: '#D97706', flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: '#92400E', margin: 0 }}>
              {isSubscription
                ? 'Your subscription renews soon. Contact your school if you need to make changes.'
                : `This pass expires in ${days} day${days === 1 ? '' : 's'}. Book your remaining classes!`}
            </p>
          </div>
        )}

        {/* View school button */}
        <Link href={`/school/${m.school.slug}`}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '11px 0', borderRadius: 12, border: '1.5px solid #0870E2',
            color: '#0870E2', fontSize: 13, fontWeight: 700, textDecoration: 'none',
            transition: 'background 0.15s, color 0.15s' }}>
          <Building2 size={14} style={{ marginRight: 7 }} />
          View {m.school.name}
        </Link>
      </div>
    </div>
  )
}

function PastMembershipRow({ m }: { m: Membership }) {
  const billing = billingLabel(m)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F3F4F6',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <CreditCard size={16} style={{ color: '#9CA3AF' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {m.planName}
          {billing && <span style={{ fontWeight: 400, color: '#9CA3AF', marginLeft: 4 }}>{billing}</span>}
        </p>
        <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0' }}>
          {m.school.name} · {fmtDateShort(m.startDate)}
          {m.endDate && ` → ${fmtDateShort(m.endDate)}`}
          {m.consumed > 0 && ` · ${m.consumed} classes`}
        </p>
      </div>
      <StatusBadge status={m.status} />
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function MyMembershipPage() {
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    fetch('/api/my/memberships')
      .then(r => r.json())
      .then(d => { setMemberships(d.memberships ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const active = memberships.filter(m => m.status === 'ACTIVE')
  const past   = memberships.filter(m => m.status !== 'ACTIVE')

  return (
    <div style={{ minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #F3F4F6',
        padding: '16px 20px', position: 'sticky', top: 0, zIndex: 10 }}>
        <h1 style={{ fontSize: 17, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
          My Membership
        </h1>
        <p style={{ fontSize: 12, color: '#9CA3AF', margin: '2px 0 0' }}>
          Active plans and subscription history
        </p>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 600, margin: '0 auto' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <div style={{ width: 24, height: 24, border: '2.5px solid #0870E2',
              borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : memberships.length === 0 ? (
          /* Empty state */
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20,
            padding: '48px 24px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ width: 64, height: 64, background: '#F3F4F6', borderRadius: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CreditCard size={28} style={{ color: '#D1D5DB' }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>
              No active membership
            </p>
            <p style={{ fontSize: 13, color: '#9CA3AF', margin: '0 0 20px' }}>
              Join a school to get a membership plan assigned
            </p>
            <Link href="/explore"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 20px', borderRadius: 12, background: '#0870E2',
                color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              Find a school
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Active memberships */}
            {active.length > 0 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase',
                  letterSpacing: '0.07em', margin: '0 0 12px' }}>
                  Active · {active.length}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {active.map(m => <ActiveMembershipCard key={m.id} m={m} />)}
                </div>
              </div>
            )}

            {/* No active but has history */}
            {active.length === 0 && past.length > 0 && (
              <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 16,
                padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <Clock size={20} style={{ color: '#F97316', flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#C2410C', margin: '0 0 2px' }}>
                    No active membership
                  </p>
                  <p style={{ fontSize: 12, color: '#EA580C', margin: 0 }}>
                    Your last plan expired or was cancelled. Contact your school to renew.
                  </p>
                </div>
              </div>
            )}

            {/* Past memberships */}
            {past.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16,
                overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <button
                  onClick={() => setShowHistory(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '14px 16px', background: 'none', border: 'none',
                    cursor: 'pointer', borderBottom: showHistory ? '1px solid #F3F4F6' : 'none' }}>
                  <div className="flex items-center gap-2">
                    <CalendarCheck size={15} style={{ color: '#9CA3AF' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
                      Membership history
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, background: '#F3F4F6',
                      color: '#6B7280', padding: '1px 8px', borderRadius: 999 }}>
                      {past.length}
                    </span>
                  </div>
                  {showHistory
                    ? <ChevronUp size={16} style={{ color: '#9CA3AF' }} />
                    : <ChevronDown size={16} style={{ color: '#9CA3AF' }} />}
                </button>

                {showHistory && (
                  <div style={{ padding: '0 16px 8px' }}>
                    {past.map(m => <PastMembershipRow key={m.id} m={m} />)}
                  </div>
                )}
              </div>
            )}

            {/* Info footer */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10,
              background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: '12px 14px' }}>
              <CheckCircle2 size={15} style={{ color: '#16A34A', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: '#15803D', margin: 0, lineHeight: 1.5 }}>
                Your membership gives you access to all included classes at your school.
                Contact your school admin to change or cancel your plan.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
