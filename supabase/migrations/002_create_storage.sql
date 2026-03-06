-- Create private storage bucket for recipe images
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-images', 'recipe-images', false);

-- Users can upload to their own folder: recipe-images/{user_id}/...
CREATE POLICY "Users can upload own images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'recipe-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can view their own images
CREATE POLICY "Users can view own images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'recipe-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own images
CREATE POLICY "Users can delete own images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'recipe-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
