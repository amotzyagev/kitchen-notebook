-- Create notebook_shares table for notebook-level sharing
CREATE TABLE notebook_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'hidden')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  declined_at timestamptz,
  UNIQUE(owner_id, shared_with_user_id),
  CHECK(owner_id != shared_with_user_id)
);

-- Indexes
CREATE INDEX idx_notebook_shares_recipient ON notebook_shares(shared_with_user_id, status);
CREATE INDEX idx_notebook_shares_owner ON notebook_shares(owner_id);

-- Row Level Security
ALTER TABLE notebook_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can create notebook shares"
  ON notebook_shares FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner can view own shares"
  ON notebook_shares FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Recipient can view shares with them"
  ON notebook_shares FOR SELECT
  USING (auth.uid() = shared_with_user_id);

CREATE POLICY "Recipient can update status"
  ON notebook_shares FOR UPDATE
  USING (auth.uid() = shared_with_user_id);

CREATE POLICY "Recipient can delete (remove)"
  ON notebook_shares FOR DELETE
  USING (auth.uid() = shared_with_user_id);

CREATE POLICY "Owner can delete (revoke)"
  ON notebook_shares FOR DELETE
  USING (auth.uid() = owner_id);

-- Update recipes SELECT policy to also include notebook-shared recipes
DROP POLICY "Users can view own and shared recipes" ON recipes;

CREATE POLICY "Users can view own and shared recipes"
  ON recipes FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM recipe_shares
      WHERE recipe_shares.recipe_id = recipes.id
        AND recipe_shares.shared_with_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM notebook_shares
      WHERE notebook_shares.owner_id = recipes.user_id
        AND notebook_shares.shared_with_user_id = auth.uid()
        AND notebook_shares.status = 'approved'
    )
  );
