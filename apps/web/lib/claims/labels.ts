// Admin-panel (English) labels shared by the queue, detail page and school page.
export { INVITATION_STATE_LABEL, REQUEST_STATUS_LABEL } from './status'
export type { InvitationState, RequestStatus } from './status'

export const REQUEST_STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border border-amber-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border border-blue-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  RESOLVED: 'bg-orange-50 text-orange-700 border border-orange-200',
  DISMISSED: 'bg-gray-100 text-gray-600 border border-gray-200',
}

export const INVITATION_STATE_BADGE: Record<string, string> = {
  accepted: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  sent: 'bg-blue-50 text-blue-700 border border-blue-200',
  opened: 'bg-blue-50 text-blue-700 border border-blue-200',
  prepared: 'bg-gray-100 text-gray-600 border border-gray-200',
  sending: 'bg-gray-100 text-gray-600 border border-gray-200',
  failed: 'bg-red-50 text-red-700 border border-red-200',
  uncertain: 'bg-amber-50 text-amber-700 border border-amber-200',
  expired: 'bg-orange-50 text-orange-700 border border-orange-200',
  revoked: 'bg-gray-100 text-gray-500 border border-gray-200',
  legacy: 'bg-gray-100 text-gray-500 border border-gray-200',
}

export const EVENT_LABEL: Record<string, string> = {
  SUBMITTED: 'Request submitted',
  LEGACY_LINK_OPENED: 'Old-format invitation link opened (no longer valid — send a new invitation)',
  ADMIN_NOTIFY_FAILED: 'Admin notification email failed (request was saved)',
  SCHOOL_LINKED: 'School linked',
  SCHOOL_CREATED: 'School created for this request',
  SCHOOL_UNLINKED: 'School unlinked',
  REJECTED: 'Rejected',
  REOPENED: 'Reopened',
  INVITATION_PREPARED: 'Invitation prepared',
  INVITATION_SENT: 'Invitation accepted by Resend',
  INVITATION_SEND_FAILED: 'Invitation rejected by Resend — not sent',
  INVITATION_SEND_UNCERTAIN: 'Invitation send outcome unknown',
  INVITATION_RESENT: 'New invitation link sent (previous link revoked)',
  INVITATION_REVOKED: 'Invitation revoked',
  INVITATION_OPENED: 'Invitee opened the link',
  VERIFY_LINK_SENT: 'Email confirmation link sent to the invitee',
  OWNER_CONFLICT: 'Blocked: the school already has an owner',
  IDENTITY_CONFLICT: 'Blocked: the email belongs to a different account',
  ACCESS_GRANTED: 'Owner access granted',
}
