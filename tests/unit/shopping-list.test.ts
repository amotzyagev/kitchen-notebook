import { describe, expect, it } from 'vitest'
import { consolidate, emptyDocument, exportText, generate, hasPending, multiplierSchema, type ShoppingSource } from '@/lib/shopping-list'

function source(text: string, id: string, multiplier = 1): ShoppingSource {
  return { id, recipeId: '11111111-1111-4111-8111-111111111111', title: 'עוגה', revision: '2026-09-06', index: 0, text, section: '', multiplier }
}
describe('Hebrew shopping quantities', () => {
  it('adds eggs across recipes and keeps provenance', () => {
    const result = consolidate([source('2 ביצים', 'a'), source('3 ביצים', 'b')])
    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('ביצים — 5 יחידות')
    expect(result[0].sourceIds).toEqual(['a', 'b'])
  })
  it('normalizes Hebrew weight abbreviations and converts kg', () => {
    expect(consolidate([source('500 גרם קמח', 'a'), source('1 ק״ג קמח', 'b')])[0].text).toBe('קמח — 1.5 ק״ג')
  })
  it('converts liquid volumes but never density or cup volume', () => {
    expect(consolidate([source('500 מ״ל חלב', 'a'), source('1 ליטר חלב', 'b')])[0].text).toBe('חלב — 1.5 ליטר')
    expect(consolidate([source('1 כוס קמח', 'a'), source('200 גרם קמח', 'b')])).toHaveLength(2)
  })
  it('handles mixed fractions, Unicode and Hebrew quantity words', () => {
    expect(consolidate([source('1½ כוס קמח', 'a'), source('חצי כוס קמח', 'b')])[0].text).toBe('קמח — 2 כוסות')
    expect(consolidate([source('1 1/2 כוס קמח', 'a'), source('½ כוס קמח', 'b')])[0].text).toBe('קמח — 2 כוסות')
  })
  it('sums thirds without early rounding and scales exactly once', () => {
    expect(consolidate(['a', 'b', 'c'].map(id => source('⅓ כוס סוכר', id)))[0].text).toBe('סוכר — 1 כוס')
    expect(consolidate([source('3 ביצים', 'a', 1 / 3)])[0].text).toBe('ביצים — 1 יחידה')
    expect(consolidate([source('2 ביצים', 'a', 2)])[0].text).toBe('ביצים — 4 יחידות')
  })
  it('preserves distinct products', () => {
    expect(consolidate([source('1 כוס קמח', 'a'), source('1 כוס קמח תופח', 'b'), source('1 כוס קמח מלא', 'c')])).toHaveLength(3)
  })
  it.each(['מלח לפי הטעם', '2-3 ביצים', '2–3 ביצים', '2־3 ביצים', '2 קופסאות עגבניות (400 גרם כל אחת)', '1 כף חמאה או שמן', '1/0 כוס חלב'])('preserves uncertain wording: %s', text => {
    const item = consolidate([source(text, 'a')])[0]
    expect(item.text).toBe(text)
    expect(item.review).toBe(true)
  })
  it('never turns a section heading into groceries', () => {
    expect(consolidate([source('לבצק:', 'a')])).toEqual([])
  })
  it('flags unparsed scaled quantities instead of silently leaving them unchanged', () => {
    expect(consolidate([source('מלח לפי הטעם', 'a', 2)])[0].text).toContain('×2')
  })
  it.each([0, -1, Infinity, NaN, 101])('rejects invalid multiplier %s', n => {
    expect(multiplierSchema.safeParse(n).success).toBe(false)
  })
})

describe('shopping-list lifecycle', () => {
  it('preserves manual corrections and unchecks changed purchased quantities', () => {
    const doc = generate({ ...emptyDocument(), sources: [source('2 ביצים', 'a')] })
    doc.items[0] = { ...doc.items[0], text: 'ביצים גדולות', edited: true, purchased: true }
    doc.sources.push(source('3 ביצים', 'b'))
    expect(hasPending(doc)).toBe(true)
    const next = generate(doc)
    expect(next.items[0]).toMatchObject({ text: 'ביצים גדולות', purchased: false, review: true, original: 'ביצים — 5 יחידות' })
    expect(hasPending(next)).toBe(false)
  })
  it('does not reset purchased marks when quantities have not changed', () => {
    const doc = generate({ ...emptyDocument(), sources: [source('2 ביצים', 'a')] })
    doc.items[0].purchased = true
    expect(generate(doc).items[0].purchased).toBe(true)
  })
  it('retains manual items and hidden exclusions', () => {
    const doc = generate({ ...emptyDocument(), sources: [source('2 ביצים', 'a')] })
    doc.items[0].hidden = true
    doc.items.push({ id: 'manual:a', text: 'סבון', original: 'סבון', sourceIds: [], edited: true, hidden: false, purchased: false, review: false })
    expect(generate(doc).items).toHaveLength(2)
    expect(generate(doc).items[0].hidden).toBe(true)
  })
  it('detects removal of the last source as a pending update', () => {
    const doc = generate({ ...emptyDocument(), sources: [source('2 ביצים', 'a')] })
    doc.sources = []
    expect(hasPending(doc)).toBe(true)
    expect(generate(doc).items).toEqual([])
  })
  it('exports Hebrew, excluding purchased and hidden items by default', () => {
    const doc = generate({ ...emptyDocument(), sources: [source('2 ביצים', 'a'), source('1 ליטר חלב', 'b'), source('מלח לפי הטעם', 'c')] })
    doc.items.find(item => item.text.includes('ביצים'))!.purchased = true
    doc.items.find(item => item.text.includes('מלח'))!.hidden = true
    expect(exportText(doc)).toBe('רשימת קניות\n☐ חלב — 1 ליטר')
    expect(exportText(doc, true)).toContain('☑ ביצים')
  })
})
