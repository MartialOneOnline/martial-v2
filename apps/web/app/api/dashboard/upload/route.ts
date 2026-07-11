import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess, DASHBOARD_ROLES } from '@/lib/auth/contexts'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY!

// Every legitimate caller today (avatars, class images, event banners) and
// the only buckets that actually exist in Supabase Storage — see the
// call sites in SettingsClient/ClassesClient/EventsClient/MembershipsClient.
// This write goes through the service-role key (bypasses per-bucket RLS), so
// `bucket` must never be forwarded from the client unchecked — reject
// anything not on this list instead of trusting the query string.
const ALLOWED_BUCKETS = ['avatars', 'class-images'] as const
type AllowedBucket = (typeof ALLOWED_BUCKETS)[number]

// Keep in sync with the `accept` attribute on the upload <input> elements —
// also used to derive the stored file extension, so the client's raw
// filename is never parsed into the storage path (see path construction
// below).
const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
}
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

// POST /api/dashboard/upload?bucket=avatars
// Body: FormData with field "file"
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })

  // Dashboard-only endpoint — only staff of the current school (any role
  // except STUDENT, same set that's allowed into /dashboard at all, see
  // hasDashboardAccess/DASHBOARD_ROLES in lib/auth/contexts.ts) may upload.
  // A STUDENT SchoolMember or a user with no membership in this school gets
  // a clean 403, instead of the previous getAuthUser()-only check that let
  // any authenticated user through regardless of school membership.
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!DASHBOARD_ROLES.includes(member.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { searchParams } = new URL(req.url)
  const bucket = searchParams.get('bucket') ?? 'avatars'
  if (!ALLOWED_BUCKETS.includes(bucket as AllowedBucket)) {
    return NextResponse.json({ error: 'Unsupported bucket' }, { status: 400 })
  }

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const ext = EXT_BY_TYPE[file.type]
  if (!ext)
    return NextResponse.json({ error: 'Unsupported file type — use JPEG, PNG or WebP' }, { status: 400 })
  if (file.size > MAX_SIZE_BYTES)
    return NextResponse.json({ error: 'File too large — max 5MB' }, { status: 400 })

  // Path is fully server-derived (userId + timestamp + a type-derived
  // extension) — the client's raw filename is never used, so there's no
  // path-traversal surface here regardless of what the browser reports as
  // File.name.
  const path = `${user.id}-${Date.now()}.${ext}`

  const arrayBuffer = await file.arrayBuffer()

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    headers: {
      apikey:          SUPABASE_KEY,
      Authorization:  `Bearer ${SUPABASE_KEY}`,
      'Content-Type':  file.type,
      'x-upsert':     'true',
    },
    body: arrayBuffer,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return NextResponse.json({ error: err.message ?? 'Upload failed' }, { status: 500 })
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
  return NextResponse.json({ url: publicUrl })
}
