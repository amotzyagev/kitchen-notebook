-- Create family_relationships table for bidirectional family access
CREATE TABLE family_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined')),
  declined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id),
  CHECK(requester_id != addressee_id)
);

-- Indexes
CREATE INDEX idx_family_relationships_requester ON family_relationships(requester_id, status);
CREATE INDEX idx_family_relationships_addressee ON family_relationships(addressee_id, status);

-- Reuse existing update_updated_at() trigger function
CREATE TRIGGER family_relationships_updated_at
  BEFORE UPDATE ON family_relationships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security
ALTER TABLE family_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Requester can create family request"
  ON family_relationships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Requester can view own requests"
  ON family_relationships FOR SELECT
  USING (auth.uid() = requester_id);

CREATE POLICY "Addressee can view received requests"
  ON family_relationships FOR SELECT
  USING (auth.uid() = addressee_id);

CREATE POLICY "Addressee can respond to request"
  ON family_relationships FOR UPDATE
  USING (auth.uid() = addressee_id);

CREATE POLICY "Either party can remove family relationship"
  ON family_relationships FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Helper function: check if two users have an accepted family relationship (bidirectional)
-- SECURITY DEFINER so it can bypass RLS when called from other table policies
CREATE OR REPLACE FUNCTION are_family(user_a uuid, user_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM family_relationships
    WHERE status = 'accepted'
      AND (
        (requester_id = user_a AND addressee_id = user_b)
        OR (requester_id = user_b AND addressee_id = user_a)
      )
  );
$$;

-- Update recipes SELECT policy to include family members (last set in migration 008)
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
      WHERE notebook_shares.shared_with_user_id = auth.uid()
        AND notebook_shares.status = 'approved'
        AND (
          notebook_shares.owner_id = recipes.user_id
          OR are_family(notebook_shares.owner_id, recipes.user_id)
        )
    )
    OR are_family(recipes.user_id, auth.uid())
  );

-- Update recipes UPDATE policy to allow family members to edit (was set in migration 001)
DROP POLICY "Users can update own recipes" ON recipes;

CREATE POLICY "Users can update own or family recipes"
  ON recipes FOR UPDATE
  USING (
    auth.uid() = user_id
    OR are_family(recipes.user_id, auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    OR are_family(recipes.user_id, auth.uid())
  );

-- Update storage SELECT policy to include family members (last set in migration 009)
DROP POLICY "Users can view own and shared images" ON storage.objects;

CREATE POLICY "Users can view own and shared images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'recipe-images'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM notebook_shares
        WHERE notebook_shares.shared_with_user_id = auth.uid()
          AND notebook_shares.status = 'approved'
          AND (
            notebook_shares.owner_id::text = (storage.foldername(name))[1]
            OR are_family(notebook_shares.owner_id, (storage.foldername(name))[1]::uuid)
          )
      )
      OR EXISTS (
        SELECT 1 FROM recipe_shares
        JOIN recipes ON recipes.id = recipe_shares.recipe_id
        WHERE recipes.user_id::text = (storage.foldername(name))[1]
          AND recipe_shares.shared_with_user_id = auth.uid()
      )
      OR are_family(
        (storage.foldername(name))[1]::uuid,
        auth.uid()
      )
    )
  );

-- Update storage INSERT policy to allow family members to upload to owner's folder
-- (needed so family can set/replace cover images stored under recipe owner's path)
DROP POLICY "Users can upload own images" ON storage.objects;

CREATE POLICY "Users can upload own or family images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'recipe-images'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR are_family(
        (storage.foldername(name))[1]::uuid,
        auth.uid()
      )
    )
  );

-- Add storage UPDATE policy (needed for upsert: true cover image uploads)
CREATE POLICY "Users can update own or family images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'recipe-images'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR are_family(
        (storage.foldername(name))[1]::uuid,
        auth.uid()
      )
    )
  );
