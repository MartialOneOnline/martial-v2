import { NextRequest, NextResponse } from 'next/server'
import { guardSuperadmin } from '@/lib/auth/server'
import { sniffImage, MAX_IMAGE_BYTES } from '@/lib/validateImageUpload'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY!

// POST /api/admin/schools/[id]/upload — logo/cover upload for the admin Edit
// modal. Separate from /api/dashboard/upload because that one resolves the
// target school from the caller's own session (getCurrentSchoolId), which
// doesn't apply here: a superadmin editing an arbitrary school has no
// "current school" of their own.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const { id } = await params

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (file.size > MAX_IMAGE_BYTES)
    return NextResponse.json({ error: 'File too large — max 5MB' }, { status: 400 })

  const arrayBuffer = await file.arrayBuffer()
  const sniffed = sniffImage(new Uint8Array(arrayBuffer))
  if (!sniffed)
    return NextResponse.json({ error: 'Unsupported file type — use JPEG, PNG or WebP' }, { status: 400 })

  const path = `school-${id}-${Date.now()}.${sniffed.ext}`

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/avatars/${path}`, {
    method: 'POST',
    headers: {
      apikey:         SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type':  sniffed.mime,
      'x-upsert':     'true',
    },
    body: arrayBuffer,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return NextResponse.json({ error: err.message ?? 'Upload failed' }, { status: 500 })
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${path}`
  return NextResponse.json({ url: publicUrl })
}
