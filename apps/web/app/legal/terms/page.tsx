import Link from 'next/link'
import { LegalDocument, Section, List } from '../LegalDocument'

export const metadata = {
  title: 'Terms and Conditions | Martial',
}

export default function TermsPage() {
  return (
    <LegalDocument title="Terms and Conditions" lastUpdated="1 January 2026">
      <p>Please read these Terms and Conditions (&ldquo;Terms&rdquo;) carefully before using our Service.</p>

      <Section heading="1. Interpretation and Definitions">
        <List>
          <li>
            <strong className="font-semibold">Company</strong>{' '}
            (&ldquo;the Company&rdquo;, &ldquo;We&rdquo;, &ldquo;Us&rdquo;, &ldquo;Our&rdquo;) refers to Martial
            App Ltd, a private limited company registered in England and Wales, company number 12588961, with
            registered office at C/O Mcphersons Walpole Harding, Citibase Brighton, 95 Ditchling Road, Brighton,
            East Sussex, United Kingdom, BN1 4ST.
          </li>
          <li>
            <strong className="font-semibold">Service</strong>{' '}
            refers to the Martial App software platform (martialapp.com and our mobile applications) and the
            Martial Camps events platform (martialcamps.com), together with any related websites, apps, and
            services.
          </li>
          <li>
            <strong className="font-semibold">Subscriber</strong>{' '}
            means an academy, gym, instructor, or business that subscribes to our SaaS platform to manage
            classes, members, and payments.
          </li>
          <li>
            <strong className="font-semibold">End User</strong>{' '}
            means an individual who uses the Service to find academies, book classes, track progress, or
            purchase event tickets.
          </li>
          <li>
            <strong className="font-semibold">Event</strong>{' '}
            means a seminar, camp, or training experience organized or listed by Martial Camps, including
            ticketed sessions led by guest athletes or instructors.
          </li>
          <li><strong className="font-semibold">Country</strong> refers to the United Kingdom.</li>
          <li><strong className="font-semibold">Device</strong> means any device used to access the Service.</li>
          <li><strong className="font-semibold">You</strong> means the individual or entity accessing or using the Service.</li>
        </List>
      </Section>

      <Section heading="2. Acknowledgment">
        <p>
          These Terms govern your use of the Service and form the agreement between you and the Company. By
          accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of
          these Terms, you may not access the Service. You represent that you are over the age of 18, or that
          you have the consent of a parent or legal guardian. Your use of the Service is also subject to our{' '}
          <Link href="/legal/privacy" className="text-[#0870E2]">Privacy Policy</Link>.
        </p>
      </Section>

      <Section heading="3. Description of the Service">
        <p>Martial App Ltd provides:</p>
        <p>
          (a) a <strong className="font-semibold">software management platform</strong>{' '}
          for martial arts academies and practitioners, offering class scheduling, membership billing,
          attendance tracking, communication tools, and related features; and
        </p>
        <p>
          (b) <strong className="font-semibold">Martial Camps</strong>, an events service through which we
          organize seminars and camps and sell tickets granting attendees access to in-person sessions led by
          professional athletes and instructors.
        </p>
        <p>
          The Company is a technology and events provider. We are not a payment institution, money remittance
          business, or provider of money transfer services; all card and bank payments are processed through
          regulated third-party payment providers as described in our Privacy Policy.
        </p>
      </Section>

      <Section heading="4. Accounts">
        <p>
          To use certain features of the Service, you must register for an account and provide accurate,
          complete information. You are responsible for maintaining the confidentiality of your account
          credentials and for all activity under your account.
        </p>
      </Section>

      <Section heading="5. Subscriptions and Billing (Subscribers)">
        <p>
          Subscribers may purchase a recurring subscription plan (monthly, quarterly, or annual) to access the
          SaaS platform. Subscription fees are billed in advance and are non-refundable except as required by
          law or as otherwise stated at the point of purchase. Subscribers are responsible for accurately
          billing their own members through the platform.
        </p>
      </Section>

      <Section heading="6. Event Tickets (Martial Camps)">
        <p>
          Tickets purchased for an Event grant the holder access to that specific Event on the date, time, and
          venue advertised. Ticket prices are shown at checkout in the applicable currency. Unless otherwise
          stated for a specific Event: tickets are non-transferable without our prior consent; refund and
          cancellation terms will be displayed on the Event page at the time of purchase; and the Company
          reserves the right to reschedule or cancel an Event due to circumstances beyond its reasonable control
          (e.g., instructor unavailability, venue issues, force majeure), in which case attendees will be
          offered a refund or transfer to an alternative date where reasonably possible.
        </p>
      </Section>

      <Section heading="7. Payments">
        <p>
          Payments for subscriptions and tickets are processed through third-party payment providers (which may
          include Stripe, GoCardless, Revolut, and card networks). By making a payment, you also agree to the
          applicable payment provider&rsquo;s terms. We are not responsible for delays or errors caused by
          third-party payment providers.
        </p>
      </Section>

      <Section heading="8. Acceptable Use">
        <p>
          You agree not to: use the Service for any unlawful purpose; upload or transmit harmful code; attempt
          to gain unauthorised access to the Service or other users&rsquo; accounts; or misrepresent your
          identity or affiliation with any academy or Event.
        </p>
      </Section>

      <Section heading="9. Intellectual Property">
        <p>
          The Service, including its content, features, and functionality, is owned by the Company or its
          licensors and is protected by copyright, trademark, and other intellectual property laws. You may not
          copy, modify, or distribute any part of the Service without our prior written consent.
        </p>
      </Section>

      <Section heading="10. Links to Other Websites">
        <p>
          The Service may contain links to third-party websites not owned or controlled by the Company. We have
          no control over, and assume no responsibility for, the content or practices of any third-party
          websites.
        </p>
      </Section>

      <Section heading="11. Termination">
        <p>
          We may suspend or terminate your access to the Service at any time, without prior notice, if you
          breach these Terms. Upon termination, your right to use the Service ceases immediately; any tickets
          already purchased for a completed or upcoming Event remain subject to Section 6.
        </p>
      </Section>

      <Section heading="12. Limitation of Liability">
        <p>
          To the maximum extent permitted by law, the Company&rsquo;s total liability to you for any claim
          arising from these Terms or the Service is limited to the amount you paid through the Service in the
          twelve (12) months preceding the claim. The Company shall not be liable for any indirect, incidental,
          or consequential damages. Nothing in these Terms limits liability for death, personal injury caused by
          negligence, or fraud, or any other liability that cannot be excluded under applicable law.
        </p>
      </Section>

      <Section heading="13. &ldquo;As Is&rdquo; Disclaimer">
        <p>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without warranties of any
          kind, whether express or implied, to the maximum extent permitted by applicable law.
        </p>
      </Section>

      <Section heading="14. Governing Law and Disputes">
        <p>
          These Terms are governed by the laws of England and Wales, without regard to conflict of law
          principles. If you are a consumer resident in the European Union or United Kingdom, you will also
          benefit from any mandatory consumer protection provisions of your country of residence. If you have a
          dispute, please contact us first at <strong className="font-semibold">support@martialapp.com</strong>{' '}
          to seek an informal resolution.
        </p>
      </Section>

      <Section heading="15. Changes to These Terms">
        <p>
          We may modify these Terms at any time. If a change is material, we will make reasonable efforts to
          provide at least 30 days&rsquo; notice before the new terms take effect. Continued use of the Service
          after changes take effect constitutes acceptance of the revised Terms.
        </p>
      </Section>

      <Section heading="16. Contact Us">
        <p>
          Martial App Ltd
          <br />
          C/O Mcphersons Walpole Harding, Citibase Brighton, 95 Ditchling Road, Brighton, East Sussex, United
          Kingdom, BN1 4ST
          <br />
          Email: support@martialapp.com
        </p>
      </Section>

      <p className="text-sm text-[#6B7280]">
        See also our <Link href="/legal/privacy" className="text-[#0870E2]">Privacy Policy</Link>.
      </p>
    </LegalDocument>
  )
}
