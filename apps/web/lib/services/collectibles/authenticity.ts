// Allowlisted variables only — never eval, never arbitrary property access.
// Add new placeholders here (and nowhere else) if a template needs them.
export interface AuthenticityVars {
  displayNumber: string
  athleteName: string
  collectionYear: number | string
  tierName: string
  collectionName: string
}

const PLACEHOLDER = /\{\{\s*(\w+)\s*\}\}/g

// Explicit key list (not `key in vars`, which also matches inherited
// Object.prototype properties like "constructor"/"__proto__" and would leak
// "[native code]" text into a published authenticity statement) and
// Object.hasOwn as a second guard against prototype-chain lookups.
const ALLOWED_KEYS: (keyof AuthenticityVars)[] = ['displayNumber', 'athleteName', 'collectionYear', 'tierName', 'collectionName']

// Replaces {{var}} placeholders with values from an allowlisted set — unknown
// placeholders are left untouched (visible, obviously wrong, rather than
// silently swallowed) rather than evaluated or interpolated as code.
export function renderAuthenticityStatement(template: string, vars: AuthenticityVars): string {
  return template.replace(PLACEHOLDER, (match, key: string) => {
    if ((ALLOWED_KEYS as string[]).includes(key) && Object.hasOwn(vars, key)) {
      return String(vars[key as keyof AuthenticityVars])
    }
    return match
  })
}
