// Unicode vulgar fractions we can READ. This set is deliberately wider than
// the one we write below: imported recipes arrive with whatever the source
// site used, and an unrecognised quantity is silently left unscaled — the
// worst possible failure for a recipe, since its neighbours still scale.
const VULGAR_VALUES: Record<string, number> = {
  '¼': 1 / 4,
  '½': 1 / 2,
  '¾': 3 / 4,
  '⅐': 1 / 7,
  '⅑': 1 / 9,
  '⅒': 1 / 10,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅕': 1 / 5,
  '⅖': 2 / 5,
  '⅗': 3 / 5,
  '⅘': 4 / 5,
  '⅙': 1 / 6,
  '⅚': 5 / 6,
  '⅛': 1 / 8,
  '⅜': 3 / 8,
  '⅝': 5 / 8,
  '⅞': 7 / 8,
}

const VULGAR_CLASS = `[${Object.keys(VULGAR_VALUES).join('')}]`

// Fractions we WRITE, ascending. Kept to forms that read naturally in a
// recipe; anything else falls back to a rounded decimal.
const FRACTION_MAP: [number, string][] = [
  [1 / 8, '⅛'],
  [1 / 6, '⅙'],
  [1 / 4, '¼'],
  [1 / 3, '⅓'],
  [3 / 8, '⅜'],
  [1 / 2, '½'],
  [5 / 8, '⅝'],
  [2 / 3, '⅔'],
  [3 / 4, '¾'],
  [5 / 6, '⅚'],
  [7 / 8, '⅞'],
]

function parseFraction(s: string): number | null {
  const trimmed = s.trim()

  // Mixed with a vulgar fraction: "2½" or "2 ½"
  const mixedVulgar = trimmed.match(new RegExp(`^(\\d+)\\s*(${VULGAR_CLASS})$`))
  if (mixedVulgar) {
    return parseInt(mixedVulgar[1], 10) + VULGAR_VALUES[mixedVulgar[2]]
  }

  // Bare vulgar fraction: "½"
  if (Object.prototype.hasOwnProperty.call(VULGAR_VALUES, trimmed)) {
    return VULGAR_VALUES[trimmed]
  }

  // Mixed ASCII: "2 1/2"
  const mixed = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixed) {
    const denominator = parseInt(mixed[3], 10)
    if (denominator === 0) return null
    return parseInt(mixed[1], 10) + parseInt(mixed[2], 10) / denominator
  }

  // Simple ASCII: "1/2"
  const simple = trimmed.match(/^(\d+)\/(\d+)$/)
  if (simple) {
    const denominator = parseInt(simple[2], 10)
    if (denominator === 0) return null
    return parseInt(simple[1], 10) / denominator
  }

  // Decimal or integer: "0.5", "2"
  const decimal = trimmed.match(/^(\d+\.?\d*)$/)
  if (decimal) {
    return parseFloat(decimal[1])
  }

  return null
}

function formatQuantity(n: number): string {
  if (Number.isInteger(n)) return String(n)

  const whole = Math.floor(n)
  const frac = n - whole

  for (const [value, symbol] of FRACTION_MAP) {
    if (Math.abs(frac - value) < 0.01) {
      return whole > 0 ? `${whole}${symbol}` : symbol
    }
  }

  // Fallback: round to 2 decimal places, trim trailing zeros
  const rounded = parseFloat(n.toFixed(2))
  return String(rounded)
}

// Matches a leading quantity. Order matters: the mixed and vulgar forms must
// be tried before the bare-integer form, or "2½" would match just the "2".
const LEADING_QUANTITY_RE = new RegExp(
  `^(\\d+\\s*${VULGAR_CLASS}|${VULGAR_CLASS}|\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+\\.?\\d*)`
)

function isGroupHeader(text: string): boolean {
  const trimmed = text.trim()
  return trimmed.endsWith(':') && !trimmed.includes(' - ') && trimmed.length < 50
}

export function scaleIngredient(ingredient: string, multiplier: number): string {
  if (multiplier === 1) return ingredient
  if (isGroupHeader(ingredient)) return ingredient

  const match = ingredient.match(LEADING_QUANTITY_RE)
  if (!match) return ingredient

  const raw = match[1]
  const quantity = parseFraction(raw)
  if (quantity === null) return ingredient

  const scaled = quantity * multiplier
  const formatted = formatQuantity(scaled)
  return ingredient.slice(0, match.index ?? 0) + formatted + ingredient.slice((match.index ?? 0) + raw.length)
}
