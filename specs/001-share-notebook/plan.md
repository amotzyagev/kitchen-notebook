# Implementation Plan: Share Notebook

**Branch**: `001-share-notebook` | **Date**: 2026-03-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-share-notebook/spec.md`

## Summary

Add notebook-level sharing: a user can share their entire recipe collection with another user by email. Recipients must approve before seeing shared recipes. Shared recipes are read-only and update live (on refresh). Recipients can hide (reversible) or remove (permanent) shared notebooks. Owners can manage and revoke shares. An in-app notification badge in the header alerts recipients of pending invitations.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+
**Primary Dependencies**: Next.js 15 (App Router), @supabase/supabase-js, @supabase/ssr, Tailwind CSS v4, shadcn/ui, Zod
**Storage**: Supabase PostgreSQL with RLS, Supabase Storage
**Testing**: Manual testing with Supabase local instance, npm run lint
**Target Platform**: Vercel (web), mobile-first responsive
**Project Type**: Web application (Next.js fullstack)
**Performance Goals**: Pages load in <3 seconds, notification check on every page load
**Constraints**: RTL (Hebrew), mobile-first (375px baseline), read-only shared recipes
**Scale/Scope**: Small user base (<100 users), family/friends sharing

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | ✅ Pass | Single new table, minimal new components, reuses existing patterns |
| II. Supabase as Single Backend | ✅ Pass | All data in Supabase PostgreSQL with RLS, no additional services |
| III. Mobile-First RTL | ✅ Pass | Notification badge and management UI designed mobile-first RTL |
| IV. User Data Isolation | ✅ Pass | RLS policies enforce: pending shares invisible, approved shares read-only, hidden shares filtered |
| V. Graceful AI Degradation | ✅ N/A | No AI features in this feature |
| VI. Quality Assurance | ✅ Pass | Zod validation on API inputs, migrations tested locally, lint clean |

## Project Structure

### Documentation (this feature)

```text
specs/001-share-notebook/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
supabase/migrations/
├── 008_create_notebook_shares.sql    # New table + RLS policies

src/
├── types/
│   └── database.ts                   # Updated with notebook_shares types
├── app/
│   ├── api/
│   │   └── notebook-shares/
│   │       ├── route.ts              # POST (create share), GET (list my shares)
│   │       ├── [id]/
│   │       │   └── route.ts          # PATCH (approve/decline/hide/unhide), DELETE (remove/revoke)
│   │       ├── pending/
│   │       │   └── route.ts          # GET (pending invitations count + list)
│   │       └── received/
│   │           └── route.ts          # GET (received shares for management)
│   └── (protected)/
│       └── recipes/
│           └── page.tsx              # Updated query to include notebook-shared recipes
├── components/
│   ├── layout/
│   │   └── app-shell.tsx             # Add notification badge
│   ├── notebook/
│   │   ├── share-notebook-dialog.tsx # Share my notebook (email input)
│   │   ├── pending-invitations.tsx   # List + approve/decline pending shares
│   │   └── shared-notebooks-list.tsx # Manage shared notebooks (hide/unhide/remove)
│   └── recipe/
│       ├── recipe-card.tsx           # Updated: show owner name for notebook-shared
│       └── recipe-list.tsx           # Updated: filter by notebook owner
└── hooks/
    └── use-notebook-shares.ts        # Client hook for notebook share operations
```

**Structure Decision**: Follows existing codebase conventions — API routes under `src/app/api/`, components organized by domain, migrations numbered sequentially. New `notebook/` component folder for share-specific UI.

### Owner Name Data Flow

The `user_profiles` table does not store display names. Display names live in Supabase Auth metadata (`user.user_metadata.display_name`). API routes that need owner names (e.g. `GET /pending`, `GET /received`) must use the Supabase admin client (`auth.admin.getUserById()`) and extract `user_metadata.display_name`, falling back to email.

On the recipes page, the app fetches the user's approved `notebook_shares` with owner info and builds a client-side map of `owner_id → {name, email}`. This map is passed to `RecipeList` → `RecipeCard`. For any recipe where `user_id !== currentUserId`, the owner name is looked up from this map.

### UI Entry Points

- **Share my notebook**: Added to the user dropdown menu in `app-shell.tsx` (alongside "התנתק"), opens `ShareNotebookDialog`
- **Manage shared notebooks**: Link in the user dropdown or a section on the recipes page, opens `SharedNotebooksList`
- **Pending invitations**: Notification badge in the header (inside `app-shell.tsx`); clicking it opens a dropdown/popover with `PendingInvitations`
