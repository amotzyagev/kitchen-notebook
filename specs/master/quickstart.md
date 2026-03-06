# Quickstart: Kitchen-Notebook (מחברת המתכונים)

**Date**: 2026-03-06 | **Plan**: [plan.md](plan.md)

## Prerequisites

- **Node.js** 20+ and **npm** 9+
- **Git**
- **Docker Desktop** (for local Supabase)
- **Supabase account** (free tier: [supabase.com](https://supabase.com))
- **Claude API key** (from [console.anthropic.com](https://console.anthropic.com))
- **Google Cloud OAuth credentials** (for Google SSO — setup in research.md R4)

## 1. Project Setup

```bash
cd kitchen-notebook

# Create Next.js project in current directory
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Initialize shadcn/ui with RTL support
npx shadcn@latest init --rtl
```

## 2. Install Dependencies

```bash
# Core
npm install @supabase/supabase-js @supabase/ssr
npm install @anthropic-ai/sdk
npm install zod react-hook-form @hookform/resolvers

# URL scraping (server-side)
npm install cheerio @mozilla/readability
npm install -D @types/jsdom
npm install jsdom

# Image compression (client-side)
npm install browser-image-compression

# Drag and drop (instruction reordering)
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Testing
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/dom vite-tsconfig-paths
npm install -D @playwright/test
npx playwright install
```

## 3. Supabase Setup

```bash
# Install Supabase CLI
npm install -D supabase

# Initialize Supabase config
npx supabase init

# Start local Supabase (requires Docker)
npx supabase start
# Note the printed anon key and API URL

# Create migration files
mkdir -p supabase/migrations
# Copy SQL from data-model.md into:
#   supabase/migrations/001_create_recipes.sql
#   supabase/migrations/002_create_storage.sql

# Apply migrations
npx supabase db push
```

## 4. Environment Variables

Create `.env.local` in project root:

```env
# Supabase (from `npx supabase status`)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-local-anon-key>

# Claude API (server-only — no NEXT_PUBLIC_ prefix!)
ANTHROPIC_API_KEY=<your-claude-api-key>
```

## 5. Configure Vitest

Create `vitest.config.mts` in project root:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
  },
})
```

Add to `package.json` scripts:

```json
{
  "scripts": {
    "test": "vitest",
    "test:e2e": "playwright test"
  }
}
```

## 6. Run

```bash
# Development server
npm run dev
# Open http://localhost:3000

# Tests
npm test              # Vitest (unit + component)
npm run test:e2e      # Playwright (E2E)
npm run lint          # ESLint
```

## Key Files to Create First

| Order | File | Purpose |
|-------|------|---------|
| 1 | `src/lib/supabase/client.ts` | Browser Supabase client (`createBrowserClient`) |
| 2 | `src/lib/supabase/server.ts` | Server Supabase client (`createServerClient`) |
| 3 | `src/middleware.ts` | Auth guard + session refresh |
| 4 | `src/app/layout.tsx` | Root layout: `<html lang="he" dir="rtl">`, Heebo font |
| 5 | `src/lib/validators/recipe.ts` | Zod schemas |
| 6 | `src/app/(auth)/login/page.tsx` | Login page |
| 7 | `src/app/(auth)/signup/page.tsx` | Signup page |
| 8 | `src/app/auth/callback/route.ts` | OAuth code exchange |
| 9 | `src/app/(protected)/recipes/page.tsx` | Recipe list |
| 10 | `src/app/(protected)/recipes/new/page.tsx` | Add recipe |
| 11 | `src/app/api/recipes/parse-url/route.ts` | URL scraping + AI |
| 12 | `src/app/api/recipes/parse-image/route.ts` | Photo OCR + AI |

## Development Workflow

1. **Database changes**: Write SQL in `supabase/migrations/`, run `npx supabase db push`
2. **Type generation**: `npx supabase gen types typescript --local > src/types/database.ts`
3. **Add UI components**: `npx shadcn@latest add button card input dialog sheet` (as needed)
4. **Testing**: `npm test -- --watch` during development
5. **Deploy**: Push to GitHub → Vercel auto-deploys. Set env vars in Vercel + connect Supabase project.
