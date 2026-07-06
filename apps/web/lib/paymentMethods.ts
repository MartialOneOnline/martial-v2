// Master catalog of payment method keys a school can offer its own members.
// Which of these are actually selectable by a school is gated by
// PlatformSettings.enabledPaymentMethods (see /api/admin/settings/payments) —
// this constant is just the full universe of valid keys.
export const PAYMENT_METHOD_KEYS = ['STRIPE', 'REVOLUT', 'CASH', 'BANK_TRANSFER', 'DIRECT_DEBIT', 'PAYPAL', 'OTHER'] as const

export type PaymentMethodKey = typeof PAYMENT_METHOD_KEYS[number]

// Shared payment-method options for the class / event / membership plan forms —
// these only offer the subset that makes sense for a one-off or recurring charge
// (no DIRECT_DEBIT/PAYPAL/OTHER), rendered as icon pills with identical styling
// across ClassesClient, EventsClient and MembershipsClient.
export const BOOKING_PAYMENT_OPTIONS = [
  { value: 'STRIPE',        label: 'Online (Stripe)',  icon: '💳' },
  { value: 'REVOLUT',       label: 'Online (Revolut)', icon: '💳' },
  { value: 'CASH',          label: 'Cash at door',     icon: '💵' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer',    icon: '🏦' },
] as const

export type BookingPaymentMethod = typeof BOOKING_PAYMENT_OPTIONS[number]['value']
