# Tasks: Recipe Image Upload

**Input**: Design documents from `/specs/002-recipe-image/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Database migration and type system updates

- [X] T001 Create migration `supabase/migrations/010_add_cover_image_path.sql` adding nullable `cover_image_path text` column to `recipes` table
- [X] T002 [P] Add `cover_image_path` field to all Recipe type variants (Row, Insert, Update) in `src/types/database.ts`
- [X] T003 [P] Add optional `cover_image_path` to `recipeInsertSchema` and `recipeSchema` in `src/lib/validators/recipe.ts`

**Checkpoint**: Schema and types ready — run `npm run lint` to verify no type errors.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: API endpoint that all user stories depend on

**⚠️ CRITICAL**: Upload/delete/remove functionality must exist before any UI work

- [X] T004 Create API route `src/app/api/recipes/[id]/cover-image/route.ts` with POST handler: auth check, rate limit, recipe ownership verification, FormData file parsing, file type + size validation (JPEG/PNG/WebP, max 2MB), upload to Supabase Storage at `{userId}/{recipeId}/cover.webp` with `{ upsert: true }`, update `cover_image_path` column, return path. Use admin client for DB update. Error responses per contracts/api.md (401, 403, 404, 400, 413, 429).
- [X] T005 Add DELETE handler to same route `src/app/api/recipes/[id]/cover-image/route.ts`: auth check, recipe ownership verification, verify `cover_image_path` is not null, delete file from storage, set `cover_image_path` to NULL, return `{ success: true }`. Error responses per contracts/api.md.

**Checkpoint**: API endpoints functional — test with curl/Postman before proceeding to UI.

---

## Phase 3: User Story 1 — Upload a Recipe Image (Priority: P1) 🎯 MVP

**Goal**: User can upload a cover image from media library or camera on the recipe detail page. Image appears below title and tags.

**Independent Test**: Open any owned recipe, tap "Add Image", select a photo, verify it appears on the recipe detail page under the title and tags.

### Implementation for User Story 1

- [X] T006 [US1] Create client component `src/components/recipe/cover-image-upload.tsx`: accepts `recipeId`, `hasCoverImage` props. When no image exists, show "הוספת תמונה" button. Offers two options: "ספריית מדיה" (file input with `accept="image/*"`) and "מצלמה" (file input with `accept="image/*" capture="environment"`). On file select: compress with `browser-image-compression` (maxWidthOrHeight: 800, maxSizeMB: 0.3, fileType: 'image/webp', useWebWorker: true), POST compressed file as FormData to `/api/recipes/{id}/cover-image`, show loading spinner during upload, show error toast on failure (Hebrew messages), call `router.refresh()` on success. Touch targets min 44x44px. RTL layout with `dir="rtl"`.
- [X] T007 [US1] Modify `src/app/(protected)/recipes/[id]/page.tsx`: if `recipe.cover_image_path` exists, generate signed URL via `supabase.storage.from('recipe-images').createSignedUrl(recipe.cover_image_path, 3600)` and render `<img>` below the tags section (before Separator) with `rounded-lg w-full max-h-64 object-cover`. If `isOwner`, render `<CoverImageUpload>` component at the bottom of the page (in the actions area). Pass `hasCoverImage={!!recipe.cover_image_path}` to component.

**Checkpoint**: Upload works end-to-end — image appears on recipe detail page after upload.

---

## Phase 4: User Story 2 — Replace/Remove an Existing Image (Priority: P1)

**Goal**: When a recipe already has an image, the button says "החלפת תמונה" (Change Image). User sees replacement warning before uploading. User can remove the image entirely.

**Independent Test**: Open a recipe with an image, verify "Change Image" label, upload new image (verify replacement warning), then remove image (verify recipe returns to no-image state).

### Implementation for User Story 2

- [X] T008 [US2] Extend `src/components/recipe/cover-image-upload.tsx`: when `hasCoverImage` is true, change button label to "החלפת תמונה". Before opening file picker, show inline warning text "התמונה הנוכחית תוחלף" (current image will be replaced). Add "הסרת תמונה" (Remove Image) button that calls DELETE `/api/recipes/{id}/cover-image`, shows loading state, calls `router.refresh()` on success, shows error toast on failure. Add confirmation before remove action.

**Checkpoint**: Replace and remove flows work. Recipe transitions correctly between image/no-image states.

---

## Phase 5: User Story 3 — Recipe Card Background Image (Priority: P2)

**Goal**: Recipe cards on the list page show uploaded images as backgrounds with semi-transparent theme-colored overlay for readability.

**Independent Test**: Upload an image to a recipe, return to recipes list, verify background image visible with readable text overlay in both light and dark modes. Verify cards without images look unchanged.

### Implementation for User Story 3

- [X] T009 [US3] Modify `src/components/recipe-list.tsx`: add a `useEffect` that generates signed URLs for all recipes with `cover_image_path` using `supabase.storage.from('recipe-images').createSignedUrl()`. Store in a `Record<string, string>` state (`coverUrls`). Re-generate when `recipes` array changes. Pass `coverImageUrl={coverUrls[recipe.id]}` to each `RecipeCard`.
- [X] T010 [US3] Modify `src/components/recipe/recipe-card.tsx`: accept optional `coverImageUrl?: string` prop. When provided, set `backgroundImage: url(coverImageUrl)`, `backgroundSize: 'cover'`, `backgroundPosition: 'center'` on the Card element. Add an inner overlay `div` with `className="absolute inset-0 bg-background/80 dark:bg-background/85"` to maintain text readability while showing the image through. Ensure the card's existing content sits above the overlay via relative positioning. Cards without `coverImageUrl` render exactly as before (no changes to existing layout/styling).

**Checkpoint**: Cards with images show backgrounds, cards without images unchanged. Readable in both themes.

---

## Phase 6: User Story 4 — Shared Recipe Image Visibility (Priority: P3)

**Goal**: Shared recipe recipients can see cover images on cards and detail pages. Recipients cannot upload/change/remove images.

**Independent Test**: Share a recipe with an image, log in as recipient, verify image visible on card and detail page, verify no upload button shown.

### Implementation for User Story 4

- [X] T011 [US4] Verify `src/app/(protected)/recipes/[id]/page.tsx`: confirm `CoverImageUpload` is only rendered when `isOwner` is true (done in T007). Verify signed URL generation works for non-owner users — the RLS policy from migration 009 grants storage SELECT access to shared recipients. No code changes expected; this is a verification task.
- [X] T012 [US4] Verify `src/components/recipe/recipe-list.tsx`: confirm signed URL generation in `coverUrls` works for shared recipes where `cover_image_path` belongs to another user's storage folder. The client Supabase auth + migration 009 RLS should allow this. No code changes expected; this is a verification task.

**Checkpoint**: Shared recipe images visible to recipients, no upload controls shown.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final quality checks

- [X] T013 Run `npm run lint` and fix any errors or warnings
- [X] T014 Verify RTL layout of `cover-image-upload.tsx` on 375px viewport
- [X] T015 Verify recipe card backgrounds readable in both light and dark modes at 375px viewport
- [X] T016 Run through all quickstart.md scenarios (upload, replace, remove, shared visibility, no-image unchanged)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on T001-T003 (types must exist for API route)
- **US1 (Phase 3)**: Depends on Phase 2 (API must exist)
- **US2 (Phase 4)**: Depends on US1 (extends same component)
- **US3 (Phase 5)**: Depends on Phase 2 (needs `cover_image_path` in recipe data). Can run in parallel with US1/US2 if desired.
- **US4 (Phase 6)**: Depends on US1 + US3 (verification of existing work)
- **Polish (Phase 7)**: Depends on all stories complete

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational only — core MVP
- **US2 (P1)**: Depends on US1 (extends CoverImageUpload component from T006)
- **US3 (P2)**: Depends on Foundational only — can run in parallel with US1
- **US4 (P3)**: Depends on US1 + US3 — verification only

### Parallel Opportunities

- T002 and T003 can run in parallel (different files)
- T004 and T005 are in the same file but logically sequential
- US1 (Phase 3) and US3 (Phase 5) can run in parallel after Foundational

---

## Parallel Example: Setup Phase

```text
# These can run in parallel after T001:
T002: Add cover_image_path to database.ts
T003: Add cover_image_path to recipe validators
```

## Parallel Example: After Foundational

```text
# These can start simultaneously:
Phase 3 (US1): Cover image upload component + detail page integration
Phase 5 (US3): Recipe card background + recipe list signed URLs
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T005)
3. Complete Phase 3: US1 — Upload (T006-T007)
4. Complete Phase 4: US2 — Replace/Remove (T008)
5. **STOP and VALIDATE**: Upload, replace, remove all work on recipe detail page

### Incremental Delivery

1. Setup + Foundational → Schema and API ready
2. US1 + US2 → Full upload/replace/remove on detail page (MVP!)
3. US3 → Card backgrounds on recipe list → Deploy
4. US4 → Verify shared access → Deploy
5. Polish → Final quality pass

---

## Notes

- All Hebrew strings must be RTL-compatible
- Compression target: 300KB / 800px / WebP via `browser-image-compression`
- Storage path: `{userId}/{recipeId}/cover.webp` — fixed name enables upsert
- Signed URLs expire after 1 hour (3600s) — sufficient for a browsing session
- No new dependencies needed — `browser-image-compression` already in project
