import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY!

// All current callers (avatars, class images, event banners) are images only —
// keep this in sync with the `accept` attribute on the upload <input> elements.
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

// POST /api/dashboard/upload?bucket=avatars
// Body: FormData with field "file"
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const bucket = searchParams.get('bucket') ?? 'avatars'

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json({ error: 'Unsupported file type — use JPEG, PNG or WebP' }, { status: 400 })
  if (file.size > MAX_SIZE_BYTES)
    return NextResponse.json({ error: 'File too large — max 5MB' }, { status: 400 })

  const ext  = file.name.split('.').pop() ?? 'jpg'
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
