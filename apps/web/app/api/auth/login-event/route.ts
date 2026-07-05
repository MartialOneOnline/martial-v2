import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import UAParser from 'ua-parser-js'
import { prisma } from '@/lib/db'
import { resolveDbUser } from '@/lib/auth/server'
import { getClientIp } from '@/lib/request-ip'

const DEDUPE_WINDOW_MS = 60_000
const GEO_TIMEOUT_MS = 2000

// Best-effort audit log for login events. Never blocks or breaks the login
// flow — the only real error response is 401 for a missing/invalid token;
// everything else degrades to a skipped 200.
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]
    if (!token) return NextResponse.json({ ok: false }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    )
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return NextResponse.json({ ok: false }, { status: 401 })

    const dbUser = await resolveDbUser(user)
    if (!dbUser) return NextResponse.json({ ok: false, skipped: true })

    const ip = getClientIp(req)
    const userAgent = req.headers.get('user-agent')

    const recent = await prisma.loginHistory.findFirst({
      where: {
        userId: dbUser.id,
        ipAddress: ip,
        userAgent,
        createdAt: { gte: new Date(Date.now() - DEDUPE_WINDOW_MS) },
      },
      select: { id: true },
    })
    if (recent) return NextResponse.json({ ok: true, deduped: true })

    let browser: string | null = null
    let os: string | null = null
    let device: string | null = null
    if (userAgent) {
      const parsed = new UAParser(userAgent).getResult()
      browser = parsed.browser.name ?? null
      os = parsed.os.name ?? null
      device = normalizeDevice(parsed.device.type)
    }

    let country: string | null = null
    let city: string | null = null
    if (ip && !isPrivateIp(ip)) {
      const geo = await geolocate(ip)
      country = geo.country
      city = geo.city
    }

    await prisma.loginHistory.create({
      data: {
        userId: dbUser.id,
        userEmail: dbUser.email,
        userName: dbUser.name,
        userRole: dbUser.role,
        ipAddress: ip,
        country,
        city,
        userAgent,
        browser,
        os,
        device,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    // Sanitized, minimal log — never the token, headers, or raw request.
    console.error('login-event skipped:', err instanceof Error ? err.message : 'unknown error')
    return NextResponse.json({ ok: false, skipped: true })
  }
}

function isPrivateIp(ip: string): boolean {
  const v = ip.trim()
  if (v === '127.0.0.1' || v === '::1' || v === 'localhost') return true
  if (/^10\./.test(v)) return true
  if (/^192\.168\./.test(v)) return true
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(v)) return true
  if (/^169\.254\./.test(v)) return true
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(v)) return true // 100.64.0.0/10 (CGNAT)
  if (/^fc[0-9a-f]{2}:/i.test(v)) return true // fc00::/7
  if (/^fe80:/i.test(v)) return true // fe80::/10
  return false
}

function normalizeDevice(type: string | undefined): string {
  if (type === 'mobile') return 'Mobile'
  if (type === 'tablet') return 'Tablet'
  if (type === undefined) return 'Desktop'
  return 'Unknown'
}

async function geolocate(ip: string): Promise<{ country: string | null; city: string | null }> {
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,city`,
      { signal: AbortSignal.timeout(GEO_TIMEOUT_MS) },
    )
    const data = await res.json()
    if (data.status === 'success') {
      return { country: data.country ?? null, city: data.city ?? null }
    }
  } catch {
    // best-effort — geolocation failure never blocks the login event
  }
  return { country: null, city: null }
}
