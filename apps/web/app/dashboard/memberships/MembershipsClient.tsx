'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X, Plus, Pencil, Trash2, Check, Infinity, Menu, Image as ImageIcon,
} from 'lucide-react'
import { useDashboard } from '../../../components/DashboardShell'
import { useT } from '../../../lib/i18n/LanguageContext'

// ── Types ──────────────────────────────────────────────────────────────────────

type PlanType = 'SUBSCRIPTION' | 'SINGLE_PASS' | 'TRIAL'
type DrawerTab = 'SUBSCRIPTION' | 'SINGLE_PASS' | 'TRIAL'

interface ClassAccessRule {
  classId: string
  included: boolean
  unlimited: boolean
  limit: string
  limitType: 'PER_WEEK' | 'PER_MONTH' | 'TOTAL'
}

interface ClassAccessConfig {
  classRules: ClassAccessRule[]
  globalLimit: string
  globalLimitType: 'PER_WEEK' | 'PER_MONTH'
}

interface PlanRow {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  price: number
  currency: string
  planType: PlanType
  billingCycle: string
  validityDays: number | null
  isPublic: boolean
  isPopular: boolean
  isActive: boolean
  classAccess: ClassAccessConfig | Record<string, never>
  stripePriceId: string | null
  memberCount: number
}

interface ClassOption {
  id: string
  name: string
}

interface PlanForm {
  name: string
  description: string
  imageUrl: string
  price: string
  currency: string
  planType: PlanType
  billingCycle: string
  validityDays: string
  validityPeriod: 'days' | 'weeks' | 'months'
  isPublic: boolean
  isPopular: boolean
  isActive: boolean
  stripePriceId: string
  classRules: ClassAccessRule[]
  globalLimit: string
  globalLimitType: 'PER_WEEK' | 'PER_MONTH'
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const BILLING_CYCLE_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Every 3 months',
  annual: 'Annual',
  'two-weekly': 'Every 2 weeks',
  'one-off': 'One-off',
}

function fmtPrice(price: number, currency: string): string {
  const sym = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : currency
  return `${sym}${price % 1 === 0 ? price : price.toFixed(2)}`
}

function validityDaysToForm(days: number | null): { validityDays: string; validityPeriod: 'days' | 'weeks' | 'months' } {
  if (!days) return { validityDays: '30', validityPeriod: 'days' }
  if (days % 30 === 0) return { validityDays: String(days / 30), validityPeriod: 'months' }
  if (days % 7 === 0) return { validityDays: String(days / 7), validityPeriod: 'weeks' }
  return { validityDays: String(days), validityPeriod: 'days' }
}

function formToValidityDays(days: string, period: 'days' | 'weeks' | 'months'): number | null {
  const n = parseInt(days) || 0
  if (!n) return null
  if (period === 'months') return n * 30
  if (period === 'weeks') return n * 7
  return n
}

function buildDefaultClassRules(classes: ClassOption[]): ClassAccessRule[] {
  return classes.map(c => ({ classId: c.id, included: true, unlimited: true, limit: '4', limitType: 'PER_WEEK' }))
}

function planToForm(plan: PlanRow, classes: ClassOption[]): PlanForm {
  const cfg = plan.classAccess as ClassAccessConfig
  const ruleMap = Object.fromEntries((cfg.classRules ?? []).map(r => [r.classId, r]))
  const classRules = classes.map(c => ruleMap[c.id] ?? {
    classId: c.id, included: true, unlimited: true, limit: '4', limitType: 'PER_WEEK' as const,
  })
  const { validityDays, validityPeriod } = validityDaysToForm(plan.validityDays)
  return {
    name: plan.name,
    description: plan.description ?? '',
    imageUrl: plan.imageUrl ?? '',
    price: String(plan.price),
    currency: plan.currency,
    planType: plan.planType,
    billingCycle: plan.billingCycle,
    validityDays,
    validityPeriod,
    isPublic: plan.isPublic,
    isPopular: plan.isPopular,
    isActive: plan.isActive,
    stripePriceId: plan.stripePriceId ?? '',
    classRules,
    globalLimit: cfg.globalLimit ?? '',
    globalLimitType: cfg.globalLimitType ?? 'PER_MONTH',
  }
}

function formToPayload(form: PlanForm) {
  return {
    name: form.name,
    description: form.description,
    imageUrl: form.imageUrl,
    price: form.price !== '' ? Number(form.price) : 0,
    currency: form.currency,
    planType: form.planType,
    billingCycle: form.billingCycle,
    validityDays: formToValidityDays(form.validityDays, form.validityPeriod),
    isPublic: form.isPublic,
    isPopular: form.isPopular,
    isActive: form.isActive,
    stripePriceId: form.stripePriceId,
    classAccess: {
      classRules: form.classRules,
      globalLimit: form.globalLimit,
      globalLimitType: form.globalLimitType,
    },
  }
}

// ── Shared styles ──────────────────────────────────────────────────────────────

const inputSt: React.CSSProperties = {
  width: '100%', border: '1px solid #E5E7EB', borderRadius: 10, padding: '9px 12px',
  fontSize: 13, color: '#111827', background: '#fff', outline: 'none',
}
const labelSt: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5,
}

// ── Toggle ─────────────────────────────────────────────────────────────────────
function Toggle({ on, onChange, size = 'md' }: { on: boolean; onChange: (v: boolean) => void; size?: 'sm' | 'md' }) {
  const w = size === 'sm' ? 32 : 40
  const h = size === 'sm' ? 18 : 22
  const dot = size === 'sm' ? 12 : 16
  return (
    <button type="button" onClick={() => onChange(!on)}
      style={{ width: w, height: h, borderRadius: 999, border: 'none', cursor: 'pointer',
        background: on ? '#0071E3' : '#D1D5DB', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <span style={{
        position: 'absolute', top: (h - dot) / 2, borderRadius: '50%',
        width: dot, height: dot, background: '#fff',
        left: on ? w - dot - (h - dot) / 2 : (h - dot) / 2,
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

// ── Image upload zone ──────────────────────────────────────────────────────────
function ImageUploadZone({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  return (
    <div>
      <label style={labelSt}>Image</label>
      {value ? (
        <div className="relative" style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Plan image" style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full cursor-pointer"
            style={{ background: 'rgba(0,0,0,0.5)', border: 'none' }}>
            <X size={13} style={{ color: '#fff' }} />
          </button>
        </div>
      ) : (
        <div style={{ border: '1.5px dashed #D1D5DB', borderRadius: 12, padding: '20px 16px',
          background: '#FAFAFA', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <ImageIcon size={24} style={{ color: '#D1D5DB' }} />
          <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>Paste image URL below</p>
          <input
            type="url"
            placeholder="https://..."
            value={value}
            onChange={e => onChange(e.target.value)}
            style={{ ...inputSt, marginTop: 4, fontSize: 12 }}
          />
        </div>
      )}
      {value && (
        <input type="url" placeholder="https://..." value={value}
          onChange={e => onChange(e.target.value)}
          style={{ ...inputSt, marginTop: 8, fontSize: 12 }} />
      )}
    </div>
  )
}

// ── Class access builder ───────────────────────────────────────────────────────
function ClassAccessBuilder({
  classRules, classes, onChange,
  globalLimit, globalLimitType, onGlobalChange,
}: {
  classRules: ClassAccessRule[]
  classes: ClassOption[]
  onChange: (rules: ClassAccessRule[]) => void
  globalLimit: string
  globalLimitType: 'PER_WEEK' | 'PER_MONTH'
  onGlobalChange: (limit: string, type: 'PER_WEEK' | 'PER_MONTH') => void
}) {
  function updateRule(classId: string, patch: Partial<ClassAccessRule>) {
    onChange(classRules.map(r => r.classId === classId ? { ...r, ...patch } : r))
  }
  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]))

  return (
    <div style={{ border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 120px 110px',
        padding: '8px 16px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
        {['Class', 'Include', 'Unlimited', 'Limit', 'Per'].map((h, i) => (
          <span key={h} style={{ fontSize: 11, fontWeight: 600, color: '#6B7280',
            textAlign: i === 0 ? 'left' : 'center' }}>{h}</span>
        ))}
      </div>

      {classRules.map((rule, idx) => (
        <div key={rule.classId}
          style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 120px 110px',
            alignItems: 'center', padding: '10px 16px',
            borderBottom: idx < classRules.length - 1 ? '1px solid #F3F4F6' : 'none',
            background: rule.included ? '#fff' : '#FAFAFA',
            opacity: rule.included ? 1 : 0.5 }}>
          <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>
            {classMap[rule.classId] ?? rule.classId}
          </span>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Toggle on={rule.included} onChange={v => updateRule(rule.classId, { included: v })} size="sm" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Toggle on={rule.unlimited} onChange={v => updateRule(rule.classId, { unlimited: v })} size="sm" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {rule.unlimited ? (
              <Infinity size={16} style={{ color: '#9CA3AF' }} />
            ) : (
              <input type="text" inputMode="numeric" value={rule.limit}
                onChange={e => updateRule(rule.classId, { limit: e.target.value.replace(/\D/g, '') })}
                style={{ width: 60, border: '1px solid #E5E7EB', borderRadius: 8, padding: '5px 8px',
                  fontSize: 13, textAlign: 'center', outline: 'none' }}
                disabled={!rule.included} />
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {rule.unlimited ? (
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>—</span>
            ) : (
              <select value={rule.limitType}
                onChange={e => updateRule(rule.classId, { limitType: e.target.value as ClassAccessRule['limitType'] })}
                style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: '5px 8px', fontSize: 12, outline: 'none', cursor: 'pointer' }}
                disabled={!rule.included}>
                <option value="PER_WEEK">/ week</option>
                <option value="PER_MONTH">/ month</option>
                <option value="TOTAL">total</option>
              </select>
            )}
          </div>
        </div>
      ))}

      <div style={{ padding: '12px 16px', background: '#F9FAFB', borderTop: '1px solid #E5E7EB',
        display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', flex: 1 }}>
          Total max bookings (all classes)
        </span>
        <input type="text" inputMode="numeric" placeholder="∞" value={globalLimit}
          onChange={e => onGlobalChange(e.target.value.replace(/\D/g, ''), globalLimitType)}
          style={{ width: 60, border: '1px solid #E5E7EB', borderRadius: 8, padding: '5px 8px', fontSize: 13, textAlign: 'center', outline: 'none' }} />
        <select value={globalLimitType}
          onChange={e => onGlobalChange(globalLimit, e.target.value as 'PER_WEEK' | 'PER_MONTH')}
          style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: '5px 8px', fontSize: 12, outline: 'none', cursor: 'pointer' }}>
          <option value="PER_WEEK">/ week</option>
          <option value="PER_MONTH">/ month</option>
        </select>
      </div>
    </div>
  )
}

// ── Plan Drawer ────────────────────────────────────────────────────────────────
const DRAWER_TABS: { id: DrawerTab; label: string }[] = [
  { id: 'SUBSCRIPTION', label: 'Subscription' },
  { id: 'SINGLE_PASS',  label: 'Single Pass'  },
  { id: 'TRIAL',        label: 'Trial'         },
]

function PlanDrawer({ open, onClose, onSaved, editPlan, classes }: {
  open: boolean
  onClose: () => void
  onSaved: (plan: PlanRow) => void
  editPlan: PlanRow | null
  classes: ClassOption[]
}) {
  const defaultForm = (planType: PlanType = 'SUBSCRIPTION'): PlanForm => ({
    name: '', description: '', imageUrl: '',
    price: '', currency: 'EUR',
    planType,
    billingCycle: 'monthly',
    validityDays: '30', validityPeriod: 'days',
    isPublic: true, isPopular: false, isActive: true,
    stripePriceId: '',
    classRules: buildDefaultClassRules(classes),
    globalLimit: '', globalLimitType: 'PER_MONTH',
  })

  const [activeTab, setActiveTab] = useState<DrawerTab>('SUBSCRIPTION')
  const [form, setForm] = useState<PlanForm>(defaultForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    if (editPlan) {
      setActiveTab(editPlan.planType as DrawerTab)
      setForm(planToForm(editPlan, classes))
    } else {
      setActiveTab('SUBSCRIPTION')
      setForm(defaultForm('SUBSCRIPTION'))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editPlan])

  function switchTab(tab: DrawerTab) {
    setActiveTab(tab)
    setForm(f => ({ ...f, planType: tab }))
  }

  function set<K extends keyof PlanForm>(k: K, v: PlanForm[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function save() {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true); setError('')
    try {
      const url = editPlan
        ? `/api/dashboard/membership-plans/${editPlan.id}`
        : '/api/dashboard/membership-plans'
      const res = await fetch(url, {
        method: editPlan ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formToPayload(form)),
      })
      if (!res.ok) throw new Error(await res.text())
      const saved = await res.json()
      onSaved({ ...saved, memberCount: editPlan?.memberCount ?? 0 })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error saving')
    } finally {
      setSaving(false)
    }
  }

  const isSubscription = activeTab === 'SUBSCRIPTION'
  const isSinglePass   = activeTab === 'SINGLE_PASS'
  const isTrial        = activeTab === 'TRIAL'

  return (
    <>
      <div className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.35)', opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none', transition: 'opacity 0.2s' }}
        onClick={onClose} />

      <div className="fixed top-0 right-0 h-full z-50 flex flex-col"
        style={{ width: 'min(960px,96vw)', background: '#F9FAFB',
          boxShadow: '-4px 0 32px rgba(0,0,0,0.12)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)' }}>

        {/* Header */}
        <div className="shrink-0" style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
                {editPlan ? 'Edit plan' : 'Add plan'}
              </h2>
              <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                Configure class access rules, pricing and billing
              </p>
            </div>
            <button onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <X size={15} style={{ color: '#6B7280' }} />
            </button>
          </div>

          {/* Tab switcher inside drawer */}
          <div className="flex px-6" style={{ borderTop: '1px solid #F3F4F6' }}>
            {DRAWER_TABS.map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button key={tab.id} type="button"
                  onClick={() => switchTab(tab.id)}
                  style={{ padding: '10px 18px', fontSize: 13, fontWeight: isActive ? 600 : 400,
                    border: 'none', background: 'transparent', cursor: 'pointer', position: 'relative',
                    color: isActive ? '#111827' : '#9CA3AF' }}>
                  {tab.label}
                  {isActive && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0,
                      height: 2, background: '#0071E3', borderRadius: '2px 2px 0 0' }} />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="flex flex-col lg:flex-row gap-6" style={{ alignItems: 'flex-start' }}>

            {/* Left column */}
            <div className="flex-1 min-w-0 flex flex-col gap-5">

              {/* Name */}
              <div>
                <label style={labelSt}>Name *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="e.g. BJJ Monthly Unlimited" style={inputSt} />
              </div>

              {/* Description */}
              <div>
                <label style={labelSt}>Description</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)}
                  rows={2} placeholder="Optional description shown to students"
                  style={{ ...inputSt, resize: 'vertical' }} />
              </div>

              {/* Image */}
              <ImageUploadZone value={form.imageUrl} onChange={v => set('imageUrl', v)} />

              {/* Price row */}
              <div className="flex gap-3 flex-wrap">
                <div style={{ flex: '2 1 120px' }}>
                  <label style={labelSt}>Price</label>
                  <input type="text" inputMode="numeric" value={form.price}
                    onChange={e => set('price', e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="0" style={inputSt} />
                </div>
                <div style={{ flex: '1 1 90px' }}>
                  <label style={labelSt}>Currency</label>
                  <select value={form.currency} onChange={e => set('currency', e.target.value)} style={inputSt}>
                    <option value="EUR">EUR €</option>
                    <option value="USD">USD $</option>
                    <option value="GBP">GBP £</option>
                  </select>
                </div>
                {isSubscription && (
                  <div style={{ flex: '2 1 140px' }}>
                    <label style={labelSt}>Billing cycle</label>
                    <select value={form.billingCycle} onChange={e => set('billingCycle', e.target.value)} style={inputSt}>
                      <option value="monthly">Monthly</option>
                      <option value="two-weekly">Every 2 weeks</option>
                      <option value="quarterly">Every 3 months</option>
                      <option value="annual">Annual</option>
                    </select>
                  </div>
                )}
                {(isSinglePass || isTrial) && (
                  <>
                    <div style={{ flex: '1 1 80px' }}>
                      <label style={labelSt}>Valid for</label>
                      <input type="text" inputMode="numeric" value={form.validityDays}
                        onChange={e => set('validityDays', e.target.value.replace(/\D/g, ''))}
                        placeholder="30" style={inputSt} />
                    </div>
                    <div style={{ flex: '1 1 90px' }}>
                      <label style={labelSt}>&nbsp;</label>
                      <select value={form.validityPeriod}
                        onChange={e => set('validityPeriod', e.target.value as PlanForm['validityPeriod'])}
                        style={inputSt}>
                        <option value="days">Days</option>
                        <option value="weeks">Weeks</option>
                        <option value="months">Months</option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              {/* Stripe */}
              <div>
                <label style={labelSt}>Stripe Price ID</label>
                <input value={form.stripePriceId} onChange={e => set('stripePriceId', e.target.value)}
                  placeholder="price_..." style={inputSt} />
              </div>

              {/* Class access */}
              <div>
                <label style={{ ...labelSt, marginBottom: 10 }}>Class Access Rules</label>
                {classes.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#9CA3AF' }}>No active classes yet. Create classes first.</p>
                ) : (
                  <ClassAccessBuilder
                    classRules={form.classRules}
                    classes={classes}
                    onChange={rules => set('classRules', rules)}
                    globalLimit={form.globalLimit}
                    globalLimitType={form.globalLimitType}
                    onGlobalChange={(limit, type) => { set('globalLimit', limit); set('globalLimitType', type) }}
                  />
                )}
              </div>
            </div>

            {/* Right column */}
            <div style={{ width: 200, flexShrink: 0 }} className="flex flex-col gap-4">
              <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 14 }}>Options</p>
                <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: '#374151' }}>Active</span>
                  <Toggle on={form.isActive} onChange={v => set('isActive', v)} size="sm" />
                </div>
                <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: '#374151' }}>Popular</span>
                  <Toggle on={form.isPopular} onChange={v => set('isPopular', v)} size="sm" />
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 13, color: '#374151' }}>Public</span>
                  <Toggle on={form.isPublic} onChange={v => set('isPublic', v)} size="sm" />
                </div>
              </div>

              {/* Image preview in sidebar */}
              {form.imageUrl && (
                <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.imageUrl} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
                  <div style={{ padding: '8px 12px', background: '#F9FAFB', borderTop: '1px solid #E5E7EB' }}>
                    <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>Plan image preview</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 flex items-center justify-between"
          style={{ background: '#fff', borderTop: '1px solid #E5E7EB' }}>
          <div>
            {error && <p style={{ fontSize: 13, color: '#EF4444' }}>{error}</p>}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose}
              style={{ padding: '9px 20px', borderRadius: 10, border: '1px solid #E5E7EB',
                fontSize: 13, fontWeight: 600, color: '#374151', background: '#fff', cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={save} disabled={saving}
              style={{ padding: '9px 24px', borderRadius: 10, border: 'none',
                fontSize: 13, fontWeight: 600, color: '#fff',
                background: saving ? '#93C5FD' : '#0071E3', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving…' : editPlan ? 'Save changes' : 'Create plan'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Delete modal ───────────────────────────────────────────────────────────────
function DeleteModal({ plan, onClose, onDeleted }: {
  plan: PlanRow; onClose: () => void; onDeleted: (id: string) => void
}) {
  const [loading, setLoading] = useState(false)

  async function confirm() {
    setLoading(true)
    await fetch(`/api/dashboard/membership-plans/${plan.id}`, { method: 'DELETE' })
    onDeleted(plan.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 420, width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Delete plan?</h3>
        <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>
          <strong>{plan.name}</strong> will be permanently deleted.
          {plan.memberCount > 0 && ` ${plan.memberCount} active member(s) use this plan.`}
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose}
            style={{ padding: '9px 20px', borderRadius: 10, border: '1px solid #E5E7EB',
              fontSize: 13, fontWeight: 600, color: '#374151', background: '#fff', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={confirm} disabled={loading}
            style={{ padding: '9px 20px', borderRadius: 10, border: 'none',
              fontSize: 13, fontWeight: 600, color: '#fff',
              background: loading ? '#FCA5A5' : '#EF4444', cursor: 'pointer' }}>
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Plan type badge ────────────────────────────────────────────────────────────
const PLAN_TYPE_COLORS: Record<PlanType, { bg: string; color: string; label: string }> = {
  SUBSCRIPTION: { bg: '#EFF6FF', color: '#1D4ED8', label: 'Subscription' },
  SINGLE_PASS:  { bg: '#F0FDF4', color: '#15803D', label: 'Single Pass'  },
  TRIAL:        { bg: '#F5F3FF', color: '#6D28D9', label: 'Trial'        },
}

// ── Table row ─────────────────────────────────────────────────────────────────
function PlanTableRow({ plan, classes, onEdit, onDelete }: {
  plan: PlanRow
  classes: ClassOption[]
  onEdit: (p: PlanRow) => void
  onDelete: (p: PlanRow) => void
}) {
  const cfg = plan.classAccess as ClassAccessConfig
  const includedRules = (cfg.classRules ?? []).filter(r => r.included)
  const allClasses = classes.length
  const included = includedRules.length

  const accessSummary = !includedRules.length
    ? 'No classes'
    : included === allClasses
      ? 'All classes'
      : `${included} class${included > 1 ? 'es' : ''}`

  const billingLabel = plan.planType === 'SUBSCRIPTION'
    ? (BILLING_CYCLE_LABELS[plan.billingCycle] ?? plan.billingCycle)
    : plan.validityDays
      ? `${plan.validityDays} days`
      : '—'

  const pt = PLAN_TYPE_COLORS[plan.planType]

  return (
    <tr className="hover:bg-[#FAFAFA] transition-colors"
      style={{ borderBottom: '1px solid #F3F4F6' }}>

      {/* Plan name + image */}
      <td style={{ padding: '12px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Image or placeholder */}
          <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
            border: '1px solid #E5E7EB', background: '#F3F4F6',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {plan.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={plan.imageUrl} alt={plan.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <ImageIcon size={18} style={{ color: '#D1D5DB' }} />
            )}
          </div>
          <div className="min-w-0">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>{plan.name}</p>
              {plan.isPopular && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                  background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', whiteSpace: 'nowrap' }}>
                  Popular
                </span>
              )}
            </div>
            {plan.description && (
              <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0', lineHeight: 1.4 }}>
                {plan.description.slice(0, 55)}{plan.description.length > 55 ? '…' : ''}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* Type badge */}
      <td className="hidden sm:table-cell" style={{ padding: '12px 20px' }}>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
          background: pt.bg, color: pt.color, whiteSpace: 'nowrap' }}>
          {pt.label}
        </span>
      </td>

      {/* Price */}
      <td style={{ padding: '12px 20px' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
          {fmtPrice(plan.price, plan.currency)}
        </span>
        <span style={{ fontSize: 11, color: '#9CA3AF', display: 'block' }}>{billingLabel}</span>
      </td>

      {/* Classes */}
      <td className="hidden md:table-cell" style={{ padding: '12px 20px', fontSize: 13, color: '#374151' }}>
        {accessSummary}
      </td>

      {/* Members */}
      <td className="hidden lg:table-cell" style={{ padding: '12px 20px' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{plan.memberCount}</span>
        <span style={{ fontSize: 11, color: '#9CA3AF', display: 'block' }}>members</span>
      </td>

      {/* Status */}
      <td style={{ padding: '12px 20px' }}>
        <span className="inline-flex items-center gap-1"
          style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
            background: plan.isActive ? '#F0FDF4' : '#F3F4F6',
            color: plan.isActive ? '#16A34A' : '#6B7280',
            border: '1px solid ' + (plan.isActive ? '#BBF7D0' : '#E5E7EB') }}>
          {plan.isActive ? <Check size={9} strokeWidth={3} /> : <X size={9} strokeWidth={3} />}
          {plan.isActive ? 'Active' : 'Inactive'}
        </span>
      </td>

      {/* Actions */}
      <td style={{ padding: '12px 20px' }}>
        <div className="flex items-center gap-2">
          <button onClick={() => onEdit(plan)}
            className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer"
            style={{ border: '1px solid #E5E7EB', background: '#fff' }}>
            <Pencil size={13} style={{ color: '#6B7280' }} />
          </button>
          <button onClick={() => onDelete(plan)}
            className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer"
            style={{ border: '1px solid #FECACA', background: '#FFF5F5' }}>
            <Trash2 size={13} style={{ color: '#EF4444' }} />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── Tab type ───────────────────────────────────────────────────────────────────
type TabId = 'subscriptions' | 'single-passes' | 'trials'

const TAB_PLAN_TYPE: Record<TabId, PlanType> = {
  subscriptions: 'SUBSCRIPTION',
  'single-passes': 'SINGLE_PASS',
  trials: 'TRIAL',
}

// ── Main client ────────────────────────────────────────────────────────────────
export default function MembershipsClient() {
  const { setMenuOpen, menuOpen } = useDashboard()
  useT()

  const [plans, setPlans]         = useState<PlanRow[]>([])
  const [classes, setClasses]     = useState<ClassOption[]>([])
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('subscriptions')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editPlan, setEditPlan]   = useState<PlanRow | null>(null)
  const [deletePlan, setDeletePlan] = useState<PlanRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard/membership-plans')
      if (res.ok) {
        const data = await res.json()
        setPlans(data.plans)
        setClasses(data.classes)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() { setEditPlan(null); setDrawerOpen(true) }
  function openEdit(plan: PlanRow) { setEditPlan(plan); setDrawerOpen(true) }

  function handleSaved(plan: PlanRow) {
    setPlans(prev => {
      const exists = prev.find(p => p.id === plan.id)
      return exists ? prev.map(p => p.id === plan.id ? plan : p) : [plan, ...prev]
    })
    setDrawerOpen(false)
  }

  function handleDeleted(id: string) {
    setPlans(prev => prev.filter(p => p.id !== id))
    setDeletePlan(null)
  }

  const filtered = plans.filter(p => p.planType === TAB_PLAN_TYPE[activeTab])

  const TAB_LABELS: Record<TabId, string> = {
    subscriptions: 'Subscriptions',
    'single-passes': 'Single Passes',
    trials: 'Trials',
  }

  const TABLE_HEADERS = ['Plan', 'Type', 'Price', 'Classes', 'Members', 'Status', 'Actions']
  const TABLE_CLASSES = ['', 'hidden sm:table-cell', '', 'hidden md:table-cell', 'hidden lg:table-cell', '', '']

  return (
    <main style={{ flex: 1, minWidth: 0, width: '100%', overflow: 'auto' }}>

      {/* Topbar */}
      <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20"
        style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
        <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
          style={{ border: '1px solid #E5E7EB', background: '#F9FAFB' }}
          onClick={() => setMenuOpen(!menuOpen)}>
          <Menu size={16} style={{ color: '#374151' }} />
        </button>

        {/* Tab pills */}
        <div className="flex-1 overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
          <div className="flex gap-1 w-max" style={{ background: '#F3F4F6', borderRadius: 10, padding: 4 }}>
            {(['subscriptions', 'single-passes', 'trials'] as TabId[]).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                  background: activeTab === tab ? '#fff' : 'transparent',
                  color: activeTab === tab ? '#111827' : '#6B7280',
                  boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s' }}>
                {TAB_LABELS[tab]}
                {plans.filter(p => p.planType === TAB_PLAN_TYPE[tab]).length > 0 && (
                  <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700,
                    background: activeTab === tab ? '#EFF6FF' : '#E5E7EB',
                    color: activeTab === tab ? '#1D4ED8' : '#9CA3AF',
                    padding: '1px 6px', borderRadius: 999 }}>
                    {plans.filter(p => p.planType === TAB_PLAN_TYPE[tab]).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <button onClick={openCreate}
          className="flex items-center gap-2 cursor-pointer shrink-0"
          style={{ padding: '9px 18px', borderRadius: 10, border: 'none',
            background: '#0071E3', color: '#fff', fontSize: 13, fontWeight: 600 }}>
          <Plus size={15} />
          <span className="hidden sm:inline">Add Plan</span>
        </button>
      </div>

      {/* Content */}
      <div className="px-4 md:px-8 py-6">

        {/* Page header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>
            Memberships
          </h1>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>
            {TAB_LABELS[activeTab]} — manage plans, pricing and class access
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center" style={{ height: 200 }}>
            <p style={{ color: '#9CA3AF', fontSize: 14 }}>Loading…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center" style={{ height: 240, gap: 12 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: '#F3F4F6',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={24} style={{ color: '#9CA3AF' }} />
            </div>
            <p style={{ fontSize: 15, color: '#9CA3AF' }}>No {TAB_LABELS[activeTab].toLowerCase()} yet</p>
            <button onClick={openCreate}
              style={{ padding: '9px 20px', borderRadius: 10, border: 'none',
                background: '#0071E3', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Add Plan
            </button>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  {TABLE_HEADERS.map((h, i) => (
                    <th key={h} className={TABLE_CLASSES[i]}
                      style={{ padding: '10px 20px', fontSize: 11, fontWeight: 600,
                        color: '#9CA3AF', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(plan => (
                  <PlanTableRow key={plan.id} plan={plan} classes={classes}
                    onEdit={openEdit} onDelete={setDeletePlan} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PlanDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={handleSaved}
        editPlan={editPlan}
        classes={classes}
      />

      {deletePlan && (
        <DeleteModal plan={deletePlan} onClose={() => setDeletePlan(null)} onDeleted={handleDeleted} />
      )}
    </main>
  )
}
