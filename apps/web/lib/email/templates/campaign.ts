import { buildDirectMessageEmail } from './directMessage'

export type CampaignTokens = {
  nombre: string
  escuela: string
  cinturon?: string
  ciudad?: string
}

// Replaces {{token}} placeholders with recipient-specific values before the
// message is escaped and wrapped in the branded envelope — this must run
// first so the substituted values still get HTML-escaped downstream.
export function renderCampaignTokens(raw: string, tokens: CampaignTokens): string {
  return raw.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    const value = tokens[key.toLowerCase() as keyof CampaignTokens]
    return value ?? ''
  })
}

// A campaign email is author-written (like directMessage) but composed from
// a preset and personalized with per-recipient tokens — reuses the same
// branded envelope rather than duplicating it.
export function buildCampaignEmail({
  studentName, schoolName, message,
}: {
  studentName?: string | null
  schoolName: string
  message: string
}): string {
  return buildDirectMessageEmail({ studentName, schoolName, message })
}
