# Martial V1 Email Redesign Brief

## Objective

We are going to modernize the email design system in Laravel V1 without changing the product behavior.

The goal is to replace the visual design of the current Blade email templates with a cleaner, more consistent Martial email system, while keeping the existing email flows working as they do today.

## Important Constraint

We should not replace everything blindly.

Each email template is connected to Laravel code that may pass different variables, translations, links, statuses or conditional logic.

Because of that, the safest approach is:

- keep the existing Blade file names and locations
- replace the internal HTML/design of each file
- preserve the variables already used by the current controllers / mail code
- only adjust backend code when a redesigned template needs additional data that is not currently provided

## Email System Strategy

Instead of using one single visual layout for all emails, we will define 4 email patterns and map each existing V1 template to the correct pattern.

### 1. Registration / Invitation

Use for:

- school invites
- student invites
- registration emails
- school signup emails
- profile claim invitation emails

Structure:

- centered Martial logo
- clear title
- optional contextual banner
- short explanatory copy
- main CTA
- help/footer

### 2. Security / Verification

Use for:

- email verification
- reset password
- claim verification
- other security/action confirmation emails

Structure:

- centered Martial logo
- strong title
- short explanation
- single primary CTA
- expiry note
- fallback URL
- security note / footer

### 3. Payment / Receipt

Use for:

- payment received
- purchase plan
- purchase class
- receipt / invoice
- plan status emails

Structure:

- centered Martial logo
- receipt title + metadata
- simple dividers
- item/service details
- price breakdown rows
- payment rows
- CTA(s) if needed
- help/footer

### 4. Simple Account Notice

Use for:

- renewal reminder
- expiration notice
- class cancellation
- generic notifications
- contact/admin notices

Structure:

- centered Martial logo
- compact clean card
- direct message
- optional CTA
- simple footer

## Existing V1 Email Groups

### Schools

- `resources/views/emails/schools/claimed.blade.php`
- `resources/views/emails/schools/invite.blade.php`
- `resources/views/emails/schools/invite-es.blade.php`
- `resources/views/emails/schools/invite-pg.blade.php`

### Students

- `resources/views/emails/students/invite.blade.php`
- `resources/views/emails/students/oldinvite.blade.php`

### Root email templates

- `admin-school-register.blade.php`
- `cancelclass.blade.php`
- `cash-payment.blade.php`
- `contactus.blade.php`
- `countdown.blade.php`
- `default.blade.php`
- `notify.blade.php`
- `olduser-waiver-link.blade.php`
- `planstatus*.blade.php`
- `purchaseclass.blade.php`
- `purchaseplan.blade.php`
- `regemailconfirm.blade.php`
- `registration.blade.php`
- `resetpassword*.blade.php`
- `schoolsignup*.blade.php`
- `user-waiver-link.blade.php`
- `wave-link.blade.php`

## Proposed Safe Implementation Plan

### Phase 1

Create shared Blade building blocks:

- `emails/layouts/martial.blade.php`
- `emails/partials/logo.blade.php`
- `emails/partials/button.blade.php`
- `emails/partials/divider.blade.php`
- `emails/partials/detail-row.blade.php`
- `emails/partials/footer.blade.php`

### Phase 2

Replace one email from each family first:

- `regemailconfirm.blade.php` -> Security / Verification
- `schools/claimed.blade.php` -> Security / Verification
- `students/invite.blade.php` -> Registration / Invitation
- `purchaseplan.blade.php` -> Payment / Receipt

This lets us validate:

- the new layout in real rendering
- compatibility with existing variables
- whether backend changes are actually needed

### Phase 3

Replace the remaining emails family by family using the same layout system.

## Why This Is Safer

This approach minimizes risk because:

- file names stay the same
- Laravel `view()` references do not need to change
- existing email flows remain connected
- backend code is only updated when required
- design becomes consistent without forcing one layout onto every email type

## Attached Preview

There is also a preview HTML file that shows the 4 proposed layout patterns:

- Registration / Invitation
- Security / Verification
- Payment / Receipt
- Simple Account Notice

This file is intended as a visual reference before integrating the redesigned Blade templates into Laravel V1.
