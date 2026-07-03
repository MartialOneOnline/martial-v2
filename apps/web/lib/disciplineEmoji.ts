const EMOJI_BY_SLUG: Record<string, string> = {
  'bjj': '🥋',
  'grappling': '🤼',
  'nogi': '🤼',
  'no-gi': '🤼',
  'mma': '🥊',
  'muay-thai': '🦵',
  'boxing': '🥊',
  'wrestling': '🤸',
  'judo': '🥋',
  'karate': '🥋',
  'kickboxing': '🦵',
  'taekwondo': '🦶',
  'sambo': '🤼',
  'capoeira': '🤸',
}

const DEFAULT_EMOJI = '🥋'

export function disciplineEmoji(slug: string): string {
  return EMOJI_BY_SLUG[slug] ?? DEFAULT_EMOJI
}
