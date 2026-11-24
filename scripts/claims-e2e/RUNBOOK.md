# Claims E2E — isolated browser check (PR #74, `claude/claim-ownership`)

Kit in `scripts/claims-e2e/` (no secrets). Only `apps/web/.env.local` and `scripts/claims-e2e/.credentials.txt` hold secrets; both are gitignored.

Safety rails:
- `guard.mjs` evaluates every environment in a **new process** (`next-env-probe.cjs`) with Next.js's own loader (`@next/env`, which caches the environment of its first call, so it is never reused), and checks the effective values, every value written in each `.env` file (also when a shell variable hides it) and the shell's variables against production fingerprints (Supabase project, database, every secret value) read with the same dotenv semantics plus a raw reading; it refuses if those fingerprints cannot be read, refuses the main checkout and requires `NEXT_PUBLIC_APP_URL` on localhost. It runs in `setup.mjs` and in `dev.mjs`.
- `dev.mjs` starts the server with **exactly** the environment it validated (all values explicit; process variables beat `.env` files), and preloads `resend-allowlist.mjs`: any `POST /emails(/batch)` whose `to`/`cc`/`bcc` is not one of the two test inboxes, any body it cannot read or parse (stream, form data, invalid JSON, no recipients — strings, Buffers, typed arrays, Blobs and `Request` bodies are read), and any other non-GET Resend call is blocked locally (the app records it as not sent). It also refuses to start unless the test database's `PlatformSettings.superAdminEmail` is a test inbox.
- Automated checks with fictitious values only: `apps/web/__tests__/claimsE2eKit.test.ts`.
- Supabase Auth sends no email in this flow (links come from `generateLink` and go out through Resend).

## 0. What you create (once)

1. **Supabase test project**, separate from production (e.g. `martial-claims-test`, region eu-west-1).
   - Authentication → URL Configuration → Site URL: `http://localhost:3100`.
   - Nothing else is needed: the flow never uses Supabase's own emails or redirect links.
2. **Dedicated Resend API key** (Sending access, domain `martialapp.com`), named e.g. `claims-e2e`. Revoke it when done.
3. Two different inboxes you control (plus-addressing works): admin and owner. The owner one must **not** exist in the test project yet.

If the plan's project limit prevents creating the test project, stop here and solve that first. Never use production for this check.

## 1. Configure and prepare

From a git worktree of the branch (never the main checkout):

```bash
cp scripts/claims-e2e/env.template apps/web/.env.local   # fill every <…> yourself — never paste secrets into a chat
node scripts/claims-e2e/guard.mjs                        # must print OK
node scripts/claims-e2e/setup.mjs                        # guard + migrations + super admin + 2 schools
node scripts/claims-e2e/dev.mjs                          # guard + allowlist + dev server
```

The server log must show `[claims-e2e] recipient allowlist active`. Admin password: `scripts/claims-e2e/.credentials.txt`.

## 2. Happy path (request → review → invitation → confirm email → accept → school access)

| # | Action | Expected |
|---|--------|----------|
| 1 | Logged out, open `/claim`, request ownership of “Claims E2E Dojo” with the **owner** inbox | Confirmation screen; owner inbox gets the acknowledgement; admin inbox gets the notice |
| 2 | Log in as admin → `/admin` | “Ownership requests to review” = 1, link opens `/admin/schools/verify?view=pending` with that request |
| 3 | Open the request → link “Claims E2E Dojo” | Status In progress; dashboard counter moves to In progress |
| 4 | Send invitation (recipient = owner inbox) | Delivery “Sent (accepted by Resend)”; owner gets the invitation email |
| 5 | Private window (no session) → open the invitation link | School name, masked email, “Accept and continue” |
| 6 | Click it → open the confirmation email | Lands on `/claim/<token>?verify=…` with “Confirm and continue” — **not** `/login`; nothing accepted yet (admin still shows In progress) |
| 7 | Click confirm | Brief “Opening your dashboard…”, then that school’s dashboard (no “You're in” screen) |
| 8 | Open the confirmation email link again | “This invitation was already accepted.” + Sign in; no second grant |
| 9 | Admin view | Request Completed, invitation Accepted, school CLAIMED (was UNVERIFIED), owner listed |

## 3. Negative checks (same run)

| # | Action | Expected |
|---|--------|----------|
| N1 | Re-open the invitation link after accepting | “This invitation was already accepted.” + Sign in, no new access |
| N2 | Second request for “Claims E2E Verified Academy”, invite, then **Reject** the request before accepting; open the link | Link no longer valid; no owner on the school; it stays VERIFIED |
| N3 | Reopen the N2 request, send the invitation again, then **Resend new link**; open the first link | Old link invalid, new one shows the invitation (don’t accept it) |
| N4 | Open an invitation link while logged in as the admin | “You're signed in with a different account…” + Sign out; no access granted |
| N5 | Open `/onboarding` and `/claim/clxxxxxxxxxxxxxxxxxxxxxxxx` | `/onboarding`: retired-link explanation with Sign in / Request a new invitation; unknown old-style id: “This invitation link isn't valid.” + Request a new invitation |

Record for each row: pass/fail, screenshot of anything unexpected, the Resend message id from the admin view (no personal data in the PR).

## 4. Teardown

1. Stop the dev server; `rm apps/web/.env.local scripts/claims-e2e/.credentials.txt`.
2. Revoke the `claims-e2e` Resend key.
3. Pause or delete the Supabase test project (Free plan: an extra active project counts towards the limit).
