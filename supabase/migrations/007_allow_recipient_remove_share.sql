-- Allow shared recipients to remove a recipe from their own view
-- by deleting their own share record (does not affect the original recipe)

DROP POLICY "Recipe owners can revoke shares" ON recipe_shares;

CREATE POLICY "Owners or recipients can revoke shares"
  ON recipe_shares FOR DELETE
  USING (auth.uid() = owner_id OR auth.uid() = shared_with_user_id);
