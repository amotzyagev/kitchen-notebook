-- Create recipe_shares table for in-app sharing
CREATE TABLE recipe_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(recipe_id, shared_with_user_id)
);

-- Indexes
CREATE INDEX idx_recipe_shares_recipe_id ON recipe_shares(recipe_id);
CREATE INDEX idx_recipe_shares_shared_with ON recipe_shares(shared_with_user_id);

-- Row Level Security
ALTER TABLE recipe_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and recipients can view shares"
  ON recipe_shares FOR SELECT
  USING (auth.uid() = owner_id OR auth.uid() = shared_with_user_id);

CREATE POLICY "Recipe owners can create shares"
  ON recipe_shares FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Recipe owners can revoke shares"
  ON recipe_shares FOR DELETE
  USING (auth.uid() = owner_id);

-- Update recipes SELECT policy to include shared recipes
DROP POLICY "Users can view own recipes" ON recipes;

CREATE POLICY "Users can view own and shared recipes"
  ON recipes FOR SELECT
  USING (
    auth.uid() = user_id
    OR id IN (SELECT recipe_id FROM recipe_shares WHERE shared_with_user_id = auth.uid())
  );
