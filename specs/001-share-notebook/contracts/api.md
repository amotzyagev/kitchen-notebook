# API Contracts: Share Notebook

**Feature**: 001-share-notebook | **Date**: 2026-03-08

## POST /api/notebook-shares

Share my notebook with another user by email.

**Request**:
```json
{ "email": "recipient@example.com" }
```

**Upsert Behavior**: If a share row already exists for this owner+recipient pair:
- If status is `declined`: check cooldown (`declined_at + 1 day < now()`). If cooldown passed, UPDATE status back to `pending`, clear `declined_at`. If cooldown active, return `400`.
- If status is `pending` or `approved` or `hidden`: return `400 Already shared`.
- If no existing row: INSERT new row with status `pending`.

**Responses**:
- `200 OK` — Share created or re-activated (or silently succeeded if user not found)
  ```json
  { "success": true }
  ```
- `400 Bad Request` — Invalid email format
- `400 Bad Request` — Cannot share with yourself
- `400 Bad Request` — Already shared with this user
- `400 Bad Request` — Cooldown active (declined less than 1 day ago)
- `401 Unauthorized` — Not authenticated
- `429 Too Many Requests` — Rate limit exceeded

---

## GET /api/notebook-shares

List users my notebook is shared with (owner view).

**Response**:
```json
{
  "shares": [
    {
      "id": "uuid",
      "shared_with_email": "user@example.com",
      "status": "pending" | "approved" | "declined" | "hidden",
      "created_at": "2026-03-08T..."
    }
  ]
}
```

---

## GET /api/notebook-shares/pending

Get pending invitations for the current user (recipient view).

**Response**:
```json
{
  "pending": [
    {
      "id": "uuid",
      "owner_email": "sharer@example.com",
      "owner_name": "Display Name",
      "created_at": "2026-03-08T..."
    }
  ],
  "count": 1
}
```

> **Note**: `owner_name` is resolved from `auth.users` via `user_metadata.display_name`, falling back to email if no display name is set. Fetched server-side using `auth.admin.getUserById()`.

---

## GET /api/notebook-shares/received

List all notebook shares received by the current user (for management).

**Response**:
```json
{
  "shares": [
    {
      "id": "uuid",
      "owner_email": "sharer@example.com",
      "owner_name": "Display Name",
      "status": "approved" | "hidden",
      "created_at": "2026-03-08T..."
    }
  ]
}
```

> **Note**: `owner_name` resolved the same way as in `/pending` — see note above.

---

## PATCH /api/notebook-shares/[id]

Update share status (recipient actions: approve, decline, hide, unhide).

**Request**:
```json
{ "action": "approve" | "decline" | "hide" | "unhide" }
```

**Responses**:
- `200 OK` — Status updated
  ```json
  { "success": true, "status": "approved" }
  ```
- `400 Bad Request` — Invalid action for current status
- `401 Unauthorized` — Not authenticated
- `403 Forbidden` — Not the recipient of this share

---

## DELETE /api/notebook-shares/[id]

Remove a shared notebook (recipient) or revoke access (owner).

**Responses**:
- `200 OK` — Share deleted
  ```json
  { "success": true }
  ```
- `401 Unauthorized` — Not authenticated
- `403 Forbidden` — Not the owner or recipient of this share
