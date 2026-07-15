-- ============================================================================
-- ARCHIVED — one-time production data-cleanup script. DO NOT RE-RUN.
-- ============================================================================
-- Status:      EXECUTED once in production (2026-07-10).
-- Result:      38 duplicate bookings cancelled (status -> CANCELLED, no rows
--              deleted); 0 duplicate active-booking groups remained after.
-- Verified:    re-checked against the live production DB on 2026-07-15 —
--              38/38 of the target rows are CANCELLED, and a full table scan
--              still finds 0 duplicate (PENDING/CONFIRMED) booking groups.
-- Related to:  migration `20260709090000_bookings_active_slot_unique_index`
--              (prisma/migrations/) — this script existed to clear the
--              duplicate rows that were blocking that unique index from
--              being added; the migration is already applied.
-- Root cause:  mechanical double-insert from the V1 CSV import batch run on
--              2026-06-22 07:44:xx (see investigation notes below) — not a
--              real user race condition, and not expected to recur now that
--              the unique index exists.
--
-- Moved here from the repo root (was untracked) during the post-series repo
-- cleanup on 2026-07-15 so it's auditable instead of living untracked at the
-- root. Content below is otherwise unchanged from when it was run.
-- ============================================================================

-- ============================================================================
-- Cleanup: 36 duplicate ACTIVE booking groups blocking migration
-- 20260709090000_bookings_active_slot_unique_index.
--
-- Investigation summary (read-only queries, 2026-07-10):
-- - Every duplicate row within a group is 100% field-identical to its
--   sibling(s) (paymentMethod, amountPaid, currency, stripePaymentId, notes,
--   attendedAt, membershipId all match) and shares the exact same createdAt
--   millisecond -- a mechanical double-insert from the V1 CSV import batch
--   run on 2026-06-22 07:44:xx, not a real user race condition.
-- - Zero rows have attendedAt set, a membershipId, or a linked Transaction
--   (checked via transactions."bookingId"). Nothing of consequence is
--   attached to any of the rows being cancelled.
-- - Rule: for each (userId, classId, scheduledAt) group, keep the row with
--   the lexicographically smallest id (deterministic tiebreak -- rows are
--   otherwise indistinguishable), CANCEL the rest. No rows are deleted.
--
-- This script defaults to ROLLBACK. Change the final ROLLBACK to COMMIT
-- only after explicit approval to apply.
-- ============================================================================

BEGIN;

-- Group 1/36: Pablo (cmpps7scw00001co0kufc2kvf) | Jiu Jitsu Avanzado (rgm-bjj-avanzado) | 2025-02-20T08:00:00.000Z
-- keep: cmqp14e4u0c6lgho0f4jut6f1 (status=CONFIRMED) | cancelling 1 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp14e4u0c6mgho0vykkbfxs'; -- was CONFIRMED, duplicate of cmqp14e4u0c6lgho0f4jut6f1

-- Group 2/36: Pablo (cmpps7scw00001co0kufc2kvf) | Jiu Jitsu Todos (rgm-bjj-todos) | 2024-10-10T06:00:00.000Z
-- keep: cmqp14crs0a0dgho01ohgjxlq (status=CONFIRMED) | cancelling 1 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp14crs0a0egho03oftynj1'; -- was CONFIRMED, duplicate of cmqp14crs0a0dgho01ohgjxlq

-- Group 3/36: Pablo (cmpps7scw00001co0kufc2kvf) | NOGI (rgm-nogi) | 2025-02-26T17:00:00.000Z
-- keep: cmqp14e4v0caygho0zvrfjbqh (status=CONFIRMED) | cancelling 1 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp14e4v0cazgho00olkf7fm'; -- was CONFIRMED, duplicate of cmqp14e4v0caygho0zvrfjbqh

-- Group 4/36: Robyn Tantoy (cmqaim2ih009605o0srz9rbxx) | Jiu Jitsu Todos (rgm-bjj-todos) | 2025-01-07T17:00:00.000Z
-- keep: cmqp14dhq0b9wgho0e0ykemxw (status=CONFIRMED) | cancelling 1 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp14dhq0bbngho057g86nm4'; -- was CONFIRMED, duplicate of cmqp14dhq0b9wgho0e0ykemxw

-- Group 5/36: Ignacio Aguilera (cmqaime3600bi05o0v78ha73a) | Jiu Jitsu Todos (rgm-bjj-todos) | 2024-04-06T07:00:00.000Z
-- keep: cmqp14ain06vugho0oac9g0ig (status=CONFIRMED) | cancelling 1 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp14ain06vwgho0ztdzbl21'; -- was CONFIRMED, duplicate of cmqp14ain06vugho0oac9g0ig

-- Group 6/36: Oscar Sanchez (cmqaimobf00dk05o02irmv8br) | NOGI (rgm-nogi) | 2025-12-04T18:00:00.000Z
-- keep: cmqp14gy70h41gho0hgunfx97 (status=CONFIRMED) | cancelling 1 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp14gy70h4dgho0igchsz5r'; -- was CONFIRMED, duplicate of cmqp14gy70h41gho0hgunfx97

-- Group 7/36: Jose Luis Montiel (cmqaiov1q00t805o027wsgl1q) | Jiu Jitsu Iniciación (rgm-bjj-iniciacion) | 2025-04-14T16:30:00.000Z
-- keep: cmqp14ele0d6kgho0588499lo (status=CONFIRMED) | cancelling 1 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp14ele0d6lgho03qusiog9'; -- was CONFIRMED, duplicate of cmqp14ele0d6kgho0588499lo

-- Group 8/36: Jose Luis Montiel (cmqaiov1q00t805o027wsgl1q) | Jiu Jitsu Todos (rgm-bjj-todos) | 2023-10-02T06:00:00.000Z
-- keep: cmqp148ny04hcgho0poon2lhg (status=CONFIRMED) | cancelling 2 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp148ny04hdgho0fmn10ydc'; -- was CONFIRMED, duplicate of cmqp148ny04hcgho0poon2lhg
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp148ny04hegho0yil6ti4q'; -- was CONFIRMED, duplicate of cmqp148ny04hcgho0poon2lhg

-- Group 9/36: Jose Luis Montiel (cmqaiov1q00t805o027wsgl1q) | NOGI (rgm-nogi) | 2023-09-23T08:00:00.000Z
-- keep: cmqp148f5044mgho0fomw6t2z (status=CONFIRMED) | cancelling 1 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp148f5044sgho0ap0ow8ub'; -- was CONFIRMED, duplicate of cmqp148f5044mgho0fomw6t2z

-- Group 10/36: Barry Russell (cmqaiovkx00tc05o0vq71cb0x) | Jiu Jitsu Todos (rgm-bjj-todos) | 2022-04-27T08:00:00.000Z
-- keep: cmqp144a6004rgho05mek15l5 (status=CONFIRMED) | cancelling 1 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp144a6004sgho0sdsa4618'; -- was CONFIRMED, duplicate of cmqp144a6004rgho05mek15l5

-- Group 11/36: Barry Russell (cmqaiovkx00tc05o0vq71cb0x) | Jiu Jitsu Todos (rgm-bjj-todos) | 2022-04-28T09:00:00.000Z
-- keep: cmqp144a6004xgho0084doego (status=CONFIRMED) | cancelling 1 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp144a6004ygho0lws8g1c3'; -- was CONFIRMED, duplicate of cmqp144a6004xgho0084doego

-- Group 12/36: Barry Russell (cmqaiovkx00tc05o0vq71cb0x) | Jiu Jitsu Todos (rgm-bjj-todos) | 2022-05-02T15:00:00.000Z
-- keep: cmqp144a60058gho0hbph41qn (status=CONFIRMED) | cancelling 1 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp144a60059gho02dwyohux'; -- was CONFIRMED, duplicate of cmqp144a60058gho0hbph41qn

-- Group 13/36: Barry Russell (cmqaiovkx00tc05o0vq71cb0x) | Jiu Jitsu Todos (rgm-bjj-todos) | 2022-05-10T09:00:00.000Z
-- keep: cmqp144a6005igho0vf7hflz8 (status=CONFIRMED) | cancelling 1 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp144a6005jgho0jq1kx1dh'; -- was CONFIRMED, duplicate of cmqp144a6005igho0vf7hflz8

-- Group 14/36: Barry Russell (cmqaiovkx00tc05o0vq71cb0x) | Jiu Jitsu Todos (rgm-bjj-todos) | 2022-05-11T08:00:00.000Z
-- keep: cmqp144a6005kgho0hj6izg71 (status=CONFIRMED) | cancelling 1 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp144a6005lgho0d4lee3s2'; -- was CONFIRMED, duplicate of cmqp144a6005kgho0hj6izg71

-- Group 15/36: Barry Russell (cmqaiovkx00tc05o0vq71cb0x) | Jiu Jitsu Todos (rgm-bjj-todos) | 2022-05-13T08:00:00.000Z
-- keep: cmqp144a6005tgho0bq7l1jv7 (status=CONFIRMED) | cancelling 1 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp144a6005ugho04vh5reru'; -- was CONFIRMED, duplicate of cmqp144a6005tgho0bq7l1jv7

-- Group 16/36: Barry Russell (cmqaiovkx00tc05o0vq71cb0x) | Open Mat (rgm-open-mat) | 2022-04-30T08:00:00.000Z
-- keep: cmqp144a60050gho0s7lg8nv0 (status=CONFIRMED) | cancelling 1 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp144a60051gho0a2e7qaax'; -- was CONFIRMED, duplicate of cmqp144a60050gho0s7lg8nv0

-- Group 17/36: Nicolas Torreblanca (cmqaiovur00te05o0hkzq58us) | Jiu Jitsu Iniciación (rgm-bjj-iniciacion) | 2022-06-14T15:00:00.000Z
-- keep: cmqp144no0096gho0x9e1sxgq (status=CONFIRMED) | cancelling 1 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp144no0097gho0kpnodusr'; -- was CONFIRMED, duplicate of cmqp144no0096gho0x9e1sxgq

-- Group 18/36: Nicolas Torreblanca (cmqaiovur00te05o0hkzq58us) | Jiu Jitsu Todos (rgm-bjj-todos) | 2022-05-11T15:00:00.000Z
-- keep: cmqp144a6005pgho0h36kogh8 (status=CONFIRMED) | cancelling 1 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp144a6005qgho0ynsjsizt'; -- was CONFIRMED, duplicate of cmqp144a6005pgho0h36kogh8

-- Group 19/36: Nicolas Torreblanca (cmqaiovur00te05o0hkzq58us) | Jiu Jitsu Todos (rgm-bjj-todos) | 2022-05-19T16:30:00.000Z
-- keep: cmqp144a7006ngho0n18ctfua (status=CONFIRMED) | cancelling 2 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp144a7006ogho0kp8tq7ns'; -- was CONFIRMED, duplicate of cmqp144a7006ngho0n18ctfua
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp144a7006pgho059oeqnwp'; -- was CONFIRMED, duplicate of cmqp144a7006ngho0n18ctfua

-- Group 20/36: Jorge de Lera (cmqaiow4a00tg05o0gp6qkeqp) | Jiu Jitsu Todos (rgm-bjj-todos) | 2022-05-16T15:00:00.000Z
-- keep: cmqp144a7006bgho0ahgcpqju (status=CONFIRMED) | cancelling 1 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp144a7006cgho0zjfc4tx0'; -- was CONFIRMED, duplicate of cmqp144a7006bgho0ahgcpqju

-- Group 21/36: Marivi Navarro Vilchez (cmqaioxrs00ts05o0ead86j9n) | Jiu Jitsu Avanzado (rgm-bjj-avanzado) | 2022-06-15T06:00:00.000Z
-- keep: cmqp144no0093gho0l7sxyksm (status=CONFIRMED) | cancelling 1 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp144no0094gho0r4puqy8y'; -- was CONFIRMED, duplicate of cmqp144no0093gho0l7sxyksm

-- Group 22/36: Marivi Navarro Vilchez (cmqaioxrs00ts05o0ead86j9n) | Jiu Jitsu Iniciación (rgm-bjj-iniciacion) | 2022-05-25T16:00:00.000Z
-- keep: cmqp144a70075gho06rpnh8tf (status=CONFIRMED) | cancelling 1 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp144a70076gho0s35yftr5'; -- was CONFIRMED, duplicate of cmqp144a70075gho06rpnh8tf

-- Group 23/36: Marivi Navarro Vilchez (cmqaioxrs00ts05o0ead86j9n) | Jiu Jitsu Iniciación (rgm-bjj-iniciacion) | 2022-05-31T15:00:00.000Z
-- keep: cmqp144a7007kgho0lzuryujo (status=CONFIRMED) | cancelling 1 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp144a7007lgho0syp59u6n'; -- was CONFIRMED, duplicate of cmqp144a7007kgho0lzuryujo

-- Group 24/36: Marivi Navarro Vilchez (cmqaioxrs00ts05o0ead86j9n) | Jiu Jitsu Iniciación (rgm-bjj-iniciacion) | 2022-06-07T15:00:00.000Z
-- keep: cmqp144a7008dgho0iunx6b3j (status=CONFIRMED) | cancelling 1 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp144a7008egho0mtnt9w5v'; -- was CONFIRMED, duplicate of cmqp144a7008dgho0iunx6b3j

-- Group 25/36: Marivi Navarro Vilchez (cmqaioxrs00ts05o0ead86j9n) | Jiu Jitsu Iniciación (rgm-bjj-iniciacion) | 2022-06-13T16:00:00.000Z
-- keep: cmqp144no008wgho0w9a5j04t (status=CONFIRMED) | cancelling 1 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp144no008xgho0wra4scwp'; -- was CONFIRMED, duplicate of cmqp144no008wgho0w9a5j04t

-- Group 26/36: Marivi Navarro Vilchez (cmqaioxrs00ts05o0ead86j9n) | Jiu Jitsu Iniciación (rgm-bjj-iniciacion) | 2022-06-14T15:00:00.000Z
-- keep: cmqp144no008ygho0qe6huyc2 (status=CONFIRMED) | cancelling 1 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp144no008zgho0w34qdiuk'; -- was CONFIRMED, duplicate of cmqp144no008ygho0qe6huyc2

-- Group 27/36: Pablo Calleja (cmqaioyu800u005o0e0ambca9) | Jiu Jitsu Todos (rgm-bjj-todos) | 2022-03-09T17:00:00.000Z
-- keep: cmqp144a5000qgho08b21u6hr (status=CONFIRMED) | cancelling 1 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp144a5000rgho0ak7w96a7'; -- was CONFIRMED, duplicate of cmqp144a5000qgho08b21u6hr

-- Group 28/36: Sergio Junior (cmqaioz3x00u205o08gdgitpa) | Open Mat (rgm-open-mat) | 2022-03-19T10:00:00.000Z
-- keep: cmqp144a6002dgho01iis12eo (status=CONFIRMED) | cancelling 1 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp144a6002egho0juv11lv4'; -- was CONFIRMED, duplicate of cmqp144a6002dgho01iis12eo

-- Group 29/36: Maksym Klymenko (cmqaiozdh00u405o0it0bky1d) | Jiu Jitsu Iniciación (rgm-bjj-iniciacion) | 2022-05-19T15:00:00.000Z
-- keep: cmqp144a7006lgho0hf4jit9s (status=CONFIRMED) | cancelling 1 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp144a7006mgho0uuwp324r'; -- was CONFIRMED, duplicate of cmqp144a7006lgho0hf4jit9s

-- Group 30/36: Maksym Klymenko (cmqaiozdh00u405o0it0bky1d) | Jiu Jitsu Iniciación (rgm-bjj-iniciacion) | 2022-06-01T16:00:00.000Z
-- keep: cmqp144a7007wgho0c8uf45kf (status=CONFIRMED) | cancelling 1 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp144a7007xgho00cvwrrtu'; -- was CONFIRMED, duplicate of cmqp144a7007wgho0c8uf45kf

-- Group 31/36: Maksym Klymenko (cmqaiozdh00u405o0it0bky1d) | Jiu Jitsu Iniciación (rgm-bjj-iniciacion) | 2022-06-09T15:00:00.000Z
-- keep: cmqp144a7008ngho0c401ousa (status=CONFIRMED) | cancelling 1 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp144a7008ogho0u3qmfl3l'; -- was CONFIRMED, duplicate of cmqp144a7008ngho0c401ousa

-- Group 32/36: Maksym Klymenko (cmqaiozdh00u405o0it0bky1d) | Jiu Jitsu Todos (rgm-bjj-todos) | 2022-05-16T15:00:00.000Z
-- keep: cmqp144a7006egho0tirlfmyg (status=CONFIRMED) | cancelling 1 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp144a7006fgho0u2zr6qs1'; -- was CONFIRMED, duplicate of cmqp144a7006egho0tirlfmyg

-- Group 33/36: Esteban Cruz (cmqaip1m200uk05o07zhsqx0n) | Jiu Jitsu Iniciación (rgm-bjj-iniciacion) | 2022-03-29T15:00:00.000Z
-- keep: cmqp144a60035gho0mncbbu3g (status=CONFIRMED) | cancelling 1 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp144a60036gho03n8kl2z2'; -- was CONFIRMED, duplicate of cmqp144a60035gho0mncbbu3g

-- Group 34/36: Esteban Cruz (cmqaip1m200uk05o07zhsqx0n) | Open Mat (rgm-open-mat) | 2022-06-04T08:00:00.000Z
-- keep: cmqp144no008ugho0nh0q7sp1 (status=CONFIRMED) | cancelling 1 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp144no008vgho0yykik2oe'; -- was CONFIRMED, duplicate of cmqp144no008ugho0nh0q7sp1

-- Group 35/36: David Martos (cmqaip5ke00vc05o0aihtlrs3) | Jiu Jitsu Iniciación (rgm-bjj-iniciacion) | 2022-09-29T15:00:00.000Z
-- keep: cmqp1454y00rygho0h6jqt6md (status=CONFIRMED) | cancelling 1 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp1454y00s2gho0ree3jhji'; -- was CONFIRMED, duplicate of cmqp1454y00rygho0h6jqt6md

-- Group 36/36: Javier Minguez (cmqaipurk010a05o0efxrru9e) | Jiu Jitsu Iniciación (rgm-bjj-iniciacion) | 2022-09-29T15:00:00.000Z
-- keep: cmqp1454y00rzgho02dadgj4d (status=CONFIRMED) | cancelling 1 duplicate(s):
UPDATE bookings SET status = 'CANCELLED', "updatedAt" = now() WHERE id = 'cmqp1454y00s3gho0hjxi4q5w'; -- was CONFIRMED, duplicate of cmqp1454y00rzgho02dadgj4d

-- ---------------------------------------------------------------------------
-- Verification 1: exactly the expected number of rows were touched by this script.
-- ---------------------------------------------------------------------------
DO $$
DECLARE touched int;
BEGIN
  SELECT COUNT(*) INTO touched FROM bookings
  WHERE status = 'CANCELLED' AND id IN (
    'cmqp14e4u0c6mgho0vykkbfxs', 'cmqp14crs0a0egho03oftynj1', 'cmqp14e4v0cazgho00olkf7fm', 'cmqp14dhq0bbngho057g86nm4', 'cmqp14ain06vwgho0ztdzbl21', 'cmqp14gy70h4dgho0igchsz5r', 'cmqp14ele0d6lgho03qusiog9', 'cmqp148ny04hdgho0fmn10ydc', 'cmqp148ny04hegho0yil6ti4q', 'cmqp148f5044sgho0ap0ow8ub', 'cmqp144a6004sgho0sdsa4618', 'cmqp144a6004ygho0lws8g1c3', 'cmqp144a60059gho02dwyohux', 'cmqp144a6005jgho0jq1kx1dh', 'cmqp144a6005lgho0d4lee3s2', 'cmqp144a6005ugho04vh5reru', 'cmqp144a60051gho0a2e7qaax', 'cmqp144no0097gho0kpnodusr', 'cmqp144a6005qgho0ynsjsizt', 'cmqp144a7006ogho0kp8tq7ns', 'cmqp144a7006pgho059oeqnwp', 'cmqp144a7006cgho0zjfc4tx0', 'cmqp144no0094gho0r4puqy8y', 'cmqp144a70076gho0s35yftr5', 'cmqp144a7007lgho0syp59u6n', 'cmqp144a7008egho0mtnt9w5v', 'cmqp144no008xgho0wra4scwp', 'cmqp144no008zgho0w34qdiuk', 'cmqp144a5000rgho0ak7w96a7', 'cmqp144a6002egho0juv11lv4', 'cmqp144a7006mgho0uuwp324r', 'cmqp144a7007xgho00cvwrrtu', 'cmqp144a7008ogho0u3qmfl3l', 'cmqp144a7006fgho0u2zr6qs1', 'cmqp144a60036gho03n8kl2z2', 'cmqp144no008vgho0yykik2oe', 'cmqp1454y00s2gho0ree3jhji', 'cmqp1454y00s3gho0hjxi4q5w'
  );
  IF touched <> 38 THEN
    RAISE EXCEPTION 'Expected % rows cancelled, found %', 38, touched;
  END IF;
  RAISE NOTICE 'OK: % rows cancelled as expected', touched;
END $$;

-- ---------------------------------------------------------------------------
-- Verification 2: zero duplicate ACTIVE groups remain anywhere in the table
-- (not just the ones in this script -- a full re-check).
-- ---------------------------------------------------------------------------
DO $$
DECLARE remaining_dupes int;
BEGIN
  SELECT COUNT(*) INTO remaining_dupes FROM (
    SELECT "userId", "classId", "scheduledAt" FROM bookings
    WHERE status IN ('PENDING', 'CONFIRMED')
    GROUP BY "userId", "classId", "scheduledAt"
    HAVING COUNT(*) > 1
  ) t;
  IF remaining_dupes > 0 THEN
    RAISE EXCEPTION 'Cleanup incomplete: % duplicate active-booking group(s) remain', remaining_dupes;
  END IF;
  RAISE NOTICE 'OK: 0 duplicate active-booking groups remain';
END $$;

-- Defaults to ROLLBACK -- swap to COMMIT only after explicit approval.
COMMIT;
-- ROLLBACK;
