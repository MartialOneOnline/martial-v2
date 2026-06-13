'use client'

import { motion } from 'framer-motion'
import { Landmark } from 'lucide-react'

const PAYMENTS = [
  { name: 'Stripe',       logo: <span className="text-xl font-black italic tracking-tight text-[#635bff]">stripe</span> },
  { name: 'PayPal',       logo: <span className="text-xl font-black italic tracking-tighter"><span className="text-[#003087]">Pay</span><span className="text-[#0079c1]">Pal</span></span> },
  { name: 'GoCardless',   logo: <span className="text-[12px] font-black tracking-[0.2em] text-[#0c2440] uppercase">gocardless</span> },
  { name: 'Direct Debit', logo: <span className="flex items-center gap-1 text-[11px] font-black tracking-wider text-[#101828] uppercase border-2 border-slate-800 p-1 rounded-sm"><Landmark className="w-3.5 h-3.5" /><span>Direct Debit</span></span> },
  { name: 'VISA',         logo: <span className="text-xl font-black tracking-tight text-[#1a1f71] italic">VISA</span> },
  { name: 'Mastercard',   logo: <div className="flex items-center gap-1.5"><div className="flex -space-x-2"><span className="w-5 h-5 bg-[#eb001b] rounded-full opacity-90 block" /><span className="w-5 h-5 bg-[#ff5f00] rounded-full opacity-90 block" /></div><span className="text-xs font-black text-slate-700 tracking-tight lowercase">mastercard</span></div> },
]

export default function PaymentMethods() {
  return (
    <section className="bg-white py-14 sm:py-16 border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 text-center">
        <div className="max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#101828] leading-tight uppercase">
            Various Payment Methods
          </h2>
          <p className="text-xs text-slate-400 font-bold tracking-wider mt-2 uppercase">
            Fully Integrated Secure Checkout Pipelines
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14">
          {PAYMENTS.map((p, i) => (
            <motion.div key={p.name}
              initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0 }} transition={{ delay: i * 0.08 }}
              whileHover={{ scale: 1.05 }}
              className="px-6 py-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center min-w-[120px] shadow-sm hover:shadow-md transition-shadow">
              {p.logo}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
