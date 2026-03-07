'use client'

import { useEffect } from 'react'

interface Recipe {
  id: string
  title: string
  ingredients: string[]
  instructions: string[]
  notes: string | null
}

function isGroupHeader(text: string): boolean {
  const trimmed = text.trim()
  return trimmed.endsWith(':') && !trimmed.includes(' - ') && trimmed.length < 50
}

export function PrintView({ recipes }: { recipes: Recipe[] }) {
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="print-view" dir="rtl">
      <style jsx global>{`
        @media print {
          body { margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .print-view { padding: 0; }
          .recipe-page { page-break-after: always; }
          .recipe-page:last-child { page-break-after: auto; }
        }
        @media screen {
          .print-view {
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
          }
        }
        .print-view {
          font-family: var(--font-heebo), system-ui, sans-serif;
          color: #1a1a1a;
          line-height: 1.6;
        }
        .recipe-page {
          padding: 2rem 0;
        }
        .recipe-title {
          font-size: 1.75rem;
          font-weight: 700;
          text-align: center;
          margin-bottom: 1.5rem;
          padding-bottom: 0.75rem;
          border-bottom: 2px solid #E85D2C;
        }
        .section-header {
          font-size: 1.15rem;
          font-weight: 600;
          margin: 1.25rem 0 0.5rem;
          color: #E85D2C;
        }
        .group-header {
          font-weight: 600;
          font-size: 1rem;
          margin-top: 0.75rem;
          margin-bottom: 0.25rem;
          padding-right: 0.5rem;
        }
        .ingredients-list {
          list-style: disc;
          padding-right: 1.5rem;
          margin: 0;
        }
        .ingredients-list li {
          margin-bottom: 0.25rem;
        }
        .instructions-list {
          padding-right: 1.5rem;
          margin: 0;
          counter-reset: step;
          list-style: none;
        }
        .instructions-list li {
          counter-increment: step;
          margin-bottom: 0.5rem;
        }
        .instructions-list li::before {
          content: counter(step) ". ";
          font-weight: 600;
          color: #E85D2C;
        }
        .notes-text {
          margin-top: 0.5rem;
          padding: 0.75rem;
          background: #fef9f5;
          border-radius: 0.5rem;
          border-right: 3px solid #E85D2C;
          white-space: pre-wrap;
        }
        .print-button {
          position: fixed;
          bottom: 2rem;
          left: 50%;
          transform: translateX(-50%);
          padding: 0.75rem 2rem;
          background: #E85D2C;
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-size: 1rem;
          cursor: pointer;
          z-index: 100;
        }
        .print-button:hover {
          background: #d14e20;
        }
        @media print {
          .print-button { display: none; }
          .notes-text { background: #f5f5f5; }
        }
      `}</style>

      <button className="print-button no-print" onClick={() => window.print()}>
        הדפסה / שמירה כ-PDF
      </button>

      {recipes.map((recipe) => (
        <div key={recipe.id} className="recipe-page">
          <h1 className="recipe-title">{recipe.title}</h1>

          <h2 className="section-header">חומרים</h2>
          <ul className="ingredients-list">
            {recipe.ingredients.map((ing, i) =>
              isGroupHeader(ing) ? (
                <li key={i} style={{ listStyle: 'none', marginRight: '-1.5rem' }}>
                  <div className="group-header">{ing}</div>
                </li>
              ) : (
                <li key={i}>{ing}</li>
              )
            )}
          </ul>

          <h2 className="section-header">הוראות הכנה</h2>
          <ol className="instructions-list">
            {recipe.instructions.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>

          {recipe.notes && (
            <>
              <h2 className="section-header">הערות</h2>
              <div className="notes-text">{recipe.notes}</div>
            </>
          )}
        </div>
      ))}
    </div>
  )
}
