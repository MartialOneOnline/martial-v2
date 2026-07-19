import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { supabaseAuthId: authUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      dateOfBirth: true,
      createdAt: true,
      deletedAt: true,
      bookings: {
        orderBy: { scheduledAt: 'desc' },
        select: {
          id: true, scheduledAt: true, status: true, attendedAt: true,
          paymentMethod: true, amountPaid: true, currency: true,
          class: { select: { id: true, name: true, school: { select: { id: true, name: true } } } },
        },
      },
      eventBookings: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, ticketName: true, quantity: true, status: true,
          amountPaid: true, currency: true, checkedIn: true, checkedInAt: true, createdAt: true,
          event: { select: { id: true, title: true } },
        },
      },
      campBookings: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, status: true, amountPaid: true, currency: true, createdAt: true,
          camp: { select: { id: true, name: true } },
        },
      },
      memberships: {
        orderBy: { startDate: 'desc' },
        select: {
          id: true, planName: true, status: true, price: true, currency: true,
          startDate: true, endDate: true, cancelledAt: true, classesUsed: true,
          school: { select: { id: true, name: true } },
        },
      },
      transactions: {
        orderBy: { date: 'desc' },
        select: {
          id: true, date: true, amount: true, currency: true, type: true,
          category: true, status: true, paymentMethod: true, description: true,
          school: { select: { id: true, name: true } },
        },
      },
      contentAccesses: {
        orderBy: { startDate: 'desc' },
        select: {
          id: true, startDate: true, endDate: true, isActive: true, revokedAt: true,
          platform: { select: { id: true, name: true } },
        },
      },
      reviews: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, rating: true, title: true, text: true, createdAt: true,
          reply: true, repliedAt: true,
          school: { select: { id: true, name: true } },
        },
      },
      schoolMembers: {
        select: {
          id: true, role: true, status: true, joinedAt: true,
          belt: true, beltDegree: true, beltDate: true,
          school: { select: { id: true, name: true } },
        },
      },
      gradings: {
        orderBy: { gradedAt: 'desc' },
        select: {
          id: true, fromBelt: true, toBelt: true, toDegree: true, gradedAt: true, notes: true,
          school: { select: { id: true, name: true } },
        },
      },
      userWaivers: {
        orderBy: { signedAt: 'desc' },
        select: {
          id: true, signedAt: true,
          waiver: { select: { id: true, title: true } },
        },
      },
      loginHistory: {
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: { id: true, createdAt: true, ipAddress: true, country: true, city: true, browser: true, os: true, device: true },
      },
    },
  })
  if (!user || user.deletedAt) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Deliberately excluded, even though they reference this user's id:
  // gradingsGiven/resolvedTransactions/impersonationsAsActor (this user acting
  // on someone ELSE's record — exporting them would leak a third party's data
  // into this user's file), leads/leadNotes/sentInvitations (school-internal
  // CRM data about them, not personal data they generated), targetedNotifications
  // (staff-dashboard notifications — this schema's Notification model isn't a
  // student-facing concept).
  const payload = {
    exportedAt: new Date().toISOString(),
    profile: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      dateOfBirth: user.dateOfBirth,
      createdAt: user.createdAt,
    },
    bookings: user.bookings,
    eventBookings: user.eventBookings,
    campBookings: user.campBookings,
    memberships: user.memberships,
    transactions: user.transactions,
    contentAccesses: user.contentAccesses,
    reviews: user.reviews,
    schoolMembers: user.schoolMembers,
    gradings: user.gradings,
    waivers: user.userWaivers,
    loginHistory: user.loginHistory,
  }

  return NextResponse.json(payload, {
    headers: { 'Content-Disposition': 'attachment; filename="my-data.json"' },
  })
}
