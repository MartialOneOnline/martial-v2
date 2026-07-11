import React from 'react'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import ChooseProfileClient from './ChooseProfileClient'

// Server component: owns exactly one responsibility — the auth guard (no
// session -> /login), same pattern as dashboard/layout.tsx and
// my/layout.tsx. The context list itself (0/1/>1 → what to render) is
// fetched client-side via GET /api/auth/contexts instead of calling
// listAvailableContexts() directly here — that endpoint already implements
// the loading/error/retry behaviour this screen needs (see
// ChooseProfileClient.tsx + logic.ts), so re-fetching the same data here
// too would just duplicate the query without saving the client component
// from needing its own loading state anyway (retry has to re-fetch from
// somewhere). The one thing this page supplies beyond the guard is the
// logged-in user's own display name/avatar — GET /api/auth/contexts
// describes *schools*, not "who is asking", so the student card's avatar
// has nowhere else to come from.
export default async function ChooseProfilePage() {
  const user = await getAuthUser()
  if (!user) redirect('/login?redirect=/choose-profile')

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { avatarUrl: true },
  })

  return <ChooseProfileClient userName={user.name} userAvatarUrl={dbUser?.avatarUrl ?? null} />
}
