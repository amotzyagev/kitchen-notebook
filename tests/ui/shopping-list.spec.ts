import { expect, test } from '@playwright/test'
import { emptyDocument, generate, type ShoppingState } from '../../src/lib/shopping-list'

test('collects across recipes, survives reload, generates Hebrew totals and exports', async ({ page }) => {
  const state: ShoppingState = { version: 0, document: emptyDocument() }
  const ingredients: Record<string, string[]> = {
    '11111111-1111-4111-8111-111111111111': ['לבצק:', '2 ביצים', '500 גרם קמח'],
    '22222222-2222-4222-8222-222222222222': ['3 ביצים', '1 ליטר חלב', 'מלח לפי הטעם'],
  }
  await page.route('**/api/shopping-list', async route => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON()
      if (body.action === 'add') for (const selection of body.selections) {
        const rows = ingredients[selection.recipeId]
        for (const index of selection.indexes ?? rows.map((_, i) => i)) {
          if (rows[index].endsWith(':')) continue
          const id = `${selection.recipeId}:${index}`
          if (!state.document.sources.some(s => s.id === id)) state.document.sources.push({ id, recipeId: selection.recipeId, revision: '2026-09-06T00:00:00Z', title: 'מתכון בדיקה', text: rows[index], index, section: '', multiplier: selection.multiplier })
        }
      }
      if (body.action === 'generate') state.document = generate(state.document)
      if (body.action === 'item') state.document.items = state.document.items.map(item => item.id === body.id ? { ...item, ...(body.purchased !== undefined ? { purchased: body.purchased } : {}), ...(body.text ? { text: body.text, edited: true } : {}) } : item)
      state.version++
    }
    await route.fulfill({ json: structuredClone(state) })
  })
  await page.goto('/recipe-0')
  await page.getByRole('button', { name: 'הוסף לרשימת קניות' }).click()
  await page.getByRole('dialog').getByRole('checkbox', { name: '2 ביצים' }).check()
  await page.getByRole('button', { name: 'הוסף והמשך לבחור' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'פנקייק משפחתי', exact: true }).click()
  await page.getByRole('button', { name: 'הוסף לרשימת קניות' }).click()
  await page.getByRole('dialog').getByRole('checkbox', { name: '3 ביצים' }).check()
  await page.getByRole('button', { name: 'הוסף והמשך לבחור' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.reload()
  await page.getByRole('link', { name: 'רשימת קניות, 2 מרכיבים שנבחרו' }).click()
  await page.getByRole('button', { name: 'צור רשימת קניות', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('ביצים — 5 יחידות')
  await page.getByRole('button', { name: 'אשר ושמור רשימה' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'ערוך ביצים — 5 יחידות' }).click()
  await page.getByRole('textbox', { name: 'תיאור וכמות' }).fill('ביצים גדולות — 5 יחידות')
  await page.getByRole('button', { name: 'שמור', exact: true }).click()
  await expect(page.getByRole('checkbox', { name: 'נקנה: ביצים גדולות — 5 יחידות' })).toBeVisible()
  await page.getByRole('button', { name: 'שיתוף וייצוא', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'תצוגה מקדימה להעתקה' })).toHaveValue('רשימת קניות\n☐ ביצים גדולות — 5 יחידות')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'קובץ טקסט', exact: true }).click()
  expect((await downloadPromise).suggestedFilename()).toBe('shopping-list.txt')
  await page.getByRole('button', { name: 'סגור', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.screenshot({ path: 'test-results/shopping-list-mobile.png', fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  // Mode 1 adds all remaining rows without duplicating individual selections.
  await page.getByRole('button', { name: 'מתכונים', exact: true }).click()
  await page.getByRole('button', { name: 'רשימת קניות', exact: true }).click()
  await page.getByRole('button', { name: 'הוסף והמשך לבחור' }).click()
  await expect(page.getByRole('link', { name: 'רשימת קניות, 5 מרכיבים שנבחרו' })).toBeVisible()
  await page.getByRole('link', { name: 'רשימת קניות, 5 מרכיבים שנבחרו' }).click()
  await page.getByRole('button', { name: 'עדכן רשימה', exact: true }).click()
  await page.getByRole('button', { name: 'אשר ושמור רשימה' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.screenshot({ path: 'test-results/shopping-list-mobile.png', fullPage: true })
  await page.goto('/shopping-list/print')
  await expect(page.locator('.shopping-print')).toContainText('ביצים גדולות')
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('header')).toBeHidden()
  await page.pdf({ path: 'test-results/shopping-list-print.pdf', format: 'A4' })
  await page.screenshot({ path: 'test-results/shopping-list-print.png', fullPage: true })
})
