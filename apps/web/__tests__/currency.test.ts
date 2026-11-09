import { describe, it, expect } from 'vitest'
import { currencyForCountry, currencyOptions, isSupportedCurrency, resolveTicketCurrency, CURRENCIES } from '../lib/currency'
import { fmtPrice, currencySymbol } from '../lib/format'

describe('currencyForCountry', () => {
  it('maps a school country to its currency', () => {
    expect(currencyForCountry('AU')).toBe('AUD')
    expect(currencyForCountry('GB')).toBe('GBP')
    expect(currencyForCountry('US')).toBe('USD')
    expect(currencyForCountry('ES')).toBe('EUR')
    expect(currencyForCountry('PT')).toBe('EUR')
    expect(currencyForCountry('AE')).toBe('AED')
    expect(currencyForCountry('BR')).toBe('BRL')
    expect(currencyForCountry('CH')).toBe('CHF')
  })

  it('is case/space tolerant', () => {
    expect(currencyForCountry(' au ')).toBe('AUD')
  })

  it('falls back to EUR for missing or unmapped countries', () => {
    expect(currencyForCountry(null)).toBe('EUR')
    expect(currencyForCountry('')).toBe('EUR')
    expect(currencyForCountry('JP')).toBe('EUR') // JPY is zero-decimal — not offered
  })

  it('only maps to currencies that are offered in the selector', () => {
    for (const c of ['AU', 'NZ', 'CA', 'GB', 'US', 'SE', 'NO', 'DK', 'PL', 'TR', 'AE', 'BR', 'MX', 'SG', 'HK', 'ZA', 'CH']) {
      expect(isSupportedCurrency(currencyForCountry(c))).toBe(true)
    }
  })
})

describe('currencyOptions', () => {
  it('keeps a legacy currency that is no longer listed', () => {
    expect(currencyOptions('JPY')[0]?.code).toBe('JPY')
    expect(currencyOptions('AUD')).toHaveLength(CURRENCIES.length)
  })
})

describe('fmtPrice', () => {
  it('keeps EUR/GBP/USD formats', () => {
    expect(fmtPrice(65, 'EUR')).toBe('65 €')
    expect(fmtPrice(65.5, 'EUR')).toBe('65,50 €')
    expect(fmtPrice(3015, 'EUR')).toBe('3.015 €')
    expect(fmtPrice(65, 'GBP')).toBe('£65')
    expect(fmtPrice(65.5, 'GBP')).toBe('£65.50')
    expect(fmtPrice(65, 'USD')).toBe('$65')
  })

  it('formats other currencies with their own symbol', () => {
    expect(fmtPrice(65, 'AUD')).toBe('A$65')
    expect(fmtPrice(1065.5, 'NZD')).toBe('NZ$1,065.50')
    expect(fmtPrice(65, 'BRL')).toBe('R$65')
  })

  it('does not crash on an invalid code', () => {
    expect(fmtPrice(65, 'XX')).toBe('65 XX')
  })
})

describe('currencySymbol', () => {
  it('returns the symbol', () => {
    expect(currencySymbol('EUR')).toBe('€')
    expect(currencySymbol('GBP')).toBe('£')
    expect(currencySymbol('AUD')).toBe('A$')
    expect(currencySymbol('CHF')).toBe('CHF')
  })
})

describe('resolveTicketCurrency (event edit)', () => {
  it('keeps an existing EUR ticket in EUR when the PUT sends no currency (AU school)', () => {
    expect(resolveTicketCurrency({ sent: undefined, existing: 'EUR', eventCurrency: 'EUR', schoolCurrency: 'AUD' })).toBe('EUR')
  })
  it('uses what the form sent', () => {
    expect(resolveTicketCurrency({ sent: 'AUD', existing: 'EUR', eventCurrency: 'EUR', schoolCurrency: 'AUD' })).toBe('AUD')
  })
  it('a new ticket follows the event before the country', () => {
    expect(resolveTicketCurrency({ sent: '', existing: null, eventCurrency: 'EUR', schoolCurrency: 'AUD' })).toBe('EUR')
  })
  it('a new ticket on an event without tickets uses the country', () => {
    expect(resolveTicketCurrency({ existing: null, eventCurrency: null, schoolCurrency: 'AUD' })).toBe('AUD')
  })
})
