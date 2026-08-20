/**
 * Tests for renderAuthenticityStatement() — allowlisted {{var}} substitution
 * only, never eval/arbitrary templating. See
 * lib/services/collectibles/authenticity.ts.
 */
import { describe, it, expect } from 'vitest'
import { renderAuthenticityStatement } from '@/lib/services/collectibles/authenticity'

const vars = {
  displayNumber: '07/50',
  athleteName: 'Marcus "Buchecha" Almeida',
  collectionYear: 2026,
  tierName: 'Champion Edition',
  collectionName: 'Martial Legacy Collection',
}

describe('renderAuthenticityStatement()', () => {
  it('substitutes all allowlisted placeholders', () => {
    const template = "Kimono #{{displayNumber}} signed by {{athleteName}} in {{collectionYear}}."
    expect(renderAuthenticityStatement(template, vars)).toBe(
      'Kimono #07/50 signed by Marcus "Buchecha" Almeida in 2026.',
    )
  })

  it('leaves an unknown placeholder untouched rather than throwing', () => {
    const result = renderAuthenticityStatement('Hello {{unknownVar}}', vars)
    expect(result).toBe('Hello {{unknownVar}}')
  })

  it('does not evaluate the template as code', () => {
    const malicious = '{{constructor}} {{__proto__}} 1+1={{displayNumber}}'
    const result = renderAuthenticityStatement(malicious, vars)
    expect(result).toContain('1+1=07/50')
    expect(result).not.toContain('function')
  })

  it('handles a template with no placeholders', () => {
    expect(renderAuthenticityStatement('Plain text', vars)).toBe('Plain text')
  })
})
