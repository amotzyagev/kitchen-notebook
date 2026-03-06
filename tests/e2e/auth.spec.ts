import { test, expect } from '@playwright/test'

test('login page shows Hebrew content', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('text=התחברות')).toBeVisible()
})
