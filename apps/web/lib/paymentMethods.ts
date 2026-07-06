// Master catalog of payment method keys a school can offer its own members.
// Which of these are actually selectable by a school is gated by
// PlatformSettings.enabledPaymentMethods (see /api/admin/settings/payments) —
// this constant is just the full universe of valid keys.
export const PAYMENT_METHOD_KEYS = ['STRIPE', 'REVOLUT', 'CASH', 'BANK_TRANSFER', 'DIRECT_DEBIT', 'PAYPAL', 'OTHER'] as const

export type PaymentMethodKey = typeof PAYMENT_METHOD_KEYS[number]
