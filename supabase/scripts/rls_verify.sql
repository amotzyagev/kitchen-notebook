-- ===========================================================================
-- Run AFTER applying migration 014.
--
-- PART A is a structural check (does the DDL exist).
-- PART B is a live negative test: it impersonates a real user via the same
-- JWT-claim mechanism PostgREST uses, and asserts the escalation is refused.
-- That is the part that actually proves the fix, because the SQL editor
-- normally runs as a superuser role that bypasses RLS entirely.
--
-- You only ever type EMAIL ADDRESSES. The uuids are looked up for you.
-- Everything in PART B is wrapped in BEGIN/ROLLBACK — nothing persists.
--
-- IMPORTANT: run the four PART B blocks ONE AT A TIME. Each one is SUPPOSED
-- to raise an error, and an error aborts the whole batch — so running
-- them together would skip every test after the first failure.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- PART A — structural. Expect 5 policy rows, 2 trigger rows, 1 function row.
-- ---------------------------------------------------------------------------

-- All five policies must now carry a non-null with_check expression.
SELECT tablename, policyname, cmd,
       with_check IS NOT NULL AS has_with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname IN (
    'Requester can create family request',
    'Addressee can respond to request',
    'Owner can create notebook shares',
    'Recipient can update status',
    'Recipe owners can create shares'
  )
ORDER BY tablename, policyname;

-- Both immutability triggers must exist.
SELECT event_object_table AS tbl, trigger_name, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_name IN (
  'family_relationships_immutable_identity',
  'notebook_shares_immutable_identity'
)
ORDER BY tbl;

-- The ownership helper must exist and be SECURITY DEFINER.
SELECT proname, prosecdef AS security_definer
FROM pg_proc
WHERE proname = 'owns_recipe';


-- ===========================================================================
-- PART B — live negative tests.
--
-- Set the two emails ONCE here, then run each test block below. Use two
-- accounts you own. ATTACKER is the account doing the escalation; VICTIM is
-- the account whose data it is trying to reach.
--
-- STEP 0 — sanity check. This must return exactly TWO rows with non-null ids.
-- If it returns one row or none, fix the emails before going further.
-- ===========================================================================

SELECT email, id
FROM user_profiles
WHERE email IN (
  'ATTACKER@EXAMPLE.COM',
  'VICTIM@EXAMPLE.COM'
);


-- ---------------------------------------------------------------------------
-- How the impersonation works, since it is not obvious:
--
--   set_config(name, value, true) is exactly SET LOCAL, but as a function —
--   so unlike SET LOCAL it can take a subquery. That lets us resolve emails to
--   uuids and stash them in transaction-local settings.
--
--   All lookups MUST happen while still superuser. After SET LOCAL role
--   authenticated, the user_profiles SELECT policy limits you to your own row,
--   so a lookup of the other account would silently return NULL.
--
--   auth.uid() reads request.jwt.claims ->> 'sub', which is why setting that
--   setting is enough to be treated as that user by every policy.
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- TEST 1 — hole #1: creating a family tie that is already accepted,
-- skipping the victim's consent entirely.
-- EXPECTED: ERROR  new row violates row-level security policy
-- ---------------------------------------------------------------------------

BEGIN;

SELECT set_config('test.attacker',
  (SELECT id::text FROM user_profiles WHERE email = 'ATTACKER@EXAMPLE.COM'), true);
SELECT set_config('test.victim',
  (SELECT id::text FROM user_profiles WHERE email = 'VICTIM@EXAMPLE.COM'), true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.attacker'),
                    'role', 'authenticated')::text, true);

SET LOCAL role authenticated;

INSERT INTO family_relationships (requester_id, addressee_id, status)
VALUES (current_setting('test.attacker')::uuid,
        current_setting('test.victim')::uuid,
        'accepted');

ROLLBACK;


-- ---------------------------------------------------------------------------
-- TEST 2 — hole #4: sharing a recipe you do not own, to yourself.
-- Picks one of the VICTIM's own recipes automatically.
-- EXPECTED: ERROR  new row violates row-level security policy
--
-- If instead you get an error about "test.recipe" being unrecognised, or an
-- invalid uuid, the victim account has no recipes — add one, or pick another
-- victim. That is a setup problem, not a pass.
-- ---------------------------------------------------------------------------

BEGIN;

SELECT set_config('test.attacker',
  (SELECT id::text FROM user_profiles WHERE email = 'ATTACKER@EXAMPLE.COM'), true);
SELECT set_config('test.victim',
  (SELECT id::text FROM user_profiles WHERE email = 'VICTIM@EXAMPLE.COM'), true);
-- Resolve the recipe while still superuser, for the same reason as above.
SELECT set_config('test.recipe',
  (SELECT id::text FROM recipes
   WHERE user_id = current_setting('test.victim')::uuid LIMIT 1), true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.attacker'),
                    'role', 'authenticated')::text, true);

SET LOCAL role authenticated;

INSERT INTO recipe_shares (recipe_id, owner_id, shared_with_user_id)
VALUES (current_setting('test.recipe')::uuid,
        current_setting('test.attacker')::uuid,
        current_setting('test.attacker')::uuid);

ROLLBACK;


-- ---------------------------------------------------------------------------
-- TEST 3 — hole #2: rewriting an identity column on a row you legitimately
-- control. Builds its own fixture and rolls it back, so it needs no
-- pre-existing data.
--
-- Note the attacker really IS the addressee here, so the RLS policy lets this
-- UPDATE through — USING and WITH CHECK both pass. The trigger is the only
-- thing standing in the way, which is exactly what this test is for.
--
-- EXPECTED: ERROR  family_relationships: id, requester_id, addressee_id and
--                  created_at are immutable
-- ---------------------------------------------------------------------------

BEGIN;

SELECT set_config('test.attacker',
  (SELECT id::text FROM user_profiles WHERE email = 'ATTACKER@EXAMPLE.COM'), true);
SELECT set_config('test.victim',
  (SELECT id::text FROM user_profiles WHERE email = 'VICTIM@EXAMPLE.COM'), true);

-- Fixture: a legitimate pending request VICTIM -> ATTACKER. Inserted before
-- the role switch, so it goes in as superuser and is not subject to RLS.
INSERT INTO family_relationships (id, requester_id, addressee_id, status)
VALUES ('dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        current_setting('test.victim')::uuid,
        current_setting('test.attacker')::uuid,
        'pending');

SELECT set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.attacker'),
                    'role', 'authenticated')::text, true);

SET LOCAL role authenticated;

UPDATE family_relationships
SET created_at = now() - interval '1 year'
WHERE id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

ROLLBACK;


-- ---------------------------------------------------------------------------
-- TEST 4 — migration 015: a family member taking ownership of your recipe.
--
-- The fixture makes ATTACKER genuinely family with VICTIM, so the recipes
-- UPDATE policy legitimately permits the write — USING and WITH CHECK both
-- pass. As in test 3, the trigger is the only thing in the way.
--
-- EXPECTED: ERROR  recipes: id, user_id and created_at are immutable
--
-- Run this one only AFTER applying migration 015.
-- ---------------------------------------------------------------------------

BEGIN;

SELECT set_config('test.attacker',
  (SELECT id::text FROM user_profiles WHERE email = 'ATTACKER@EXAMPLE.COM'), true);
SELECT set_config('test.victim',
  (SELECT id::text FROM user_profiles WHERE email = 'VICTIM@EXAMPLE.COM'), true);
SELECT set_config('test.recipe',
  (SELECT id::text FROM recipes
   WHERE user_id = current_setting('test.victim')::uuid LIMIT 1), true);

-- Clear any existing tie between the two accounts so the fixture cannot hit
-- the UNIQUE(requester_id, addressee_id) constraint. Rolled back either way.
DELETE FROM family_relationships
WHERE (requester_id = current_setting('test.victim')::uuid
       AND addressee_id = current_setting('test.attacker')::uuid)
   OR (requester_id = current_setting('test.attacker')::uuid
       AND addressee_id = current_setting('test.victim')::uuid);

INSERT INTO family_relationships (requester_id, addressee_id, status)
VALUES (current_setting('test.victim')::uuid,
        current_setting('test.attacker')::uuid,
        'accepted');

SELECT set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.attacker'),
                    'role', 'authenticated')::text, true);

SET LOCAL role authenticated;

UPDATE recipes
SET user_id = current_setting('test.attacker')::uuid
WHERE id = current_setting('test.recipe')::uuid;

ROLLBACK;


-- ---------------------------------------------------------------------------
-- A PASS is an ERROR on every one of the four tests. If any INSERT or UPDATE
-- reports success, that hole is still open — stop and check pg_policies shows
-- exactly ONE policy per name (a stale duplicate would be OR'd in and would
-- re-open the hole).
--
-- If the TEST 3 fixture fails with a unique-violation, those two accounts
-- already have a family_relationships row. Pick a different pair, or delete
-- the existing row first.
-- ---------------------------------------------------------------------------
