'use client'

import { paymentStatusColors, type PaymentStatus } from '@/lib/design/tokens'

interface PaymentBadgeProps {
  status: string
  variant?: 'soft' | 'solid'
  size?: 'sm' | 'md'
  showDot?: boolean
}

export function PaymentBadge({ status, variant = 'soft', size = 'sm', showDot = true }: PaymentBadgeProps) {
  const key = status.toUpperCase() as PaymentStatus
  const token = paymentStatusColors[key] ?? paymentStatusColors.CANCELED

  const isSoft = variant === 'soft'
  const bg = isSoft ? token.bg : token.solid
  const color = isSoft ? token.text : token.solidText
  const dot = token.dot

  const padding = size === 'sm' ? '3px 9px' : '5px 12px'
  const fontSize = size === 'sm' ? 11 : 13
  const dotSize = size === 'sm' ? 6 : 8

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: bg, color, fontSize, fontWeight: 600,
      padding, borderRadius: 999, whiteSpace: 'nowrap',
    }}>
      {showDot && (
        <span style={{ width: dotSize, height: dotSize, borderRadius: '50%', background: dot, flexShrink: 0 }} />
      )}
      {token.label}
    </span>
  )
}
