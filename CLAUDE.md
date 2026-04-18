# kitchen-notebook Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-06

## Active Technologies
- TypeScript 5.x / Node.js 20+ + Next.js 15 (App Router), @supabase/supabase-js, @supabase/ssr, (master)
- Supabase PostgreSQL (data) + Supabase Storage (images) (master)
- TypeScript 5.x / Node.js 20+ + Next.js 15 (App Router), @supabase/supabase-js, @supabase/ssr, Tailwind CSS v4, shadcn/ui, Zod (001-share-notebook)
- Supabase PostgreSQL with RLS, Supabase Storage (001-share-notebook)
- TypeScript 5.x / Node.js 20+ + Next.js 15 (App Router), @supabase/supabase-js, @supabase/ssr, Tailwind CSS v4, shadcn/ui, browser-image-compression, Zod (002-recipe-image)
- Supabase PostgreSQL (recipes table) + Supabase Storage (recipe-images bucket) (002-recipe-image)

- TypeScript 5.x / Node.js 20+ + Next.js 15 (App Router), Supabase (@supabase/supabase-js, @supabase/ssr), Tailwind CSS v4, shadcn/ui, Claude API (@anthropic-ai/sdk), Zod, React Hook Form (master)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test; npm run lint

## Code Style

TypeScript 5.x / Node.js 20+: Follow standard conventions

## Recent Changes
- 002-recipe-image: Added TypeScript 5.x / Node.js 20+ + Next.js 15 (App Router), @supabase/supabase-js, @supabase/ssr, Tailwind CSS v4, shadcn/ui, browser-image-compression, Zod
- 001-share-notebook: Added TypeScript 5.x / Node.js 20+ + Next.js 15 (App Router), @supabase/supabase-js, @supabase/ssr, Tailwind CSS v4, shadcn/ui, Zod
- master: Added TypeScript 5.x / Node.js 20+ + Next.js 15 (App Router), @supabase/supabase-js, @supabase/ssr,


<!-- MANUAL ADDITIONS START -->
## Feature Notifications Workflow

When shipping a new feature, add an entry to `src/lib/feature-notifications.ts`.
Users who haven't seen it will automatically get a badge on the bell icon, and will see
the feature description in the notifications dialog on their next login.

Each entry needs: `id` (unique string), `titleHe` (Hebrew title), `bodyHe` (Hebrew description), `date` (YYYY-MM-DD).

The migration `supabase/migrations/013_add_seen_notification_ids.sql` added the `seen_notification_ids text[]`
column to `user_profiles` to track which notifications each user has dismissed.
<!-- MANUAL ADDITIONS END -->
