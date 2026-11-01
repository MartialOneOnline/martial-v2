export interface TemplateMeta {
  name?: string
  activity?: string | null
  description?: string | null
  isPublished?: boolean
}

function optionalText(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t.slice(0, max) : null
}

/** Name / activity / description / published from a request body — only the fields sent. */
export function parseTemplateMeta(body: Record<string, unknown>, { requireName }: { requireName: boolean }):
  { ok: true; value: TemplateMeta } | { ok: false; error: string } {
  const value: TemplateMeta = {}
  if (body.name !== undefined || requireName) {
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return { ok: false, error: 'Name is required' }
    if (name.length > 80) return { ok: false, error: 'Name is too long' }
    value.name = name
  }
  if (body.activity !== undefined) value.activity = optionalText(body.activity, 40)
  if (body.description !== undefined) value.description = optionalText(body.description, 500)
  if (body.isPublished !== undefined) {
    if (typeof body.isPublished !== 'boolean') return { ok: false, error: 'isPublished must be true or false' }
    value.isPublished = body.isPublished
  }
  return { ok: true, value }
}
