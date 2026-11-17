/**
 * lib/email/templates/campaign.ts — campaign emails are branded as the school:
 * sender display name, school logo, footer in the campaign language, and no
 * automatic (English) "Hi X," greeting duplicating the preset's own one.
 */
import { describe, it, expect } from 'vitest'
import {
  buildCampaignEmail, buildCampaignText, campaignFrom, renderCampaignTokens, usableEmailLogo,
} from '../lib/email/templates/campaign'
import { CAMPAIGN_PRESETS } from '../lib/email/campaignPresets'

describe('campaignFrom', () => {
  it('uses the school name as display name on the shared address', () => {
    expect(campaignFrom('Roger Gracie Málaga')).toBe('"Roger Gracie Málaga" <notifications@martialapp.com>')
  })
  it('quotes names with commas/dots and strips quotes and line breaks', () => {
    expect(campaignFrom('BJJ, Inc. "Pro"\r\nBcc: x@y.z')).toBe('"BJJ, Inc. ProBcc: x@y.z" <notifications@martialapp.com>')
  })
  it('falls back to Martial when the name is empty', () => {
    expect(campaignFrom('  ')).toBe('Martial <notifications@martialapp.com>')
  })
})

describe('usableEmailLogo', () => {
  it('accepts absolute https raster images', () => {
    expect(usableEmailLogo('https://cdn.example.com/logo.png')).toBe('https://cdn.example.com/logo.png')
  })
  it('rejects svg, http and relative urls', () => {
    expect(usableEmailLogo('https://cdn.example.com/logo.svg')).toBeNull()
    expect(usableEmailLogo('http://cdn.example.com/logo.png')).toBeNull()
    expect(usableEmailLogo('/logos/a.png')).toBeNull()
    expect(usableEmailLogo(null)).toBeNull()
  })
})

describe('buildCampaignEmail', () => {
  const tokens = { nombre: 'Pablo Cabo', escuela: 'Roger Gracie Málaga' }
  const message = renderCampaignTokens(CAMPAIGN_PRESETS.REMINDER.es.body, tokens)

  it('greets exactly once, with the preset greeting, and never in English', () => {
    const html = buildCampaignEmail({ schoolName: tokens.escuela, message, language: 'es' })
    expect(html).not.toMatch(/>\s*Hi\b/)
    expect(html.match(/Hola Pablo Cabo,/g)).toHaveLength(1)
  })

  it('shows the school logo instead of the MARTIAL badge when usable', () => {
    const html = buildCampaignEmail({ schoolName: tokens.escuela, schoolLogoUrl: 'https://x.co/l.png', message, language: 'es' })
    expect(html).toContain('src="https://x.co/l.png"')
    expect(html).not.toContain('>MARTIAL<')
  })

  it('falls back to the school name badge without a logo', () => {
    const html = buildCampaignEmail({ schoolName: tokens.escuela, schoolLogoUrl: 'https://x.co/l.svg', message, language: 'es' })
    expect(html).not.toContain('<img')
    expect(html).not.toContain('>MARTIAL<')
  })

  it('writes the footer in the campaign language, defaulting to English', () => {
    expect(buildCampaignEmail({ schoolName: 'RGM', message, language: 'es' })).toContain('Enviado por RGM a través de Martial.')
    expect(buildCampaignEmail({ schoolName: 'RGM', message, language: 'fr' })).toContain('Envoyé par RGM via Martial.')
    expect(buildCampaignEmail({ schoolName: 'RGM', message, language: 'xx' })).toContain('Sent by RGM via Martial.')
  })
})

describe('buildCampaignText', () => {
  it('starts with the message itself, no automatic greeting', () => {
    const text = buildCampaignText({ schoolName: 'RGM', message: 'Hola Pablo,\n\nTexto', language: 'es' })
    expect(text.startsWith('Hola Pablo,')).toBe(true)
    expect(text).toContain('Enviado por RGM a través de Martial.')
  })
})

describe('CUSTOM preset', () => {
  it('prefills only the greeting in each language', () => {
    expect(CAMPAIGN_PRESETS.CUSTOM.es.body).toBe('Hola {{nombre}},\n\n')
    expect(CAMPAIGN_PRESETS.CUSTOM.en.body).toBe('Hi {{nombre}},\n\n')
    expect(CAMPAIGN_PRESETS.CUSTOM.pt.body).toBe('Olá {{nombre}},\n\n')
    expect(CAMPAIGN_PRESETS.CUSTOM.fr.body).toBe('Bonjour {{nombre}},\n\n')
  })
})
