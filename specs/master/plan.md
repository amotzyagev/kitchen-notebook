# Implementation Plan: Kitchen-Notebook (מחברת המתכונים)

**Branch**: `master` | **Date**: 2026-03-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/master/spec.md`

## Summary

Kitchen-Notebook is a mobile-first, Hebrew RTL recipe management web app. Users sign up
via Supabase Auth (email + Google OAuth; Apple deferred post-MVP), add recipes through
manual entry, photo capture (Claude vision OCR), or URL paste (hybrid JSON-LD/Readability
+ Claude extraction), and manage them in a personal notebook. All AI processing uses the
Claude API with synchronous execution and graceful fallback on failure. Data is stored in
Supabase PostgreSQL with RLS for per-user isolation; images in Supabase Storage.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+
**Primary Dependencies**: Next.js 15 (App Router), @supabase/supabase-js, @supabase/ssr,
Tailwind CSS v4, shadcn/ui, @anthropic-ai/sdk, Zod, React Hook Form, Cheerio,
@mozilla/readability, browser-image-compression
**Storage**: Supabase PostgreSQL (data) + Supabase Storage (images)
**Testing**: Vitest + React Testing Library (unit/component) + Playwright (E2E)
**Target Platform**: Mobile web browsers (Chrome Android, Safari iOS/iPadOS), responsive desktop
**Project Type**: Web application (mobile-first)
**Performance Goals**: MVP — no specific latency/throughput targets beyond usable UX
**Constraints**: Online-only, synchronous AI processing (30s max timeout), single Supabase backend
**Scale/Scope**: Personal use, ~5 screens (auth, recipe list, recipe detail, add recipe, source comparison)

### Research Items (all resolved — see [research.md](./research.md))

| # | Topic | Decision |
|---|-------|----------|
| R1 | Testing | Vitest + RTL + Playwright |
| R2 | URL Scraping | Hybrid: JSON-LD → Readability → Claude |
| R3 | Photo OCR | Claude Sonnet vision + tool use (strict) |
| R4 | Auth | Supabase Auth, Google SSO (Apple deferred) |
| R5 | RTL | Tailwind v4 logical props + Heebo font + shadcn/ui --rtl |
| R6 | Image Upload | browser-image-compression → Supabase Storage |

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | PASS | App Router conventions, shadcn/ui, no custom abstractions. Hybrid scraping uses existing npm packages before AI. |
| II. Supabase as Single Backend | PASS | All backend via Supabase (Auth, PostgreSQL, Storage). No additional servers. |
| III. Mobile-First RTL | PASS | Tailwind v4 logical properties, `dir="rtl"` on `<html>`, Heebo font, shadcn/ui `--rtl`. |
| IV. User Data Isolation | PASS | RLS on all tables, Storage policies scoped to `auth.uid()`, middleware auth guard. |
| V. Graceful AI Degradation | PASS | 30s timeout, raw input always preserved, manual edit fallback on any failure. |
| VI. Quality Assurance | PASS | Vitest + RTL for component tests, Playwright E2E, Zod at all boundaries, lint zero-warning. |

**Gate result**: PASS — all principles satisfied.

## Project Structure

### Documentation (this feature)

```text
specs/master/
├── plan.md              # This file
├── research.md          # Phase 0 output (completed)
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API routes)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout: <html lang="he" dir="rtl">, Heebo font, Supabase provider
│   ├── page.tsx                  # Landing → redirect to /recipes or /login
│   ├── auth/
│   │   └── callback/route.ts     # OAuth callback handler (code exchange)
│   ├── (auth)/                   # Route group: public auth pages
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx  # Password reset form (after email link)
│   ├── (protected)/              # Route group: auth-required pages
│   │   ├── layout.tsx            # Auth guard (redirect if no session)
│   │   ├── recipes/
│   │   │   ├── page.tsx          # Recipe list (search by title+ingredients, filter by tags)
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx      # Recipe detail view (RTL)
│   │   │   │   ├── edit/page.tsx # Edit mode (drag-and-drop instructions)
│   │   │   │   └── source/page.tsx # Source comparison view (US-4)
│   │   │   └── new/page.tsx      # Add recipe: manual / photo / link tabs
│   │   └── layout.tsx
│   └── api/
│       └── recipes/
│           ├── parse-url/route.ts     # URL → JSON-LD/Readability → Claude translation
│           └── parse-image/route.ts   # Image → Claude vision OCR + translation
├── components/
│   ├── ui/                       # shadcn/ui (installed with --rtl)
│   ├── recipe/
│   │   ├── recipe-card.tsx       # Grid/list item
│   │   ├── recipe-form.tsx       # Manual entry + edit form (React Hook Form + Zod)
│   │   ├── recipe-list.tsx       # Search + filter + grid
│   │   ├── ingredient-list.tsx   # Ingredient display with checkboxes
│   │   ├── instruction-list.tsx  # Ordered steps with drag-and-drop
│   │   ├── photo-upload.tsx      # Camera/gallery + client compression
│   │   ├── url-input.tsx         # URL paste input
│   │   └── source-comparison.tsx # Side-by-side original vs Hebrew (US-4)
│   ├── auth/
│   │   ├── login-form.tsx
│   │   ├── signup-form.tsx
│   │   ├── forgot-password-form.tsx
│   │   └── oauth-buttons.tsx     # Google SSO button
│   └── layout/
│       ├── app-shell.tsx         # Main app wrapper (nav, header)
│       ├── bottom-nav.tsx        # Mobile bottom navigation
│       └── direction-provider.tsx # RTL DirectionProvider for portals
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # createBrowserClient() for Client Components
│   │   ├── server.ts             # createServerClient() for Server Components/Actions
│   │   └── middleware.ts         # Session refresh helper
│   ├── ai/
│   │   ├── client.ts             # Anthropic SDK client (server-only)
│   │   ├── parse-recipe-url.ts   # Hybrid: JSON-LD → Readability → Claude extraction
│   │   ├── parse-recipe-image.ts # Claude vision OCR + tool use
│   │   └── translate.ts          # Hebrew translation prompt
│   ├── validators/
│   │   ├── recipe.ts             # Zod schemas for recipe CRUD
│   │   ├── auth.ts               # Zod schemas for auth forms
│   │   └── ai-response.ts        # Zod schemas for AI tool output
│   └── utils.ts                  # Minimal shared helpers (if any)
├── hooks/
│   ├── use-recipes.ts            # Recipe CRUD operations via Supabase
│   └── use-auth.ts               # Auth state hook
├── types/
│   └── database.ts               # Supabase generated types
└── middleware.ts                  # Next.js middleware: auth redirect + session refresh

tests/
├── integration/
│   ├── auth.test.ts              # Auth flows (signup, login, forgot-password)
│   ├── recipe-crud.test.ts       # Recipe create/read/update/delete
│   ├── recipe-ingestion.test.ts  # URL/photo ingestion + AI fallback
│   └── source-comparison.test.ts # Source view (US-4)
├── unit/
│   ├── validators.test.ts        # Zod schema tests
│   ├── parse-recipe-url.test.ts  # JSON-LD extraction logic
│   └── parse-recipe-image.test.ts # OCR response handling
└── e2e/                          # Playwright E2E tests
    ├── auth.spec.ts
    ├── recipe-flow.spec.ts
    └── rtl-layout.spec.ts

supabase/
├── migrations/
│   ├── 001_create_recipes.sql    # recipes table + RLS
│   └── 002_create_storage.sql    # Storage bucket + policies
├── seed.sql                      # Dev seed data
└── config.toml                   # Local Supabase config
```

**Structure Decision**: Next.js App Router single-project with route groups:
- `(auth)/` — public pages (login, signup, forgot-password)
- `(protected)/` — auth-required pages (recipes, source view)
- `auth/callback/` — OAuth code exchange (not in a route group)
- `api/recipes/` — server-side AI operations (keeps API keys secret)

Source comparison view moved under `recipes/[id]/source/` to keep recipe-related routes
together. Supabase migrations in standard `supabase/` directory.

## Key Architecture Decisions

### AI Processing Pipeline

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────┐
│   Photo Upload  │     │   URL Paste      │     │ Manual Entry │
│ (client-side    │     │ (user pastes     │     │ (form input) │
│  compression)   │     │  recipe URL)     │     │              │
└────────┬────────┘     └────────┬─────────┘     └──────┬───────┘
         │                       │                       │
         ▼                       ▼                       │
┌─────────────────┐     ┌──────────────────┐            │
│ Upload to       │     │ POST /api/       │            │
│ Supabase Storage│     │ recipes/parse-url│            │
└────────┬────────┘     └────────┬─────────┘            │
         │                       │                       │
         ▼                       ▼                       │
┌─────────────────┐     ┌──────────────────┐            │
│ POST /api/      │     │ 1. JSON-LD check │            │
│ recipes/        │     │ 2. Readability   │            │
│ parse-image     │     │ 3. Claude Haiku  │            │
└────────┬────────┘     │    extraction    │            │
         │              └────────┬─────────┘            │
         ▼                       │                       │
┌─────────────────┐              │                       │
│ Claude Sonnet   │              ▼                       │
│ vision + tool   │     ┌──────────────────┐            │
│ use (strict)    │     │ Claude Sonnet    │            │
│ OCR+translate   │     │ Hebrew translate │            │
└────────┬────────┘     └────────┬─────────┘            │
         │                       │                       │
         ▼                       ▼                       ▼
┌──────────────────────────────────────────────────────────┐
│                 Zod validation                            │
│           (RecipeFormSchema.safeParse)                    │
└──────────────────────────┬───────────────────────────────┘
                           │
                    ┌──────┴──────┐
                    │ Valid?      │
                    ├── YES ──────┤──────────────────────┐
                    │ NO/Error    │                      ▼
                    └──────┬──────┘             ┌────────────────┐
                           │                   │ Save to Supabase│
                           ▼                   │ (recipe + image │
                    ┌────────────────┐         │  path)          │
                    │ Show edit form │         └────────────────┘
                    │ pre-filled with│
                    │ raw input      │
                    └────────────────┘
```

### Authentication Flow

```
┌─────────┐     ┌──────────┐     ┌──────────────┐
│ Login/  │────▶│ Supabase │────▶│ Set cookies  │
│ Signup  │     │ Auth API │     │ via @supabase│
│ Page    │     │          │     │ /ssr         │
└─────────┘     └──────────┘     └──────┬───────┘
                                        │
                                        ▼
                                ┌──────────────┐
                                │ middleware.ts │
                                │ getUser() on │
                                │ every request│
                                └──────┬───────┘
                                       │
                                ┌──────┴──────┐
                                │ Has user?   │
                                ├── YES ──────┤──▶ /recipes (protected)
                                │ NO          │
                                └──────┬──────┘
                                       ▼
                                  /login (public)
```

### Data Flow: Recipe Search

```
User types in search bar
       │
       ▼
Supabase query:
  .from('recipes')
  .select('*')
  .eq('user_id', userId)                    ← RLS also enforces this
  .or(`title.ilike.%${query}%,ingredients.cs.{${query}}`)
  .order('last_edited_at', { ascending: false })
       │
       ▼
Display results in grid/list
```

## Dependency Installation Plan

### Core dependencies

```bash
# Next.js project init (if starting fresh)
npx create-next-app@latest kitchen-notebook --typescript --tailwind --app --src-dir

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# UI
npx shadcn@latest init --rtl
# Then add components as needed: npx shadcn@latest add button card input dialog ...

# AI
npm install @anthropic-ai/sdk

# Forms + validation
npm install react-hook-form @hookform/resolvers zod

# URL scraping
npm install cheerio @mozilla/readability jsdom
npm install -D @types/jsdom

# Image compression
npm install browser-image-compression

# Drag and drop (for instruction reordering)
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Dev dependencies

```bash
# Testing
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/dom jsdom vite-tsconfig-paths
npm install -D @playwright/test

# Supabase CLI (for local dev + migrations)
npm install -D supabase
```

### Environment variables

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
ANTHROPIC_API_KEY=<claude-api-key>  # Server-only, no NEXT_PUBLIC_ prefix
```

## Complexity Tracking

> No constitution violations detected. Table intentionally left empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
