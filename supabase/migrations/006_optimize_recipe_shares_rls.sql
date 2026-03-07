-- Optimize shared recipes RLS: use EXISTS instead of IN subquery
-- and add composite index for the lookup

-- Drop the current select policy
DROP POLICY "Users can view own and shared recipes" ON recipes;

-- Create optimized policy using EXISTS instead of IN
CREATE POLICY "Users can view own and shared recipes"
  ON recipes FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM recipe_shares
      WHERE recipe_shares.recipe_id = recipes.id
        AND recipe_shares.shared_with_user_id = auth.uid()
    )
  );

-- Add composite index for the lookup
CREATE INDEX IF NOT EXISTS idx_recipe_shares_lookup
  ON recipe_shares(shared_with_user_id, recipe_id);
