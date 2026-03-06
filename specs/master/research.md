# Research: Kitchen-Notebook (מחברת המתכונים)

**Date**: 2026-03-06 | **Branch**: `master` | **Plan**: [plan.md](plan.md) | **Spec**: [spec.md](spec.md)

---

## R1: Testing Framework

**Decision**: Vitest + React Testing Library (components) + Playwright (E2E)

**Rationale**: Vitest is officially supported by Next.js 15 (listed first in docs, has
`with-vitest` starter template). It is 4–8x faster than Jest, requires zero Babel/transform
config for TypeScript, and has Jest-compatible API for low learning curve. Async Server
Components cannot be unit-tested by either framework — use Playwright for E2E.

**Alternatives considered**:
- Jest: Still supported but requires `next/jest`, `ts-jest`, more config. Slower. Rejected.
- Cypress: No WebKit/Safari support — critical for iOS testing. Rejected.

**Key packages**:
- `vitest` — test runner
- `@vitejs/plugin-react` — React support
- `@testing-library/react` + `@testing-library/dom` — component testing
- `jsdom` — browser environment simulation
- `vite-tsconfig-paths` — resolve `@/` path aliases
- `@playwright/test` — E2E tests for full user flows and RTL verification

**Test layers**:

| Layer | Tool | Scope |
|-------|------|-------|
| Unit | Vitest | Zod schemas, utils, data transforms |
| Component | Vitest + RTL | Recipe forms, cards, auth UI |
| Integration | Vitest + mocked Supabase | CRUD operations, AI response handling |
| E2E | Playwright | Auth flow, recipe CRUD, RTL layout, mobile viewports |

**Setup**: Minimal `vitest.config.mts` with `environment: 'jsdom'` and `tsconfigPaths()`.

---

## R2: Recipe URL Scraping

**Decision**: Hybrid — JSON-LD extraction (Cheerio) → Readability fallback → Claude AI
as last resort.

**Rationale**: ~70–80% of recipe sites include `schema.org/Recipe` JSON-LD (required by
Google for rich results). Direct extraction is free, fast, and reliable. When JSON-LD is
absent, `@mozilla/readability` strips boilerplate to ~3,000 tokens (vs 50,000 raw HTML),
then Claude extracts structured recipe data. This minimizes AI token cost.

**Alternatives considered**:
- JSON-LD only: ~20–30% of URLs would fail. Rejected as sole approach.
- Raw HTML → Claude: 10–50x more token cost, slow. Rejected as primary path.
- Dedicated recipe-scraper npm packages: Site-specific allowlists, break when sites change. Rejected.

**Key packages**:
- `cheerio` ^1.0 — HTML parsing, JSON-LD `<script>` extraction
- `@mozilla/readability` ^0.6 — article text extraction (strips nav, ads, footer)
- `jsdom` ^25 — DOM environment for Readability (lazy-loaded behind JSON-LD check)
- Native `fetch` (Node 20+) — no axios/node-fetch needed

**Implementation flow**:
```
URL → fetch(url) with browser User-Agent + 10s timeout
    → Cheerio: extract <script type="application/ld+json"> for @type: "Recipe"
    → Found? → Map schema.org fields directly (zero AI cost)
    → Not found? → Readability.parse() → trim to 8,000 chars → Claude Haiku extraction
    → Still failed? → Return error → user enters manually (per spec fallback)
    → Translation step: Send extracted data to Claude Sonnet for Hebrew translation
```

**Notes**:
- Use Claude Haiku for extraction (cheapest), Sonnet for Hebrew translation
- Set browser-like `User-Agent` header to avoid 403s
- Handle JSON-LD variants: `@graph` arrays, nested Recipe types
- Route Handler at `app/api/recipes/parse-url/route.ts` (server-side, keeps keys secret)

---

## R3: Claude Vision API for Recipe Photo OCR

**Decision**: Claude Sonnet with base64 image input + tool use (`strict: true`) for
structured JSON output. Single API call handles OCR + parse + Hebrew translation.

**Rationale**: Claude's vision handles printed and handwritten text without separate OCR
services. Tool use with `strict: true` guarantees JSON schema compliance — no retry logic
needed. Single call for OCR + translation keeps latency low (~3–8 seconds).

**API details**:
- Image format: base64 (`image/jpeg`, `image/png`, `image/webp`, `image/gif`)
- Max size: 5 MB per image, 8000×8000 px max
- Recommended: resize to ≤1.15 megapixels (≈1092×1092), JPEG, ≤1 MB
- Token cost formula: `(width × height) / 750` ≈ 1,590 tokens at recommended size
- Place image block BEFORE text block in `content` array for best performance

**Tool schema** (forces structured output):
```typescript
{
  name: "save_recipe",
  strict: true,
  input_schema: {
    properties: {
      title: { type: "string" },           // Hebrew
      ingredients: { type: "array", items: { type: "string" } },  // Hebrew
      instructions: { type: "array", items: { type: "string" } }, // Hebrew
      notes: { type: "string" },
      original_text: { type: "string" },    // Raw OCR before translation
      confidence: { type: "string", enum: ["high", "medium", "low"] },
      is_recipe: { type: "boolean" }
    }
  }
}
```
Use `tool_choice: { type: "any" }` to force tool call (no free-text responses).

**Cost**: ~$0.005–0.008 per recipe photo (Sonnet). At 50 recipes/month: <$0.40/month.

**Error handling**:
- `is_recipe: false` → "לא זיהיתי מתכון בתמונה" (no recipe detected)
- `confidence: "low"` → show extracted text, prompt user to review/edit
- API timeout (30s max) → save raw image, show manual edit form (per spec)
- `stop_reason: "max_tokens"` → recipe truncated, increase `max_tokens` to 3000

---

## R4: Supabase Auth with SSO

**Decision**: Supabase Auth via `@supabase/ssr` with cookie-based sessions.
MVP: Email/Password + Google OAuth. **Apple Sign-In deferred to post-MVP.**

**Rationale**: `@supabase/ssr` is the current official package (replaces deprecated
`@supabase/auth-helpers-nextjs`). Cookie-based sessions are more secure (no XSS via
localStorage) and work with Server Components, API routes, and middleware. Apple SSO
requires $99/year developer account, complex credential setup, and 6-month key rotation
— too much overhead for MVP.

**Google SSO setup**:
1. Google Cloud Console → Credentials → OAuth 2.0 Client ID (Web application)
2. Authorized origins: `http://localhost:3000`, `https://yourdomain.com`
3. Redirect URIs: `https://<project>.supabase.co/auth/v1/callback`
4. Supabase Dashboard → Auth → Providers → Google → paste Client ID + Secret

**Session management** (two client types):
- `createBrowserClient()` — Client Components (`'use client'`)
- `createServerClient()` — Server Components, Route Handlers, Server Actions
- Middleware refreshes access tokens automatically on every request
- Sessions persist via HTTP-only cookies (refresh token: up to 30 days)

**Critical rules**:
- Always use `supabase.auth.getUser()` on server, never `getSession()` (can be spoofed)
- OAuth callback route required at `app/auth/callback/route.ts`
- Middleware must return the `supabaseResponse` object (not a new `NextResponse.next()`)

**Email/Password + Forgot Password flow**:
1. `signUp({ email, password })` → email confirmation sent
2. `signInWithPassword({ email, password })` → session established
3. `resetPasswordForEmail(email, { redirectTo })` → magic link emailed
4. `verifyOtp({ token_hash, type: 'recovery' })` → session for password reset
5. `updateUser({ password: newPassword })` → password changed

**Apple SSO (deferred)**:
Requires: Apple Developer account ($99/year), App ID, Services ID, signing key (.p8),
Team ID, Key ID. Secret key must be rotated every 6 months. To be added post-MVP when
iOS App Store distribution is considered.

---

## R5: RTL Layout with Tailwind CSS v4

**Decision**: CSS logical properties via Tailwind v4 native utilities, `dir="rtl"` on
`<html>`, **Heebo font**, shadcn/ui with `--rtl` flag.

**Rationale**: Tailwind v4 ships logical property utilities natively — no plugins or
config needed. shadcn/ui added RTL support in January 2026 via `--rtl` CLI flag that
auto-converts physical to logical classes at install time.

**Font**: **Heebo** — clean sans-serif, 9 weights (Thin to Black), supports Hebrew + Latin.
De facto standard for Israeli product UIs. Imported via `next/font/google` with
`subsets: ['hebrew', 'latin']`.

**Root layout setup**:
```tsx
import { Heebo } from 'next/font/google'
const heebo = Heebo({ subsets: ['hebrew', 'latin'], variable: '--font-heebo' })

<html lang="he" dir="rtl" className={heebo.variable}>
  <body className="font-[--font-heebo]">{children}</body>
</html>
```

**Tailwind v4 logical utilities** (no config needed):

| Physical (DO NOT USE) | Logical (ALWAYS USE) | CSS property |
|-----------------------|---------------------|-------------|
| `pl-4` / `pr-4` | `ps-4` / `pe-4` | padding-inline-start/end |
| `ml-4` / `mr-4` | `ms-4` / `me-4` | margin-inline-start/end |
| `left-0` / `right-0` | `start-0` / `end-0` | inset-inline-start/end |
| `text-left` / `text-right` | `text-start` / `text-end` | text-align |
| `border-l-*` / `border-r-*` | `border-s-*` / `border-e-*` | border-inline-start/end |
| `rounded-l-*` / `rounded-r-*` | `rounded-s-*` / `rounded-e-*` | border-radius logical |

**shadcn/ui RTL**:
- Init with `npx shadcn@latest init --rtl`
- Use `DirectionProvider` wrapper for portal components (Popover, Dialog, Tooltip)
- Directional icons (arrows, chevrons) need `rtl:rotate-180`
- Calendar, Pagination, Sidebar may need manual RTL adjustments

**Mixed LTR/RTL content**:
- URLs, emails, code: wrap in `<span dir="ltr">`
- User-generated content: use `dir="auto"`
- URL input fields: always set `dir="ltr"`

**Key rules**:
- Set `dir="rtl"` on `<html>`, not `<body>`
- Never use physical classes — always logical equivalents
- Flexbox/Grid are direction-aware automatically
- Include both `'hebrew'` and `'latin'` font subsets

---

## R6: Image Upload & Compression

**Decision**: Client-side compression with `browser-image-compression` before uploading
to Supabase Storage. Path: `recipe-images/{user_id}/{recipe_id}/{filename}`.

**Key settings**:
```typescript
const options = {
  maxWidthOrHeight: 1568,  // Matches Claude vision optimal size
  maxSizeMB: 1,            // Well under 5 MB API limit
  useWebWorker: true,      // Non-blocking compression
  fileType: 'image/jpeg',  // Best compression for photos
};
```

**Upload flow**:
1. Camera/gallery → client-side compress → upload to Supabase Storage
2. Route Handler downloads via signed URL → base64-encode → Claude API
3. Store storage path (`source_image_path`) + parsed recipe in database

**Supabase Storage setup**:
- Create `recipe-images` bucket with RLS: `auth.uid() = owner_id`
- Max file size: 5 MB (enforced at bucket level)
- Use signed URLs for temporary Route Handler access

---

## Research Summary

| # | Topic | Decision | Status |
|---|-------|----------|--------|
| R1 | Testing | Vitest + RTL + Playwright | Resolved |
| R2 | URL Scraping | Hybrid: JSON-LD → Readability → Claude | Resolved |
| R3 | Photo OCR | Claude Sonnet vision + tool use | Resolved |
| R4 | Auth | Supabase Auth, Google SSO (Apple deferred) | Resolved |
| R5 | RTL | Tailwind v4 logical props + Heebo font | Resolved |
| R6 | Image Upload | browser-image-compression + Supabase Storage | Resolved |
