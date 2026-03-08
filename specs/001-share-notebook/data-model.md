# Data Model: Share Notebook

**Feature**: 001-share-notebook | **Date**: 2026-03-08

## New Table: `notebook_shares`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default gen_random_uuid() | Unique identifier |
| owner_id | uuid | FK → auth.users(id), NOT NULL | User who shares their notebook |
| shared_with_user_id | uuid | FK → auth.users(id), NOT NULL | Recipient user |
| status | text | NOT NULL, CHECK IN ('pending', 'approved', 'declined', 'hidden') | Current state of the share |
| created_at | timestamptz | NOT NULL, default now() | When the share was created |
| updated_at | timestamptz | NOT NULL, default now() | Last status change |
| declined_at | timestamptz | NULL | When the share was declined (for cooldown enforcement) |

### Constraints

- UNIQUE(owner_id, shared_with_user_id) — one share relationship per owner-recipient pair
- CHECK(owner_id != shared_with_user_id) — cannot share with self

### Indexes

- idx_notebook_shares_recipient: (shared_with_user_id, status) — fast lookup for "what's shared with me" and pending count
- idx_notebook_shares_owner: (owner_id) — fast lookup for "who did I share with"

## State Transitions

```
[none] --share--> pending
pending --approve--> approved
pending --decline--> declined
approved --hide--> hidden
approved --remove(recipient)--> [deleted]
approved --revoke(owner)--> [deleted]
hidden --unhide--> approved
hidden --remove(recipient)--> [deleted]
hidden --revoke(owner)--> [deleted]
declined --cooldown expires + re-share--> pending
```

### Upsert Logic for Re-sharing After Decline

The UNIQUE constraint on `(owner_id, shared_with_user_id)` means a declined share cannot be re-created with INSERT. Instead, the `POST /api/notebook-shares` route must:
1. Check for an existing row with the given owner+recipient pair
2. If exists with `status='declined'`, verify cooldown has passed (`declined_at + 1 day < now()`)
3. If cooldown passed, UPDATE the row: set `status='pending'`, clear `declined_at`, update `updated_at`
4. If no existing row, INSERT a new row with `status='pending'`

## RLS Policies on `notebook_shares`

| Policy | Action | Condition |
|--------|--------|-----------|
| Owner can create | INSERT | auth.uid() = owner_id |
| Owner can view own shares | SELECT | auth.uid() = owner_id |
| Recipient can view shares with them | SELECT | auth.uid() = shared_with_user_id |
| Recipient can update status (approve/decline/hide/unhide) | UPDATE | auth.uid() = shared_with_user_id |
| Recipient can delete (remove) | DELETE | auth.uid() = shared_with_user_id |
| Owner can delete (revoke) | DELETE | auth.uid() = owner_id |

## Updated RLS on `recipes` table

Current SELECT policy:
```
user_id = auth.uid()
OR EXISTS(SELECT 1 FROM recipe_shares WHERE recipe_id = recipes.id AND shared_with_user_id = auth.uid())
```

Updated SELECT policy (add third condition):
```
user_id = auth.uid()
OR EXISTS(SELECT 1 FROM recipe_shares WHERE recipe_id = recipes.id AND shared_with_user_id = auth.uid())
OR EXISTS(SELECT 1 FROM notebook_shares WHERE owner_id = recipes.user_id AND shared_with_user_id = auth.uid() AND status = 'approved')
```

## Updated TypeScript Types

Add to `database.ts`:

```typescript
notebook_shares: {
  Row: {
    id: string
    owner_id: string
    shared_with_user_id: string
    status: 'pending' | 'approved' | 'declined' | 'hidden'
    created_at: string
    updated_at: string
    declined_at: string | null
  }
  Insert: {
    id?: string
    owner_id: string
    shared_with_user_id: string
    status?: 'pending' | 'approved' | 'declined' | 'hidden'
    created_at?: string
    updated_at?: string
    declined_at?: string | null
  }
  Update: {
    id?: string
    owner_id?: string
    shared_with_user_id?: string
    status?: 'pending' | 'approved' | 'declined' | 'hidden'
    created_at?: string
    updated_at?: string
    declined_at?: string | null
  }
  Relationships: [
    {
      foreignKeyName: 'notebook_shares_owner_id_fkey'
      columns: ['owner_id']
      referencedRelation: 'users'
      referencedColumns: ['id']
    },
    {
      foreignKeyName: 'notebook_shares_shared_with_user_id_fkey'
      columns: ['shared_with_user_id']
      referencedRelation: 'users'
      referencedColumns: ['id']
    }
  ]
}
```

## Relationship to Existing Tables

- `notebook_shares.owner_id` → `auth.users.id` (the sharer)
- `notebook_shares.shared_with_user_id` → `auth.users.id` (the recipient)
- No direct FK to `recipes` — the relationship is implicit via `recipes.user_id = notebook_shares.owner_id`
- `recipe_shares` remains independent — both can coexist for the same owner-recipient pair
