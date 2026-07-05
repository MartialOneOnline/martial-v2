import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guardSuperadmin } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { APP_URL } from '@/lib/email/resend'

// POST /api/admin/schools/[id]/impersonate — generate a magic link to log in as the school's owner
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const { id } = await params
  const owner = await prisma.schoolMember.findFirst({
    where: { schoolId: id, role: 'OWNER', status: 'ACTIVE' },
    include: { user: { select: { email: true } } },
  })
  if (!owner?.user.email) {
    return NextResponse.json({ error: 'This school has no active owner to log in as' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: owner.user.email,
    options: { redirectTo: `${APP_URL}/dashboard` },
  })

  if (error || !data.properties?.action_link) {
    return NextResponse.json({ error: error?.message ?? 'Failed to generate login link' }, { status: 500 })
  }

  return NextResponse.json({ actionLink: data.properties.action_link })
}
