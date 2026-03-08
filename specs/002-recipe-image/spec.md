# Feature Specification: Recipe Image Upload

**Feature Branch**: `002-recipe-image`
**Created**: 2026-03-08
**Status**: Draft
**Input**: User wants to add recipe cover images that display as card backgrounds on the homepage and as hero images on the recipe detail page, with upload from camera or media library.

## Clarifications

### Session 2026-03-08

- Q: Can users delete/remove an image without replacing it? → A: Yes, allow removal — add a "Remove Image" option when an image exists.
- Q: Should the button label change when an image already exists? → A: Yes, dynamic label — shows "Add Image" when no image, "Change Image" when image exists.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upload a Recipe Image (Priority: P1)

A user opens a recipe they created and wants to add a photo of the dish. At the bottom of the recipe page, they tap "Add Image." The system offers a choice between selecting from the device's media library or taking a photo with the camera. After selecting/capturing an image, the system compresses it and uploads it. The image then appears on the recipe detail page below the title and tags.

**Why this priority**: This is the core feature — without upload capability, nothing else works.

**Independent Test**: Open any owned recipe, tap "Add Image", select a photo, verify it appears on the recipe detail page under the title and tags.

**Acceptance Scenarios**:

1. **Given** a recipe with no image, **When** the user taps "Add Image" at the bottom of the recipe page, **Then** a prompt appears offering "Media Library" and "Camera" options.
2. **Given** the user selects an image from the media library, **When** the image is uploaded, **Then** the compressed image is stored and immediately displayed on the recipe page below the title and tags.
3. **Given** the user chooses "Camera", **When** they capture a photo, **Then** the photo is compressed and uploaded, appearing on the recipe page.
4. **Given** the upload is in progress, **When** the user waits, **Then** a loading indicator is shown on the button.

---

### User Story 2 - Replace an Existing Recipe Image (Priority: P1)

A user has a recipe that already has an image. They want to replace it with a better photo. When they tap "Add Image", the system informs them that the current image will be replaced. After confirmation, the new image replaces the old one.

**Why this priority**: Equally essential — users must be able to update photos without confusion about what happens to the old one.

**Independent Test**: Open a recipe that already has an image, tap "Add Image", verify the replacement warning is shown, upload a new image, verify the old image is replaced.

**Acceptance Scenarios**:

1. **Given** a recipe with an existing image, **When** the user taps "Add Image", **Then** the system displays a message indicating the current image will be replaced.
2. **Given** the user confirms and selects a new image, **When** the upload completes, **Then** the old image is deleted and the new image is displayed.
3. **Given** the user sees the replacement warning, **When** they cancel, **Then** no changes are made.
4. **Given** a recipe with an existing image, **When** the user chooses "Remove Image", **Then** the image is deleted and the recipe returns to its no-image state.

---

### User Story 3 - Recipe Card Background Image on Homepage (Priority: P2)

On the recipes list page (homepage), recipe cards that have an uploaded image display it as a background image behind the card content. The card retains its current color scheme (light/dark mode) with slight opacity so the image is visible behind the text without interfering with readability.

**Why this priority**: This is the visual payoff of uploading images — making the recipe list more visually appealing. Depends on US1 for images to exist.

**Independent Test**: Upload an image to a recipe (US1), return to the recipes list, verify the recipe card shows the image as a background with the text overlay remaining readable in both light and dark modes. Verify cards without images look unchanged.

**Acceptance Scenarios**:

1. **Given** a recipe with an uploaded image, **When** the user views the recipes list, **Then** the recipe card displays the image as a background with a semi-transparent color overlay preserving readability.
2. **Given** a recipe without an uploaded image, **When** the user views the recipes list, **Then** the recipe card looks exactly as it does today (no change).
3. **Given** the user switches between light and dark mode, **When** viewing a recipe card with an image, **Then** the overlay color adapts to the current theme while maintaining readability.

---

### User Story 4 - Shared Recipe Image Visibility (Priority: P3)

When a recipe with an image is shared (via notebook sharing or individual recipe sharing), the recipient can see the recipe image both on the recipe card (background) and on the recipe detail page. Recipients cannot change or delete the image.

**Why this priority**: Extends the feature to shared context. Lower priority since sharing is a secondary use case.

**Independent Test**: Share a recipe that has an image with another user, log in as that user, verify the image appears on both the card and the detail page. Verify the recipient does not see the "Add Image" button.

**Acceptance Scenarios**:

1. **Given** a shared recipe with an image, **When** the recipient views the recipes list, **Then** the recipe card shows the image background.
2. **Given** a shared recipe with an image, **When** the recipient opens the recipe detail page, **Then** the image is displayed below the title and tags.
3. **Given** a shared recipe, **When** the recipient views the recipe page, **Then** no "Add Image" button is shown.

---

### Edge Cases

- What happens when the user uploads a very large image (e.g., 20MB)? The system compresses it client-side before upload to fit within storage constraints.
- What happens when the upload fails mid-way? The system shows an error message and the recipe retains its previous state (no image or existing image unchanged).
- What happens when the user's device doesn't support camera access? The "Camera" option is hidden or disabled; only "Media Library" is available.
- What happens when the user uploads a non-image file? The file input only accepts image types (JPEG, PNG, WebP).
- What happens on slow connections? The loading indicator remains visible until upload completes or times out with an error message.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow recipe owners to upload an image for any recipe they own.
- **FR-002**: System MUST offer the user a choice between media library and device camera when adding an image.
- **FR-003**: System MUST compress uploaded images client-side to a maximum size suitable for storage (targeting under 500KB per image to support hundreds of recipes).
- **FR-004**: System MUST store the uploaded image associated with the specific recipe and user.
- **FR-005**: System MUST display the uploaded image on the recipe detail page, positioned below the title and tags section.
- **FR-006**: System MUST NOT change the recipe detail page layout when no image exists for a recipe.
- **FR-007**: System MUST display the uploaded image as a background on the recipe card in the recipes list, with a semi-transparent overlay in the current theme color to maintain text readability.
- **FR-008**: System MUST NOT change the appearance of recipe cards that have no uploaded image.
- **FR-009**: When a recipe already has an image, the system MUST inform the user that the existing image will be replaced before proceeding.
- **FR-010**: System MUST delete the old image from storage when it is replaced by a new one.
- **FR-015**: System MUST allow recipe owners to remove an uploaded image, returning the recipe to its no-image state.
- **FR-016**: The "Add Image" button MUST display as "Change Image" when the recipe already has an uploaded image.
- **FR-011**: System MUST show a loading indicator during image upload.
- **FR-012**: System MUST allow shared recipe recipients to view recipe images (both on cards and detail pages).
- **FR-013**: System MUST hide the "Add Image" button for recipes the user does not own.
- **FR-014**: System MUST handle upload errors gracefully with a user-facing error message in Hebrew.

### Key Entities

- **Recipe Image**: A compressed photo associated with a recipe. Stored in cloud storage under the recipe owner's folder. Each recipe has at most one image. Replaces any previous image on re-upload.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can upload a recipe image in under 10 seconds on a typical mobile connection (including compression).
- **SC-002**: Compressed images are under 500KB each, ensuring hundreds of recipes with images remain within reasonable storage limits.
- **SC-003**: Recipe cards with images maintain text readability — text contrast ratio meets WCAG AA standards against the overlay.
- **SC-004**: Recipe detail pages with images load within 2 seconds on a typical connection.
- **SC-005**: 100% of existing recipes without images continue to display identically to the current design.

## Assumptions

- The existing `recipe-images` Supabase Storage bucket will be reused for cover images, using a path convention that distinguishes cover images from source images.
- Client-side compression will use the existing `browser-image-compression` library already in the project.
- The "Add Image" button will be at the bottom of the recipe detail page, consistent with the existing action buttons area.
- Camera access uses the standard HTML `capture` attribute on file inputs, which is natively supported on mobile browsers without additional libraries.
- Image format after compression will be JPEG or WebP for optimal size.
