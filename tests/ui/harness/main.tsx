// Browser-only component harness. It is not part of the Next.js app or deployment.
import { createRoot } from 'react-dom/client'
import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'
import { ShoppingProvider } from '@/components/shopping/shopping-provider'
import { ShoppingListView } from '@/components/shopping/shopping-list-view'
import { ShoppingLink } from '@/components/shopping/shopping-link'
import { AddToShopping } from '@/components/shopping/add-to-shopping'
import { RecipeMultiplierSection } from '@/components/recipe/recipe-multiplier-section'
import { ShoppingPrint } from '@/components/shopping/shopping-print'
import { useShopping } from '@/components/shopping/shopping-provider'
import { navigate } from './navigation'
import './styles.css'

const recipes = [
  { id: '11111111-1111-4111-8111-111111111111', title: 'עוגת יום שישי', ingredients: ['לבצק:', '2 ביצים', '500 גרם קמח'], updated_at: '2026-09-06T00:00:00Z' },
  { id: '22222222-2222-4222-8222-222222222222', title: 'פנקייק משפחתי', ingredients: ['3 ביצים', '1 ליטר חלב', 'מלח לפי הטעם'], updated_at: '2026-09-06T00:00:00Z' },
]
function App() {
  const [path, setPath] = useState(location.pathname)
  const { state } = useShopping()
  useEffect(() => { const update = () => setPath(location.pathname); window.addEventListener('popstate', update); return () => window.removeEventListener('popstate', update) }, [])
  return <>
    <header className="sticky top-0 bg-background border-b h-14 flex items-center justify-between px-4"><span>מחברת המתכונים</span><ShoppingLink /></header>
    <nav className="flex flex-wrap gap-4 p-4 no-print"><button onClick={() => navigate('/recipes')}>מתכונים</button>{recipes.map((r, i) => <button key={r.id} onClick={() => navigate(`/recipe-${i}`)}>{r.title}</button>)}</nav>
    {path === '/shopping-list/print' ? <ShoppingPrint document={state.document} all={false} warning={false} />
      : path === '/shopping-list' ? <ShoppingListView />
      : path.startsWith('/recipe-') ? <div className="max-w-2xl mx-auto p-4"><h1 className="text-2xl mb-6">{recipes[Number(path.slice(-1))].title}</h1><RecipeMultiplierSection ingredients={recipes[Number(path.slice(-1))].ingredients} recipeId={recipes[Number(path.slice(-1))].id} title={recipes[Number(path.slice(-1))].title} revision={recipes[Number(path.slice(-1))].updated_at} /></div>
      : <div className="p-4"><p className="mb-4">שני מתכונים נבחרו</p><AddToShopping recipes={recipes} /></div>}
    <Toaster dir="rtl" />
  </>
}
createRoot(document.getElementById('root')!).render(<ShoppingProvider><App /></ShoppingProvider>)
