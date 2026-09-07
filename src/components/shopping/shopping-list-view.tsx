'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ShoppingBasket, Share2, Plus, Trash2, Pencil, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { exportText, generate, hasPending, type ShoppingItem } from '@/lib/shopping-list'
import { useShopping } from './shopping-provider'

export function ShoppingListView() {
  const { state, loading, busy, error, refresh, mutate } = useShopping()
  const doc = state.document
  const [failure, setFailure] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [manual, setManual] = useState('')
  const manualId = useRef<string | null>(null)
  const [review, setReview] = useState(false)
  const [reset, setReset] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [includePurchased, setIncludePurchased] = useState(false)
  const [showPurchased, setShowPurchased] = useState(true)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState('')
  const pending = hasPending(doc)
  const visible = doc.items.filter(item => !item.hidden)
  const remaining = visible.filter(item => !item.purchased)
  const purchased = visible.filter(item => item.purchased)
  const sources = [...new Set(doc.sources.map(s => s.recipeId))]
  const preview = generate(doc)
  const text = exportText(doc, includePurchased)

  useEffect(() => {
    if (!loading && new URLSearchParams(window.location.search).get('review') === '1') {
      setReview(true)
      window.history.replaceState(window.history.state, '', '/shopping-list')
    }
  }, [loading])

  async function run(action: Record<string, unknown>) {
    setFailure('')
    try { await mutate(action); return true }
    catch (e) { setFailure(e instanceof Error ? e.message : 'השמירה נכשלה'); return false }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(text); toast.success('הרשימה הועתקה') }
    catch { toast.info('לא ניתן להעתיק אוטומטית. סמנו והעתיקו את הטקסט בתצוגה המקדימה.') }
  }
  async function share() {
    if (!navigator.share) { await copy(); return }
    try { await navigator.share({ title: doc.name, text }) }
    catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) toast.error('השיתוף לא נפתח. אפשר להעתיק את הטקסט.') }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = 'shopping-list.txt'; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  function renderItem(item: ShoppingItem) {
    const origins = doc.sources.filter(source => item.sourceIds.includes(source.id))
    return <li key={item.id} className="border-b border-border last:border-0 py-3">
      <div className="flex items-start gap-3">
        <label className="flex min-h-11 min-w-11 items-center justify-center cursor-pointer">
          <Checkbox aria-label={`נקנה: ${item.text}`} checked={item.purchased} onCheckedChange={checked => void run({ action: 'item', id: item.id, purchased: checked === true })} disabled={busy} className="size-5" />
        </label>
        <div className="flex-1 min-w-0 pt-2">
          {editing === item.id ? <form className="space-y-2" onSubmit={async e => { e.preventDefault(); if (await run({ action: 'item', id: item.id, text: draft })) setEditing(null) }}>
            <Input aria-label="תיאור וכמות" value={draft} onChange={e => setDraft(e.target.value)} maxLength={2000} required autoFocus />
            <div className="flex gap-2"><Button size="sm" disabled={busy}>שמור</Button><Button size="sm" variant="ghost" type="button" onClick={() => setEditing(null)}>ביטול</Button></div>
          </form> : <bdi className={`block break-words text-base ${item.purchased ? 'line-through text-muted-foreground' : ''}`}>{item.text}</bdi>}
          {item.review && <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">לבדיקה — ודאו שהכמות מתאימה</p>}
          {item.edited && item.text !== item.original && origins.length > 0 && <p className="text-xs text-muted-foreground mt-1">חישוב מהמתכונים: <bdi>{item.original}</bdi></p>}
          {origins.length > 0 && <details className="text-xs text-muted-foreground mt-2">
            <summary className="cursor-pointer py-1">מקור המצרכים ({origins.length})</summary>
            <ul className="space-y-1 py-2">{origins.map(source => <li key={source.id}><Link className="underline" href={`/recipes/${source.recipeId}`}>{source.title}</Link> — <bdi>{source.text}</bdi> ×{source.multiplier}{source.section && ` (${source.section})`}</li>)}</ul>
          </details>}
        </div>
        <div className="flex shrink-0">
          <Button size="icon" variant="ghost" aria-label={`ערוך ${item.text}`} onClick={() => { setEditing(item.id); setDraft(item.text) }} disabled={busy}><Pencil className="size-4" /></Button>
          <Button size="icon" variant="ghost" aria-label={`הסר ${item.text}`} onClick={() => void run({ action: 'item', id: item.id, hidden: true })} disabled={busy}><Trash2 className="size-4" /></Button>
        </div>
      </div>
    </li>
  }
  if (loading) return <p className="p-8 text-center" role="status">טוען את רשימת הקניות…</p>
  return <div dir="rtl" className="max-w-2xl mx-auto px-4 py-6 space-y-6 pb-28">
    <div className="space-y-3">
      <Link className="text-sm text-muted-foreground underline" href="/recipes">חזרה למתכונים</Link>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-[var(--font-display)] text-primary break-words">{doc.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">{remaining.length} פריטים לקנייה · {sources.length} מתכונים</p>
        </div>
        <Button variant="ghost" size="icon" aria-label="שנה שם רשימה" onClick={() => { setName(doc.name); setRenaming(true) }}><Pencil className="size-4" /></Button>
      </div>
      <p className="text-xs text-muted-foreground flex items-center gap-1" role="status">{busy ? 'שומר…' : error || failure ? 'יש שינוי שלא נשמר' : <><Check className="size-3" /> הרשימה נשמרת בחשבון שלך</>}</p>
    </div>
    {(error || failure) && <div role="alert" className="border border-destructive rounded-lg p-3 space-y-2"><p>{failure || error}</p><Button variant="outline" onClick={async () => { await refresh(); setFailure('') }}>רענן ונסה שוב</Button></div>}
    {doc.sources.length > 0 && <details className="border rounded-lg px-4 py-3">
      <summary className="cursor-pointer font-medium">מצרכים שנאספו ({doc.sources.length})</summary>
      <div className="space-y-4 mt-4">{sources.map(recipeId => {
        const rows = doc.sources.filter(s => s.recipeId === recipeId)
        return <section key={recipeId} className="space-y-2">
          <h2 className="font-semibold">{rows[0].title}</h2>
          <QuantityEditor key={`${recipeId}:${rows[0].multiplier}`} initial={rows[0].multiplier} busy={busy} save={multiplier => run({ action: 'source-quantity', recipeId, multiplier })} />
          <ul>{rows.map(source => <li key={source.id} className="flex items-center gap-2 text-sm"><bdi className="flex-1">{source.text}</bdi><Button size="icon" variant="ghost" disabled={busy} aria-label={`הסר מהבחירה: ${source.text}`} onClick={() => void run({ action: 'remove-source', id: source.id })}><Trash2 className="size-3" /></Button></li>)}</ul>
        </section>
      })}</div>
    </details>}
    {pending && <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
      <p className="font-medium">{doc.generatedSignature ? 'נוספו מצרכים או השתנו כמויות' : 'המצרכים מוכנים ליצירת הרשימה'}</p>
      <p className="text-sm text-muted-foreground">נחבר כמויות מתאימות. פריטים לא ברורים יישארו לבדיקה.</p>
      <Button disabled={busy || !!error} onClick={() => setReview(true)}>{doc.generatedSignature ? 'עדכן רשימה' : 'צור רשימת קניות'}</Button>
    </div>}
    {!doc.sources.length && !visible.length && <div className="text-center py-8 space-y-3 border-y">
      <ShoppingBasket className="size-10 mx-auto text-primary" />
      <h2 className="text-lg font-semibold">מה מבשלים השבוע?</h2>
      <p className="text-muted-foreground">בחרו מתכונים או הוסיפו מצרכים מתוך מתכון. אפשר גם להוסיף פריט כאן.</p>
      <Button asChild><Link href="/recipes">לבחירת מתכונים</Link></Button>
    </div>}
    {visible.length > 0 && <section aria-label="רשימת מצרכים" className="border rounded-lg px-2 sm:px-4 bg-card">
      <ul>{remaining.map(renderItem)}</ul>
      {purchased.length > 0 && <><button className="text-sm text-muted-foreground py-4 w-full text-start" onClick={() => setShowPurchased(!showPurchased)} aria-expanded={showPurchased}>נקנו ({purchased.length}) — {showPurchased ? 'הסתר' : 'הצג'}</button>{showPurchased && <ul>{purchased.map(renderItem)}</ul>}</>}
    </section>}
    <form className="flex gap-2" onSubmit={async e => { e.preventDefault(); manualId.current ??= crypto.randomUUID(); if (await run({ action: 'manual', id: manualId.current, text: manual })) { setManual(''); manualId.current = null } }}>
      <Input aria-label="פריט נוסף" placeholder="עוד משהו לקנות?" value={manual} onChange={e => setManual(e.target.value)} maxLength={2000} required />
      <Button disabled={busy || !!error || !manual.trim()}><Plus className="size-4" /> הוסף</Button>
    </form>
    {doc.items.some(item => item.hidden) && <details className="text-sm"><summary className="cursor-pointer">פריטים שהוסרו — שחזור</summary><ul>{doc.items.filter(item => item.hidden).map(item => <li className="flex items-center gap-2 py-1" key={item.id}><bdi className="flex-1">{item.text}</bdi><Button size="sm" variant="ghost" disabled={busy} onClick={() => void run({ action: 'item', id: item.id, hidden: false })}>שחזר</Button></li>)}</ul></details>}
    <div className="flex flex-wrap gap-3 border-t pt-4">
      <Button disabled={busy || !visible.length} onClick={() => setSharing(true)}><Share2 className="size-4" /> שיתוף וייצוא</Button>
      <Button variant="ghost" disabled={busy || (!doc.sources.length && !doc.items.length)} onClick={() => setReset(true)}>רשימה חדשה</Button>
    </div>

    <Dialog open={review} onOpenChange={setReview}><DialogContent dir="rtl" className="max-h-[85dvh] overflow-y-auto">
      <DialogHeader className="text-start sm:text-start ps-5"><DialogTitle>בדיקת רשימת הקניות</DialogTitle><DialogDescription>עריכות ידניות יישמרו. שינוי בכמות יבטל את הסימון ״נקנה״. פריטים שסומנו לבדיקה דורשים תשומת לב.</DialogDescription></DialogHeader>
      <ul className="divide-y">{preview.items.filter(item => !item.hidden).map(item => <li className="py-2" key={item.id}><bdi>{item.text}</bdi>{item.review && <span className="text-sm text-amber-700 block">לבדיקה</span>}</li>)}</ul>
      {failure && <div role="alert"><p className="text-destructive">{failure}</p><Button variant="outline" onClick={() => void refresh()}>רענן את התצוגה</Button></div>}
      <Button disabled={busy} onClick={async () => { if (await run({ action: 'generate' })) setReview(false) }}>אשר ושמור רשימה</Button>
    </DialogContent></Dialog>
    <Dialog open={reset} onOpenChange={setReset}><DialogContent dir="rtl"><DialogHeader className="ps-5"><DialogTitle>להתחיל רשימה חדשה?</DialogTitle><DialogDescription>המצרכים, העריכות והסימונים ברשימה הנוכחית יימחקו. אפשר לייצא אותם לפני שמתחילים מחדש.</DialogDescription></DialogHeader><div className="flex gap-2"><Button variant="destructive" disabled={busy} onClick={async () => { if (await run({ action: 'reset' })) setReset(false) }}>מחק והתחל מחדש</Button><Button variant="outline" onClick={() => setReset(false)}>ביטול</Button></div></DialogContent></Dialog>
    <Dialog open={renaming} onOpenChange={setRenaming}><DialogContent dir="rtl"><DialogHeader className="ps-5"><DialogTitle>שם הרשימה</DialogTitle><DialogDescription>למשל: קניות לסוף השבוע</DialogDescription></DialogHeader><form className="space-y-3" onSubmit={async e => { e.preventDefault(); if (await run({ action: 'name', name })) setRenaming(false) }}><Input aria-label="שם הרשימה" value={name} onChange={e => setName(e.target.value)} required maxLength={100} /><Button disabled={busy}>שמור</Button></form></DialogContent></Dialog>
    <Dialog open={sharing} onOpenChange={setSharing}><DialogContent dir="rtl" className="max-h-[85dvh] overflow-y-auto">
      <DialogHeader className="text-start sm:text-start ps-5"><DialogTitle>שיתוף וייצוא</DialogTitle><DialogDescription>בחרו אפליקציה ונמען במכשיר שלכם. הרשימה נשארת שמורה גם לאחר השיתוף.</DialogDescription></DialogHeader>
      {pending && <p role="alert" className="text-amber-700">יש מצרכים שטרם נכללו ברשימה. סגרו ועדכנו את הרשימה, או ייצאו את הגרסה השמורה שמוצגת כאן.</p>}
      <label className="flex items-center gap-2"><Checkbox checked={includePurchased} onCheckedChange={v => setIncludePurchased(v === true)} />כלול גם פריטים שנקנו</label>
      <Textarea value={text} readOnly aria-label="תצוגה מקדימה להעתקה" rows={8} />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void share()}>שיתוף… / Messages</Button>
        <Button variant="outline" onClick={() => { if (encodeURIComponent(text).length > 6000) { toast.info('הרשימה ארוכה — השתמשו בשיתוף או בהעתקת הטקסט'); return } window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer') }}>WhatsApp</Button>
        <Button variant="outline" onClick={() => void copy()}>העתק רשימה</Button>
        <Button variant="outline" onClick={download}>קובץ טקסט</Button>
        <Button variant="outline" onClick={() => window.open(`/shopping-list/print?all=${includePurchased ? '1' : '0'}&version=${state.version}`, '_blank', 'noopener,noreferrer')}>הדפסה / שמירה כ-PDF</Button>
      </div>
      <p className="text-xs text-muted-foreground">Messages ואפליקציות נוספות זמינים בהתאם למכשיר. אם תפריט השיתוף אינו נתמך, אפשר להעתיק ולהדביק.</p>
    </DialogContent></Dialog>
  </div>
}

function QuantityEditor({ initial, busy, save }: { initial: number; busy: boolean; save: (n: number) => Promise<boolean> }) {
  const [value, setValue] = useState(String(initial))
  return <form className="flex items-center gap-2" onSubmit={e => { e.preventDefault(); void save(Number(value)) }}>
    <label className="flex gap-2 items-center text-sm">כמות ×<Input className="w-20" dir="ltr" type="number" min="0.01" max="100" step="any" required value={value} onChange={e => setValue(e.target.value)} /></label>
    <Button size="sm" variant="outline" disabled={busy || Number(value) === initial}>עדכן כמות</Button>
  </form>
}
