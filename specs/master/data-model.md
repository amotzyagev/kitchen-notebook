# Data Model: Kitchen-Notebook (מחברת המתכונים)

**Date**: 2026-03-06 | **Plan**: [plan.md](plan.md) | **Spec**: [spec.md](spec.md)

## Overview

All data lives in Supabase PostgreSQL with Row Level Security (RLS) enforcing per-user
isolation. Supabase Auth manages user identity — no custom `profiles` table for MVP
(Supabase Auth stores `display_name` in `raw_user_meta_data`). Recipe images in Supabase
Storage with per-user folder policies.

**Design principle**: One table (`recipes`). Tags, ingredients, and instructions are
PostgreSQL `text[]` arrays — not separate tables, not JSONB objects. This is the simplest
model that satisfies the spec.

## Entity Relationship

```
auth.users (Supabase-managed)
    │
    │ 1:N
    ▼
┌──────────────────┐
│     recipes      │
│──────────────────│
│ id          (PK) │
│ user_id     (FK) │──→ auth.users.id
│ title            │
│ ingredients []   │
│ instructions []  │
│ notes            │
│ original_text    │
│ source_type      │
│ source_url       │
│ source_image_path│
│ tags []          │
│ created_at       │
│ updated_at       │
└──────────────────┘

Supabase Storage
    recipe-images/{user_id}/{recipe_id}/{filename}
```

## Table: `recipes`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Primary key |
| `user_id` | `uuid` | NOT NULL | `auth.uid()` | FK → `auth.users.id` |
| `title` | `text` | NOT NULL | — | Recipe title (Hebrew) |
| `ingredients` | `text[]` | NOT NULL | `'{}'` | Ingredients list, one string per item |
| `instructions` | `text[]` | NOT NULL | `'{}'` | Ordered steps, one string per step |
| `notes` | `text` | NULL | `NULL` | User's personal notes |
| `original_text` | `text` | NULL | `NULL` | Raw text before AI translation |
| `source_type` | `text` | NOT NULL | `'manual'` | `'manual'` \| `'link'` \| `'image'` |
| `source_url` | `text` | NULL | `NULL` | Original URL (link import only) |
| `source_image_path` | `text` | NULL | `NULL` | Supabase Storage path (image import only) |
| `tags` | `text[]` | NOT NULL | `'{}'` | User-defined tags |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Auto-updated on every edit |

**Indexes**:
- Primary key on `id`
- `idx_recipes_user_id` on `user_id` (speeds up RLS filter)
- `idx_recipes_tags` GIN on `tags` (enables `@>` containment queries for tag filter)

**Constraints**:
- `source_type` CHECK: `IN ('manual', 'link', 'image')`
- `source_url_required`: `source_type != 'link' OR source_url IS NOT NULL`
- `source_image_required`: `source_type != 'image' OR source_image_path IS NOT NULL`

**Trigger**: `updated_at` auto-set to `now()` on every UPDATE.

## User Profile (MVP)

**No custom table.** Supabase Auth provides everything needed:
- `auth.users.id` — UUID, used as `user_id` FK
- `auth.users.email` — user email
- `auth.users.raw_user_meta_data` — JSONB with `display_name` (from signup form or OAuth)
- `auth.users.created_at` — account creation

Access in code: `const { data: { user } } = await supabase.auth.getUser()`

## Storage: recipe-images bucket

- **Path**: `{user_id}/{recipe_id}/{filename}`
- **Access**: Private — RLS policies match `auth.uid()` to first folder segment
- **Max file size**: 5 MB
- **Allowed types**: image/jpeg, image/png, image/webp

## Search Implementation

Recipe search by title and ingredients (per clarification):

```typescript
// Title search (ILIKE for case-insensitive partial match)
.from('recipes')
.ilike('title', `%${query}%`)

// Ingredient search (array containment — checks if any ingredient contains the term)
// Note: text[] containment is exact match. For partial ingredient matching,
// use a helper function or filter client-side for MVP.
.from('recipes')
.or(`title.ilike.%${query}%`)
.order('updated_at', { ascending: false })
```

For MVP, search by title with `ILIKE` is sufficient. Ingredient search can use
client-side filtering on the already-loaded user recipes (personal collection is small).

## Migration: 001_create_recipes.sql

```sql
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
```

## Migration: 002_create_storage.sql

```sql
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
```

## Zod Schemas

```typescript
// src/lib/validators/recipe.ts
import { z } from 'zod';

export const sourceTypeSchema = z.enum(['manual', 'link', 'image']);

// Form validation (user input)
export const recipeFormSchema = z.object({
  title: z.string().min(1, 'כותרת נדרשת'),
  ingredients: z.array(z.string().min(1)).min(1, 'נדרש לפחות מרכיב אחד'),
  instructions: z.array(z.string().min(1)).min(1, 'נדרש לפחות שלב אחד'),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

// Database insert (form + source metadata)
export const recipeInsertSchema = recipeFormSchema.extend({
  source_type: sourceTypeSchema,
  source_url: z.string().url().optional(),
  source_image_path: z.string().optional(),
  original_text: z.string().optional(),
});

// Full recipe from database
export const recipeSchema = recipeInsertSchema.extend({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type RecipeForm = z.infer<typeof recipeFormSchema>;
export type RecipeInsert = z.infer<typeof recipeInsertSchema>;
export type Recipe = z.infer<typeof recipeSchema>;
```

```typescript
// src/lib/validators/ai-response.ts
import { z } from 'zod';

// Claude tool use output schema
export const aiRecipeExtractionSchema = z.object({
  title: z.string(),
  ingredients: z.array(z.string()),
  instructions: z.array(z.string()),
  notes: z.string(),
  original_text: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
  is_recipe: z.boolean(),
});

export type AIRecipeExtraction = z.infer<typeof aiRecipeExtractionSchema>;
```
