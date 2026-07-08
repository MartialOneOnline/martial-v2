export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim()
    .replace(/\s+/g, '-').replace(/-+/g, '-')
    .substring(0, 80)
}

// Appends -2, -3, ... until `taken` no longer reports a collision.
export async function uniqueSlug(base: string, taken: (candidate: string) => Promise<boolean>): Promise<string> {
  const root = base || 'event'
  let candidate = root
  let i = 2
  while (await taken(candidate)) {
    candidate = `${root}-${i}`
    i++
  }
  return candidate
}
