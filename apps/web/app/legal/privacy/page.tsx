import Link from 'next/link'
import { LegalDocument, Section, List } from '../LegalDocument'

export const metadata = {
  title: 'Privacy Policy | Martial',
}

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument title="Privacy Policy" lastUpdated="1 January 2026">
      <p>
        This Privacy Policy describes how Martial App Ltd (&ldquo;Martial&rdquo;, &ldquo;MARTIAL APP&rdquo;, &ldquo;we&rdquo;,
        &ldquo;us&rdquo;, or &ldquo;our&rdquo;) collects, uses, and discloses personal information when you use:
      </p>
      <List>
        <li>
          our software-as-a-service platform for martial arts academies and practitioners, available at{' '}
          <a href="https://martialapp.com" className="text-[#0870E2]">martialapp.com</a>{' '}
          and through our mobile applications (&ldquo;the App&rdquo; or &ldquo;the Service&rdquo;); and
        </li>
        <li>
          our events division, Martial Camps, through which we organize and sell tickets to in-person seminars,
          camps and training experiences with martial arts athletes and instructors (
          <a href="https://martialcamps.com" className="text-[#0870E2]">martialcamps.com</a>).
        </li>
      </List>
      <p>
        Company details: Martial App Ltd, a private limited company registered in England and Wales, company
        number 12588961. Registered office: C/O Mcphersons Walpole Harding, Citibase Brighton, 95 Ditchling
        Road, Brighton, East Sussex, United Kingdom, BN1 4ST.
      </p>
      <p>
        If you have any questions about this Privacy Policy, contact us at{' '}
        <strong className="font-semibold">privacy@martialapp.com</strong>.
      </p>

      <Section heading="1. Who This Policy Applies To">
        <p>This Policy applies to:</p>
        <List>
          <li>
            <strong className="font-semibold">End Users</strong>{' '}
            — students, practitioners, and individuals who use the App to find academies, book classes, track
            progress, or purchase event tickets.
          </li>
          <li>
            <strong className="font-semibold">Subscribers</strong>{' '}
            — academies, gyms, instructors, and businesses that use our SaaS platform to manage their
            operations.
          </li>
          <li>
            <strong className="font-semibold">Event Attendees</strong>{' '}
            — individuals who purchase tickets to Martial Camps seminars and events.
          </li>
        </List>
      </Section>

      <Section heading="2. Categories of Personal Information We Collect">
        <p>Depending on how you interact with our Service, we may collect:</p>
        <List>
          <li><strong className="font-semibold">Contact details</strong>: name, email address, postal address, phone number.</li>
          <li><strong className="font-semibold">Account and profile details</strong>: username, password (encrypted), profile photo, date of birth, nationality.</li>
          <li><strong className="font-semibold">Business details (Subscribers)</strong>: academy/company name, address, tax identification number, and authorised contacts.</li>
          <li><strong className="font-semibold">Financial and transaction data</strong>: purchase history, ticket/subscription order details, billing information. Card and payment details are collected and processed directly by our payment processors (see Section 5); we do not store full card numbers.</li>
          <li><strong className="font-semibold">Attendance and training data</strong>: class check-ins, QR code scans, progress/promotion tracking.</li>
          <li><strong className="font-semibold">Event data</strong>: ticket purchases, seminar attendance, dietary or accessibility requirements you provide for an event.</li>
          <li><strong className="font-semibold">Technical data</strong>: IP address, device identifiers, browser type, operating system, and log data.</li>
          <li><strong className="font-semibold">Location data</strong>: approximate location derived from your IP address or device settings, used to show nearby academies or relevant events.</li>
          <li><strong className="font-semibold">Communications</strong>: messages you send to us or through the platform, support requests, and marketing preferences.</li>
        </List>
      </Section>

      <Section heading="3. How We Use Personal Information">
        <p>We use personal information to:</p>
        <List>
          <li>create and administer your account, process ticket purchases and subscription payments, and provide customer support;</li>
          <li>operate core Service features such as class scheduling, attendance tracking, QR check-in, billing, and academy/student communication;</li>
          <li>process and fulfil event registrations for Martial Camps seminars, including sending logistical information about the event;</li>
          <li>send administrative communications (e.g., booking confirmations, changes to these terms);</li>
          <li>send marketing communications about new features, academies, or upcoming seminars, where you have consented or as otherwise permitted by law (you can opt out at any time);</li>
          <li>maintain the security of our Service, detect and prevent fraud, and comply with legal obligations;</li>
          <li>analyse usage to improve the Service.</li>
        </List>
      </Section>

      <Section heading="4. Legal Bases for Processing (UK/EU GDPR)">
        <p>
          Where the UK GDPR or EU GDPR applies, we rely on the following legal bases: performance of a contract
          with you (e.g., processing a ticket or subscription purchase); your consent (e.g., marketing
          communications, non-essential cookies); our legitimate interests (e.g., improving the Service,
          preventing fraud); and compliance with a legal obligation (e.g., tax and accounting records).
        </p>
      </Section>

      <Section heading="5. Payment Processing">
        <p>
          Ticket and subscription payments are processed by third-party payment providers, which may include
          Stripe, GoCardless, Revolut, and card networks (Visa, Mastercard). When you make a payment, your
          payment details are collected and processed directly by these providers under their own privacy
          policies; we do not have access to or store your full card number.
        </p>
      </Section>

      <Section heading="6. How We Share Personal Information">
        <p>We may share personal information with:</p>
        <List>
          <li><strong className="font-semibold">Subscribers</strong> (academies), where you are an End User interacting with that academy through the Service;</li>
          <li><strong className="font-semibold">Service providers</strong>, including hosting providers, payment processors, email delivery services, analytics providers, and customer support tools, acting on our behalf;</li>
          <li><strong className="font-semibold">Professional advisers and authorities</strong>, where required to comply with a legal obligation or to protect our legal rights;</li>
          <li><strong className="font-semibold">A successor entity</strong>, in the event of a merger, acquisition, or sale of all or part of our business.</li>
        </List>
        <p>We do not sell personal information.</p>
      </Section>

      <Section heading="7. Data Retention">
        <p>
          We retain personal information for as long as necessary to provide the Service, comply with legal,
          tax, and accounting obligations, resolve disputes, and enforce our agreements. Event attendance
          records and financial records are typically retained for the period required under UK tax law.
        </p>
      </Section>

      <Section heading="8. Your Rights">
        <p>
          Subject to applicable law (including UK GDPR), you may have the right to: access a copy of your
          personal information; request correction of inaccurate information; request deletion of your
          information; object to or restrict certain processing; and request portability of your data. To
          exercise these rights, contact <strong className="font-semibold">privacy@martialapp.com</strong>. You
          also have the right to lodge a complaint with the UK Information Commissioner&rsquo;s Office (
          <a href="https://ico.org.uk" className="text-[#0870E2]">ico.org.uk</a>) or your local data protection
          authority.
        </p>
      </Section>

      <Section heading="9. Cookies">
        <p>
          Our website and App use cookies and similar technologies to operate core functionality, remember
          your preferences, and understand how the Service is used. You can manage cookie preferences through
          your browser or device settings.
        </p>
      </Section>

      <Section heading="10. Data Security">
        <p>
          We use reasonable technical and organisational measures designed to protect personal information. No
          method of transmission or storage is completely secure, and we cannot guarantee absolute security.
        </p>
      </Section>

      <Section heading="11. International Transfers">
        <p>
          Where personal information is transferred outside the UK or European Economic Area, we take steps to
          ensure an adequate level of protection, such as relying on the UK&rsquo;s International Data Transfer
          Agreement/Addendum or the EU Standard Contractual Clauses, as applicable.
        </p>
      </Section>

      <Section heading="12. Children">
        <p>
          The Service is not directed at children under the age of 16. We do not knowingly collect personal
          information from children under 16 without appropriate parental or guardian consent.
        </p>
      </Section>

      <Section heading="13. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. Material changes will be notified through the
          Service or by email where appropriate. The &ldquo;Last updated&rdquo; date at the top of this Policy
          indicates when it was last revised.
        </p>
      </Section>

      <Section heading="14. Contact Us">
        <p>
          Martial App Ltd
          <br />
          C/O Mcphersons Walpole Harding, Citibase Brighton, 95 Ditchling Road, Brighton, East Sussex, United
          Kingdom, BN1 4ST
          <br />
          Email: privacy@martialapp.com
        </p>
      </Section>

      <p className="text-sm text-[#6B7280]">
        See also our <Link href="/legal/terms" className="text-[#0870E2]">Terms of Service</Link>.
      </p>
    </LegalDocument>
  )
}
