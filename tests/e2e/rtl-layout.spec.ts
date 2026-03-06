import { test, expect } from '@playwright/test'

test('HTML has RTL direction', async ({ page }) => {
  await page.goto('/login')
  const dir = await page.locator('html').getAttribute('dir')
  expect(dir).toBe('rtl')
})

test('no horizontal scroll on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/login')
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
})
