type CategoryColor = {
  border: string
  bg: string
  text: string
}

const CATEGORIES: Record<string, CategoryColor> = {
  sweet: {
    border: 'border-s-pink-400',
    bg: 'bg-pink-50 dark:bg-pink-950/20',
    text: 'text-pink-600 dark:text-pink-400',
  },
  baking: {
    border: 'border-s-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    text: 'text-amber-600 dark:text-amber-400',
  },
  savory: {
    border: 'border-s-red-400',
    bg: 'bg-red-50 dark:bg-red-950/20',
    text: 'text-red-600 dark:text-red-400',
  },
  salad: {
    border: 'border-s-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  soup: {
    border: 'border-s-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-950/20',
    text: 'text-orange-600 dark:text-orange-400',
  },
  vegan: {
    border: 'border-s-lime-400',
    bg: 'bg-lime-50 dark:bg-lime-950/20',
    text: 'text-lime-600 dark:text-lime-400',
  },
  breakfast: {
    border: 'border-s-yellow-400',
    bg: 'bg-yellow-50 dark:bg-yellow-950/20',
    text: 'text-yellow-600 dark:text-yellow-400',
  },
  snack: {
    border: 'border-s-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-950/20',
    text: 'text-violet-600 dark:text-violet-400',
  },
  asian: {
    border: 'border-s-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-950/20',
    text: 'text-teal-600 dark:text-teal-400',
  },
}

// Map Hebrew tags to category keys - first match wins (priority order)
const TAG_MAP: [string[], string][] = [
  [['סלט'], 'salad'],
  [['מרק'], 'soup'],
  [['בשרי', 'עיקרית', 'מטגון'], 'savory'],
  [['טבעוני'], 'vegan'],
  [['ארוחת בוקר', 'דגני בוקר'], 'breakfast'],
  [['נשנוש', 'נשנושים', 'קרקר', 'קרקרים', 'חטיף'], 'snack'],
  [['אסיאתי', 'סושי'], 'asian'],
  [['קינוח', 'שוקולד', 'גלידה', 'ממרח', 'קרם', 'פודינג', 'סופלה'], 'sweet'],
  [['אפייה', 'מאפים', 'עוגה', 'עוגיות', 'לחמניות', 'לחם', 'פאי', 'בורקס', 'פילו', 'קרפ'], 'baking'],
]

const DEFAULT_CATEGORY: CategoryColor = {
  border: 'border-s-stone-300',
  bg: '',
  text: 'text-stone-500',
}

export function getRecipeCategory(tags: string[]): CategoryColor {
  const tagSet = new Set(tags.map(t => t.trim()))
  for (const [keywords, categoryKey] of TAG_MAP) {
    if (keywords.some(k => tagSet.has(k))) {
      return CATEGORIES[categoryKey]
    }
  }
  return DEFAULT_CATEGORY
}
