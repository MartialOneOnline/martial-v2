'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CreditCard, Building2, Zap, Clock, CalendarCheck,
  ChevronDown, ChevronUp, RefreshCw, CheckCircle2,
  Pause, X, Play, Star, AlertTriangle, Send,
} from 'lucide-react'
import { fmtPrice } from '../../../lib/format'
import { useT } from '../../../lib/i18n/LanguageContext'
import type { Translations } from '../../../lib/i18n/translations'

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
  status: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED'
  startDate: string
  endDate: string | null
  cancelledAt: string | null
  consumed: number
  totalAllowed: number | null
  notes: string | null
  school: { id: string; name: string; slug: string; logoUrl: string | null; city: string | null }
}

type Plan = {
  id: string
  name: string
  description: string | null
  price: number
  currency: string
  planType: 'SUBSCRIPTION' | 'SINGLE_PASS' | 'TRIAL'
  billingCycle: string
  validityDays: number | null
  imageUrl: string | null
  isPopular: boolean
  alreadyActive: boolean
  hasActiveInSchool: boolean
  school: { id: string; name: string; slug: string; currency: string }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getStatusConfig(t: Translations): Record<string, { label: string; bg: string; color: string }> {
  return {
    PENDING:   { label: t.my.statusPending,   bg: '#FFFBEB', color: '#D97706' },
    ACTIVE:    { label: t.my.statusActive,    bg: '#F0FDF4', color: '#16A34A' },
    PAUSED:    { label: t.my.statusPaused,    bg: '#EFF6FF', color: '#3B82F6' },
    CANCELLED: { label: t.my.statusCancelled, bg: '#F3F4F6', color: '#6B7280' },
    EXPIRED:   { label: t.my.statusExpired,   bg: '#FEF2F2', color: '#EF4444' },
  }
}

function getPlanTypeConfig(t: Translations): Record<string, { label: string; bg: string; color: string }> {
  return {
    SUBSCRIPTION: { label: t.my.typeSub,        bg: '#EFF6FF', color: '#1D4ED8' },
    SINGLE_PASS:  { label: t.my.typeSinglePass,  bg: '#F5F3FF', color: '#7C3AED' },
    TRIAL:        { label: t.my.typeTrial,       bg: '#FFF7ED', color: '#C2410C' },
  }
}

function getBillingLabels(t: Translations): Record<string, string> {
  return {
    monthly:      t.my.billingMonth,
    quarterly:    t.my.billing3Months,
    annual:       t.my.billingYear,
    'two-weekly': t.my.billing2Weeks,
    'one-off':    t.my.billingOnce,
  }
}

function getPaymentLabels(t: Translations): Record<string, string> {
  return {
    STRIPE:        t.my.payCard,
    CASH:          t.my.payCash,
    BANK_TRANSFER: t.my.payBank,
    DIRECT_DEBIT:  t.my.payDebit,
    OTHER:         t.my.payOther,
  }
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

function billingLabel(planType: string, billingCycle: string | null, validityDays: number | null, t: Translations): string {
  if (planType === 'SUBSCRIPTION' && billingCycle) {
    const l = getBillingLabels(t)[billingCycle]
    return l ? `/${l}` : `/${billingCycle}`
  }
  if (validityDays) return t.my.billingDayPass.replace('{n}', String(validityDays))
  return ''
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusBadge({ status, t }: { status: string; t: Translations }) {
  const cfg = getStatusConfig(t)[status] ?? { label: status, bg: '#F3F4F6', color: '#6B7280' }
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
      background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

function PlanTypeBadge({ planType, t }: { planType: string; t: Translations }) {
  const cfg = getPlanTypeConfig(t)[planType] ?? { label: planType, bg: '#F3F4F6', color: '#6B7280' }
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
      background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

// ── Confirm action modal ───────────────────────────────────────────────────────

function ConfirmModal({
  action, membershipName, onConfirm, onClose, loading, t,
}: {
  action: 'pause' | 'resume' | 'cancel'
  membershipName: string
  onConfirm: () => void
  onClose: () => void
  loading: boolean
  t: Translations
}) {
  const config = {
    pause:  { title: t.my.pauseMembership,  desc: t.my.pauseDesc,  btn: t.my.pauseBtn,  btnColor: '#3B82F6' },
    resume: { title: t.my.resumeMembership, desc: t.my.resumeDesc, btn: t.my.resumeBtn, btnColor: '#16A34A' },
    cancel: { title: t.my.cancelMembership, desc: t.my.cancelDesc, btn: t.my.cancelBtn, btnColor: '#EF4444' },
  }[action]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end',
      justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 20px 36px',
        width: '100%', maxWidth: 520 }}
        onClick={e => e.stopPropagation()}>
        {action === 'cancel' && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#FEF2F2',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={22} style={{ color: '#EF4444' }} />
            </div>
          </div>
        )}
        <p style={{ fontSize: 17, fontWeight: 800, color: '#111827', margin: '0 0 6px', textAlign: 'center' }}>
          {config.title}
        </p>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 4px', textAlign: 'center' }}>
          <strong style={{ color: '#374151' }}>{membershipName}</strong>
        </p>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 24px', textAlign: 'center', lineHeight: 1.5 }}>
          {config.desc}
        </p>
        <button onClick={onConfirm} disabled={loading}
          style={{ width: '100%', padding: '13px', borderRadius: 14, background: config.btnColor,
            color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1, marginBottom: 10 }}>
          {loading ? t.my.pleaseWait : config.btn}
        </button>
        <button onClick={onClose}
          style={{ width: '100%', padding: '13px', borderRadius: 14, background: 'none',
            color: '#6B7280', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
          {t.my.keepMyMembership}
        </button>
      </div>
    </div>
  )
}

// ── Active membership card ─────────────────────────────────────────────────────

function ActiveMembershipCard({
  m, onAction, t,
}: {
  m: Membership
  onAction: (id: string, action: 'pause' | 'resume' | 'cancel') => void
  t: Translations
}) {
  const days = m.endDate ? daysLeft(m.endDate) : null
  const isExpiringSoon = days !== null && days <= 14
  const billing = billingLabel(m.planType, m.billingCycle, m.validityDays, t)
  const isSubscription = m.planType === 'SUBSCRIPTION'
  const isPending = m.status === 'PENDING'
  const isPaused = m.status === 'PAUSED'
  const isActive = m.status === 'ACTIVE'

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
            <StatusBadge status={m.status} t={t} />
          </div>
        </div>
      ) : (
        <div style={{ background: isPaused
            ? 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)'
            : 'linear-gradient(135deg, #0870E2 0%, #0E3A7A 100%)',
          padding: '20px 20px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
              <PlanTypeBadge planType={m.planType} t={t} />
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
          <StatusBadge status={m.status} t={t} />
        </div>

        {/* Pending notice */}
        {isPending && (
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12,
            padding: '12px 14px', marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <Clock size={14} style={{ color: '#D97706', flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#92400E', margin: '0 0 2px' }}>{t.my.pendingApproval}</p>
              <p style={{ fontSize: 12, color: '#B45309', margin: 0, lineHeight: 1.5 }}>
                {t.my.pendingDesc}
              </p>
            </div>
          </div>
        )}

        {/* Date grid */}
        {!isPending && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '10px 12px' }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase',
                letterSpacing: '0.06em', margin: '0 0 3px' }}>{t.my.started}</p>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', margin: 0 }}>{fmtDate(m.startDate)}</p>
            </div>
            {m.endDate && (
              <div style={{ background: isExpiringSoon ? '#FFFBEB' : '#F9FAFB',
                borderRadius: 12, padding: '10px 12px',
                border: isExpiringSoon ? '1px solid #FDE68A' : '1px solid transparent' }}>
                <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                  letterSpacing: '0.06em', margin: '0 0 3px',
                  color: isExpiringSoon ? '#D97706' : '#9CA3AF' }}>
                  {isSubscription ? t.my.renews : t.my.expires}
                </p>
                <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 2px',
                  color: isExpiringSoon ? '#92400E' : '#374151' }}>
                  {fmtDate(m.endDate)}
                </p>
                {days !== null && (
                  <p style={{ fontSize: 10, margin: 0, color: isExpiringSoon ? '#D97706' : '#9CA3AF' }}>
                    {days === 0 ? t.my.todayLabel : days === 1 ? t.my.oneDayLeft : t.my.daysLeft.replace('{n}', String(days))}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Classes remaining bar — SINGLE_PASS with a totalAllowed cap */}
        {!isPending && m.planType === 'SINGLE_PASS' && m.totalAllowed !== null && (
          (() => {
            const remaining = Math.max(0, m.totalAllowed - m.consumed)
            const pct = m.totalAllowed > 0 ? (m.consumed / m.totalAllowed) * 100 : 0
            const isEmpty = remaining === 0
            return (
              <div style={{ background: isEmpty ? '#FEF2F2' : '#F0FDF4',
                border: `1px solid ${isEmpty ? '#FECACA' : '#BBF7D0'}`,
                borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.06em', color: isEmpty ? '#DC2626' : '#16A34A' }}>
                    {t.my.classesOnPass}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: isEmpty ? '#DC2626' : '#111827' }}>
                    {remaining} <span style={{ fontWeight: 400, color: '#9CA3AF' }}>/ {m.totalAllowed} {t.my.leftOf}</span>
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: isEmpty ? '#FECACA' : '#D1FAE5', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`,
                    background: isEmpty ? '#EF4444' : '#22C55E', transition: 'width 0.4s ease' }} />
                </div>
                {isEmpty && (
                  <p style={{ fontSize: 11, color: '#DC2626', margin: '6px 0 0' }}>
                    {t.my.allClassesUsed}
                  </p>
                )}
              </div>
            )
          })()
        )}

        {/* Payment method */}
        {!isPending && (
          <div className="flex items-center gap-2" style={{ marginBottom: 14 }}>
            <CreditCard size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#6B7280' }}>
              {t.my.paidBy} {getPaymentLabels(t)[m.paymentMethod] ?? m.paymentMethod}
            </span>
          </div>
        )}

        {/* Expiring soon warning */}
        {isExpiringSoon && isActive && (
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10,
            padding: '10px 12px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={13} style={{ color: '#D97706', flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: '#92400E', margin: 0 }}>
              {isSubscription
                ? t.my.subscriptionRenewsSoon
                : t.my.passExpiresSoon.replace('{n}', String(days))}
            </p>
          </div>
        )}

        {/* Paused notice */}
        {isPaused && (
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10,
            padding: '10px 12px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Pause size={13} style={{ color: '#3B82F6', flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: '#1D4ED8', margin: 0 }}>
              {t.my.membershipPaused}
            </p>
          </div>
        )}

        {/* Action buttons for SUBSCRIPTION */}
        {isSubscription && (isActive || isPaused) && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {isActive && (
              <button onClick={() => onAction(m.id, 'pause')}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '10px 0', borderRadius: 12, border: '1.5px solid #E5E7EB',
                  background: '#fff', color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                <Pause size={13} />
                {t.my.pause}
              </button>
            )}
            {isPaused && (
              <button onClick={() => onAction(m.id, 'resume')}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '10px 0', borderRadius: 12, border: '1.5px solid #16A34A',
                  background: '#F0FDF4', color: '#16A34A', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                <Play size={13} />
                {t.my.resume}
              </button>
            )}
            <button onClick={() => onAction(m.id, 'cancel')}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '10px 0', borderRadius: 12, border: '1.5px solid #FCA5A5',
                background: '#FEF2F2', color: '#EF4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <X size={13} />
              {t.my.cancelMembership}
            </button>
          </div>
        )}

        {/* View school button */}
        <Link href={`/school/${m.school.slug}`}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '11px 0', borderRadius: 12, border: '1.5px solid #0870E2',
            color: '#0870E2', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          <Building2 size={14} style={{ marginRight: 7 }} />
          {t.my.viewSchool} {m.school.name}
        </Link>
      </div>
    </div>
  )
}

// ── Past membership row ────────────────────────────────────────────────────────

function PastMembershipRow({ m, t }: { m: Membership; t: Translations }) {
  const billing = billingLabel(m.planType, m.billingCycle, m.validityDays, t)
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
          {m.consumed > 0 && m.totalAllowed
            ? ` · ${m.consumed}/${m.totalAllowed} ${t.my.myClasses}`
            : m.consumed > 0 ? ` · ${m.consumed} ${t.my.myClasses}` : ''}
        </p>
      </div>
      <StatusBadge status={m.status} t={t} />
    </div>
  )
}

// ── Plan card (available to purchase) ─────────────────────────────────────────

function PlanCard({ plan, onRequest, requesting, t }: {
  plan: Plan
  onRequest: (plan: Plan) => void
  requesting: boolean
  t: Translations
}) {
  const billing = billingLabel(plan.planType, plan.billingCycle, plan.validityDays, t)
  const ptCfg = getPlanTypeConfig(t)[plan.planType] ?? { label: plan.planType, bg: '#F3F4F6', color: '#6B7280' }

  return (
    <div style={{ background: '#fff', border: plan.isPopular ? '2px solid #0870E2' : '1px solid #E5E7EB',
      borderRadius: 16, overflow: 'hidden', position: 'relative',
      boxShadow: plan.isPopular ? '0 4px 16px rgba(8,112,226,0.12)' : '0 1px 4px rgba(0,0,0,0.04)' }}>

      {plan.isPopular && (
        <div style={{ background: '#0870E2', padding: '5px 12px', display: 'flex',
          alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <Star size={10} style={{ color: '#fff' }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', letterSpacing: '0.05em' }}>{t.my.mostPopular.toUpperCase()}</span>
        </div>
      )}

      {plan.imageUrl && (
        <div style={{ height: 80, overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={plan.imageUrl} alt={plan.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      <div style={{ padding: '14px 16px 16px' }}>
        <div className="flex items-start justify-between gap-2" style={{ marginBottom: 8 }}>
          <div>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
              background: ptCfg.bg, color: ptCfg.color, display: 'inline-block', marginBottom: 5 }}>
              {ptCfg.label}
            </span>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.01em' }}>{plan.name}</p>
            <p style={{ fontSize: 11, color: '#9CA3AF', margin: '1px 0 0' }}>{plan.school.name}</p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
              {fmtPrice(plan.price, plan.currency)}
            </p>
            {billing && <p style={{ fontSize: 11, color: '#9CA3AF', margin: '1px 0 0' }}>{billing}</p>}
          </div>
        </div>

        {plan.description && (
          <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 12px', lineHeight: 1.5 }}>
            {plan.description}
          </p>
        )}

        {plan.alreadyActive ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '10px 0', borderRadius: 12, background: '#F0FDF4', color: '#16A34A',
            fontSize: 12, fontWeight: 700 }}>
            <CheckCircle2 size={13} />
            {t.my.currentPlan}
          </div>
        ) : (
          <button onClick={() => onRequest(plan)} disabled={requesting}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '11px 0', borderRadius: 12,
              background: plan.isPopular ? '#0870E2' : '#111827',
              color: '#fff', fontSize: 12, fontWeight: 700, border: 'none',
              cursor: requesting ? 'not-allowed' : 'pointer', opacity: requesting ? 0.7 : 1 }}>
            <Send size={12} />
            {plan.planType === 'TRIAL' ? t.my.bookTrial : t.my.requestPlan}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Request success modal ──────────────────────────────────────────────────────

function RequestSuccessModal({ plan, onClose, t }: { plan: Plan; onClose: () => void; t: Translations }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end',
      justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '32px 20px 40px',
        width: '100%', maxWidth: 520, textAlign: 'center' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F0FDF4',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <CheckCircle2 size={26} style={{ color: '#16A34A' }} />
        </div>
        <p style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: '0 0 8px' }}>{t.my.requestSent}</p>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 6px', lineHeight: 1.5 }}>
          {t.my.requestSentDesc.replace('{plan}', plan.name).replace('{school}', plan.school.name)}
        </p>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 28px', lineHeight: 1.5 }}>
          {t.my.adminWillReview}
        </p>
        <button onClick={onClose}
          style={{ width: '100%', padding: '13px', borderRadius: 14, background: '#0870E2',
            color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
          {t.my.gotIt}
        </button>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function MyMembershipPage() {
  const t = useT()
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{ id: string; action: 'pause' | 'resume' | 'cancel'; name: string } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [requestingPlanId, setRequestingPlanId] = useState<string | null>(null)
  const [successPlan, setSuccessPlan] = useState<Plan | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/my/memberships').then(r => r.json()),
      fetch('/api/my/school-plans').then(r => r.json()),
    ]).then(([mData, pData]) => {
      setMemberships(mData.memberships ?? [])
      setPlans(pData.plans ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const active = memberships.filter(m => ['ACTIVE', 'PAUSED', 'PENDING'].includes(m.status))
  const past   = memberships.filter(m => ['CANCELLED', 'EXPIRED'].includes(m.status))

  // Plans not already shown as active/pending
  const activePlanIds = new Set(active.map(m => m.planName))
  const availablePlans = plans.filter(p => !p.alreadyActive)

  async function handleAction(id: string, action: 'pause' | 'resume' | 'cancel') {
    setActionLoading(true)
    try {
      await fetch(`/api/my/memberships/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const mData = await fetch('/api/my/memberships').then(r => r.json())
      setMemberships(mData.memberships ?? [])
    } finally {
      setActionLoading(false)
      setConfirmModal(null)
    }
  }

  async function handleRequest(plan: Plan) {
    setRequestingPlanId(plan.id)
    try {
      const res = await fetch(`/api/my/memberships/${plan.id}`, {
        method: 'POST',
      })
      if (res.ok) {
        const [mData, pData] = await Promise.all([
          fetch('/api/my/memberships').then(r => r.json()),
          fetch('/api/my/school-plans').then(r => r.json()),
        ])
        setMemberships(mData.memberships ?? [])
        setPlans(pData.plans ?? [])
        setSuccessPlan(plan)
      }
    } finally {
      setRequestingPlanId(null)
    }
  }

  return (
    <div style={{ minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #F3F4F6',
        padding: '16px 20px', position: 'sticky', top: 0, zIndex: 10 }}>
        <h1 style={{ fontSize: 17, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
          {t.my.myMembership}
        </h1>
        <p style={{ fontSize: 12, color: '#9CA3AF', margin: '2px 0 0' }}>
          {t.my.activePlansHistory}
        </p>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 600, margin: '0 auto' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <div style={{ width: 24, height: 24, border: '2.5px solid #0870E2',
              borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Active / Pending memberships */}
            {active.length > 0 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase',
                  letterSpacing: '0.07em', margin: '0 0 12px' }}>
                  {t.my.activeCount} · {active.length}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {active.map(m => (
                    <ActiveMembershipCard key={m.id} m={m} t={t}
                      onAction={(id, action) => setConfirmModal({ id, action, name: m.planName })} />
                  ))}
                </div>
              </div>
            )}

            {/* No active membership */}
            {active.length === 0 && past.length === 0 && availablePlans.length === 0 && (
              <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20,
                padding: '48px 24px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ width: 64, height: 64, background: '#F3F4F6', borderRadius: 20,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <CreditCard size={28} style={{ color: '#D1D5DB' }} />
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>
                  {t.my.noActiveMembership}
                </p>
                <p style={{ fontSize: 13, color: '#9CA3AF', margin: '0 0 20px' }}>
                  {t.my.joinSchoolForPlan}
                </p>
                <Link href="/explore"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '10px 20px', borderRadius: 12, background: '#0870E2',
                    color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                  {t.my.findASchool}
                </Link>
              </div>
            )}

            {/* No active but has expired history */}
            {active.length === 0 && past.length > 0 && (
              <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 16,
                padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <Clock size={20} style={{ color: '#F97316', flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#C2410C', margin: '0 0 2px' }}>
                    {t.my.noActiveMembership}
                  </p>
                  <p style={{ fontSize: 12, color: '#EA580C', margin: 0 }}>
                    {t.my.lastPlanExpired}
                  </p>
                </div>
              </div>
            )}

            {/* Available plans */}
            {availablePlans.length > 0 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase',
                  letterSpacing: '0.07em', margin: '0 0 12px' }}>
                  {t.my.availablePlans}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {availablePlans.map(p => (
                    <PlanCard key={p.id} plan={p} t={t}
                      onRequest={handleRequest}
                      requesting={requestingPlanId === p.id} />
                  ))}
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
                      {t.my.membershipHistory}
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
                    {past.map(m => <PastMembershipRow key={m.id} m={m} t={t} />)}
                  </div>
                )}
              </div>
            )}

            {/* Info footer */}
            {active.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10,
                background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: '12px 14px' }}>
                <CheckCircle2 size={15} style={{ color: '#16A34A', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: '#15803D', margin: 0, lineHeight: 1.5 }}>
                  {t.my.membershipGivesAccess}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirm action modal */}
      {confirmModal && (
        <ConfirmModal
          action={confirmModal.action}
          membershipName={confirmModal.name}
          loading={actionLoading}
          onConfirm={() => handleAction(confirmModal.id, confirmModal.action)}
          onClose={() => setConfirmModal(null)}
          t={t}
        />
      )}

      {/* Request success modal */}
      {successPlan && (
        <RequestSuccessModal plan={successPlan} onClose={() => setSuccessPlan(null)} t={t} />
      )}
    </div>
  )
}
