-- Add 'import' to the source_type CHECK constraint
ALTER TABLE recipes DROP CONSTRAINT IF EXISTS recipes_source_type_check;
ALTER TABLE recipes ADD CONSTRAINT recipes_source_type_check
  CHECK (source_type IN ('manual', 'link', 'image', 'import'));
