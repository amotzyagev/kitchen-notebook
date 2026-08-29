import { describe, it, expect } from 'vitest'
import { scaleIngredient } from '@/lib/utils/scale-ingredient'

describe('scaleIngredient', () => {
  it('returns the ingredient untouched at x1', () => {
    expect(scaleIngredient('2 כוסות קמח', 1)).toBe('2 כוסות קמח')
    expect(scaleIngredient('½ כפית מלח', 1)).toBe('½ כפית מלח')
  })

  it('scales plain integers', () => {
    expect(scaleIngredient('2 כוסות קמח', 2)).toBe('4 כוסות קמח')
    expect(scaleIngredient('3 ביצים', 3)).toBe('9 ביצים')
    expect(scaleIngredient('4 כפות שמן', 0.5)).toBe('2 כפות שמן')
  })

  it('scales decimals', () => {
    expect(scaleIngredient('0.5 ליטר חלב', 2)).toBe('1 ליטר חלב')
    expect(scaleIngredient('1.5 כוסות סוכר', 2)).toBe('3 כוסות סוכר')
  })

  it('scales ASCII fractions', () => {
    expect(scaleIngredient('1/2 כוס סוכר', 2)).toBe('1 כוס סוכר')
    expect(scaleIngredient('1/4 כפית', 2)).toBe('½ כפית')
    expect(scaleIngredient('2 1/2 כוסות', 2)).toBe('5 כוסות')
  })

  // This is the regression the parser previously missed: formatQuantity emits
  // these symbols, so any recipe already scaled once - or imported from a site
  // that uses them - was silently left unscaled.
  it('scales bare unicode vulgar fractions', () => {
    expect(scaleIngredient('½ כוס סוכר', 2)).toBe('1 כוס סוכר')
    expect(scaleIngredient('¼ כפית מלח', 2)).toBe('½ כפית מלח')
    expect(scaleIngredient('⅓ כוס שמן', 3)).toBe('1 כוס שמן')
    expect(scaleIngredient('¾ כוס חלב', 4)).toBe('3 כוס חלב')
    expect(scaleIngredient('⅛ כפית', 4)).toBe('½ כפית')
  })

  it('scales mixed numbers written with a unicode fraction', () => {
    expect(scaleIngredient('2½ כוסות קמח', 2)).toBe('5 כוסות קמח')
    expect(scaleIngredient('1½ כוסות מים', 2)).toBe('3 כוסות מים')
    expect(scaleIngredient('2 ½ כוסות קמח', 2)).toBe('5 כוסות קמח')
    expect(scaleIngredient('1¼ כוס', 4)).toBe('5 כוס')
  })

  it('does not mistake a mixed unicode fraction for a bare integer', () => {
    // The old regex matched only the leading "2" and dropped the half.
    expect(scaleIngredient('2½ כוסות', 1.5)).not.toBe('3½ כוסות')
    expect(scaleIngredient('2½ כוסות', 1.5)).toBe('3¾ כוסות')
  })

  it('formats results back into fractions where it can', () => {
    expect(scaleIngredient('1 כוס', 0.5)).toBe('½ כוס')
    expect(scaleIngredient('1 כוס', 0.25)).toBe('¼ כוס')
    expect(scaleIngredient('2 כוסות', 1 / 3)).toBe('⅔ כוסות')
    expect(scaleIngredient('3 כוסות', 0.5)).toBe('1½ כוסות')
  })

  it('leaves group headers alone', () => {
    expect(scaleIngredient('לרוטב:', 2)).toBe('לרוטב:')
    expect(scaleIngredient('לבצק:', 3)).toBe('לבצק:')
  })

  it('leaves ingredients with no leading quantity alone', () => {
    expect(scaleIngredient('מלח לפי הטעם', 2)).toBe('מלח לפי הטעם')
    expect(scaleIngredient('קורט פלפל', 3)).toBe('קורט פלפל')
  })

  it('preserves the text after the quantity verbatim', () => {
    expect(scaleIngredient('2 כפות שמן זית כתית מעולה', 2)).toBe('4 כפות שמן זית כתית מעולה')
    expect(scaleIngredient('½ כוס (120 מ"ל) חלב', 2)).toBe('1 כוס (120 מ"ל) חלב')
  })

  it('does not produce Infinity from a zero denominator', () => {
    expect(scaleIngredient('1/0 כוס', 2)).toBe('1/0 כוס')
  })

  it('falls back to a decimal when no fraction is close enough', () => {
    expect(scaleIngredient('1 כוס', 0.7)).toBe('0.7 כוס')
  })
})
