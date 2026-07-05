import { NextRequest } from 'next/server'

// IP extraction assumes a trusted reverse proxy in front of the app.
// Without one, these headers are client-controlled and only orientative.
export function getClientIp(req: NextRequest): string | null {
  const cf = req.headers.get('cf-connecting-ip')
  if (cf) return cf.trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real.trim()
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return null
}
