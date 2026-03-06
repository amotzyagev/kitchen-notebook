# Feature Specification: Kitchen-Notebook (מחברת המתכונים)

**Date**: 2026-03-06 | **Branch**: `master` | **Status**: Draft

## Overview

Kitchen-Notebook is a mobile-friendly recipe management app for Hebrew-speaking users. It ingests recipes from multiple sources (manual entry, photo capture, link paste), uses AI to parse and translate them into Hebrew, and stores them in a personal, private digital recipe notebook. The app supports full RTL layout and provides source comparison capabilities.

## User Stories

### US-1: Authentication & User Management (P1 - MVP)

**As a** user, **I want to** sign up and log in securely, **so that** my recipes are private and accessible only to me.

#### Acceptance Criteria

- Login/Signup page with clean, RTL-aligned design
- Email + Password authentication with "Forgot Password" flow
- Sign in with Google (SSO)
- Sign in with Apple (SSO) — **deferred to post-MVP** (requires $99/year Apple Developer account + complex setup)
- All user data (recipes, images, tags) tied to `user_id` for complete privacy
- Session persistence across app restarts

### US-2: Recipe Ingestion (P1 - MVP)

**As a** user, **I want to** add recipes via manual entry, photo capture, or link paste, **so that** I can collect recipes from any source.

#### Acceptance Criteria

- **Manual Entry**: Form with fields for title, ingredients, instructions, notes
- **Photo Capture/Upload**: Camera capture or gallery upload; AI extracts recipe text from image
- **Link Paste**: Paste a URL; AI scrapes and parses the recipe content
- AI translates non-Hebrew recipes into Hebrew automatically
- Original source (URL, photo, or raw text) is preserved alongside the translated recipe
- **AI Failure Fallback**: If AI parsing/translation fails (e.g., blurry photo, unreachable URL, unsupported language), the raw input is saved and the user is presented with an editable recipe form to manually fill or correct fields
- **Processing Model**: AI ingestion (parsing, OCR, translation) runs synchronously — the user sees a loading/progress indicator while waiting. No background job infrastructure required for MVP

### US-3: Recipe CRUD & Editing (P1 - MVP)

**As a** user, **I want to** view, edit, and delete my recipes at any time, **so that** I can maintain and improve my recipe collection.

#### Acceptance Criteria

- Recipe list/grid view with search (by title and ingredients) and filter by tags
- Full recipe detail view with RTL layout
- **Edit Mode (מצב עריכה)**: Update title, ingredients, instructions, and personal notes
- Reorder instruction steps via drag-and-drop or move controls
- Delete recipe with confirmation dialog
- `last_edited_at` timestamp updated on every edit

### US-4: View Source & Review Flow (P2)

**As a** user, **I want to** view the original source of an imported recipe, **so that** I can verify the AI translation and correct mistakes.

#### Acceptance Criteria

- "Original Source" (מקור) button on recipes imported via link — opens original URL
- "View Original" (הצג מקור) button for all imported recipes
- Source comparison view: modal or split-screen showing original text/photo/link alongside Hebrew translation
- Users can switch between source view and edit mode to fix translation errors

## Data Architecture

### Recipe Object

| Field | Type | Description |
|-------|------|-------------|
| `recipe_id` | UUID | Primary key |
| `user_id` | UUID/String | Owner reference (foreign key to user) |
| `title` | String | Recipe title (Hebrew) |
| `ingredients` | Array<String> | List of ingredients (Hebrew) |
| `instructions` | Array<String> | Ordered steps (Hebrew) |
| `notes` | String | User's personal notes |
| `original_text` | String | Raw text before translation |
| `source_type` | Enum | 'manual' \| 'link' \| 'image' |
| `source_url` | String? | Original URL (if link import) |
| `source_image_path` | String? | Cloud storage path (if photo import) |
| `tags` | Array<String> | User-defined tags |
| `created_at` | Timestamp | Creation time |
| `last_edited_at` | Timestamp | Last modification time |

### User Profile

| Field | Type | Description |
|-------|------|-------------|
| `user_id` | UUID/String | Primary key |
| `email` | String | User email |
| `display_name` | String | Display name |
| `auth_provider` | String | 'email' \| 'google' \| 'apple' |
| `preferences` | Object | User settings (language, theme, etc.) |
| `created_at` | Timestamp | Account creation time |

## Clarifications

### Session 2026-03-06

- Q: When AI fails to parse or translate a recipe, what should happen? → A: Save raw input as-is; user manually fills/edits the recipe fields
- Q: Should AI recipe ingestion happen synchronously or asynchronously? → A: Synchronous — user sees a loading/progress indicator and waits (simpler MVP)
- Q: Should the app support offline access to saved recipes? → A: No — online-only for MVP; recipes require network access
- Q: Should recipe images use Supabase Storage or a separate provider? → A: Supabase Storage — unified backend with native auth/RLS integration
- Q: What should recipe list search cover? → A: Title + ingredients — covers "what can I make with X?" use case

## Non-Functional Requirements

- **RTL**: Full right-to-left layout for Hebrew UI
- **Mobile-first**: Optimized for phones and tablets (Android + iOS/iPadOS)
- **Cross-platform**: Accessible via Chrome on Android and Safari on iOS
- **Privacy**: Strict user data isolation — no cross-user data access
- **Connectivity**: Online-only for MVP — no offline/PWA caching. All operations require network access
- **Cloud Storage**: Recipe images stored in Supabase Storage with per-user RLS policies for isolation
- **AI Integration**: Recipe parsing, OCR, and translation via AI service
