import { z } from 'zod'

export const multiplierSchema = z.number().finite().min(0.01).max(100)
export const sourceSchema = z.object({
  id: z.string(), recipeId: z.string().uuid(), revision: z.string(),
  title: z.string(), index: z.number().int().nonnegative(), text: z.string(),
  section: z.string(), multiplier: multiplierSchema,
})
export const itemSchema = z.object({
  id: z.string(), text: z.string().trim().min(1).max(2000),
  original: z.string(), sourceIds: z.array(z.string()),
  purchased: z.boolean(), edited: z.boolean(), hidden: z.boolean(), review: z.boolean(),
})
export const documentSchema = z.object({
  name: z.string().trim().min(1).max(100),
  sources: z.array(sourceSchema).max(1000), items: z.array(itemSchema).max(1200),
  generatedSignature: z.string(),
})
export type ShoppingSource = z.infer<typeof sourceSchema>
export type ShoppingItem = z.infer<typeof itemSchema>
export type ShoppingDocument = z.infer<typeof documentSchema>
export type ShoppingState = { version: number; document: ShoppingDocument }
export const emptyDocument = (): ShoppingDocument => ({ name: 'רשימת קניות', sources: [], items: [], generatedSignature: '' })
export const signature = (sources: ShoppingSource[]) => JSON.stringify(sources)
export const hasPending = (doc: ShoppingDocument) => doc.sources.length > 0
  ? signature(doc.sources) !== doc.generatedSignature
  : !!doc.generatedSignature && doc.generatedSignature !== '[]'
export const isIngredientHeader = (text: string) => text.trim().endsWith(':') && !text.includes(' - ') && text.trim().length < 50

// Keep quantities rational until display; repeated thirds must sum to one.
type Fraction = [bigint, bigint]
const gcd = (a: bigint, b: bigint): bigint => b ? gcd(b, a % b) : a
const reduce = ([n, d]: Fraction): Fraction => { const g = gcd(n, d); return [n / g, d / g] }
const fraction = (n: number | string, d: number | string = 1): Fraction => reduce([BigInt(n), BigInt(d)])
const add = (a: Fraction, b: Fraction): Fraction => reduce([a[0] * b[1] + b[0] * a[1], a[1] * b[1]])
const multiply = (a: Fraction, b: Fraction): Fraction => reduce([a[0] * b[0], a[1] * b[1]])
const vulgar: Record<string, Fraction> = Object.fromEntries(Object.entries({ '½': [1, 2], '⅓': [1, 3], '⅔': [2, 3], '¼': [1, 4], '¾': [3, 4], '⅛': [1, 8], '⅜': [3, 8], '⅝': [5, 8], '⅞': [7, 8], '⅕': [1, 5], '⅖': [2, 5], '⅗': [3, 5], '⅘': [4, 5], '⅙': [1, 6], '⅚': [5, 6] }).map(([symbol, [n, d]]) => [symbol, fraction(n, d)]))
const decimal = (s: string): Fraction => {
  const d = 10 ** (s.split('.')[1]?.length ?? 0)
  return fraction(s.replace('.', ''), d)
}
function multiplierFraction(n: number): Fraction {
  for (const value of Object.values(vulgar)) if (Math.abs(n - Number(value[0]) / Number(value[1])) < 1e-12) return value
  return decimal(String(Number(n.toFixed(6))))
}
function quantity(s: string): Fraction | null {
  if (vulgar[s]) return vulgar[s]
  const mixed = s.match(/^(\d+)\s+(.+)$/)
  if (mixed) { const tail = quantity(mixed[2]); return tail ? add(fraction(mixed[1]), tail) : null }
  const slash = s.match(/^(\d+)\/(\d+)$/)
  if (slash) return Number(slash[2]) ? fraction(slash[1], slash[2]) : null
  return /^\d+(?:\.\d{1,6})?$/.test(s) ? decimal(s) : null
}
const normalize = (s: string) => s.normalize('NFC').replace(/[\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/g, '').replace(/[״“”]/g, '"').replace(/[׳’]/g, "'").replace(/\s+/g, ' ').trim()
const units: Record<string, [string, number]> = {
  'גרם': ['גרם', 1], 'גרמים': ['גרם', 1], "גר'": ['גרם', 1], 'ג': ['גרם', 1],
  'ק"ג': ['גרם', 1000], 'קילוגרם': ['גרם', 1000], 'קילו': ['גרם', 1000],
  'מ"ל': ['מ״ל', 1], 'מיליליטר': ['מ״ל', 1], 'ליטר': ['מ״ל', 1000],
  'כוס': ['כוסות', 1], 'כוסות': ['כוסות', 1], 'כף': ['כפות', 1], 'כפות': ['כפות', 1],
  'כפית': ['כפיות', 1], 'כפיות': ['כפיות', 1], 'יחידה': ['יחידות', 1], 'יחידות': ['יחידות', 1],
}
const aliases: Record<string, string> = { 'ביצה': 'ביצים' }
function parse(text: string): { name: string; unit: string; amount: Fraction } | null {
  let input = normalize(text)
  // These expressions carry alternatives, ranges or packaging information.
  if (/[()–־]|\d\s*-\s*\d|\sאו\s|לפי הטעם|לפי הצורך/.test(input)) return null
  input = input.replace(/^חצי\s+/, '1/2 ').replace(/^רבע\s+/, '1/4 ').replace(/^שליש\s+/, '1/3 ')
    .replace(/(\d)([½⅓⅔¼¾⅛⅜⅝⅞⅕⅖⅗⅘⅙⅚])/g, '$1 $2')
  const match = input.match(/^(\d+\s+(?:\d+\/\d+|[½⅓⅔¼¾⅛⅜⅝⅞⅕⅖⅗⅘⅙⅚])|\d+\/\d+|\d+(?:\.\d+)?|[½⅓⅔¼¾⅛⅜⅝⅞⅕⅖⅗⅘⅙⅚])\s+(.+)$/)
  if (!match) return null
  let amount = quantity(match[1])
  const numeric = amount ? Number(amount[0]) / Number(amount[1]) : 0
  if (!amount || !Number.isFinite(numeric) || numeric <= 0 || numeric > 1000000) return null
  let name = match[2]
  let unit = 'יחידות'
  const token = name.split(' ')[0]
  if (units[token]) {
    const [normalized, factor] = units[token]
    unit = normalized
    amount = multiply(amount, fraction(factor))
    name = name.slice(token.length).trim()
  } else if (!/^(ביצים|ביצה|עגבניות|עגבנייה|עגבניה|בצל|בצלים|תפוחים|תפוח|תפוחי אדמה|תפוח אדמה|מלפפונים|מלפפון|גזרים|גזר|לימונים|לימון|פלפלים|פלפל|שיני שום|שן שום|קישואים|קישוא|חצילים|חציל)(?:\s|$)/.test(name)) return null
  if (!name) return null
  return { name: aliases[name] ?? name, unit, amount }
}
function display(name: string, unit: string, amount: Fraction) {
  let n = Number(amount[0]) / Number(amount[1])
  if (unit === 'גרם' && n >= 1000) { unit = 'ק״ג'; n /= 1000 }
  if (unit === 'מ״ל' && n >= 1000) { unit = 'ליטר'; n /= 1000 }
  if (n === 1) unit = ({ 'כוסות': 'כוס', 'כפות': 'כף', 'כפיות': 'כפית', 'יחידות': 'יחידה' } as Record<string, string>)[unit] ?? unit
  return `${name} — ${n < 0.001 ? n.toPrecision(3) : Number(n.toFixed(3))} ${unit}`
}

export function consolidate(sources: ShoppingSource[]): ShoppingItem[] {
  const groups = new Map<string, { name: string; unit: string; amount: Fraction; ids: string[] }>()
  const output: ShoppingItem[] = []
  for (const source of sources) {
    if (isIngredientHeader(source.text)) continue
    const parsed = parse(source.text)
    if (!parsed) {
      const text = source.multiplier === 1 ? source.text : `${source.text} (כמות מתכון ×${source.multiplier} — לבדיקה)`
      output.push({ id: `raw:${source.id}`, text, original: text, sourceIds: [source.id], purchased: false, edited: false, hidden: false, review: true })
      continue
    }
    const key = `${parsed.unit}:${parsed.name}`
    const amount = multiply(parsed.amount, multiplierFraction(source.multiplier))
    const group = groups.get(key)
    if (group) { group.amount = add(group.amount, amount); group.ids.push(source.id) }
    else groups.set(key, { ...parsed, amount, ids: [source.id] })
  }
  for (const [key, group] of groups) {
    const text = display(group.name, group.unit, group.amount)
    output.push({ id: `group:${key}`, text, original: text, sourceIds: group.ids, purchased: false, edited: false, hidden: false, review: false })
  }
  return output
}

export function generate(doc: ShoppingDocument): ShoppingDocument {
  const old = new Map(doc.items.map(item => [item.id, item]))
  const items = consolidate(doc.sources).map(item => {
    const previous = old.get(item.id)
    if (!previous) return item
    const changed = previous.original !== item.original
    return { ...item, text: previous.edited ? previous.text : item.text,
      edited: previous.edited, hidden: previous.hidden,
      purchased: changed ? false : previous.purchased,
      review: item.review || (changed && previous.edited) }
  })
  const ids = new Set(items.map(item => item.id))
  // Manual rows, including user-created splits, survive regeneration.
  for (const item of doc.items) if (!item.sourceIds.length && !ids.has(item.id)) items.push(item)
  return { ...doc, items, generatedSignature: signature(doc.sources) }
}

export function exportText(doc: ShoppingDocument, includePurchased = false) {
  return [doc.name, ...doc.items.filter(item => !item.hidden && (includePurchased || !item.purchased))
    .map(item => `${item.purchased ? '☑' : '☐'} ${item.text}`)].join('\n')
}
