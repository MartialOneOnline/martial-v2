import Link from 'next/link'
import { LegalDocument, Section, List } from '../LegalDocument'

export const metadata = {
  title: 'Cookie Policy | Martial',
}

export default function CookiesPolicyPage() {
  return (
    <LegalDocument title="Cookie Policy" lastUpdated="1 January 2026">
      <p>
        This Cookie Policy explains how Martial App Ltd (&ldquo;Martial&rdquo;, &ldquo;we&rdquo;,
        &ldquo;us&rdquo;, or &ldquo;our&rdquo;) uses cookies and similar technologies on{' '}
        <a href="https://martialapp.com" className="text-[#0870E2]">martialapp.com</a>, our mobile applications,
        and <a href="https://martialcamps.com" className="text-[#0870E2]">martialcamps.com</a>{' '}
        (together, &ldquo;the Service&rdquo;). It should be read together with our{' '}
        <Link href="/legal/privacy" className="text-[#0870E2]">Privacy Policy</Link>.
      </p>
      <p>
        Company details: Martial App Ltd, a private limited company registered in England and Wales, company
        number 12588961. Registered office: Flat 14 Starboard Court, Brighton Marina Village, Brighton, England,
        BN2 5UX, United Kingdom.
      </p>
      <p>
        If you have any questions about this Cookie Policy, contact us at{' '}
        <strong className="font-semibold">privacy@martialapp.com</strong>.
      </p>

      <Section heading="1. What Are Cookies">
        <p>
          Cookies are small text files placed on your device when you visit a website or use an app. They allow
          a service to recognise your device, remember information about your visit, and make the Service work
          more reliably and securely. We also use similar technologies such as local storage on our mobile
          applications, which we refer to collectively as &ldquo;cookies&rdquo; in this Policy.
        </p>
      </Section>

      <Section heading="2. Cookies We Use">
        <p>We use the following categories of cookies:</p>
        <List>
          <li>
            <strong className="font-semibold">Strictly necessary cookies</strong>{' '}
            — required for the Service to function, such as keeping you signed in, maintaining your session,
            remembering which school or role context you are using, and protecting against fraud. These cookies
            are set by our authentication provider, Supabase, and cannot be switched off without affecting core
            functionality.
          </li>
          <li>
            <strong className="font-semibold">Preference cookies</strong>{' '}
            — remember choices you make, such as your selected language, so we do not need to ask again on each
            visit.
          </li>
          <li>
            <strong className="font-semibold">Payment cookies</strong>{' '}
            — set by our payment providers (which may include Stripe, GoCardless, and Revolut) when you make or
            manage a payment, to process the transaction securely and prevent fraud. These are governed by the
            relevant provider&rsquo;s own cookie and privacy policies.
          </li>
        </List>
        <p>
          We do not currently use analytics or advertising cookies. If this changes, we will update this Policy
          and, where required by law, ask for your consent before they are set.
        </p>
      </Section>

      <Section heading="3. Third-Party Cookies">
        <p>
          Some cookies are placed by third parties we work with, such as our payment processors, when their
          services are embedded in or linked from the Service (for example, during checkout). We do not control
          these cookies; please refer to the relevant third party&rsquo;s own cookie policy for details.
        </p>
      </Section>

      <Section heading="4. Managing Cookies">
        <p>
          Because the cookies we use are strictly necessary, preference, or payment-related, disabling them may
          prevent you from signing in or completing a purchase. Most browsers let you view, delete, and block
          cookies through their settings, and you can manage or withdraw consent for any third-party payment
          cookies through your browser or the payment provider&rsquo;s own tools. On our mobile applications, you
          can clear locally stored data through your device settings.
        </p>
      </Section>

      <Section heading="5. Changes to This Policy">
        <p>
          We may update this Cookie Policy from time to time, including if we introduce new categories of
          cookies such as analytics. Material changes will be notified through the Service or by email where
          appropriate. The &ldquo;Last updated&rdquo; date at the top of this Policy indicates when it was last
          revised.
        </p>
      </Section>

      <Section heading="6. Contact Us">
        <p>
          Martial App Ltd
          <br />
          Flat 14 Starboard Court, Brighton Marina Village, Brighton, England, BN2 5UX, United Kingdom
          <br />
          Email: privacy@martialapp.com
        </p>
      </Section>

      <p className="text-sm text-[#6B7280]">
        See also our <Link href="/legal/privacy" className="text-[#0870E2]">Privacy Policy</Link> and{' '}
        <Link href="/legal/terms" className="text-[#0870E2]">Terms of Service</Link>.
      </p>
    </LegalDocument>
  )
}
