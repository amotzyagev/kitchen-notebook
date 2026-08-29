-- ===========================================================================
-- RUN THIS BEFORE APPLYING MIGRATION 016.
--
-- 016 makes account approval a database-level rule. Anyone it considers
-- unapproved loses access to their own recipes until an admin approves them.
-- That is the intended behaviour, but only if the approval data is actually
-- correct today — the gate has so far been enforced in middleware only, and
-- middleware did not cover every route, so it is possible for an account to
-- have been using the app while still marked approved = false.
--
-- All three queries below should come back EMPTY. Any rows mean applying 016
-- would lock those people out. Fix the data first, then apply.
-- ===========================================================================


-- (1) Auth users with no user_profiles row at all.
--
-- is_approved() returns false for these, so they would lose everything. The
-- middleware has a repair path that POSTs to /api/auth/on-signup, but it only
-- fires on a page visit and it creates the profile with approved = false.
--
-- EXPECTED: no rows.
SELECT u.id, u.email, u.created_at, 'no user_profiles row' AS problem
FROM auth.users u
LEFT JOIN user_profiles p ON p.id = u.id
WHERE p.id IS NULL;


-- (2) Unapproved accounts that own data.
--
-- These are the dangerous ones: someone who got in past the middleware gap,
-- created recipes, and is still marked unapproved. After 016 their recipes
-- become invisible to them.
--
-- EXPECTED: no rows.
SELECT p.id, p.email, p.approved,
       (SELECT count(*) FROM recipes r WHERE r.user_id = p.id) AS recipe_count,
       (SELECT count(*) FROM recipe_self_notes n WHERE n.user_id = p.id) AS note_count
FROM user_profiles p
WHERE p.approved = false
  AND (
    EXISTS (SELECT 1 FROM recipes r WHERE r.user_id = p.id)
    OR EXISTS (SELECT 1 FROM recipe_self_notes n WHERE n.user_id = p.id)
  );


-- (3) Unapproved accounts entangled in sharing or family relationships.
--
-- After 016 these rows still exist but the unapproved side can no longer see
-- or act on them, which can leave a share stuck pending forever.
--
-- EXPECTED: no rows.
SELECT p.id, p.email, 'has shares or family ties while unapproved' AS problem
FROM user_profiles p
WHERE p.approved = false
  AND (
    EXISTS (SELECT 1 FROM notebook_shares s
            WHERE s.owner_id = p.id OR s.shared_with_user_id = p.id)
    OR EXISTS (SELECT 1 FROM recipe_shares s
               WHERE s.owner_id = p.id OR s.shared_with_user_id = p.id)
    OR EXISTS (SELECT 1 FROM family_relationships f
               WHERE f.requester_id = p.id OR f.addressee_id = p.id)
  );


-- ---------------------------------------------------------------------------
-- Overview, for context. Not a pass/fail check.
-- ---------------------------------------------------------------------------
SELECT approved, count(*) AS accounts
FROM user_profiles
GROUP BY approved
ORDER BY approved;


-- ---------------------------------------------------------------------------
-- If query (1) returns rows and you are satisfied those accounts are
-- legitimate, backfill them as approved BEFORE applying 016:
--
--   INSERT INTO user_profiles (id, email, approved)
--   SELECT u.id, u.email, true
--   FROM auth.users u
--   LEFT JOIN user_profiles p ON p.id = u.id
--   WHERE p.id IS NULL;
--
-- If query (2) or (3) returns rows, approve those specific accounts, or accept
-- that they will be locked out until an admin approves them in /admin/users.
--
-- TO ROLL BACK 016 if something goes wrong:
--
--   DROP POLICY "Account must be approved" ON recipes;
--   DROP POLICY "Account must be approved" ON recipe_shares;
--   DROP POLICY "Account must be approved" ON notebook_shares;
--   DROP POLICY "Account must be approved" ON family_relationships;
--   DROP POLICY "Account must be approved" ON recipe_self_notes;
--   DROP POLICY "Account must be approved to write recipe images" ON storage.objects;
--   DROP POLICY "Account must be approved to replace recipe images" ON storage.objects;
-- ---------------------------------------------------------------------------
