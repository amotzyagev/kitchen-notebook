-- Update storage RLS to allow notebook-shared and recipe-shared image access
DROP POLICY "Users can view own images" ON storage.objects;

CREATE POLICY "Users can view own and shared images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'recipe-images'
    AND (
      -- Owner can view own images
      auth.uid()::text = (storage.foldername(name))[1]
      -- Notebook share recipients can view shared images
      OR EXISTS (
        SELECT 1 FROM notebook_shares
        WHERE notebook_shares.owner_id::text = (storage.foldername(name))[1]
          AND notebook_shares.shared_with_user_id = auth.uid()
          AND notebook_shares.status = 'approved'
      )
      -- Individual recipe share recipients can view shared images
      OR EXISTS (
        SELECT 1 FROM recipe_shares
        JOIN recipes ON recipes.id = recipe_shares.recipe_id
        WHERE recipes.user_id::text = (storage.foldername(name))[1]
          AND recipe_shares.shared_with_user_id = auth.uid()
      )
    )
  );
