# V1 Email Type Map

This is the clean organization of the existing Laravel V1 email templates by email intent.

## 1. Invitation / Registration

Use this pattern for emails whose goal is to onboard a user, connect them to a school, or invite them to claim something.

Files:

- `resources/views/emails/registration.blade.php`
- `resources/views/emails/schoolsignup.blade.php`
- `resources/views/emails/schoolsignup-es.blade.php`
- `resources/views/emails/schoolsignup-pt.blade.php`
- `resources/views/emails/schoolsignup-ar.blade.php`
- `resources/views/emails/schools/invite.blade.php`
- `resources/views/emails/schools/invite-es.blade.php`
- `resources/views/emails/schools/invite-pg.blade.php`
- `resources/views/emails/students/invite.blade.php`
- `resources/views/emails/students/oldinvite.blade.php`

Visual direction:

- Can use school context
- Can use profile preview
- Can use school image or banner if available
- Strong primary CTA

## 2. Security / Verification

Use this pattern for emails whose goal is to verify identity, confirm an action, or reset access.

Files:

- `resources/views/emails/regemailconfirm.blade.php`
- `resources/views/emails/resetpassword.blade.php`
- `resources/views/emails/resetpassword-es.blade.php`
- `resources/views/emails/resetpassword-pt.blade.php`
- `resources/views/emails/resetpassword-ar.blade.php`
- `resources/views/emails/schools/claimed.blade.php`

Visual direction:

- No banner
- No decorative school card unless strictly needed for claim context
- Short text
- One clear CTA
- Expiry note and fallback link

## 3. Payment / Receipt / Billing

Use this pattern for any email that confirms a payment, purchase, billing event, or plan state.

Files:

- `resources/views/emails/purchaseplan.blade.php`
- `resources/views/emails/purchaseclass.blade.php`
- `resources/views/emails/cash-payment.blade.php`
- `resources/views/emails/planstatus.blade.php`
- `resources/views/emails/planstatus-es.blade.php`
- `resources/views/emails/planstatus-pt.blade.php`
- `resources/views/emails/planstatus-ar.blade.php`

Visual direction:

- Receipt-style rows
- Clear totals
- Payment method/status
- Simple dividers
- Usually no banner

## 4. Simple Account Notice

Use this pattern for short operational messages, reminders, alerts, and account notices.

Files:

- `resources/views/emails/cancelclass.blade.php`
- `resources/views/emails/countdown.blade.php`
- `resources/views/emails/notify.blade.php`
- `resources/views/emails/contactus.blade.php`
- `resources/views/emails/admin-school-register.blade.php`

Visual direction:

- Compact layout
- No banner by default
- Direct copy
- Optional CTA

## 5. Waiver / Action Link

Use this pattern for document/action links that are not quite billing and not quite security, but still require a focused action.

Files:

- `resources/views/emails/user-waiver-link.blade.php`
- `resources/views/emails/olduser-waiver-link.blade.php`
- `resources/views/emails/wave-link.blade.php`

Visual direction:

- Usually close to Security / Verification
- Clear document/action CTA
- Little or no marketing copy

## 6. Utility / Base / Legacy

These are support or base files, not primary user-facing redesign targets.

Files:

- `resources/views/emails/default.blade.php`
- `resources/views/emails/emailtemplate.html`

Visual direction:

- Keep as utility/base files
- Use to support shared rendering only if still referenced

## Banner Rule

Use school image/banner only for:

- school claim invites
- school registration/profile presentation
- selected onboarding emails where the school itself is the main object

Do not use banner for:

- reset password
- email verification
- payment received
- plan status
- renew reminder
- expiration notice
- generic notify emails

## Recommended Implementation Order

1. Security / Verification
2. Invitation / Registration
3. Payment / Receipt / Billing
4. Simple Account Notice
5. Waiver / Action Link

This order is safer because it starts with the most critical trust-sensitive emails and then moves into the more varied transactional and notice templates.
