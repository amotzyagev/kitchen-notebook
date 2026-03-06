# Tasks: Kitchen-Notebook (מחברת המתכונים)

**Input**: Design documents from `/specs/master/`
**Prerequisites**: plan.md (required), spec.md (required), data-model.md, contracts/, research.md, quickstart.md

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1, US2, US3, US4)

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Create the Next.js project, install all dependencies, configure tooling.

- [ ] T001 Initialize Next.js 15 project with `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"` in project root
- [ ] T002 Initialize shadcn/ui with RTL support using `npx shadcn@latest init --rtl` in project root
- [ ] T003 Install core dependencies: `npm install @supabase/supabase-js @supabase/ssr @anthropic-ai/sdk zod react-hook-form @hookform/resolvers browser-image-compression cheerio @mozilla/readability jsdom @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` and `npm install -D @types/jsdom supabase`
- [ ] T004 Install test dependencies: `npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/dom vite-tsconfig-paths @playwright/test` and run `npx playwright install`
- [ ] T005 Create `vitest.config.mts` at project root with jsdom environment, react plugin, and tsconfigPaths plugin (see quickstart.md section 5)
- [ ] T006 Add test scripts to `package.json`: `"test": "vitest"` and `"test:e2e": "playwright test"`
- [ ] T007 Create `.env.local` with placeholder values for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `ANTHROPIC_API_KEY` (see quickstart.md section 4)
- [ ] T008 Add `.env.local` to `.gitignore` if not already present

**Checkpoint**: Project builds with `npm run dev` and `npm test` runs (no tests yet).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database, auth infrastructure, root layout, and middleware. MUST complete before any user story.

**CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T009 Initialize local Supabase with `npx supabase init` and `npx supabase start` (requires Docker Desktop running)
- [ ] T010 Create `supabase/migrations/001_create_recipes.sql` with recipes table, RLS policies, indexes, and updated_at trigger (copy SQL from data-model.md migration section)
- [ ] T011 Create `supabase/migrations/002_create_storage.sql` with recipe-images bucket and storage RLS policies (copy SQL from data-model.md storage migration section)
- [ ] T012 Apply migrations with `npx supabase db push` and verify tables exist via Supabase Studio at http://localhost:54323
- [ ] T013 Generate TypeScript types with `npx supabase gen types typescript --local > src/types/database.ts`
- [ ] T014 [P] Create `src/lib/supabase/client.ts` — browser Supabase client using `createBrowserClient` from `@supabase/ssr`
- [ ] T015 [P] Create `src/lib/supabase/server.ts` — server Supabase client using `createServerClient` from `@supabase/ssr` with cookie handling
- [ ] T016 Create `src/middleware.ts` — Next.js middleware that refreshes Supabase session on every request, redirects unauthenticated users from `/(protected)/*` to `/login`, redirects authenticated users from `/login` to `/recipes`. Use `getUser()` (never `getSession()`)
- [ ] T017 [P] Create `src/lib/validators/recipe.ts` with Zod schemas: `recipeFormSchema`, `recipeInsertSchema`, `recipeSchema`, and TypeScript types (copy from data-model.md Zod section)
- [ ] T018 [P] Create `src/lib/validators/ai-response.ts` with `aiRecipeExtractionSchema` Zod schema (copy from data-model.md)
- [ ] T019 [P] Create `src/lib/validators/auth.ts` with Zod schemas for login form (`email`, `password`), signup form (`email`, `password`, `displayName`), and forgot-password form (`email`)
- [ ] T020 [P] Create `src/lib/validators/api.ts` with `parseUrlRequestSchema` and `parseImageRequestSchema` (copy from contracts/api-routes.md section 3)
- [ ] T021 Update `src/app/layout.tsx` — set `<html lang="he" dir="rtl">`, import Heebo font via `next/font/google` with `subsets: ['hebrew', 'latin']`, apply font CSS variable to body
- [ ] T022 [P] Create `src/components/layout/direction-provider.tsx` — wrap children with shadcn/ui `DirectionProvider` for RTL portal components
- [ ] T023 Create `src/app/page.tsx` — landing page that redirects to `/recipes` if authenticated or `/login` if not (use server-side Supabase client to check)
- [ ] T024 Install shadcn/ui components needed across all stories: `npx shadcn@latest add button card input label dialog sheet toast form separator dropdown-menu`
- [ ] T025 Verify `npm run lint` passes with zero warnings. Fix any ESLint issues from generated code

**Checkpoint**: `npm run dev` starts, visiting localhost redirects to /login (no login page yet — 404 is expected). Database tables exist in Supabase Studio. `npm run lint` passes.

---

## Phase 3: User Story 1 — Authentication & User Management (P1 - MVP)

**Goal**: Users can sign up, log in (email + Google), reset password, and stay logged in across sessions.

**Independent Test**: Navigate to /login → sign up with email → see redirect to /recipes → refresh page → still authenticated.

### Implementation for US-1

- [ ] T026 [P] [US1] Create `src/components/auth/login-form.tsx` — email + password form using React Hook Form + Zod (`authLoginSchema`), calls `supabase.auth.signInWithPassword()`, shows Hebrew error messages, RTL layout
- [ ] T027 [P] [US1] Create `src/components/auth/signup-form.tsx` — email + password + display name form using React Hook Form + Zod, calls `supabase.auth.signUp()` with `displayName` in `raw_user_meta_data`, shows Hebrew validation errors
- [ ] T028 [P] [US1] Create `src/components/auth/forgot-password-form.tsx` — email-only form, calls `supabase.auth.resetPasswordForEmail()` with redirectTo to `/reset-password`, shows success message in Hebrew
- [ ] T029 [P] [US1] Create `src/components/auth/oauth-buttons.tsx` — "התחבר עם Google" button, calls `supabase.auth.signInWithOAuth({ provider: 'google' })`, styled with shadcn/ui Button
- [ ] T030 [US1] Create `src/app/(auth)/login/page.tsx` — page composing LoginForm + OAuthButtons + link to signup + link to forgot-password. RTL layout, mobile-first, centered card
- [ ] T031 [P] [US1] Create `src/app/(auth)/signup/page.tsx` — page composing SignupForm + OAuthButtons + link to login
- [ ] T032 [P] [US1] Create `src/app/(auth)/forgot-password/page.tsx` — page composing ForgotPasswordForm + link back to login
- [ ] T033 [US1] Create `src/app/(auth)/reset-password/page.tsx` — new password form. Calls `supabase.auth.updateUser({ password })`. Only accessible after clicking email recovery link
- [ ] T034 [US1] Create `src/app/auth/callback/route.ts` — OAuth callback Route Handler. Reads `code` from URL params, exchanges for session via `supabase.auth.exchangeCodeForSession(code)`, redirects to `/recipes`
- [ ] T035 [US1] Create `src/app/(protected)/layout.tsx` — protected layout that checks auth via server-side `getUser()` and redirects to `/login` if no session. Wraps children with app shell
- [ ] T036 [US1] Create `src/components/layout/app-shell.tsx` — main app wrapper with Hebrew header ("מחברת המתכונים"), user menu (display name + logout button), RTL layout
- [ ] T037 [US1] Create `src/components/layout/bottom-nav.tsx` — mobile bottom navigation bar with icons for: recipes list (home), add recipe (+), shown only on mobile (hidden on desktop via Tailwind responsive classes)
- [ ] T038 [US1] Verify full auth flow manually: signup → email confirmation → login → see protected page → logout → redirect to login → Google SSO (requires Google Cloud Console setup — see T069 onboarding guide)
- [ ] T039 [US1] Run `npm run lint` and fix any warnings

**Checkpoint**: User can sign up (email), log in, see protected layout with header, log out. Google SSO works if Google credentials configured. Session persists across page refresh.

---

## Phase 4: User Story 2 — Recipe Ingestion (P1 - MVP)

**Goal**: Users can add recipes via manual entry, photo capture, or link paste. AI processes and translates to Hebrew. Failure falls back to manual editing.

**Independent Test**: Add recipe manually → see it saved. Paste URL → see AI-parsed Hebrew recipe. Upload photo → see OCR result in Hebrew. Simulate AI failure → see raw input in edit form.

**Depends on**: Phase 3 (US-1 auth must work)

### Implementation for US-2

- [ ] T040 [P] [US2] Create `src/lib/ai/client.ts` — initialize Anthropic SDK client using `ANTHROPIC_API_KEY` env var. Server-only (throw error if imported in client component)
- [ ] T041 [P] [US2] Create `src/lib/ai/parse-recipe-image.ts` — function that takes base64 image + mediaType, calls Claude Sonnet vision API with tool use (`save_recipe` tool, `strict: true`, `tool_choice: { type: "any" }`), returns `AIRecipeExtraction`. Include system prompt for Hebrew translation + OCR. Set `max_tokens: 2048`. Validate response with `aiRecipeExtractionSchema`
- [ ] T042 [P] [US2] Create `src/lib/ai/parse-recipe-url.ts` — hybrid extraction function: (1) fetch URL with browser User-Agent + 10s timeout, (2) Cheerio: extract JSON-LD `schema.org/Recipe`, (3) if found map fields directly, (4) if not found use Readability to extract clean text, (5) send trimmed text to Claude Haiku for structured extraction, (6) return extracted recipe data. Handle `@graph` arrays and nested Recipe types in JSON-LD
- [ ] T043 [P] [US2] Create `src/lib/ai/translate.ts` — function that takes extracted recipe data (any language) and calls Claude Sonnet to translate title, ingredients, instructions, notes to Hebrew. Returns translated data. Uses tool use for structured output
- [ ] T044 [US2] Create `src/app/api/recipes/parse-image/route.ts` — POST Route Handler: verify auth via `getUser()`, validate body with `parseImageRequestSchema`, check image size (< 5 MB), call `parseRecipeImage()`, validate with Zod, return structured response or Hebrew error. Set `export const maxDuration = 30`
- [ ] T045 [US2] Create `src/app/api/recipes/parse-url/route.ts` — POST Route Handler: verify auth, validate body with `parseUrlRequestSchema`, call `parseRecipeUrl()`, translate to Hebrew via `translate()`, return structured response or Hebrew error. Set `export const maxDuration = 30`
- [ ] T046 [US2] Create `src/components/recipe/recipe-form.tsx` — recipe entry/edit form using React Hook Form + Zod (`recipeFormSchema`). Fields: title (text input), ingredients (dynamic list — add/remove items), instructions (dynamic ordered list — add/remove/reorder), notes (textarea), tags (comma-separated input or tag chips). All fields RTL. Submit saves to Supabase via `createRecipe()`
- [ ] T047 [P] [US2] Create `src/components/recipe/photo-upload.tsx` — camera capture / gallery upload component. Uses `<input type="file" accept="image/*" capture="camera">`. On file select: compress with `browser-image-compression` (maxWidthOrHeight: 1568, maxSizeMB: 1), convert to base64, call POST `/api/recipes/parse-image`. Show loading spinner during processing. On success: pre-fill recipe-form. On failure: show Hebrew error, let user fill form manually
- [ ] T048 [P] [US2] Create `src/components/recipe/url-input.tsx` — URL paste input with "חלץ מתכון" (extract recipe) button. On submit: call POST `/api/recipes/parse-url`. Show loading spinner. On success: pre-fill recipe-form. On failure: show Hebrew error, let user enter manually
- [ ] T049 [US2] Create `src/app/(protected)/recipes/new/page.tsx` — "Add Recipe" page with 3 tabs: "ידני" (Manual), "צילום" (Photo), "קישור" (Link). Manual tab shows recipe-form directly. Photo tab shows photo-upload → recipe-form. Link tab shows url-input → recipe-form. All tabs share the same recipe-form for final editing before save
- [ ] T050 [US2] Create `src/hooks/use-recipes.ts` — custom hook wrapping Supabase operations: `createRecipe(data)` inserts into `recipes` table via browser Supabase client, `uploadRecipeImage(userId, recipeId, file)` uploads to Supabase Storage at path `{userId}/{recipeId}/{filename}` and returns storage path
- [ ] T051 [US2] Wire the save flow: recipe-form submit → if source_type is 'image', upload compressed image to Storage first → then insert recipe row with all fields including `source_image_path` or `source_url` + `original_text` → redirect to recipe detail page
- [ ] T052 [US2] Verify manually: add recipe via manual entry → saved. Paste URL (try a recipe blog) → see AI-extracted Hebrew recipe → edit if needed → save. Upload recipe photo → see OCR result → save
- [ ] T053 [US2] Run `npm run lint` and fix any warnings

**Checkpoint**: All three ingestion methods work. AI failures show error and let user enter manually. Saved recipes appear in Supabase Studio.

---

## Phase 5: User Story 3 — Recipe CRUD & Editing (P1 - MVP)

**Goal**: Users can browse, search, view, edit, reorder, and delete their recipes.

**Independent Test**: See recipe list → search by title → filter by tag → tap recipe → see detail → edit title → reorder steps → delete recipe → confirm gone.

**Depends on**: Phase 4 (US-2 — need recipes in DB to view/edit)

### Implementation for US-3

- [ ] T054 [P] [US3] Create `src/components/recipe/recipe-card.tsx` — card component showing recipe title, first 2 ingredients, tags, source type icon, updated_at date. RTL layout. Tappable → navigates to `/recipes/[id]`
- [ ] T055 [US3] Create `src/components/recipe/recipe-list.tsx` — responsive grid of RecipeCards. Includes search input (searches title via ILIKE), tag filter dropdown (populated from distinct tags across user's recipes), empty state message ("אין מתכונים עדיין — הוסף את הראשון!"). Uses Supabase client to query recipes with search/filter. Sorted by `updated_at` descending
- [ ] T056 [US3] Create `src/app/(protected)/recipes/page.tsx` — recipes list page composing RecipeList. Server component that fetches initial recipes, passes to client RecipeList for search/filter interactivity
- [ ] T057 [P] [US3] Create `src/components/recipe/ingredient-list.tsx` — display component for ingredients list with optional checkboxes (for cooking mode). RTL text alignment
- [ ] T058 [P] [US3] Create `src/components/recipe/instruction-list.tsx` — display component for numbered instruction steps. In view mode: numbered list. In edit mode: drag-and-drop reordering using `@dnd-kit/sortable` + add/remove buttons
- [ ] T059 [US3] Create `src/app/(protected)/recipes/[id]/page.tsx` — recipe detail view. Server component fetching recipe by ID. Shows: title, ingredients (IngredientList), instructions (InstructionList), notes, tags, source type badge, created/updated dates. Buttons: "עריכה" (edit), "מחק" (delete), "הצג מקור" (view source — if source_type != 'manual'). RTL layout, mobile-optimized
- [ ] T060 [US3] Create `src/app/(protected)/recipes/[id]/edit/page.tsx` — edit page reusing `recipe-form.tsx` pre-filled with existing recipe data. On submit: calls `updateRecipe(id, data)` from `use-recipes` hook. Redirect back to detail page on success
- [ ] T061 [US3] Add `updateRecipe(id, data)` and `deleteRecipe(id)` functions to `src/hooks/use-recipes.ts`. `deleteRecipe` also removes associated images from Supabase Storage
- [ ] T062 [US3] Add delete confirmation dialog to recipe detail page — shadcn/ui AlertDialog with Hebrew text: "האם למחוק את המתכון?" (Delete this recipe?), confirm/cancel buttons. On confirm: call `deleteRecipe()`, redirect to `/recipes`
- [ ] T063 [US3] Verify manually: create 3+ recipes → see them in list → search by title → filter by tag → view detail → edit a recipe → reorder instructions → delete a recipe → verify gone from list
- [ ] T064 [US3] Run `npm run lint` and fix any warnings

**Checkpoint**: Full CRUD works. Search and filter work. Drag-and-drop instruction reorder works. Delete with confirmation works. All pages are RTL and mobile-friendly.

---

## Phase 6: User Story 4 — View Source & Review Flow (P2)

**Goal**: Users can view original source of imported recipes and compare with Hebrew translation.

**Independent Test**: Import recipe via URL → view source → see original URL link + original text alongside Hebrew. Import via photo → view source → see original photo alongside Hebrew text.

**Depends on**: Phase 5 (US-3 — need recipe detail page)

### Implementation for US-4

- [ ] T065 [US4] Create `src/components/recipe/source-comparison.tsx` — split view component. Left side: Hebrew translated recipe (title, ingredients, instructions). Right side: original content based on `source_type`: 'link' → show `original_text` + clickable `source_url` button; 'image' → show original image from Supabase Storage (signed URL); 'manual' → show "מתכון ידני" (manual recipe — no source). Mobile: stacked vertically (Hebrew on top). RTL layout
- [ ] T066 [US4] Create `src/app/(protected)/recipes/[id]/source/page.tsx` — source comparison page. Fetches recipe, renders SourceComparison component. "חזור למתכון" (back to recipe) button. "עריכה" (edit) button to fix translation errors. Only accessible for non-manual recipes (redirect to detail page if `source_type === 'manual'`)
- [ ] T067 [US4] Wire "הצג מקור" (View Source) button on recipe detail page (T059) to navigate to `/recipes/[id]/source`. Show button only when `source_type !== 'manual'`. For `source_type === 'link'`, also add "מקור מקורי" (Original Source) button that opens `source_url` in a new tab
- [ ] T068 [US4] Verify manually: import recipe via link → detail page shows "הצג מקור" button → tap → see comparison view with original text + Hebrew. Import via photo → tap source → see photo + Hebrew side by side. Manual recipe → no source button shown
- [ ] T069 [US4] Run `npm run lint` and fix any warnings

**Checkpoint**: Source comparison works for link and image recipes. Manual recipes have no source button. Users can navigate between source view and edit mode.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Quality checks, visual polish, and testing across all stories.

- [ ] T070 Add `src/app/not-found.tsx` — custom 404 page with Hebrew message and link back to recipes
- [ ] T071 Add `src/app/error.tsx` — global error boundary with Hebrew error message, retry button, and link to recipes
- [ ] T072 Add loading states: create `src/app/(protected)/recipes/loading.tsx` and `src/app/(protected)/recipes/[id]/loading.tsx` with skeleton UI (shadcn/ui Skeleton component)
- [ ] T073 Verify RTL layout on 375px viewport for every page: login, signup, forgot-password, recipe list, recipe detail, edit, add recipe (all 3 tabs), source comparison. Fix any horizontal scroll or misalignment
- [ ] T074 Verify touch targets are at least 44x44px on all interactive elements (buttons, links, form inputs, navigation items)
- [ ] T075 Create `supabase/seed.sql` with 3-5 sample Hebrew recipes for development (manual, link, and image source types)
- [ ] T076 Create `tests/unit/validators.test.ts` — test all Zod schemas: valid input passes, invalid input fails with correct error. Test recipe form, AI response, auth forms, API request schemas
- [ ] T077 Create `tests/integration/recipe-crud.test.ts` — test recipe CRUD operations with mocked Supabase client: create, list, get, update, delete. Verify Zod validation at boundaries
- [ ] T078 Run full test suite: `npm test` (unit + integration) and `npm run lint`. All must pass with zero warnings
- [ ] T079 [P] Create `tests/e2e/auth.spec.ts` — Playwright E2E test: visit /login → see Hebrew login page → (mock) sign in → see recipes page → sign out → redirected to login
- [ ] T080 [P] Create `tests/e2e/rtl-layout.spec.ts` — Playwright test: visit each page at 375px viewport → verify no horizontal scroll → verify text-align is right → verify dir="rtl" on html element

**Checkpoint**: All tests pass. All pages are RTL, mobile-friendly, with proper loading/error states.

---

## Phase 8: Services Onboarding Guide

**Purpose**: Create a detailed, step-by-step guide for a complete beginner on which services to sign up for, how to configure them, and how to connect everything.

- [ ] T081 Create `docs/services-onboarding.md` — a comprehensive beginner guide covering the following sections (written in English, with screenshots-style descriptions of each step):

  **Section 1: Overview** — List all services needed (Supabase, Vercel, Claude API, Google Cloud, GitHub), what each does, and monthly cost estimate.

  **Section 2: GitHub Setup** — Create a GitHub account (if needed). Create a new repository. Push the kitchen-notebook code. Explain what Git and GitHub are in simple terms.

  **Section 3: Supabase Setup** — Step-by-step: (1) Go to supabase.com, click "Start your project", sign up with GitHub. (2) Create a new project — pick a name, set database password, choose region (closest to Israel = eu-central-1). (3) Wait for project to initialize (~2 min). (4) Go to Settings → API → copy Project URL and anon key. (5) Go to Authentication → Providers → enable Email provider. (6) Go to Authentication → URL Configuration → set Site URL to `http://localhost:3000` for dev. (7) Run migrations against the remote Supabase: `npx supabase link --project-ref <ref>` then `npx supabase db push`.

  **Section 4: Google Cloud OAuth Setup** — Step-by-step: (1) Go to console.cloud.google.com, sign in with Google. (2) Create a new project (any name). (3) Go to APIs & Services → OAuth consent screen → configure (External, add app name + email). (4) Go to Credentials → Create Credentials → OAuth 2.0 Client ID → Web application. (5) Add authorized origins: `http://localhost:3000`. (6) Add redirect URI: `https://<supabase-project>.supabase.co/auth/v1/callback`. (7) Copy Client ID and Client Secret. (8) In Supabase Dashboard → Authentication → Providers → Google → paste credentials.

  **Section 5: Claude API Setup** — Step-by-step: (1) Go to console.anthropic.com, create account. (2) Go to API Keys → Create Key → copy it. (3) Add to `.env.local` as `ANTHROPIC_API_KEY=sk-ant-...`. (4) Add payment method (pay-as-you-go, ~$1/month for family use).

  **Section 6: Vercel Deployment** — Step-by-step: (1) Go to vercel.com, sign up with GitHub. (2) Click "New Project" → import your GitHub repo. (3) Vercel auto-detects Next.js. (4) Add environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`. (5) Click Deploy. (6) Copy the deployed URL (e.g., `kitchen-notebook.vercel.app`). (7) Update Supabase Site URL to the Vercel URL. (8) Update Google OAuth authorized origins to include the Vercel URL.

  **Section 7: Domain (Optional)** — How to buy a .com domain (~$12/year from Cloudflare or Namecheap) and connect it to Vercel.

  **Section 8: Checklist** — Final verification checklist: all env vars set, auth works, AI processing works, images upload, RTL layout correct on mobile.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup ──────────────────────▶ No dependencies
Phase 2: Foundational ───────────────▶ Depends on Phase 1
Phase 3: US-1 (Auth) ───────────────▶ Depends on Phase 2
Phase 4: US-2 (Ingestion) ──────────▶ Depends on Phase 3
Phase 5: US-3 (CRUD & Editing) ─────▶ Depends on Phase 4
Phase 6: US-4 (Source View) ─────────▶ Depends on Phase 5
Phase 7: Polish ─────────────────────▶ Depends on Phase 6
Phase 8: Onboarding Guide ──────────▶ Can start after Phase 2 (parallel with US work)
```

### Parallel Opportunities Within Phases

**Phase 2**: T014 + T015 (Supabase clients), T017–T020 (Zod schemas), T022 (direction provider) — all in parallel.

**Phase 3**: T026–T029 (auth form components) — all in parallel, then pages.

**Phase 4**: T040–T043 (AI lib files) — all in parallel, then route handlers, then UI.

**Phase 5**: T054 + T057 + T058 (display components) — in parallel.

---

## Implementation Strategy

### MVP First (User Stories 1–3)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: US-1 (Auth) → **Test: can sign in**
4. Complete Phase 4: US-2 (Ingestion) → **Test: can add recipes 3 ways**
5. Complete Phase 5: US-3 (CRUD) → **Test: full recipe management**
6. **STOP and VALIDATE**: Full MVP is functional
7. Phase 6: US-4 (Source View) → nice-to-have
8. Phase 7: Polish → quality and testing
9. Phase 8: Onboarding Guide → deployment readiness

### Task Count Summary

| Phase | Story | Tasks | Parallel |
|-------|-------|-------|----------|
| Phase 1: Setup | — | 8 | 0 |
| Phase 2: Foundational | — | 17 | 8 |
| Phase 3: US-1 (Auth) | US-1 | 14 | 6 |
| Phase 4: US-2 (Ingestion) | US-2 | 14 | 6 |
| Phase 5: US-3 (CRUD) | US-3 | 11 | 3 |
| Phase 6: US-4 (Source) | US-4 | 5 | 0 |
| Phase 7: Polish | — | 11 | 2 |
| Phase 8: Onboarding | — | 1 | 0 |
| **Total** | | **81** | **25** |
