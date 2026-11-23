// Domain errors of the ownership flow. `code` is stable (UI and tests switch
// on it); `status` is the HTTP status the route returns.
export type ClaimErrorCode =
  | 'NOT_FOUND'
  | 'INVALID_INPUT'
  | 'INVALID_TRANSITION'
  | 'SCHOOL_NOT_LINKED'
  | 'SCHOOL_NOT_CLAIMABLE'
  | 'OWNER_EXISTS'
  | 'ACTIVE_INVITATION_EXISTS'
  | 'INVITATION_CLOSED'
  | 'DELIVERY_BUSY'
  | 'NOTHING_TO_RETRY'
  | 'RETRY_WINDOW_PASSED'
  | 'LINK_EXPIRED'
  | 'POSSIBLE_DUPLICATES'
  | 'CHANGED_CONCURRENTLY'

const STATUS: Record<ClaimErrorCode, number> = {
  NOT_FOUND: 404,
  INVALID_INPUT: 400,
  INVALID_TRANSITION: 409,
  SCHOOL_NOT_LINKED: 409,
  SCHOOL_NOT_CLAIMABLE: 409,
  OWNER_EXISTS: 409,
  ACTIVE_INVITATION_EXISTS: 409,
  INVITATION_CLOSED: 409,
  DELIVERY_BUSY: 409,
  NOTHING_TO_RETRY: 409,
  RETRY_WINDOW_PASSED: 409,
  LINK_EXPIRED: 409,
  POSSIBLE_DUPLICATES: 409,
  CHANGED_CONCURRENTLY: 409,
}

export class ClaimError extends Error {
  readonly status: number
  constructor(readonly code: ClaimErrorCode, message: string, readonly details?: Record<string, unknown>) {
    super(message)
    this.name = 'ClaimError'
    this.status = STATUS[code]
  }
}
