import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'
import { emptyDocument, type ShoppingDocument } from '@/lib/shopping-list'

const mock = vi.hoisted(() => ({ auth: vi.fn(), read: vi.fn(), recipes: vi.fn(), save: vi.fn(), update: vi.fn(), eq: vi.fn(), init: vi.fn() }))
vi.mock('@/lib/api-utils', () => ({ requireAuth: mock.auth }))
import { GET, POST } from '@/app/api/shopping-list/route'
const recipeId = '11111111-1111-4111-8111-111111111111'
const recipe = { id: recipeId, title: 'עוגה', ingredients: ['לבצק:', '2 ביצים', '1 כוס קמח'], updated_at: '2026-09-06T00:00:00Z' }
let saved: ShoppingDocument
let version: number
function request(action: Record<string, unknown>, expected = version) {
  return new Request('http://localhost/api/shopping-list', { method: 'POST', body: JSON.stringify({ ...action, version: expected }) })
}
const selection = (extra = {}) => ({ recipeId, multiplier: 1, ...extra })
describe('persistent shopping-list API', () => {
  beforeEach(() => {
    vi.clearAllMocks(); saved = emptyDocument(); version = 0
    mock.init.mockResolvedValue({ error: null })
    mock.read.mockImplementation(async () => ({ data: { document: structuredClone(saved), version }, error: null }))
    mock.recipes.mockResolvedValue({ data: [recipe], error: null })
    let patch: { document: ShoppingDocument; version: number }
    mock.save.mockImplementation(async () => { saved = patch.document; version = patch.version; return { data: { version }, error: null } })
    mock.eq.mockImplementation(() => ({ eq: mock.eq, select: () => ({ maybeSingle: mock.save }) }))
    mock.update.mockImplementation(value => { patch = value; return { eq: mock.eq } })
    mock.auth.mockResolvedValue({ user: { id: 'owner' }, supabase: { from: (table: string) => table === 'recipes'
      ? { select: () => ({ in: mock.recipes }) }
      : { upsert: mock.init, update: mock.update, select: () => ({ eq: () => ({ single: mock.read, maybeSingle: mock.read }) }) } } })
  })

  it('requires authentication on reads and writes', async () => {
    mock.auth.mockResolvedValue(NextResponse.json({ message: 'login' }, { status: 401 }))
    expect((await GET()).status).toBe(401)
    expect((await POST(request({ action: 'generate' }))).status).toBe(401)
    expect(mock.init).not.toHaveBeenCalled()
  })
  it('adds a whole recipe, ignores headings and snapshots source data', async () => {
    const response = await POST(request({ action: 'add', selections: [selection()] }))
    expect(response.status).toBe(200)
    expect(saved.sources).toHaveLength(2)
    expect(saved.sources[0]).toMatchObject({ text: '2 ביצים', title: 'עוגה', section: 'לבצק:', multiplier: 1 })
    expect(mock.eq).toHaveBeenCalledWith('user_id', 'owner')
    expect(mock.eq).toHaveBeenCalledWith('version', 0)
  })
  it('mixes individual and whole-recipe selections without duplicate contributions', async () => {
    await POST(request({ action: 'add', selections: [selection({ indexes: [1] })] }))
    await POST(request({ action: 'add', selections: [selection()] }))
    await POST(request({ action: 'add', selections: [selection()] }))
    expect(saved.sources).toHaveLength(2)
  })
  it('requires confirmation when a repeated selection changes quantity', async () => {
    await POST(request({ action: 'add', selections: [selection()] }))
    const response = await POST(request({ action: 'add', selections: [selection({ multiplier: 2 })] }))
    expect(response.status).toBe(409)
    expect((await response.json()).code).toBe('replacement_required')
    await POST(request({ action: 'add', selections: [selection({ multiplier: 2, replace: true })] }))
    expect(saved.sources).toHaveLength(2)
    expect(saved.sources.every(s => s.multiplier === 2)).toBe(true)
  })
  it('rejects inaccessible recipes and stale ingredient indexes', async () => {
    mock.recipes.mockResolvedValueOnce({ data: [], error: null })
    expect((await POST(request({ action: 'add', selections: [selection()] }))).status).toBe(403)
    expect((await POST(request({ action: 'add', selections: [selection({ revision: 'old', indexes: [1] })] }))).status).toBe(409)
    expect(saved.sources).toHaveLength(0)
  })
  it('rejects invalid quantities and out-of-range indexes', async () => {
    expect((await POST(request({ action: 'add', selections: [selection({ multiplier: 0 })] }))).status).toBe(400)
    expect((await POST(request({ action: 'add', selections: [selection({ indexes: [10] })] }))).status).toBe(400)
    expect(saved.sources).toHaveLength(0)
  })
  it('rejects stale versions instead of overwriting a concurrent update', async () => {
    version = 5
    expect((await POST(request({ action: 'reset' }, 4))).status).toBe(409)
    expect(mock.update).not.toHaveBeenCalled()
    mock.save.mockResolvedValueOnce({ data: null, error: null })
    expect((await POST(request({ action: 'reset' }, 5))).status).toBe(409)
  })
  it('generates from saved snapshots even if recipe access is later lost', async () => {
    await POST(request({ action: 'add', selections: [selection({ indexes: [1] })] }))
    mock.recipes.mockResolvedValue({ data: [], error: null })
    await POST(request({ action: 'generate' }))
    expect(saved.items[0].text).toBe('ביצים — 2 יחידות')
    expect(mock.recipes).toHaveBeenCalledTimes(1)
  })
  it('supports manual additions, edits, purchased state and hide/undo', async () => {
    const id = '22222222-2222-4222-8222-222222222222'
    await POST(request({ action: 'manual', id, text: 'סבון' }))
    await POST(request({ action: 'manual', id, text: 'סבון' }))
    expect(saved.items).toHaveLength(1)
    await POST(request({ action: 'item', id: `manual:${id}`, text: 'סבון כלים', purchased: true, hidden: true }))
    expect(saved.items[0]).toMatchObject({ text: 'סבון כלים', purchased: true, hidden: true })
    await POST(request({ action: 'item', id: `manual:${id}`, hidden: false }))
    expect(saved.items[0].hidden).toBe(false)
  })
  it('returns a clean Hebrew error for malformed JSON and database failures', async () => {
    expect((await POST(new Request('http://localhost', { method: 'POST', body: '{' }))).status).toBe(400)
    mock.read.mockResolvedValueOnce({ data: null, error: { message: 'offline' } })
    expect((await GET()).status).toBe(500)
  })
})
