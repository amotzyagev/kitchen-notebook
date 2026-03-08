# API Contracts: Recipe Image Upload

**Feature Branch**: `002-recipe-image`
**Date**: 2026-03-08

## `POST /api/recipes/[id]/cover-image`

Upload or replace a recipe's cover image.

### Request

- **Auth**: Required (must be recipe owner)
- **Content-Type**: `multipart/form-data`
- **Body**: `file` field containing the image (JPEG, PNG, or WebP)

### Response

**200 OK** — Image uploaded successfully
```json
{
  "cover_image_path": "userId/recipeId/cover.webp"
}
```

**401 Unauthorized** — Not authenticated
```json
{
  "error": "unauthorized",
  "message": "יש להתחבר כדי להשתמש בתכונה זו"
}
```

**403 Forbidden** — Not the recipe owner
```json
{
  "error": "forbidden",
  "message": "אין הרשאה לעדכן מתכון זה"
}
```

**404 Not Found** — Recipe doesn't exist
```json
{
  "error": "not_found",
  "message": "המתכון לא נמצא"
}
```

**400 Bad Request** — No file or invalid file type
```json
{
  "error": "invalid_file",
  "message": "יש להעלות קובץ תמונה (JPEG, PNG או WebP)"
}
```

**413 Payload Too Large** — File exceeds 2MB (server-side safety limit)
```json
{
  "error": "file_too_large",
  "message": "הקובץ גדול מדי. הגודל המרבי הוא 2MB"
}
```

**429 Rate Limited**
```json
{
  "error": "rate_limit",
  "message": "יותר מדי בקשות. נסה שוב בעוד דקה."
}
```

### Behavior

1. Verify authenticated user
2. Rate limit: 10 requests/minute per user
3. Fetch recipe, verify ownership
4. Validate file (type, size)
5. Upload file to `{userId}/{recipeId}/cover.webp` using `{ upsert: true }` (overwrites existing)
6. Update recipe `cover_image_path` column
7. Return new path

**Note**: File size is validated in the handler after parsing FormData (Next.js App Router has no route-level body size config).

---

## `DELETE /api/recipes/[id]/cover-image`

Remove a recipe's cover image.

### Request

- **Auth**: Required (must be recipe owner)
- **Body**: None

### Response

**200 OK** — Image removed
```json
{
  "success": true
}
```

**401 Unauthorized**
```json
{
  "error": "unauthorized",
  "message": "יש להתחבר כדי להשתמש בתכונה זו"
}
```

**403 Forbidden**
```json
{
  "error": "forbidden",
  "message": "אין הרשאה לעדכן מתכון זה"
}
```

**404 Not Found** — Recipe doesn't exist or has no cover image
```json
{
  "error": "not_found",
  "message": "המתכון לא נמצא"
}
```

### Behavior

1. Verify authenticated user
2. Fetch recipe, verify ownership
3. If `cover_image_path` is NULL, return 404
4. Delete file from storage
5. Set `cover_image_path` to NULL
6. Return success
