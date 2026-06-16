# Martial V1 Email Redesign

This folder contains Blade files for replacing the old Laravel V1 email designs with the new Martial email layout system.

## Laravel Destination

Copy these files into the V1 Laravel project like this:

```txt
resources/views/emails/layouts/martial.blade.php
resources/views/emails/partials/logo.blade.php
resources/views/emails/partials/divider.blade.php
resources/views/emails/partials/button.blade.php
resources/views/emails/partials/footer.blade.php
resources/views/emails/partials/detail-row.blade.php
```

The template files in `templates/` are starting points for replacing existing V1 emails.

## Patterns

### `templates/invitation-registration.blade.php`

Use for:

- invitation to register
- invite student/staff/school
- school signup
- claim profile invitation

### `templates/security-verification.blade.php`

Use for:

- email verification
- reset password
- claim verification
- login/security links

### `templates/payment-receipt.blade.php`

Use for:

- payment received
- purchase plan
- purchase class
- invoice/receipt
- successful payment status

### `templates/simple-notice.blade.php`

Use for:

- renew reminder
- membership expiration
- class cancellation
- generic notify
- contact/admin notices

## Notes

- These files use classic Blade `@extends` and `@include`.
- Includes assume the files live under `resources/views/emails`.
- The layout expects the Martial logo at `asset('images/martial-logo.png')`; change `$logoUrl` if V1 uses a different asset path.
- All styles are inline/table-based for email compatibility.
