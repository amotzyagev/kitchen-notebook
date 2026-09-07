import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/api-utils'
import { documentSchema, emptyDocument, generate, isIngredientHeader, multiplierSchema, type ShoppingDocument } from '@/lib/shopping-list'

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('add'), selections: z.array(z.object({
    recipeId: z.string().uuid(), indexes: z.array(z.number().int().min(0).max(199)).max(200).optional(),
    revision: z.string().max(100).optional(),
    multiplier: multiplierSchema, replace: z.boolean().default(false),
  })).min(1).max(100) }),
  z.object({ action: z.literal('generate') }),
  z.object({ action: z.literal('reset') }),
  z.object({ action: z.literal('name'), name: z.string().trim().min(1).max(100) }),
  z.object({ action: z.literal('remove-source'), id: z.string().max(300) }),
  z.object({ action: z.literal('source-quantity'), recipeId: z.string().uuid(), multiplier: multiplierSchema }),
  z.object({ action: z.literal('item'), id: z.string().max(2000), text: z.string().trim().min(1).max(2000).optional(), purchased: z.boolean().optional(), hidden: z.boolean().optional() }),
  z.object({ action: z.literal('manual'), id: z.string().uuid(), text: z.string().trim().min(1).max(2000) }),
])

export async function GET() {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const { data, error } = await auth.supabase.from('shopping_lists').select('*').eq('user_id', auth.user.id).maybeSingle()
    if (error) throw error
    return NextResponse.json(data ? { version: data.version, document: documentSchema.parse(data.document) } : { version: 0, document: emptyDocument() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[shopping-list]', error)
    return NextResponse.json({ message: 'לא ניתן לטעון את רשימת הקניות. נסו שוב.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const { supabase, user } = auth
    const raw = await request.text()
    if (raw.length > 100000) return NextResponse.json({ message: 'הבקשה גדולה מדי' }, { status: 413 })
    const body = JSON.parse(raw)
    const action = actionSchema.parse(body)
    const expected = z.number().int().nonnegative().parse(body.version)
    // Insert-if-absent avoids overwriting a list created by another tab.
    const { error: initError } = await supabase.from('shopping_lists').upsert({ user_id: user.id, document: emptyDocument() }, { onConflict: 'user_id', ignoreDuplicates: true })
    if (initError) throw initError
    const { data: row, error: readError } = await supabase.from('shopping_lists').select('*').eq('user_id', user.id).single()
    if (readError) throw readError
    if (row.version !== expected) return NextResponse.json({ message: 'הרשימה השתנתה במכשיר או בחלון אחר. רעננו ונסו שוב.' }, { status: 409 })
    let doc: ShoppingDocument = documentSchema.parse(row.document)
    if (action.action === 'add') {
      const ids = [...new Set(action.selections.map(s => s.recipeId))]
      const { data: recipes, error } = await supabase.from('recipes').select('id,title,ingredients,updated_at').in('id', ids)
      if (error) throw error
      if (recipes.length !== ids.length) return NextResponse.json({ message: 'אחד המתכונים אינו זמין עוד. עדכנו את הבחירה.' }, { status: 403 })
      for (const selection of action.selections) {
        const recipe = recipes.find(r => r.id === selection.recipeId)!
        if (selection.revision && selection.revision !== recipe.updated_at) return NextResponse.json({ message: 'המתכון השתנה מאז פתיחת הדף. רעננו את דף המתכון ובחרו שוב.' }, { status: 409 })
        const existing = doc.sources.filter(s => s.recipeId === recipe.id)
        const revisionChanged = existing.some(s => s.revision !== recipe.updated_at)
        const quantityChanged = existing.some(s => s.multiplier !== selection.multiplier)
        if ((revisionChanged || quantityChanged) && !selection.replace) return NextResponse.json({
          code: 'replacement_required', message: 'המתכון כבר ברשימה עם גרסה או כמות אחרת. להחליף את הבחירה הקודמת?',
        }, { status: 409 })
        if (revisionChanged) doc.sources = doc.sources.filter(s => s.recipeId !== recipe.id)
        else if (quantityChanged) doc.sources = doc.sources.map(s => s.recipeId === recipe.id ? { ...s, multiplier: selection.multiplier } : s)
        const indexes = new Set(selection.indexes ?? recipe.ingredients.map((_, i) => i))
        if ([...indexes].some(i => i >= recipe.ingredients.length)) return NextResponse.json({ message: 'בחירת המרכיבים אינה תקינה' }, { status: 400 })
        let section = ''
        recipe.ingredients.forEach((text, index) => {
          if (isIngredientHeader(text)) { section = text; return }
          if (!indexes.has(index)) return
          const id = `${recipe.id}:${recipe.updated_at}:${index}`
          if (!doc.sources.some(s => s.id === id)) doc.sources.push({ id, recipeId: recipe.id, revision: recipe.updated_at, title: recipe.title, text, index, section, multiplier: selection.multiplier })
        })
      }
    } else if (action.action === 'generate') doc = generate(doc)
    else if (action.action === 'reset') doc = emptyDocument()
    else if (action.action === 'name') doc.name = action.name
    else if (action.action === 'remove-source') doc.sources = doc.sources.filter(s => s.id !== action.id)
    else if (action.action === 'source-quantity') doc.sources = doc.sources.map(s => s.recipeId === action.recipeId ? { ...s, multiplier: action.multiplier } : s)
    else if (action.action === 'manual') {
      const id = `manual:${action.id}`
      if (!doc.items.some(item => item.id === id)) doc.items.push({ id, text: action.text, original: action.text, sourceIds: [], edited: true, purchased: false, hidden: false, review: false })
    } else if (action.action === 'item') {
      const item = doc.items.find(item => item.id === action.id)
      if (!item) return NextResponse.json({ message: 'הפריט לא נמצא' }, { status: 404 })
      if (action.text !== undefined) { item.text = action.text; item.edited = true; item.review = false }
      if (action.purchased !== undefined) item.purchased = action.purchased
      if (action.hidden !== undefined) item.hidden = action.hidden
    }
    doc = documentSchema.parse(doc)
    const { data: saved, error: saveError } = await supabase.from('shopping_lists')
      .update({ document: doc, version: expected + 1 }).eq('user_id', user.id).eq('version', expected).select('version').maybeSingle()
    if (saveError) throw saveError
    if (!saved) return NextResponse.json({ message: 'הרשימה השתנתה. רעננו ונסו שוב.' }, { status: 409 })
    return NextResponse.json({ version: saved.version, document: doc })
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) return NextResponse.json({ message: 'הנתונים אינם תקינים או שהרשימה גדולה מדי (עד 1,000 מרכיבים).' }, { status: 400 })
    console.error('[shopping-list]', error)
    return NextResponse.json({ message: 'השמירה לא אושרה. בדקו את החיבור ונסו שוב.' }, { status: 500 })
  }
}
