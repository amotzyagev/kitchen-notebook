CREATE TABLE recipe_self_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(recipe_id, user_id)
);

CREATE INDEX idx_recipe_self_notes_recipe ON recipe_self_notes(recipe_id);
CREATE INDEX idx_recipe_self_notes_user ON recipe_self_notes(user_id);

CREATE TRIGGER recipe_self_notes_updated_at
  BEFORE UPDATE ON recipe_self_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE recipe_self_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own self notes"
  ON recipe_self_notes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own self notes"
  ON recipe_self_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM recipes WHERE id = recipe_id));

CREATE POLICY "Users can update own self notes"
  ON recipe_self_notes FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own self notes"
  ON recipe_self_notes FOR DELETE USING (auth.uid() = user_id);
