# Shopping list

The personal shopping list supports whole-recipe additions from recipe selection and individual ingredient additions from recipe detail pages. The basket in the header is available on all protected pages. Confirmed changes persist in Supabase; unsaved offline edits do not survive a reload.

## Release

Apply `supabase/migrations/018_create_shopping_lists.sql` to the target Supabase database after the preceding migrations, then deploy the application. This migration adds one table, an owner/approval RLS policy and an updated-at trigger. It does not change existing recipes. No remote database migration or deployment was performed during implementation.

The implementation uses a single versioned JSON document per user rather than the three tables proposed in the initial plan. This keeps source additions, generation, and manual edits atomic without a new database RPC. Every write is scoped to the authenticated owner and compares the expected version; stale clients must refresh and retry. The database also enforces ownership and account approval.

Sources contain snapshots of the recipe's title, ingredient text, section, revision and selected multiplier. The combination of recipe revision and ingredient index prevents repeated additions from duplicating contributions. A changed recipe or multiplier requires explicit replacement. Recipe access is checked when adding ingredients; generated lists use saved snapshots afterward.

The current output is a flat list with expandable source details. Editing, adding rows, hiding and restoring rows allow users to correct uncertain entries. Automatic normalization is intentionally conservative: explicit compatible units and known countable ingredients can merge, while unknown wording remains marked for review. Cup quantities are not converted to weights. Calculation uses rational arithmetic and display-only rounding.

## Exports

- Copy text and UTF-8 text-file download.
- WhatsApp compose link, with a long-message fallback to copy/native sharing.
- Native device sharing for Messages/iMessage and other available apps; no delivery is claimed.
- An authenticated RTL print page and the browser's Save as PDF option. This is not a separate server-generated PDF download.

Purchased items are omitted by default, with an option to include them. Pending source changes are identified before export. Print pages warn if their saved version differs from the version the user opened. Exports do not clear the list or mark purchases.

## Verification

```sh
npm test -- --run
npm run lint
npm run build
npm run test:shopping-ui
```

The UI test uses installed Chrome and an isolated Vite harness with mocked account responses; it is not a production route. It covers recipe-to-recipe collection, reload, consolidation, editing, text download, whole-recipe additions, mobile overflow, and print/PDF rendering. Artifacts are written to the ignored `test-results` directory.

Before release, verify the migration against the target database, including reads/writes with two distinct authenticated users and an unapproved account. Local database verification was unavailable because Docker was not running. Native iOS Messages and Android WhatsApp handoff still require device testing; the browser harness does not send messages.
