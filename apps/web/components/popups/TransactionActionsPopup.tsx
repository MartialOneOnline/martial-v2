'use client'

import { useState, useEffect, useRef } from 'react'
import { Eye, RefreshCw, Download, Mail, Ban, Trash2, MoreHorizontal } from 'lucide-react'

export interface Transaction {
  id: number
  name: string
  status: string
  price: string
}

interface Props {
  transaction: Transaction
  onClose: () => void
  onAction?: (action: string, tx: Transaction) => void
}

const ACTIONS = [
  { id: 'view',    icon: Eye,        label: 'View Details',      color: '#111827', destructive: false },
  { id: 'refund',  icon: RefreshCw,  label: 'Issue Refund',      color: '#D97706', destructive: false },
  { id: 'receipt', icon: Download,   label: 'Download Receipt',  color: '#0071E3', destructive: false },
  { id: 'email',   icon: Mail,       label: 'Email Receipt',     color: '#6366F1', destructive: false },
  { id: 'void',    icon: Ban,        label: 'Void Transaction',  color: '#DC2626', destructive: true  },
  { id: 'delete',  icon: Trash2,     label: 'Delete',            color: '#DC2626', destructive: true, divider: true },
]

export default function TransactionActionsPopup({ transaction, onClose, onAction }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute right-0 z-50 rounded-xl shadow-2xl overflow-hidden"
      style={{ background: '#fff', border: '1px solid #E5E7EB', width: 200, top: 28 }}
    >
      {/* Transaction mini-header */}
      <div className="px-3 py-2.5" style={{ borderBottom: '1px solid #F3F4F6', background: '#F9FAFB' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {transaction.name}
        </p>
        <div className="flex items-center justify-between mt-0.5">
          <span style={{ fontSize: 11, color: '#6B7280' }}>{transaction.price}</span>
          <span style={{
            fontSize: 10, fontWeight: 600,
            color: transaction.status === 'Paid' ? '#16A34A' : transaction.status === 'Pending' ? '#D97706' : '#DC2626',
          }}>
            {transaction.status}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="py-1">
        {ACTIONS.map(action => {
          const Icon = action.icon
          return (
            <div key={action.id}>
              {action.divider && <div style={{ height: 1, background: '#F3F4F6', margin: '4px 0' }} />}
              <button
                onClick={() => { onAction?.(action.id, transaction); onClose() }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left cursor-pointer transition-colors"
                style={{ background: 'none', border: 'none' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = action.destructive ? '#FEF2F2' : '#F9FAFB' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}
              >
                <Icon size={13} style={{ color: action.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: action.color, fontWeight: action.destructive ? 600 : 400 }}>{action.label}</span>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* Inline trigger button — drop-in replacement for the MoreHorizontal button in table rows */
export function TransactionActionsButton({
  transaction,
  onAction,
}: {
  transaction: Transaction
  onAction?: (action: string, tx: Transaction) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
        style={{ color: '#9CA3AF', background: 'transparent', border: 'none' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F9FAFB' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <TransactionActionsPopup
          transaction={transaction}
          onClose={() => setOpen(false)}
          onAction={onAction}
        />
      )}
    </div>
  )
}
