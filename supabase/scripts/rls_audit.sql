-- ===========================================================================
-- STEP 1 — confirm the remote DB matches the migration files.
-- Migration 014 uses strict DROP POLICY (no IF EXISTS) on purpose: if a policy
-- name has drifted, a silent no-op would leave the OLD permissive policy in
-- place alongside the new one. Policies are OR'd, so the fix would do nothing.
-- All five names must come back.
-- ===========================================================================
SELECT tablename, policyname, cmd
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


-- ===========================================================================
-- STEP 2 — look for rows that could only exist via the holes.
-- ===========================================================================

-- (a) Family relationships inserted already-'accepted' (hole #1).
-- A legitimate acceptance goes through an UPDATE, which bumps updated_at via
-- the family_relationships_updated_at trigger. created_at = updated_at on an
-- accepted row means it was never updated — it was born accepted.
SELECT 'family_born_accepted' AS finding, id, requester_id, addressee_id, created_at
FROM family_relationships
WHERE status = 'accepted'
  AND created_at = updated_at;

-- (b) Notebook shares inserted already-approved/hidden (hole #3), same logic.
SELECT 'notebook_born_approved' AS finding, id, owner_id, shared_with_user_id, status, created_at
FROM notebook_shares
WHERE status <> 'pending'
  AND created_at = updated_at;

-- (c) Recipe shares whose claimed owner does not own the recipe (hole #4).
-- This one is unambiguous: the app never creates such a row.
SELECT 'share_owner_mismatch' AS finding,
       rs.id, rs.recipe_id, rs.owner_id AS claimed_owner,
       r.user_id AS actual_owner, rs.shared_with_user_id, rs.created_at
FROM recipe_shares rs
JOIN recipes r ON r.id = rs.recipe_id
WHERE rs.owner_id <> r.user_id;

-- (d) Recipes whose owner is not the original creator is NOT detectable —
-- there is no provenance column. If (a)/(b)/(c) return rows, treat recipe
-- ownership as suspect too and check auth.users.created_at against the
-- accounts involved.

-- NOTE: hole #2 (rewriting requester_id/owner_id on an existing row) leaves
-- updated_at legitimately bumped and is NOT distinguishable after the fact.
-- If (a)-(c) are clean that is good evidence, not proof.
