const FRACTION_MAP: [number, string][] = [
  [1 / 4, '¼'],
  [1 / 3, '⅓'],
  [1 / 2, '½'],
  [2 / 3, '⅔'],
  [3 / 4, '¾'],
]

function parseFraction(s: string): number | null {
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixed) {
    return parseInt(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3])
  }
  const simple = s.match(/^(\d+)\/(\d+)$/)
  if (simple) {
    return parseInt(simple[1]) / parseInt(simple[2])
  }
  const decimal = s.match(/^(\d+\.?\d*)$/)
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

// Regex matches: "2 1/2", "1/2", "0.5", "2" at the start of the string
const LEADING_QUANTITY_RE = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+\.?\d*)/

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
