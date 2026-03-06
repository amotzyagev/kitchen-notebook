# API Contracts: Kitchen-Notebook (מחברת המתכונים)

**Date**: 2026-03-06 | **Plan**: [../plan.md](../plan.md)

## Overview

Two interface layers:
1. **Supabase Client SDK** — Direct database access with RLS (recipes CRUD, storage)
2. **Next.js Route Handlers** — Server-side AI processing (keeps Claude API key secret)

All Route Handlers require a valid Supabase session (verified via `getUser()` in handler).

---

## 1. Route Handlers (Server-Side)

### POST /api/recipes/parse-url

Fetches a URL, extracts recipe data (JSON-LD → Readability → Claude), translates to Hebrew.

**Request**:
```typescript
// Content-Type: application/json
{
  url: string;  // Recipe URL to scrape
}
```

**Response (200)**:
```typescript
{
  title: string;            // Hebrew
  ingredients: string[];    // Hebrew, one per item
  instructions: string[];   // Hebrew, one per step
  notes: string;            // Hebrew (tips, serving suggestions)
  original_text: string;    // Raw text before translation
  confidence: 'high' | 'medium' | 'low';
}
```

**Error Responses**:
```typescript
// 400 — Missing or invalid URL
{ error: 'invalid_url', message: 'כתובת URL לא תקינה' }

// 422 — Could not extract recipe from page
{ error: 'extraction_failed', message: 'לא הצלחתי לחלץ מתכון מהדף' }

// 500 — AI or network error
{ error: 'ai_error', message: 'שגיאה בעיבוד המתכון' }

// 504 — Timeout (30s max)
{ error: 'timeout', message: 'הבקשה נמשכה זמן רב מדי' }
```

**Auth**: Valid Supabase session required.
**Timeout**: 30 seconds max (Constitution: Principle V).

---

### POST /api/recipes/parse-image

Processes a recipe photo via Claude vision OCR, returns structured recipe data in Hebrew.

**Request**:
```typescript
// Content-Type: application/json
{
  imageBase64: string;      // Base64-encoded image data
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
}
```

**Response (200)**:
```typescript
{
  title: string;            // Hebrew
  ingredients: string[];    // Hebrew
  instructions: string[];   // Hebrew
  notes: string;            // Hebrew
  original_text: string;    // Raw OCR text before translation
  confidence: 'high' | 'medium' | 'low';
  is_recipe: boolean;       // false if image doesn't contain a recipe
}
```

**Error Responses**:
```typescript
// 400 — Missing image data
{ error: 'missing_image', message: 'חסרים נתוני תמונה' }

// 413 — Image too large (> 5 MB)
{ error: 'image_too_large', message: 'התמונה גדולה מדי' }

// 422 — Not a recipe image
{ error: 'not_a_recipe', message: 'לא זיהיתי מתכון בתמונה' }

// 500 — AI processing error
{ error: 'ocr_failed', message: 'שגיאה בזיהוי טקסט מהתמונה' }
```

**Auth**: Valid Supabase session required.
**Timeout**: 30 seconds max.
**Max image size**: 5 MB (base64 ≈ 6.67 MB string).

---

## 2. Supabase Client Operations

TypeScript function signatures for the Supabase client wrapper. All operations are
scoped to the authenticated user via RLS — no `user_id` filter needed in application code.

### Recipes CRUD

```typescript
// List recipes with optional search and tag filter
async function listRecipes(options?: {
  search?: string;          // Search title (ILIKE)
  tag?: string;             // Filter by tag name
  limit?: number;           // Default: 50
  offset?: number;          // Pagination
}): Promise<Recipe[]>

// Get single recipe by ID
async function getRecipe(id: string): Promise<Recipe | null>

// Create recipe
async function createRecipe(data: RecipeInsert): Promise<Recipe>

// Update recipe (partial)
async function updateRecipe(
  id: string,
  data: Partial<RecipeForm>
): Promise<Recipe>

// Delete recipe (also cascades to storage images)
async function deleteRecipe(id: string): Promise<void>
```

### Image Storage

```typescript
// Upload compressed image to Supabase Storage
async function uploadRecipeImage(
  userId: string,
  recipeId: string,
  file: File
): Promise<string>  // Returns storage path

// Get signed URL for image display
async function getRecipeImageUrl(
  path: string
): Promise<string>  // Returns time-limited signed URL

// Delete image from storage
async function deleteRecipeImage(path: string): Promise<void>
```

---

## 3. Zod Request Validation

```typescript
// src/lib/validators/api.ts
import { z } from 'zod';

export const parseUrlRequestSchema = z.object({
  url: z.string().url(),
});

export const parseImageRequestSchema = z.object({
  imageBase64: z.string().min(1),
  mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});
```

---

## 4. Error Handling Convention

All Route Handlers follow this pattern:

```typescript
export async function POST(request: Request) {
  try {
    // 1. Verify auth session (getUser, not getSession)
    // 2. Validate request body with Zod
    // 3. Process (fetch/AI/etc.)
    // 4. Validate AI response with Zod
    // 5. Return structured response
  } catch (error) {
    // Log error server-side
    // Return user-friendly Hebrew error message
    // Never expose internal details to client
  }
}

// Set max duration for AI operations
export const maxDuration = 30;  // seconds
```
