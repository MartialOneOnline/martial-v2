import { prisma } from '@/lib/db'
import type { NotificationType } from '@/lib/prisma-client/client'

interface NotificationInput {
  schoolId: string
  type: NotificationType
  title: string
  body: string
  href?: string
  recipientUserId?: string
}

// Fire-and-forget: never awaited in API routes so it never blocks the response
export function createNotification(input: NotificationInput): void {
  prisma.notification.create({ data: input }).catch(() => {})
}

// ── Pre-built factories ───────────────────────────────────────────────────────

export function notifyMembershipRequest(schoolId: string, studentName: string, planName: string) {
  createNotification({
    schoolId,
    type: 'MEMBERSHIP_REQUEST',
    title: 'Nueva solicitud de membresía',
    body: `${studentName} ha solicitado el plan ${planName}`,
    href: '/dashboard/payments/subscriptions?status=PENDING',
  })
}

export function notifyPaymentReceived(schoolId: string, memberName: string, amount: string, planName: string) {
  createNotification({
    schoolId,
    type: 'PAYMENT_RECEIVED',
    title: 'Pago recibido',
    body: `${memberName} ha pagado ${amount} por ${planName}`,
    href: '/dashboard/payments/transactions',
  })
}

export function notifyNewMember(schoolId: string, memberName: string) {
  createNotification({
    schoolId,
    type: 'NEW_MEMBER',
    title: 'Nuevo alumno registrado',
    body: `${memberName} ha aceptado la invitación y se ha unido a tu academia`,
    href: '/dashboard/users',
  })
}

export function notifyNewLead(schoolId: string, leadName: string) {
  createNotification({
    schoolId,
    type: 'NEW_LEAD',
    title: 'Nuevo lead registrado',
    body: `${leadName} se ha registrado para una clase de prueba`,
    href: '/dashboard/school/leads',
  })
}
