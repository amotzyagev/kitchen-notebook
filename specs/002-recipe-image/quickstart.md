# Quickstart: Recipe Image Upload

**Feature Branch**: `002-recipe-image`
**Date**: 2026-03-08

## Integration Scenarios

### Scenario 1: Upload First Cover Image

**Precondition**: User is logged in, has at least one recipe with no cover image.

1. Navigate to recipes list
2. Open a recipe → detail page shows no image (layout unchanged)
3. Scroll to bottom → see "הוספת תמונה" (Add Image) button
4. Tap button → prompt offers "ספריית מדיה" (Media Library) and "מצלמה" (Camera)
5. Select image from library
6. Loading indicator appears on button
7. Image appears below title and tags on detail page
8. Navigate back to recipes list → recipe card shows image as background with text overlay

### Scenario 2: Replace Existing Cover Image

**Precondition**: User has a recipe with a cover image.

1. Open recipe → image visible below title
2. Scroll to bottom → see "החלפת תמונה" (Change Image) button
3. Tap button → system shows "התמונה הנוכחית תוחלף" (Current image will be replaced) message
4. Select new image
5. Old image replaced with new one on detail page
6. Recipe card on list page updates to show new background

### Scenario 3: Remove Cover Image

**Precondition**: User has a recipe with a cover image.

1. Open recipe → image visible below title
2. Scroll to bottom → see "החלפת תמונה" (Change Image) button
3. Tap button → options include "הסרת תמונה" (Remove Image)
4. Confirm removal
5. Image disappears from detail page
6. Recipe card returns to plain style (no background)

### Scenario 4: View Shared Recipe with Image

**Precondition**: User A shared notebook with User B, User A has a recipe with a cover image.

1. User B opens recipes list → sees User A's recipe with background image on card
2. User B opens recipe → sees cover image below title and tags
3. User B scrolls to bottom → no "Add Image" button visible (not the owner)

### Scenario 5: No Image — No Change

**Precondition**: Recipes exist without cover images.

1. View recipes list → cards look identical to current design
2. Open recipe detail → page layout is the same as before feature
3. No visual regressions on existing recipes

## Verification Checklist

- [ ] Upload image on mobile (iOS Safari, Android Chrome)
- [ ] Camera capture works on mobile
- [ ] Image compression produces <300KB files
- [ ] Card backgrounds readable in light mode
- [ ] Card backgrounds readable in dark mode
- [ ] Replacement warning shows when image exists
- [ ] Remove image returns recipe to no-image state
- [ ] Shared recipe images visible to recipients
- [ ] Add Image button hidden for non-owners
- [ ] No layout change for recipes without images
- [ ] RTL layout correct on all new UI elements
