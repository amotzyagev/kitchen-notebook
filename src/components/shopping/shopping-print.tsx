'use client'
import { Button } from '@/components/ui/button'
import type { ShoppingDocument } from '@/lib/shopping-list'
export function ShoppingPrint({ document, all, warning }: { document: ShoppingDocument; all: boolean; warning: boolean }) {
  return <article className="shopping-print max-w-2xl mx-auto p-6" dir="rtl">
    <style>{`
      .shopping-print ul { list-style: none; padding: 0; }
      .shopping-print li { padding: 0.6rem 0; border-bottom: 1px solid #ddd; break-inside: avoid; overflow-wrap: anywhere; }
      @media print {
        @page { size: A4; margin: 18mm; }
        body { background: white !important; color: black !important; }
        header, nav, .no-print, [data-sonner-toaster] { display: none !important; }
        main { padding: 0 !important; }
        .shopping-print { padding: 0; max-width: none; color: black; }
        .shopping-print h1 { color: black; }
      }
    `}</style>
    <div className="no-print space-y-3 mb-6">
      {warning && <p role="alert">הרשימה עודכנה או שיש מצרכים שטרם נוצרו. בדקו את הגרסה המוצגת לפני ההדפסה.</p>}
      <Button onClick={() => window.print()}>הדפסה / שמירה כ-PDF</Button>
    </div>
    <h1 className="text-2xl font-semibold mb-4">{document.name}</h1>
    <ul>{document.items.filter(item => !item.hidden && (all || !item.purchased)).map(item => <li key={item.id}><span aria-hidden="true">{item.purchased ? '☑' : '☐'} </span><bdi>{item.text}</bdi></li>)}</ul>
  </article>
}
