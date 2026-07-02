---
name: project-whatsapp
description: "WhatsApp Business API integration plan — each school connects their own number (Opción 2)"
metadata:
  type: project
---

## Decision: Opción 2 — Each school connects their own WhatsApp number

Each school creates their own Meta Business account and connects their Phone Number ID + Access Token in Martial Settings → Integrations. Messages go out from the school's own number.

**Why:** More professional (messages from school's number), aligns with Stripe Connect pattern already in schema.

## Architecture

### Schema changes needed
```prisma
// Add to School model
whatsappPhoneNumberId  String?
whatsappAccessToken    String?   // encrypt in prod
```

### Settings > Integrations tab (new)
- Phone Number ID field + Access Token field (masked)
- "Test connection" button → sends test message to owner
- Status badge: Connected ✅ / Not configured

### API
- `PATCH /api/dashboard/school` already exists — just add new fields
- `/api/dashboard/messages` — add WhatsApp branch when `channel === 'WhatsApp'`

### School onboarding steps
1. Create Meta Business Manager account
2. Create Business-type app in Meta Developer
3. Add WhatsApp product to the app
4. Register their phone number in Meta
5. Get Phone Number ID + Permanent Access Token
6. Paste both in Martial → Settings → Integrations

## Critical limitation: Template Messages

**Outbound messages (school → student without prior contact) REQUIRE Meta-approved templates.**
- Free-form only works within 24h session window (student must message first)
- For broadcast: MANDATORY templates

## Implementation plan: Camino A (recommended MVP)

Build 3-4 standard templates pre-approved by Meta:

| Template | Trigger |
|---|---|
| Membership expiry | 7 days before expiry |
| Membership activated | Admin activates a membership |
| Trial reminder | Day before trial class |
| Class cancelled | Admin cancels a class |

School connects credentials once → automatic notifications fire via WhatsApp.
Manual broadcast comes later (Camino B — requires session messages or more templates).

## Camino B (phase 2)
- Webhook receives incoming student messages
- School can reply within 24h window
- Mini-CRM inbox inside Martial
- Manual broadcast possible with approved templates

## How to apply
When user wants to implement WhatsApp: start with Schema changes + Settings Integrations tab + Camino A templates. SendModal WhatsApp channel activates automatically when `school.whatsappPhoneNumberId` is set.
