# Data Model: Recipe Image Upload

**Feature Branch**: `002-recipe-image`
**Date**: 2026-03-08

## Schema Changes

### Modified Entity: `recipes`

**New Column:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `cover_image_path` | text | YES | NULL | Storage path to the recipe's cover image (e.g., `{userId}/{recipeId}/cover.webp`). NULL means no cover image. |

**Migration**: `010_add_cover_image_path.sql`

```sql
ALTER TABLE recipes ADD COLUMN cover_image_path text;
```

No RLS changes needed — the column inherits the existing recipes table RLS policies. No NOT NULL constraint — most recipes won't have a cover image.

### Storage: `recipe-images` bucket (existing)

**New path convention:**

| Path Pattern | Purpose |
|--------------|---------|
| `{userId}/{recipeId}/{originalFilename}` | Existing: source image for AI extraction |
| `{userId}/{recipeId}/cover.webp` | New: recipe cover/background image |

No bucket or RLS changes needed. Existing policies already allow:
- Owner: upload, view, delete in their folder
- Shared recipients: view images in shared owner's folder (migration 009)

## Entity Relationships

```
recipes (1) ──── (0..1) cover image in storage
  └── cover_image_path points to storage object path
```

## State Transitions

**Cover Image Lifecycle:**

```
[No Image] ──upload──→ [Has Image] ──replace──→ [Has Image]
                            │                        │
                          remove                   remove
                            │                        │
                            ▼                        ▼
                       [No Image]               [No Image]
```

- **Upload**: Store file in storage, set `cover_image_path`
- **Replace**: Upload new file with `upsert: true` (overwrites existing), `cover_image_path` unchanged (same path)
- **Remove**: Delete file from storage, set `cover_image_path` to NULL

## Validation Rules

- `cover_image_path`: Optional text, max 500 characters, must match pattern `{uuid}/{uuid}/cover.webp`
- Image file: Must be JPEG, PNG, or WebP before compression; stored as WebP after compression
- Max compressed size: 300KB
- Max dimensions after compression: 800x800px
