import { getResend, FROM, APP_URL } from './resend'
import { detectLang } from './templates/inviteStudent'
import { buildWelcomeStudentEmail, getWelcomeStudentSubject } from './templates/welcomeStudent'
import { buildTrialConfirmedEmail, getTrialConfirmedSubject } from './templates/trialConfirmed'
import { buildMembershipReceiptEmail, getMembershipReceiptSubject } from './templates/membershipReceipt'
import { buildMembershipRequestEmail, getMembershipRequestSubject } from './templates/membershipRequest'
import {
  buildEventTicketConfirmationEmail, getEventTicketConfirmationSubject,
  buildEventTicketRefundEmail, getEventTicketRefundSubject,
} from './templates/eventTicketReceipt'

type SendResult = { success: true; emailId?: string } | { success: false; error: string }

async function send(to: string, subject: string, html: string): Promise<SendResult> {
  try {
    const { data, error } = await getResend().emails.send({ from: FROM, to, subject, html })
    if (error) {
      console.error('[sendEmails] Resend error:', error)
      return { success: false, error: error.message }
    }
    return { success: true, emailId: data?.id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[sendEmails] Unexpected error:', msg)
    return { success: false, error: msg }
  }
}

// ── 1. Welcome student ─────────────────────────────────────────────────────────
export async function sendWelcomeStudentEmail({
  to,
  studentName,
  schoolName,
  schoolCity,
  lang,
}: {
  to: string
  studentName?: string | null
  schoolName: string
  schoolCity?: string | null
  lang?: string | null
}): Promise<SendResult> {
  const l = detectLang(lang)
  const subject = getWelcomeStudentSubject(schoolName, l)
  const html = buildWelcomeStudentEmail({
    studentName,
    schoolName,
    schoolCity,
    dashboardUrl: `${APP_URL}/my`,
    lang,
  })
  return send(to, subject, html)
}

// ── 2. Trial confirmed ─────────────────────────────────────────────────────────
export async function sendTrialConfirmedEmail({
  to,
  studentName,
  schoolName,
  schoolCity,
  className,
  scheduledAt,
  location,
  lang,
}: {
  to: string
  studentName?: string | null
  schoolName: string
  schoolCity?: string | null
  className: string
  scheduledAt: Date
  location?: string | null
  lang?: string | null
}): Promise<SendResult> {
  const l = detectLang(lang)
  const subject = getTrialConfirmedSubject(schoolName, l)
  const html = buildTrialConfirmedEmail({
    studentName,
    schoolName,
    schoolCity,
    className,
    scheduledAt,
    location,
    bookingUrl: `${APP_URL}/my/classes`,
    lang,
  })
  return send(to, subject, html)
}

// ── 3. Membership request (admin notification) ────────────────────────────────
export async function sendMembershipRequestEmail({
  to,
  adminName,
  studentName,
  schoolName,
  schoolCity,
  planName,
  price,
  currency,
  requestedAt,
  lang,
}: {
  to: string
  adminName?: string | null
  studentName: string
  schoolName: string
  schoolCity?: string | null
  planName: string
  price: number
  currency: string
  requestedAt: Date
  lang?: string | null
}): Promise<SendResult> {
  const l = detectLang(lang)
  const subject = getMembershipRequestSubject(studentName, planName, l)
  const html = buildMembershipRequestEmail({
    adminName,
    studentName,
    schoolName,
    schoolCity,
    planName,
    price,
    currency,
    requestedAt,
    dashboardUrl: `${APP_URL}/dashboard/payments/subscriptions?status=PENDING`,
    lang,
  })
  return send(to, subject, html)
}

// ── 4. Membership receipt ──────────────────────────────────────────────────────
export async function sendMembershipReceiptEmail({
  to,
  studentName,
  schoolName,
  schoolCity,
  planName,
  amount,
  currency,
  paymentMethod,
  startDate,
  endDate,
  membershipId,
  lang,
}: {
  to: string
  studentName?: string | null
  schoolName: string
  schoolCity?: string | null
  planName: string
  amount: number
  currency: string
  paymentMethod: string
  startDate: Date
  endDate?: Date | null
  membershipId: string
  lang?: string | null
}): Promise<SendResult> {
  const l = detectLang(lang)
  const subject = getMembershipReceiptSubject(planName, l)
  const html = buildMembershipReceiptEmail({
    studentName,
    schoolName,
    schoolCity,
    planName,
    amount,
    currency,
    paymentMethod,
    startDate,
    endDate,
    membershipId,
    dashboardUrl: `${APP_URL}/my/membership`,
    lang,
  })
  return send(to, subject, html)
}

// ── 5. Event ticket confirmation ───────────────────────────────────────────────
export async function sendEventTicketConfirmationEmail({
  to,
  studentName,
  schoolName,
  schoolCity,
  eventTitle,
  ticketName,
  quantity,
  amount,
  currency,
  startAt,
  location,
  bookingId,
  lang,
}: {
  to: string
  studentName?: string | null
  schoolName: string
  schoolCity?: string | null
  eventTitle: string
  ticketName: string
  quantity: number
  amount: number
  currency: string
  startAt: Date
  location?: string | null
  bookingId: string
  lang?: string | null
}): Promise<SendResult> {
  const l = detectLang(lang)
  const subject = getEventTicketConfirmationSubject(eventTitle, l)
  const html = buildEventTicketConfirmationEmail({
    studentName,
    schoolName,
    schoolCity,
    eventTitle,
    ticketName,
    quantity,
    amount,
    currency,
    startAt,
    location,
    bookingId,
    dashboardUrl: `${APP_URL}/my/events`,
    lang,
  })
  return send(to, subject, html)
}

// ── 6. Event ticket sold out / refunded ────────────────────────────────────────
export async function sendEventTicketRefundedEmail({
  to,
  studentName,
  schoolName,
  schoolCity,
  eventTitle,
  ticketName,
  amount,
  currency,
  bookingId,
  lang,
}: {
  to: string
  studentName?: string | null
  schoolName: string
  schoolCity?: string | null
  eventTitle: string
  ticketName: string
  amount: number
  currency: string
  bookingId: string
  lang?: string | null
}): Promise<SendResult> {
  const l = detectLang(lang)
  const subject = getEventTicketRefundSubject(eventTitle, l)
  const html = buildEventTicketRefundEmail({
    studentName,
    schoolName,
    schoolCity,
    eventTitle,
    ticketName,
    amount,
    currency,
    bookingId,
    dashboardUrl: `${APP_URL}/my/events`,
    lang,
  })
  return send(to, subject, html)
}
