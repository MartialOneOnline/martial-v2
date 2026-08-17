import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/server'
import { sniffImage, MAX_IMAGE_BYTES } from '@/lib/validateImageUpload'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY!

// POST /api/my/upload — avatar upload for the student portal.
// Bucket is fixed to 'avatars' (unlike /api/dashboard/upload, students never
// need class-images) and only requires an authenticated session — no
// school/dashboard-role check, since this is uploading your own photo, not
// school content. Body: FormData with field "file".
//
// Previously /complete-profile and /my/profile talked to Supabase Storage
// directly from the browser (supabase.storage.from('avatars').upload(...)),
// trusting the client-supplied File.type/name entirely — no allowlist, no
// size cap, no verification the bytes were actually an image. This route
// sniffs the real file signature (see validateImageUpload.ts) so a renamed
// script or an oversized file never reaches storage no matter what the
// upload claims about itself.
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (file.size > MAX_IMAGE_BYTES)
    return NextResponse.json({ error: 'File too large — max 5MB' }, { status: 400 })

  const buffer = new Uint8Array(await file.arrayBuffer())
  const sniffed = sniffImage(buffer)
  if (!sniffed)
    return NextResponse.json({ error: 'Unsupported file type — use a JPEG, PNG or WebP image' }, { status: 400 })

  // Path is fully server-derived (userId + sniffed extension) — the
  // client's raw filename is never used, so there's no path-traversal
  // surface regardless of what the browser reports as File.name. Stable
  // per user (no timestamp) so the avatar URL doesn't change on re-upload.
  const path = `${user.id}.${sniffed.ext}`

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/avatars/${path}`, {
    method: 'POST',
    headers: {
      apikey:         SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type':  sniffed.mime,
      'x-upsert':     'true',
    },
    body: buffer,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return NextResponse.json({ error: err.message ?? 'Upload failed' }, { status: 500 })
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${path}`
  return NextResponse.json({ url: publicUrl })
}
