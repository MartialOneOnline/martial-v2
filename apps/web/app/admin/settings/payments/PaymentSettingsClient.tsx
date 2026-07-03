'use client'

import { useEffect, useState } from 'react'
import { CreditCard, Save, Check, Percent, Clock, Wallet } from 'lucide-react'
import { Section, Toggle } from '../SettingsClient'
import { PAYMENT_METHOD_KEYS } from '@/lib/paymentMethods'
import { fmtPrice } from '@/lib/format'

const METHOD_LABELS: Record<string, string> = {
  STRIPE: 'Stripe',
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  DIRECT_DEBIT: 'Direct Debit',
  PAYPAL: 'PayPal',
  OTHER: 'Other',
}

type Cycle = 'monthly' | 'quarterly' | 'annual'
const CYCLES: { cycle: Cycle; label: string; hint: string }[] = [
  { cycle: 'monthly',   label: 'Monthly',   hint: 'interval = month, interval_count = 1' },
  { cycle: 'quarterly', label: 'Quarterly', hint: 'interval = month, interval_count = 3 (Stripe has no native "quarter")' },
  { cycle: 'annual',    label: 'Annual',    hint: 'interval = year, interval_count = 1' },
]

type Settings = {
  enabledPaymentMethods: string[]
  defaultCurrency: string
  defaultTaxName: string | null
  defaultTaxRate: number | null
  defaultTaxNumber: string | null
  taxActive: boolean
  gracePeriodDays: number
  planCurrency: string
  planPriceMonthly: number | null
  planPriceQuarterly: number | null
  planPriceAnnual: number | null
  stripePriceIdMonthly: string | null
  stripePriceIdQuarterly: string | null
  stripePriceIdAnnual: string | null
}

const PRICE_AMOUNT_FIELD: Record<Cycle, keyof Settings> = {
  monthly: 'planPriceMonthly',
  quarterly: 'planPriceQuarterly',
  annual: 'planPriceAnnual',
}
const PRICE_ID_FIELD: Record<Cycle, keyof Settings> = {
  monthly: 'stripePriceIdMonthly',
  quarterly: 'stripePriceIdQuarterly',
  annual: 'stripePriceIdAnnual',
}

export default function PaymentSettingsClient() {
  const [form, setForm] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/settings/payments')
      .then(r => r.json())
      .then(d => { setForm(d.settings); setLoading(false) })
  }, [])

  function toggleMethod(key: string) {
    setForm(f => f ? {
      ...f,
      enabledPaymentMethods: f.enabledPaymentMethods.includes(key)
        ? f.enabledPaymentMethods.filter(m => m !== key)
        : [...f.enabledPaymentMethods, key],
    } : f)
  }

  async function save() {
    if (!form) return
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin/settings/payments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabledPaymentMethods: form.enabledPaymentMethods,
        defaultCurrency: form.defaultCurrency,
        defaultTaxName: form.defaultTaxName,
        defaultTaxRate: form.defaultTaxRate,
        defaultTaxNumber: form.defaultTaxNumber,
        taxActive: form.taxActive,
        gracePeriodDays: form.gracePeriodDays,
        stripePriceIdMonthly: form.stripePriceIdMonthly,
        stripePriceIdQuarterly: form.stripePriceIdQuarterly,
        stripePriceIdAnnual: form.stripePriceIdAnnual,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error || 'Failed to save'); return }
    setForm(data.settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading || !form) {
    return <div className="p-8 text-sm text-gray-400">Loading…</div>
  }

  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold text-[#101828]">Payment Settings</h1>
          <p className="text-xs text-gray-400">Payment methods, tax defaults, and Martial&apos;s subscription plan</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 h-9 px-4 rounded-xl text-white text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
          style={{ background: saved ? '#10B981' : '#0870E2' }}
        >
          {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      <div className="p-8 max-w-2xl space-y-6">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-600">{error}</div>
        )}

        <Section title="Payment Methods" icon={Wallet}>
          <p className="text-xs text-gray-400 -mt-2 mb-1">Schools can only offer payment methods you enable here.</p>
          <div>
            {PAYMENT_METHOD_KEYS.map(key => {
              const active = form.enabledPaymentMethods.includes(key)
              return (
                <div key={key} className="flex items-center justify-between py-1.5">
                  <p className="text-sm font-medium text-[#101828]">{METHOD_LABELS[key]}</p>
                  <button
                    onClick={() => toggleMethod(key)}
                    className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full transition-colors"
                    style={active ? { background: '#DCFCE7', color: '#16A34A' } : { background: '#FEE2E2', color: '#DC2626' }}
                  >
                    {active ? 'Active' : 'Inactive'}
                  </button>
                </div>
              )
            })}
          </div>
        </Section>

        <Section title="Default Currency & Tax" icon={Percent}>
          <p className="text-xs text-gray-400 -mt-2 mb-1">
            Informational only in this iteration — not applied to Martial&apos;s subscription checkout below (no automatic tax collection yet).
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Currency</label>
              <select
                value={form.defaultCurrency}
                onChange={e => setForm(f => f && { ...f, defaultCurrency: e.target.value })}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0870E2]/20 focus:border-[#0870E2]"
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Tax name</label>
              <input
                type="text"
                value={form.defaultTaxName ?? ''}
                onChange={e => setForm(f => f && { ...f, defaultTaxName: e.target.value })}
                placeholder="VAT"
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0870E2]/20 focus:border-[#0870E2]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Tax %</label>
              <input
                type="number"
                value={form.defaultTaxRate ?? ''}
                onChange={e => setForm(f => f && { ...f, defaultTaxRate: e.target.value === '' ? null : Number(e.target.value) })}
                placeholder="20"
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0870E2]/20 focus:border-[#0870E2]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Tax number</label>
              <input
                type="text"
                value={form.defaultTaxNumber ?? ''}
                onChange={e => setForm(f => f && { ...f, defaultTaxNumber: e.target.value })}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0870E2]/20 focus:border-[#0870E2]"
              />
            </div>
          </div>
          <Toggle
            label="Tax active"
            description="Display only — does not charge tax anywhere yet"
            checked={form.taxActive}
            onChange={v => setForm(f => f && { ...f, taxActive: v })}
          />
        </Section>

        <Section title="Grace Period" icon={Clock}>
          <p className="text-xs text-gray-400 -mt-2 mb-1">
            Days a school may stay past due before you step in manually — there is no automatic suspension yet.
          </p>
          <input
            type="number"
            min={0}
            value={form.gracePeriodDays}
            onChange={e => setForm(f => f && { ...f, gracePeriodDays: Math.max(0, Number(e.target.value)) })}
            className="w-32 h-9 px-3 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0870E2]/20 focus:border-[#0870E2]"
          />
        </Section>

        <Section title="Martial Subscription Plan" icon={CreditCard}>
          <p className="text-xs text-gray-400 -mt-2 mb-1">
            Create each Price in the Stripe dashboard first, then paste its ID here. The price shown is read live from Stripe — it can&apos;t be typed manually.
          </p>
          <div className="space-y-3">
            {CYCLES.map(({ cycle, label, hint }) => {
              const amount = form[PRICE_AMOUNT_FIELD[cycle]] as number | null
              return (
                <div key={cycle} className="p-3 rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-semibold text-[#101828]">{label}</p>
                    {amount != null && (
                      <span className="text-xs font-semibold text-[#0870E2]">{fmtPrice(amount / 100, form.planCurrency)}</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={(form[PRICE_ID_FIELD[cycle]] as string | null) ?? ''}
                    onChange={e => setForm(f => f && { ...f, [PRICE_ID_FIELD[cycle]]: e.target.value || null })}
                    placeholder="price_..."
                    className="w-full h-9 px-3 rounded-xl border border-gray-200 text-sm text-gray-700 font-mono focus:outline-none focus:ring-2 focus:ring-[#0870E2]/20 focus:border-[#0870E2]"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">{hint}</p>
                </div>
              )
            })}
          </div>
        </Section>
      </div>
    </div>
  )
}
