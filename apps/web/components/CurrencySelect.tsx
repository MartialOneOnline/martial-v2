'use client'

import type { CSSProperties } from 'react'
import { currencyOptions } from '../lib/currency'
import { currencySymbol } from '../lib/format'

/** Currency <select> shared by every price form (plans, classes, tickets, transactions). */
export default function CurrencySelect({ value, onChange, style, className, ariaLabel }: {
  value: string
  onChange: (code: string) => void
  style?: CSSProperties
  className?: string
  ariaLabel?: string
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={style} className={className} aria-label={ariaLabel}>
      {currencyOptions(value).map(c => {
        const sym = currencySymbol(c.code)
        return (
          <option key={c.code} value={c.code}>
            {sym && sym !== c.code ? `${c.code} ${sym}` : c.code}
          </option>
        )
      })}
    </select>
  )
}
