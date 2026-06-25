'use client'

import { useCallback, useEffect, useState } from 'react'
import { CreditCard, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { fmtPrice } from '../../../lib/format'

type Transaction = {
  id: string
  amount: number
  currency: string
  description: string | null
  date: string
  type: string
  category: string
  school: { name: string; slug: string }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtAmount(amount: number, currency: string, type: string) {
  const sign = type === 'INCOME' || type === 'PAYMENT' ? '-' : '+'
  return `${sign}${fmtPrice(Math.abs(amount), currency)}`
}

export default function MyPaymentsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/my/payments?page=${page}`)
      .then(r => r.json())
      .then(d => { setTransactions(d.transactions ?? []); setTotal(d.total ?? 0); setPages(d.pages ?? 1); setLoading(false) })
      .catch(() => setLoading(false))
  }, [page])

  useEffect(() => { load() }, [load])

  const totalSpent = transactions.reduce((acc, t) => acc + t.amount, 0)
  const summaryCurrency = transactions[0]?.currency ?? 'EUR'

  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-[#101828]">Payments</h1>
        <p className="text-xs text-gray-400">{total} transactions</p>
      </div>

      <div className="p-6 space-y-4 max-w-2xl">
        {/* Summary card */}
        {transactions.length > 0 && (
          <div className="bg-[#0870E2] rounded-2xl p-5 text-white">
            <p className="text-xs font-semibold opacity-70 uppercase tracking-wide mb-1">Total this page</p>
            <p className="text-3xl font-bold">{fmtPrice(totalSpent, summaryCurrency)}</p>
            <p className="text-sm opacity-70 mt-0.5">{transactions.length} transactions</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-[#0870E2] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-10 shadow-sm text-center">
            <CreditCard className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No payment history yet</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {transactions.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-9 h-9 rounded-xl bg-[#0870E2]/8 flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4 text-[#0870E2]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#101828] truncate">
                      {t.description || t.category || 'Payment'}
                    </p>
                    <p className="text-[11px] text-gray-400">{t.school.name} · {fmtDate(t.date)}</p>
                  </div>
                  <p className="text-sm font-bold text-[#101828] shrink-0">
                    {fmtAmount(t.amount, t.currency, t.type)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">{(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-500 px-2">{page} / {pages}</span>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
