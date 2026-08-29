-- Enforce the account-approval gate in the database, not only in middleware.
--
-- Approval was checked in src/middleware.ts alone, and only for /recipes,
-- /settings and /api/recipes. But an unapproved account holds a perfectly
-- valid Supabase JWT, and the browser has the anon key — so it can query
-- PostgREST directly and skip middleware entirely. It could read and write its
-- own recipes, and more importantly reach OTHER users by sending family
-- requests and notebook shares, which is exactly what the gate exists to stop.
--
-- These are RESTRICTIVE policies. Postgres AND-s them with the existing
-- permissive policies rather than replacing them, so none of the sharing and
-- family logic built up across migrations 005-015 has to be restated here —
-- which is the point, since transcribing those expressions again would be the
-- likeliest way to introduce a new hole.
--
-- service_role and postgres have BYPASSRLS, so the admin client is unaffected:
-- /api/auth/on-signup can still create profiles and /api/admin/users can still
-- approve them.
--
-- user_profiles is deliberately NOT gated — a pending user must still be able
-- to read their own row to be told they are pending.
--
-- BEFORE APPLYING: run supabase/scripts/approval_preflight.sql. If any active
-- account has approved = false, or any auth.users row has no user_profiles row
-- at all, this migration will lock those people out of their own recipes.

CREATE OR REPLACE FUNCTION is_approved()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.approved
  );
$$;


CREATE POLICY "Account must be approved"
  ON recipes AS RESTRICTIVE FOR ALL
  USING (is_approved())
  WITH CHECK (is_approved());

CREATE POLICY "Account must be approved"
  ON recipe_shares AS RESTRICTIVE FOR ALL
  USING (is_approved())
  WITH CHECK (is_approved());

CREATE POLICY "Account must be approved"
  ON notebook_shares AS RESTRICTIVE FOR ALL
  USING (is_approved())
  WITH CHECK (is_approved());

CREATE POLICY "Account must be approved"
  ON family_relationships AS RESTRICTIVE FOR ALL
  USING (is_approved())
  WITH CHECK (is_approved());

CREATE POLICY "Account must be approved"
  ON recipe_self_notes AS RESTRICTIVE FOR ALL
  USING (is_approved())
  WITH CHECK (is_approved());

-- Storage: gate writes to the recipe-images bucket so an unapproved account
-- cannot burn storage quota. Scoped by bucket_id so that adding another bucket
-- later is not silently caught by this policy. Reads are left alone; they are
-- harmless and the SELECT policy there is the most intricate one in the schema.
CREATE POLICY "Account must be approved to write recipe images"
  ON storage.objects AS RESTRICTIVE FOR INSERT
  WITH CHECK (bucket_id <> 'recipe-images' OR is_approved());

CREATE POLICY "Account must be approved to replace recipe images"
  ON storage.objects AS RESTRICTIVE FOR UPDATE
  USING (bucket_id <> 'recipe-images' OR is_approved())
  WITH CHECK (bucket_id <> 'recipe-images' OR is_approved());
