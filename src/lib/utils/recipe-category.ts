type CategoryColor = {
  borderColor: string
}

const CATEGORIES: Record<string, CategoryColor> = {
  sweet: { borderColor: '#f472b6' },       // pink-400
  baking: { borderColor: '#fbbf24' },       // amber-400
  savory: { borderColor: '#f87171' },       // red-400
  salad: { borderColor: '#34d399' },        // emerald-400
  soup: { borderColor: '#fb923c' },         // orange-400
  vegan: { borderColor: '#a3e635' },        // lime-400
  breakfast: { borderColor: '#facc15' },    // yellow-400
  snack: { borderColor: '#a78bfa' },        // violet-400
  asian: { borderColor: '#2dd4bf' },        // teal-400
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
  borderColor: '#d6d3d1',  // stone-300
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
