-- Create recipes table
CREATE TABLE recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  ingredients text[] NOT NULL DEFAULT '{}',
  instructions text[] NOT NULL DEFAULT '{}',
  notes text,
  original_text text,
  source_type text NOT NULL DEFAULT 'manual'
    CHECK (source_type IN ('manual', 'link', 'image')),
  source_url text,
  source_image_path text,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Source field consistency constraints
ALTER TABLE recipes ADD CONSTRAINT source_url_required
  CHECK (source_type != 'link' OR source_url IS NOT NULL);
ALTER TABLE recipes ADD CONSTRAINT source_image_required
  CHECK (source_type != 'image' OR source_image_path IS NOT NULL);

-- Indexes
CREATE INDEX idx_recipes_user_id ON recipes(user_id);
CREATE INDEX idx_recipes_tags ON recipes USING GIN(tags);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security (Constitution: Principle IV)
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recipes"
  ON recipes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recipes"
  ON recipes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recipes"
  ON recipes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own recipes"
  ON recipes FOR DELETE USING (auth.uid() = user_id);
