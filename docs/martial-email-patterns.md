# Martial Email Patterns

## Goal

Use one consistent Martial email language, but different layouts by email intent. The current V1/V2 emails mix plain legacy Laravel templates, profile-claim cards, renewal notices and payment emails. They should not all share the exact same hero/banner structure.

## Shared Foundation

- Background: `#F4F7FB`
- Surface: `#FFFFFF`
- Primary text: `#101828`
- Secondary text: `#667085`
- Muted/footer text: `#98A2B3`
- Divider: `#E5EAF0`
- Primary CTA: `#0870E2`
- Brand navy: `#0E3A7A`
- Radius: large outer card, softer internal elements
- Style: centered logo, clean card, strong title, restrained sections, no heavy shadows, no complex gradients

## Pattern 1: Registration / Invitation

Use when:

- invitation to register
- invitation to join school
- claim school profile
- email verification after claiming

Structure:

- Centered Martial logo
- Clear title
- Optional banner only if it adds context
- Entity name centered, e.g. school name
- Short body copy
- Details section if useful
- Primary CTA
- Fallback link only if necessary
- Help section
- Legal/footer

Notes:

- School-claim emails can use a banner or school profile preview.
- Student registration emails should usually avoid a big image and focus on school/instructor + account activation.

## Pattern 2: Simple Account Notice

Use when:

- renew reminder
- membership expired
- class cancelled
- admin notification
- generic notify email

Structure:

- Centered Martial logo
- Compact white card
- Greeting/title
- One or two paragraphs
- Optional small status pill
- Optional CTA
- Footer

Notes:

- No banner.
- No profile card.
- This should feel like the clean NZZL reminder/receipt examples: direct and easy to scan.

## Pattern 3: Payment / Receipt

Use when:

- payment received
- purchase plan
- purchase class
- invoice
- plan status

Structure:

- Centered Martial logo
- Title: `Payment received`, `Your receipt from Martial`
- Receipt ID/date metadata
- Divider
- Main item: plan/class/school
- Divider
- Price breakdown rows, right-aligned amounts
- Payment method row
- Secondary + primary CTA pair if needed
- Help section
- Footer

Notes:

- No large banner by default.
- This should follow the NZZL receipt pattern closely: simple rows, right-aligned values, lots of whitespace.

## Pattern 4: Security / Verification

Use when:

- reset password
- email verification
- login code
- claim verification

Structure:

- Centered Martial logo
- Title
- Short explanation
- Primary CTA
- Expiry note
- Plain fallback URL in smaller text
- Security ignore note
- Footer

Notes:

- No marketing copy.
- No banner.
- Strong clarity and trust.

## Mapping From Current Templates

| Existing email type | Pattern |
| --- | --- |
| `inviteSchool` / school claim | Registration / Invitation |
| `inviteStudent` / invite user | Registration / Invitation |
| `claimed` / verify claim email | Security / Verification |
| `registration` | Registration / Invitation or Security / Verification |
| `resetpassword-*` | Security / Verification |
| `purchaseplan` / `purchaseclass` | Payment / Receipt |
| `planstatus-*` | Payment / Receipt or Simple Account Notice |
| `renew` reminder | Simple Account Notice |
| `expiration` / membership expired | Simple Account Notice |
| `cancelclass` | Simple Account Notice |
| `notify` | Simple Account Notice |
| `contactus` | Simple Account Notice |

## Immediate Next Step

Do not keep polishing one email in isolation. Create reusable email primitives first:

- `renderEmailShell`
- `renderLogo`
- `renderDivider`
- `renderButton`
- `renderFooter`
- `renderHelpSection`
- `renderDetailsRows`
- `renderReceiptRows`

Then rebuild each template with the correct pattern.
