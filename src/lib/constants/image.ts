export const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export type ValidImageType = (typeof VALID_IMAGE_TYPES)[number]

export const RECIPE_IMAGES_BUCKET = 'recipe-images'
