-- Close four RLS privilege-escalation holes in the sharing/family tables.
--
-- All of these are reachable by any authenticated user talking to PostgREST
-- directly with their own JWT. The API routes under src/app/api that validate
-- ownership and state transitions are NOT a security boundary: the browser
-- holds the anon key and can issue the same queries without them.
--
--   1. family_relationships INSERT never constrained `status`, so a request
--      could be created already accepted:
--        insert({requester_id: self, addressee_id: victim, status: 'accepted'})
--      are_family() then returns true, which per migration 012 grants SELECT
--      and UPDATE on every recipe the victim owns, plus their storage folder.
--
--   2. family_relationships / notebook_shares UPDATE policies omitted
--      WITH CHECK. Postgres then reuses the USING expression as the check,
--      which pins only the acting user's own column and leaves the
--      counterparty column free. The addressee of any request could rewrite
--      requester_id to an arbitrary victim uuid and set status='accepted' —
--      same escalation as (1), reached from a legitimate inbound request.
--
--   3. notebook_shares INSERT likewise never constrained `status`, letting an
--      owner force their notebook onto someone without that person accepting.
--
--   4. recipe_shares INSERT checked only owner_id = auth.uid(), never that the
--      recipe named by recipe_id actually belongs to that owner. Any user could
--      share an arbitrary recipe uuid with themselves and then read it.
--
-- Column immutability cannot be expressed in an RLS policy — WITH CHECK sees
-- only the new row, never OLD — so (2) is enforced with BEFORE UPDATE triggers.


-- ---------------------------------------------------------------------------
-- 1 + 2. family_relationships
-- ---------------------------------------------------------------------------

-- A relationship may only be created in the 'pending' state. Acceptance is the
-- addressee's decision and can only happen via UPDATE, which only they can do.
DROP POLICY "Requester can create family request" ON family_relationships;

CREATE POLICY "Requester can create family request"
  ON family_relationships FOR INSERT
  WITH CHECK (
    auth.uid() = requester_id
    AND status = 'pending'
    AND declined_at IS NULL
  );

-- Pin the identity columns across updates. The addressee may change only
-- status, declined_at and updated_at.
CREATE OR REPLACE FUNCTION forbid_family_relationship_identity_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id           IS DISTINCT FROM OLD.id
  OR NEW.requester_id IS DISTINCT FROM OLD.requester_id
  OR NEW.addressee_id IS DISTINCT FROM OLD.addressee_id
  OR NEW.created_at   IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION
      'family_relationships: id, requester_id, addressee_id and created_at are immutable'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER family_relationships_immutable_identity
  BEFORE UPDATE ON family_relationships
  FOR EACH ROW EXECUTE FUNCTION forbid_family_relationship_identity_change();

-- Restate the UPDATE policy with an explicit WITH CHECK rather than relying on
-- the implicit reuse of USING. The trigger above is what actually pins the
-- counterparty column; this makes the intent legible at the policy level.
DROP POLICY "Addressee can respond to request" ON family_relationships;

CREATE POLICY "Addressee can respond to request"
  ON family_relationships FOR UPDATE
  USING (auth.uid() = addressee_id)
  WITH CHECK (auth.uid() = addressee_id);


-- ---------------------------------------------------------------------------
-- 3 + 2. notebook_shares
-- ---------------------------------------------------------------------------

DROP POLICY "Owner can create notebook shares" ON notebook_shares;

CREATE POLICY "Owner can create notebook shares"
  ON notebook_shares FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id
    AND status = 'pending'
    AND declined_at IS NULL
  );

CREATE OR REPLACE FUNCTION forbid_notebook_share_identity_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id                  IS DISTINCT FROM OLD.id
  OR NEW.owner_id            IS DISTINCT FROM OLD.owner_id
  OR NEW.shared_with_user_id IS DISTINCT FROM OLD.shared_with_user_id
  OR NEW.created_at          IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION
      'notebook_shares: id, owner_id, shared_with_user_id and created_at are immutable'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notebook_shares_immutable_identity
  BEFORE UPDATE ON notebook_shares
  FOR EACH ROW EXECUTE FUNCTION forbid_notebook_share_identity_change();

DROP POLICY "Recipient can update status" ON notebook_shares;

CREATE POLICY "Recipient can update status"
  ON notebook_shares FOR UPDATE
  USING (auth.uid() = shared_with_user_id)
  WITH CHECK (auth.uid() = shared_with_user_id);


-- ---------------------------------------------------------------------------
-- 4. recipe_shares
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER so the check does not recurse back through the recipes
-- SELECT policy (which itself consults recipe_shares).
CREATE OR REPLACE FUNCTION owns_recipe(recipe uuid, owner uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe
      AND recipes.user_id = owner
  );
$$;

DROP POLICY "Recipe owners can create shares" ON recipe_shares;

CREATE POLICY "Recipe owners can create shares"
  ON recipe_shares FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id
    AND owns_recipe(recipe_id, auth.uid())
  );
