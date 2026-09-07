'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingBasket } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { isIngredientHeader } from '@/lib/shopping-list'
import { ShoppingError, useShopping } from './shopping-provider'

type RecipeChoice = { id: string; title: string; ingredients: string[]; updated_at: string }
export function AddToShopping({ recipes, multiplier = 1, individual = false }: { recipes: RecipeChoice[]; multiplier?: number; individual?: boolean }) {
  const [open, setOpen] = useState(false)
  return <>
    <Button variant="outline" size="sm" disabled={!recipes.length} onClick={() => setOpen(true)}>
      <ShoppingBasket className="size-4" />{individual ? 'הוסף לרשימת קניות' : 'רשימת קניות'}
    </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      {open && <Picker recipes={recipes} multiplier={multiplier} individual={individual} close={() => setOpen(false)} />}
    </Dialog>
  </>
}
function Picker({ recipes, multiplier, individual, close }: { recipes: RecipeChoice[]; multiplier: number; individual: boolean; close: () => void }) {
  const { mutate, busy, loading, error, refresh } = useShopping()
  const router = useRouter()
  const [quantities, setQuantities] = useState<Record<string, string>>(() => Object.fromEntries(recipes.map(r => [r.id, String(multiplier)])))
  const [included, setIncluded] = useState(() => new Set(recipes.map(r => r.id)))
  const [indexes, setIndexes] = useState<number[]>([])
  const [replacement, setReplacement] = useState(false)
  const [message, setMessage] = useState('')
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const valid = recipes.filter(r => included.has(r.id)).every(r => {
    const n = Number(quantities[r.id]); return Number.isFinite(n) && n >= 0.01 && n <= 100
  })
  async function save(generateNow: boolean) {
    setAdding(true); setMessage('')
    try {
      if (!added) {
        await mutate({ action: 'add', selections: recipes.filter(r => included.has(r.id)).map(r => ({
          recipeId: r.id, revision: r.updated_at, multiplier: Number(quantities[r.id]), replace: replacement,
          ...(individual ? { indexes } : {}),
        })) })
        setAdded(true)
      }
      if (generateNow) {
        // Generation is explicitly reviewed on the list page to protect edits.
        router.push('/shopping-list?review=1')
      }
      toast.success('המצרכים נשמרו ברשימת הקניות')
      close()
    } catch (e) {
      if (e instanceof ShoppingError && e.code === 'replacement_required') setReplacement(true)
      setMessage(e instanceof Error ? e.message : 'השמירה נכשלה')
    } finally { setAdding(false) }
  }
  return <DialogContent dir="rtl" className="max-h-[85dvh] overflow-y-auto">
    <DialogHeader className="text-start sm:text-start ps-5">
      <DialogTitle>מצרכים לרשימת הקניות</DialogTitle>
      <DialogDescription>{individual ? 'בחרו מצרכים לקנייה. הסימונים בזמן הבישול נשארים נפרדים.' : 'בחרו מתכונים וכמויות. המצרכים יתווספו לרשימה הקיימת.'}</DialogDescription>
    </DialogHeader>
    {error && <div role="alert"><p>{error}</p><Button variant="outline" onClick={() => void refresh()}>נסה שוב</Button></div>}
    <fieldset disabled={adding || added} className="space-y-4">
      {recipes.map(recipe => <div key={recipe.id} className="flex items-center gap-3 border-b pb-3">
        {!individual && <Checkbox aria-label={`כלול ${recipe.title}`} checked={included.has(recipe.id)} onCheckedChange={checked => setIncluded(prev => { const next = new Set(prev); if (checked) next.add(recipe.id); else next.delete(recipe.id); return next })} />}
        <span className="flex-1 font-medium">{recipe.title}</span>
        <label className="flex items-center gap-2 text-sm">כמות ×<Input type="number" min="0.01" max="100" step="any" dir="ltr" className="w-20" aria-label={`מכפיל כמות עבור ${recipe.title}`} value={quantities[recipe.id]} onChange={e => { setReplacement(false); setQuantities(prev => ({ ...prev, [recipe.id]: e.target.value })) }} /></label>
      </div>)}
      {!valid && <p role="alert" className="text-destructive">הכמות צריכה להיות בין 0.01 ל־100.</p>}
      {individual && recipes[0] && <div className="space-y-1">
        <Button type="button" variant="ghost" size="sm" onClick={() => setIndexes(indexes.length ? [] : recipes[0].ingredients.flatMap((text, i) => isIngredientHeader(text) ? [] : [i]))}>{indexes.length ? 'נקה בחירה' : 'בחר הכל'}</Button>
        {recipes[0].ingredients.map((text, index) => isIngredientHeader(text)
          ? <p className="font-semibold pt-3" key={index}>{text}</p>
          : <label key={index} className="flex items-center gap-3 min-h-11 py-2 cursor-pointer">
            <Checkbox checked={indexes.includes(index)} onCheckedChange={checked => setIndexes(prev => checked ? [...prev, index] : prev.filter(i => i !== index))} />
            <bdi className="flex-1">{text}</bdi>
          </label>)}
      </div>}
    </fieldset>
    {message && <p role="alert" className="text-destructive">{message}</p>}
    {message && !replacement && <Button variant="outline" onClick={() => void refresh()}>רענן רשימה לפני ניסיון נוסף</Button>}
    <div className="flex flex-wrap gap-2">
      <Button disabled={busy || adding || loading || !!error || !valid || !included.size || (individual && !indexes.length)} onClick={() => void save(false)}>{adding ? 'שומר…' : replacement ? 'החלף בחירה קודמת והוסף' : 'הוסף והמשך לבחור'}</Button>
      <Button variant="outline" disabled={busy || adding || loading || !!error || !valid || !included.size || (individual && !indexes.length)} onClick={() => void save(true)}>הוסף וצור רשימה</Button>
    </div>
  </DialogContent>
}
