'use client'

import { useState } from 'react'
import { fmtPrice } from '../../../lib/format'

type Plan = {
  id: string
  name: string
  description: string | null
  price: number
  currency: string
  billingCycle: string
  isPopular: boolean
}

const TABS = [
  { key: 'subscription', label: 'Subscriptions' },
  { key: 'pass', label: 'Passes' },
  { key: 'private', label: 'Private' },
]

function categorise(plans: Plan[]) {
  const sub: Plan[] = []
  const pass: Plan[] = []
  const priv: Plan[] = []

  for (const p of plans) {
    const n = p.name.toLowerCase()
    if (n.includes('privada') || n.includes('private')) {
      priv.push(p)
    } else if (p.billingCycle === 'monthly' || p.billingCycle === 'quarterly' || p.billingCycle === 'annual') {
      sub.push(p)
    } else {
      pass.push(p)
    }
  }
  return { subscription: sub, pass: pass, private: priv }
}

function PriceLabel({ price, currency, billingCycle }: { price: number; currency: string; billingCycle: string }) {
  if (price === 0) return <span className="text-2xl font-bold text-emerald-600">Free</span>
  const suffix = billingCycle === 'monthly' ? '/mo' : billingCycle === 'quarterly' ? '/qtr' : billingCycle === 'annual' ? '/yr' : ''
  return (
    <span className="text-2xl font-bold text-[#0870E2]">
      {fmtPrice(price, currency)}<span className="text-sm font-normal text-[#4f4f4f]">{suffix}</span>
    </span>
  )
}

export default function MembershipSection({ plans }: { plans: Plan[] }) {
  const categories = categorise(plans)
  const activeTabs = TABS.filter(t => categories[t.key as keyof typeof categories].length > 0)
  const [activeTab, setActiveTab] = useState(activeTabs[0]?.key ?? 'subscription')

  const current = categories[activeTab as keyof typeof categories] ?? []

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
      {/* Tabs */}
      {activeTabs.length > 1 && (
        <div className="flex border-b border-slate-100">
          {activeTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.key
                  ? 'text-[#0870E2]'
                  : 'text-[#6b7280] hover:text-[#0870E2]'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0870E2]" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Plans list */}
      <div className="divide-y divide-slate-50">
        {current.map(plan => (
          <div key={plan.id} className={`flex items-center justify-between gap-4 px-5 py-4 ${plan.isPopular ? 'bg-[#f0f9ff]' : ''}`}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-[#061229] text-sm">{plan.name}</span>
                {plan.isPopular && (
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-[#0870E2] text-white px-2 py-0.5 rounded-full">Popular</span>
                )}
              </div>
              {plan.description && (
                <p className="text-xs text-[#6b7280] mt-0.5 line-clamp-1">{plan.description}</p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <PriceLabel price={plan.price} currency={plan.currency} billingCycle={plan.billingCycle} />
            </div>
          </div>
        ))}
      </div>

      {/* Footer CTA */}
      <div className="px-5 py-4 border-t border-slate-100 bg-slate-50">
        <p className="text-xs text-[#6b7280]">Contact the school directly to sign up or ask about pricing.</p>
      </div>
    </div>
  )
}
