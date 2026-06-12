// Martial App — Software Color System v1.0

export const uiColors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSoft: '#F9FAFB',
  surfaceMuted: '#F1F5F9',
  border: '#E5EAF0',
  borderStrong: '#CBD5E1',
  textPrimary: '#101828',
  textSecondary: '#667085',
  textMuted: '#98A2B3',
  textDisabled: '#CBD5E1',
  white: '#FFFFFF',
  ink: '#0B1220',
}

export const martialColors = {
  navy: '#0E3A7A',
  navyDark: '#071A33',
  blue: '#3C83C3',
  sky: '#6EC1EC',
  cyan: '#7DE7EC',
}

export const primaryColors = {
  primary: '#0870E2',
  primaryHover: '#0761C9',
  primaryPressed: '#0557B3',
  primarySoft: '#EFF6FF',
  primaryBorder: '#BFDBFE',
}

export const memberStatusColors = {
  ACTIVE: {
    label: 'Active',
    bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0', dot: '#22C55E',
    solid: '#22C55E', solidText: '#FFFFFF',
  },
  PENDING: {
    label: 'Pending',
    bg: '#FEF9C3', text: '#A16207', border: '#FDE68A', dot: '#EAB308',
    solid: '#FACC15', solidText: '#111827',
  },
  LEAD: {
    label: 'Lead',
    bg: '#FFEDD5', text: '#C2410C', border: '#FDBA74', dot: '#F97316',
    solid: '#F97316', solidText: '#FFFFFF',
  },
  INACTIVE: {
    label: 'Inactive',
    bg: '#FFE4E6', text: '#BE123C', border: '#FDA4AF', dot: '#E11D48',
    solid: '#E11D48', solidText: '#FFFFFF',
  },
  FROZEN: {
    label: 'Frozen',
    bg: '#DBEAFE', text: '#1D4ED8', border: '#BFDBFE', dot: '#3B82F6',
    solid: '#3B82F6', solidText: '#FFFFFF',
  },
  ARCHIVED: {
    label: 'Archived',
    bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB', dot: '#6B7280',
    solid: '#6B7280', solidText: '#FFFFFF',
  },
} as const

export const paymentStatusColors = {
  PAID: {
    label: 'Paid',
    bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0', dot: '#22C55E',
    solid: '#22C55E', solidText: '#FFFFFF',
  },
  PENDING: {
    label: 'Pending',
    bg: '#FEF9C3', text: '#A16207', border: '#FDE68A', dot: '#EAB308',
    solid: '#FACC15', solidText: '#111827',
  },
  PROCESSING: {
    label: 'Processing',
    bg: '#DBEAFE', text: '#1D4ED8', border: '#BFDBFE', dot: '#3B82F6',
    solid: '#3B82F6', solidText: '#FFFFFF',
  },
  REQUIRES_ACTION: {
    label: 'Action required',
    bg: '#FFEDD5', text: '#C2410C', border: '#FDBA74', dot: '#F97316',
    solid: '#F97316', solidText: '#FFFFFF',
  },
  FAILED: {
    label: 'Failed',
    bg: '#FFE4E6', text: '#BE123C', border: '#FDA4AF', dot: '#E11D48',
    solid: '#E11D48', solidText: '#FFFFFF',
  },
  REFUNDED: {
    label: 'Refunded',
    bg: '#F1F5F9', text: '#475569', border: '#CBD5E1', dot: '#64748B',
    solid: '#64748B', solidText: '#FFFFFF',
  },
  PARTIALLY_REFUNDED: {
    label: 'Partial refund',
    bg: '#E0F2FE', text: '#0369A1', border: '#BAE6FD', dot: '#0284C7',
    solid: '#0284C7', solidText: '#FFFFFF',
  },
  CANCELED: {
    label: 'Canceled',
    bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB', dot: '#6B7280',
    solid: '#6B7280', solidText: '#FFFFFF',
  },
  DISPUTED: {
    label: 'Disputed',
    bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5', dot: '#B91C1C',
    solid: '#991B1B', solidText: '#FFFFFF',
  },
} as const

export const productAccentColors = {
  ai: '#7C5CFF',
  aiSoft: '#F4F1FF',
  marketplace: '#F97316',
  marketplaceSoft: '#FFF7ED',
  booking: '#0870E2',
  bookingSoft: '#EFF6FF',
  verified: '#0870E2',
  verifiedSoft: '#EFF6FF',
  partner: '#7DE7EC',
  partnerSoft: '#F2FCFD',
}

export const gradients = {
  brandHero: 'linear-gradient(135deg, #071A33 0%, #0E3A7A 55%, #7DE7EC 100%)',
  appSplash: 'linear-gradient(135deg, #0E3A7A 0%, #3C83C3 60%, #6EC1EC 100%)',
  productBlue: 'linear-gradient(135deg, #0870E2 0%, #3C83C3 100%)',
  cyanGlow: 'linear-gradient(135deg, #6EC1EC 0%, #7DE7EC 100%)',
  premiumDark: 'linear-gradient(135deg, #071A33 0%, #0B1220 100%)',
  surfaceIce: 'linear-gradient(135deg, #FFFFFF 0%, #F2FBFF 100%)',
}

export type MemberStatus = keyof typeof memberStatusColors
export type PaymentStatus = keyof typeof paymentStatusColors
