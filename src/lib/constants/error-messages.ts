/** Shared Hebrew error messages used across API routes */

export const ERROR_RATE_LIMIT = 'יותר מדי בקשות. נסה שוב בעוד דקה.'
export const ERROR_SERVER = 'שגיאה בשרת'

export const ERROR_NOT_A_RECIPE_TEXT = 'לא זיהיתי מתכון בטקסט'
export const ERROR_NOT_A_RECIPE_IMAGE = 'לא זיהיתי מתכון בתמונה'
export function errorNotARecipeFile(filename: string) {
  return `לא זיהיתי מתכון בקובץ: ${filename}`
}
