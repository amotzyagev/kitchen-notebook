# Research: Recipe Image Upload

**Feature Branch**: `002-recipe-image`
**Date**: 2026-03-08

## R1: Storage Path Convention for Cover Images

**Decision**: Use `{userId}/{recipeId}/cover.webp` as the storage path for cover images, within the existing `recipe-images` bucket.

**Rationale**: The existing source images use `{userId}/{recipeId}/{originalFilename}`. Using a fixed name `cover.webp` makes it trivially distinguishable from source images and simplifies replacement (overwrite same path). WebP format provides the best size-to-quality ratio.

**Alternatives considered**:
- Separate bucket (`recipe-covers`): Rejected — adds infrastructure complexity, duplicates RLS policies. Constitution says "simplest implementation."
- Same bucket with prefix (`{userId}/{recipeId}/cover/{filename}`): Rejected — over-engineered, filename doesn't matter for a single cover image.

## R2: Database Column for Cover Image

**Decision**: Add a `cover_image_path` column (nullable text) to the `recipes` table via migration.

**Rationale**: The existing `source_image_path` tracks the original uploaded photo used for AI extraction — a fundamentally different purpose. A dedicated column keeps the schema clear and avoids conflating "source of recipe data" with "decorative cover photo."

**Alternatives considered**:
- Reuse `source_image_path`: Rejected — would conflict with existing image-source recipes and blur the distinction between source material and cover photos.
- Separate `recipe_images` table: Rejected — each recipe has at most one cover image. A column is simpler than a join table.
- Convention-based (always check storage for `cover.webp`): Rejected — requires a storage list call per recipe on every page load, terrible for performance.

## R3: Image Compression Settings

**Decision**: Compress cover images client-side using `browser-image-compression` with maxWidthOrHeight: 800px, maxSizeMB: 0.3 (300KB), output as WebP.

**Rationale**: Cover images are decorative — used as card backgrounds (small thumbnails ~200px wide) and recipe page heroes (max ~430px on mobile). 800px is more than sufficient. 300KB target supports 500+ recipes within Supabase free-tier storage (1GB). The existing photo-upload already uses this library with 1568px/1MB for AI parsing, so our decorative images can be smaller.

**Alternatives considered**:
- Same settings as photo-upload (1568px/1MB): Rejected — cover images don't need AI-readable resolution. Smaller = faster upload + less storage.
- Server-side compression: Rejected — adds API complexity, increases upload time, constitution says "simplest implementation."

## R4: API Design for Cover Image Upload

**Decision**: Create a single API route `/api/recipes/[id]/cover-image` handling POST (upload) and DELETE (remove).

**Rationale**: RESTful convention for a sub-resource. The recipe ID in the URL path simplifies authorization (fetch recipe, check ownership). File upload via FormData (multipart) keeps it standard.

**Implementation notes**:
- Supabase `storage.upload()` fails by default if the file already exists. Use `{ upsert: true }` option for replacement.
- File size must be validated in the handler after parsing FormData (Next.js App Router has no route-level body size config).

**Alternatives considered**:
- Client-side direct upload to Supabase Storage: Rejected — need server-side ownership verification and database column update in a single transaction-like flow.
- Separate upload and metadata endpoints: Rejected — over-engineered for a simple operation.

## R5: Recipe Card Background Image Display

**Decision**: Use CSS `background-image` with a semi-transparent overlay. Generate Supabase signed URLs **client-side** in `RecipeList` using the existing authenticated Supabase client, stored in a `recipeId → signedUrl` map that updates whenever the recipe list changes (initial load, search, filter).

**Rationale**: Signed URLs are required because the bucket is private. The client already has a fully authenticated Supabase client (`createClient` from `@/lib/supabase/client`) that is used for storage operations (e.g., `uploadRecipeImage` in `use-recipes.ts`). Client-side generation is necessary because `RecipeList` re-fetches recipes on search/filter via its own Supabase queries — a server-generated URL map would become stale after any client-side re-fetch.

**Alternatives considered**:
- Public bucket: Rejected — constitution requires user data isolation and scoped storage policies.
- Server-side signed URL generation passed as prop: Rejected — `RecipeList` does client-side search/filter that re-fetches recipes from Supabase directly, making the server-generated map stale. Would require duplicating URL generation logic.
- Next.js Image component for backgrounds: Rejected — CSS `background-image` is simpler for overlay effects; Next.js Image doesn't natively support background usage.

## R6: Shared Recipe Image Access

**Decision**: Rely on existing storage RLS policies from migration 009 (`Users can view own and shared images`) which already grants SELECT access to notebook-share and recipe-share recipients.

**Rationale**: Migration 009 already handles this — shared recipe recipients can view images in the owner's storage folder. No additional RLS changes needed.

**Alternatives considered**:
- Additional storage policy: Not needed — 009 already covers this.
- Public signed URLs: Rejected — breaks data isolation principle.
