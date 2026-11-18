import { describe, it, expect } from 'vitest'
import { buildMembershipPaymentFailedEmail, getMembershipPaymentFailedSubject } from '@/lib/email/templates/membershipPaymentFailed'

const base = {
  studentName: 'Francis',
  schoolName: 'Roger Gracie Malaga',
  schoolCity: 'Málaga',
  planName: 'Jiu Jitsu Mensual',
  amountLabel: '65 €',
  nextAttemptAt: new Date(Date.UTC(2026, 10, 19, 13, 6)),
  updateUrl: 'https://martialapp.com/my/membership',
  invoiceUrl: 'https://invoice.stripe.com/i/abc',
}

describe('membership payment-failed email', () => {
  it.each([
    ['es', 'No hemos podido cobrar tu pago — Jiu Jitsu Mensual', 'Actualizar método de pago', '19 de noviembre de 2026'],
    ['en', "We couldn't collect your payment — Jiu Jitsu Mensual", 'Update payment method', '19 November 2026'],
    ['pt', 'Não conseguimos cobrar o seu pagamento — Jiu Jitsu Mensual', 'Atualizar método de pagamento', '19 de novembro de 2026'],
    ['fr', "Nous n'avons pas pu prélever votre paiement — Jiu Jitsu Mensual", 'Mettre à jour le moyen de paiement', '19 novembre 2026'],
  ] as const)('renders in %s', (lang, subject, cta, date) => {
    expect(getMembershipPaymentFailedSubject('Jiu Jitsu Mensual', lang)).toBe(subject)
    const html = buildMembershipPaymentFailedEmail({ ...base, lang })
    expect(html).toContain(cta)
    expect(html).toContain('65 €')
    expect(html).toContain(date)
    expect(html).toContain('href="https://martialapp.com/my/membership"')
    expect(html).toContain('href="https://invoice.stripe.com/i/abc"')
  })

  it('falls back to English and omits optional rows/links', () => {
    const html = buildMembershipPaymentFailedEmail({ ...base, lang: null, nextAttemptAt: null, invoiceUrl: null })
    expect(html).toContain('lang="en"')
    expect(html).not.toContain('Next attempt')
    expect(html).not.toContain('invoice.stripe.com')
  })

  it('escapes school-controlled text', () => {
    const html = buildMembershipPaymentFailedEmail({ ...base, planName: '<b>Plan</b>', studentName: 'A & B', lang: 'en' })
    expect(html).not.toContain('<b>Plan</b>')
    expect(html).toContain('&lt;b&gt;Plan&lt;/b&gt;')
    expect(html).toContain('Hi A &amp; B,')
  })
})
