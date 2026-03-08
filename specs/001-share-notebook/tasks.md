# Tasks: Share Notebook

**Input**: Design documents from `/specs/001-share-notebook/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md

**Tests**: Not requested — no test tasks included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migration and type definitions for the `notebook_shares` table

- [x] T001 Create notebook_shares table migration with RLS policies, indexes, constraints, and updated recipes SELECT policy in supabase/migrations/008_create_notebook_shares.sql
- [x] T002 Add notebook_shares Row/Insert/Update types and Relationships to src/types/database.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared utilities that multiple user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Create admin client helper function that resolves a user ID to `{name, email}` using `auth.admin.getUserById()` with display_name fallback to email in src/lib/supabase/admin.ts
- [x] T004 [P] Create client hook with functions for share, approve, decline, hide, unhide, remove, revoke, and data fetching (pending count, received list, owner list) in src/hooks/use-notebook-shares.ts

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 — Share My Notebook With Another User (Priority: P1) 🎯 MVP

**Goal**: An owner can share their entire notebook with another user by entering their email address

**Independent Test**: Log in as User A, open user dropdown, click "שתף את המחברת", enter User B's email, verify success toast. Check DB for a new `notebook_shares` row with status='pending'. Try sharing with own email (blocked), non-existent email (silent success), duplicate (error).

### Implementation for User Story 1

- [x] T005 [US1] Implement POST handler in src/app/api/notebook-shares/route.ts — validate email with Zod, look up recipient via admin client, enforce self-share check, upsert logic for declined rows with cooldown, INSERT for new shares, silent success for unknown emails
- [x] T006 [P] [US1] Create share-notebook-dialog component with email input, Zod validation, loading state, success/error toasts, and call to POST /api/notebook-shares in src/components/notebook/share-notebook-dialog.tsx
- [x] T007 [US1] Add "שתף את המחברת" menu item to user dropdown in src/components/layout/app-shell.tsx that opens ShareNotebookDialog

**Checkpoint**: User Story 1 fully functional — owners can share their notebook by email

---

## Phase 4: User Story 2 — Receive and Approve a Shared Notebook (Priority: P1)

**Goal**: Recipients see an in-app notification badge for pending invitations and can approve or decline

**Independent Test**: After US1 creates a share, log in as User B, verify badge with count appears in header, click to see pending invitations with owner name, approve — verify sharer's recipes now appear in recipe list. Test decline — verify recipes don't appear and cooldown prevents re-share for 1 day.

### Implementation for User Story 2

- [x] T008 [P] [US2] Implement GET handler in src/app/api/notebook-shares/pending/route.ts — query notebook_shares where shared_with_user_id = current user and status='pending', resolve owner names via admin client, return pending list with count
- [x] T009 [P] [US2] Implement PATCH handler in src/app/api/notebook-shares/[id]/route.ts — validate action (approve/decline/hide/unhide) with Zod, enforce recipient-only access, validate state transitions, set declined_at on decline, return updated status
- [x] T010 [P] [US2] Create pending-invitations component showing list of pending shares with owner name/email, approve and decline buttons, loading states, and toast feedback in src/components/notebook/pending-invitations.tsx
- [x] T011 [US2] Add notification badge (pending count) to header in src/components/layout/app-shell.tsx — fetch count from GET /pending on mount, show badge dot with count, clicking opens popover/dropdown with PendingInvitations component

**Checkpoint**: User Stories 1 & 2 fully functional — complete share-and-approve flow works

---

## Phase 5: User Story 3 — View Shared Notebooks and Their Recipes (Priority: P2)

**Goal**: Approved notebook-shared recipes appear in the recipe list with clear owner attribution

**Independent Test**: With an approved notebook share, verify recipe list shows shared recipes with owner name badge. Test "שותפו איתי" filter includes notebook-shared recipes. Verify multiple shared notebooks show distinct owner names.

### Implementation for User Story 3

- [x] T012 [US3] Implement GET handler in src/app/api/notebook-shares/received/route.ts — query notebook_shares where shared_with_user_id = current user and status IN ('approved', 'hidden'), resolve owner names via admin client, return shares list
- [x] T013 [US3] Update src/app/(protected)/recipes/page.tsx to fetch approved notebook shares via GET /received and build an ownerMap (owner_id → {name, email}), pass ownerMap to RecipeList
- [x] T014 [US3] Update src/components/recipe/recipe-list.tsx to accept ownerMap prop and pass it through to RecipeCard; ensure "שותפו איתי" filter also captures notebook-shared recipes
- [x] T015 [US3] Update src/components/recipe/recipe-card.tsx to accept optional ownerName prop and display it as a badge (e.g., "המחברת של [name]") below the shared badge when present

**Checkpoint**: User Stories 1–3 functional — shared recipes visible with owner attribution

---

## Phase 6: User Story 4 — Hide a Shared Notebook (Priority: P2)

**Goal**: Recipients can hide a shared notebook to temporarily remove its recipes from view, and unhide later

**Independent Test**: With an approved notebook share, open shared notebooks management, hide it — verify recipes disappear from list. Unhide — verify recipes reappear. Verify owner is not notified.

### Implementation for User Story 4

- [x] T016 [US4] Create shared-notebooks-list component showing received approved/hidden notebook shares with owner name, status badge, hide/unhide toggle button using PATCH /api/notebook-shares/[id], in src/components/notebook/shared-notebooks-list.tsx
- [x] T017 [US4] Add "מחברות משותפות" menu item to user dropdown in src/components/layout/app-shell.tsx that opens a dialog/sheet containing SharedNotebooksList

**Checkpoint**: User Story 4 functional — hide/unhide works independently

---

## Phase 7: User Story 5 — Remove a Shared Notebook (Priority: P2)

**Goal**: Recipients can permanently remove a shared notebook, requiring the owner to re-share

**Independent Test**: With an approved or hidden notebook share, click remove in shared notebooks management, confirm — verify share row deleted and recipes disappear. Verify owner can re-share and recipient gets new pending invitation.

### Implementation for User Story 5

- [x] T018 [US5] Implement DELETE handler in src/app/api/notebook-shares/[id]/route.ts — verify current user is either owner_id or shared_with_user_id, delete the row, return success
- [x] T019 [US5] Add remove button with confirmation dialog to shared-notebooks-list component in src/components/notebook/shared-notebooks-list.tsx — calls DELETE /api/notebook-shares/[id], removes item from list on success

**Checkpoint**: User Stories 4 & 5 functional — full recipient management (hide/unhide/remove)

---

## Phase 8: User Story 6 — Manage My Outgoing Notebook Shares (Priority: P3)

**Goal**: Owners can see who they've shared with and revoke access

**Independent Test**: After sharing with multiple users, view sharing management — verify all recipients listed with status. Revoke one — verify recipient can no longer see recipes.

### Implementation for User Story 6

- [x] T020 [US6] Implement GET handler (owner view) in src/app/api/notebook-shares/route.ts — query notebook_shares where owner_id = current user, resolve shared_with_user emails via admin client, return shares list with status
- [x] T021 [US6] Add outgoing shares list with revoke buttons to share-notebook-dialog component in src/components/notebook/share-notebook-dialog.tsx — fetch via GET /api/notebook-shares, show each recipient's email and status, revoke calls DELETE /api/notebook-shares/[id]

**Checkpoint**: All 6 user stories functional — complete sharing feature

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and quality checks

- [x] T022 Verify RTL layout and mobile responsiveness (375px) for all new components: share dialog, pending invitations popover, shared notebooks list, notification badge, owner name badges on recipe cards
- [x] T023 Run `npm run lint` and fix any issues across all new and modified files
- [x] T024 Run full quickstart.md validation: share flow, approve, hide/unhide, remove, decline+cooldown, owner management, mobile RTL

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (types must exist for hook)
- **User Stories (Phase 3–8)**: All depend on Phase 2 completion
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — no dependencies on other stories
- **US2 (P1)**: Can start after Phase 2 — independently testable, but full flow test needs US1 share to exist
- **US3 (P2)**: Can start after Phase 2 — needs an approved share for meaningful test (US1+US2)
- **US4 (P2)**: Can start after Phase 2 — needs approved share for test; shares management UI with US5
- **US5 (P2)**: Depends on US4 (adds remove to shared-notebooks-list created in US4)
- **US6 (P3)**: Depends on US1 (adds outgoing list to share-notebook-dialog created in US1)

### Within Each User Story

- API routes before UI components that consume them
- Components before integration into app-shell or page layouts

### Parallel Opportunities

**Phase 2**: T003 and T004 can run in parallel (different files)

**Phase 3 (US1)**: T005 and T006 can run in parallel (API route vs component)

**Phase 4 (US2)**: T008, T009, and T010 can all run in parallel (three different files), then T011 integrates them

**Phase 5 (US3)**: T012 first (API), then T013–T015 sequentially (each modifies a file that feeds the next)

**Cross-story**: US1 and US2 can run in parallel after Phase 2. US3 and US4 can run in parallel after US2.

---

## Parallel Example: User Story 2

```
# Launch API routes and component in parallel:
Task T008: "GET /api/notebook-shares/pending in src/app/api/notebook-shares/pending/route.ts"
Task T009: "PATCH /api/notebook-shares/[id] in src/app/api/notebook-shares/[id]/route.ts"
Task T010: "pending-invitations component in src/components/notebook/pending-invitations.tsx"

# Then integrate (depends on above):
Task T011: "notification badge + popover in src/components/layout/app-shell.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (migration + types)
2. Complete Phase 2: Foundational (admin helper + hook)
3. Complete Phase 3: US1 — Share my notebook
4. Complete Phase 4: US2 — Receive and approve
5. **STOP and VALIDATE**: Full share→approve→see recipes flow
6. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 + US2 → Core share/approve flow (MVP!)
3. US3 → Owner name attribution on recipe cards
4. US4 + US5 → Recipient management (hide/unhide/remove)
5. US6 → Owner management (view shares, revoke)
6. Polish → RTL, lint, full validation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- The `src/app/api/notebook-shares/route.ts` file is created in US1 (POST) and extended in US6 (GET)
- The `src/app/api/notebook-shares/[id]/route.ts` file is created in US2 (PATCH) and extended in US5 (DELETE)
- The `src/components/layout/app-shell.tsx` is modified in US1 (dropdown item), US2 (badge), and US4 (management item) — these must be sequential
- Owner names are resolved server-side via `auth.admin.getUserById()` → `user_metadata.display_name` with email fallback
- Upsert logic in POST handles re-sharing after decline with 1-day cooldown check
