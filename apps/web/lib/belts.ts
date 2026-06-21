// BJJ belt image mapping — belt name (lowercase) + stripe count → /public/belts/*.svg
// Covers adult belts (white/blue/purple/brown/black) + special (coral, black-red, red)

const BASE = '/belts'

type BeltKey =
  | 'white' | 'blue' | 'purple' | 'brown' | 'black'
  | 'coral' | 'black-red' | 'red'

// Maps belt name variations (from DB) → normalised key
const BELT_ALIASES: Record<string, BeltKey> = {
  white: 'white', blanco: 'white',
  blue: 'blue', azul: 'blue',
  purple: 'purple', morado: 'purple',
  brown: 'brown', marron: 'brown', marrón: 'brown',
  black: 'black', negro: 'black',
  coral: 'coral',
  'black-red': 'black-red', 'negro-rojo': 'black-red',
  red: 'red', rojo: 'red',
}

// Max stripes per belt
const MAX_STRIPES: Record<BeltKey, number> = {
  white: 4, blue: 4, purple: 4, brown: 4,
  black: 6, coral: 7, 'black-red': 8, red: 9,
}

function normalise(belt: string): BeltKey | null {
  return BELT_ALIASES[belt.toLowerCase().trim()] ?? null
}

export function getBeltImage(belt: string, stripes = 0): string {
  const key = normalise(belt)
  if (!key) return `${BASE}/white.svg`

  const max = MAX_STRIPES[key]
  const s = Math.min(Math.max(0, stripes), max)

  if (s === 0) {
    if (key === 'coral') return `${BASE}/coral-7stripe.svg`
    if (key === 'black-red') return `${BASE}/black-red-8stripe.svg`
    if (key === 'red') return `${BASE}/red-9stripe.svg`
    return `${BASE}/${key}.svg`
  }

  if (key === 'coral') return `${BASE}/coral-7stripe.svg`
  if (key === 'black-red') return `${BASE}/black-red-8stripe.svg`
  if (key === 'red') return `${BASE}/red-9stripe.svg`

  return `${BASE}/${key}-${s}stripe.svg`
}

export function getBeltLabel(belt: string, stripes = 0): string {
  const key = normalise(belt)
  if (!key) return belt
  const name = key.charAt(0).toUpperCase() + key.slice(1).replace('-', ' & ') + ' Belt'
  return stripes > 0 ? `${name} ${stripes} Stripe${stripes !== 1 ? 's' : ''}` : name
}
