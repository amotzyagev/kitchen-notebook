<!--
  Sync Impact Report
  Version change: 1.0.0 → 1.1.0 (new principle added)
  Added principles:
    - VI. Quality Assurance
  Modified sections: none
  Removed sections: none
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ aligned (Constitution Check covers new principle)
    - .specify/templates/spec-template.md ✅ aligned
    - .specify/templates/tasks-template.md ✅ aligned
  Follow-up TODOs: none
-->

# Kitchen-Notebook (מחברת המתכונים) Constitution

## Core Principles

### I. Simplicity First

- Every feature MUST use the simplest implementation that satisfies the spec.
- No abstractions, utilities, or helpers until the same pattern appears in 3+ places.
- Use Next.js App Router conventions (file-based routing, server components by default,
  `use client` only when interactivity is required).
- Use shadcn/ui components before building custom UI. Only create custom components
  when no shadcn primitive fits.
- YAGNI: Do not add configurability, feature flags, or extensibility points unless the
  spec explicitly requires them.

**Rationale**: The developer is learning web-app design. Simplicity reduces cognitive
load, speeds debugging, and produces code that is easier to revisit after time away.

### II. Supabase as Single Backend

- All backend concerns (auth, database, storage, real-time) MUST use Supabase services.
- No additional backend servers, API layers, or BaaS providers.
- Database access MUST go through the Supabase client (`@supabase/supabase-js` and
  `@supabase/ssr`) — no raw SQL in application code except in migration files.
- File uploads MUST use Supabase Storage with per-user bucket policies.
- Authentication MUST use Supabase Auth (email/password, Google SSO, Apple SSO).

**Rationale**: A single backend provider eliminates multi-service orchestration, reduces
credentials management, and keeps the deployment footprint minimal.

### III. Mobile-First RTL

- All UI MUST be designed mobile-first (375px viewport as baseline).
- Every page and component MUST render correctly in RTL (`dir="rtl"`).
- Tailwind logical properties (`ps-*`, `pe-*`, `ms-*`, `me-*`, `start`, `end`) MUST be
  used instead of physical `left`/`right` properties.
- Touch targets MUST be at least 44x44px per WCAG guidelines.
- No horizontal scroll on screens up to 430px wide.

**Rationale**: The primary audience uses Hebrew on mobile devices. RTL and mobile
correctness are not afterthoughts — they are baseline requirements.

### IV. User Data Isolation

- Every database table containing user data MUST have a `user_id` column with a
  Row Level Security (RLS) policy restricting access to the owning user.
- RLS MUST be enabled on all user-facing tables — no exceptions.
- Supabase Storage buckets MUST use policies scoped to `auth.uid()`.
- API routes and server actions MUST verify `user_id` matches the authenticated session
  before any read/write operation.
- No shared or public recipe data in MVP.

**Rationale**: Recipe data is personal. Data leaks between users would be a critical
failure. Defense-in-depth (RLS + application checks) prevents accidental exposure.

### V. Graceful AI Degradation

- AI features (parsing, OCR, translation) MUST NOT block the user from saving data.
- If AI processing fails for any reason, the raw input MUST be preserved and the user
  MUST be presented with a manual editing fallback.
- AI calls MUST have a reasonable timeout (30 seconds max) after which the fallback
  activates.
- No silent data loss — every user-submitted input (text, photo, URL) MUST be persisted
  regardless of AI success or failure.

**Rationale**: AI is inherently unreliable. The app must remain useful even when AI
features are degraded or unavailable.

### VI. Quality Assurance

- All external inputs MUST be validated with Zod schemas at system boundaries:
  form submissions, API route handlers, and AI response parsing.
- Every Supabase migration MUST be tested against a local Supabase instance
  (`supabase start`) before applying to production.
- `npm run lint` MUST pass with zero warnings before code is merged. Do not
  disable ESLint rules inline — fix the underlying issue instead.
- Every user story MUST include at least one happy-path integration test and one
  error/edge-case test covering its acceptance criteria.
- RTL layout MUST be visually verified on a 375px viewport for every new page
  or component before marking the story complete.
- AI-powered features (recipe parsing, OCR, translation) MUST be tested with
  both a successful response and a simulated failure to verify the fallback path.

**Rationale**: For a solo beginner developer, automated checks and structured
testing catch mistakes that experience would otherwise prevent. Quality gates
keep the codebase trustworthy as it grows.

## Technology Constraints

- **Runtime**: TypeScript 5.x / Node.js 20+
- **Framework**: Next.js 15 (App Router) — no Pages Router
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions if needed)
- **Styling**: Tailwind CSS v4 — no CSS modules, no styled-components
- **UI Library**: shadcn/ui — no Material UI, no Chakra, no Ant Design
- **AI**: Claude API via `@anthropic-ai/sdk` — no OpenAI, no local models
- **Validation**: Zod for all schema validation (API inputs, form data, AI responses)
- **Forms**: React Hook Form with Zod resolvers
- **Package Manager**: npm (no yarn, no pnpm, no bun)
- **Deployment**: Vercel (Next.js default) — no self-hosted, no Docker for MVP

Adding a technology not listed above requires a constitution amendment.

## Development Workflow

- **Branch strategy**: Feature branches off `main`, merged via pull request.
- **Commit style**: Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`).
- **Testing**: Run `npm test` and `npm run lint` before every PR. Fix failures before
  merging — do not skip or disable checks.
- **One story at a time**: Complete and verify one user story before starting the next.
  Follow priority order (P1 first).
- **Incremental delivery**: Each user story MUST be independently deployable and
  testable. No "big bang" integration at the end.
- **AI-assisted development**: When using Claude Code for implementation, review
  generated code for correctness — do not blindly accept. Ask questions when unsure.

## Governance

- This constitution is the highest-authority document for project decisions.
- All implementation plans, task lists, and code reviews MUST verify compliance with
  these principles.
- Amendments require:
  1. A clear rationale for the change.
  2. Update to this file with version bump.
  3. Review of all dependent artifacts for consistency.
- Complexity beyond what the spec requires MUST be justified in the plan's Complexity
  Tracking table.
- Version follows MAJOR.MINOR.PATCH semantic versioning:
  - MAJOR: Principle removed or fundamentally redefined.
  - MINOR: New principle or section added.
  - PATCH: Wording clarification or typo fix.

**Version**: 1.1.0 | **Ratified**: 2026-03-06 | **Last Amended**: 2026-03-06
