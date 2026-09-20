import { expect, test } from '@playwright/test'

/**
 * End-to-end smoke test over the real app: browse → search → scale → suggest,
 * plus a round-trip through IndexedDB for a user-created recipe.
 */

test('browses seed recipes and searches across folders', async ({ page }) => {
  await page.goto('/recipes')

  // Seed folders render at the root.
  await expect(page.getByText('Main dishes')).toBeVisible()

  // Search is diacritics- and case-insensitive and flattens folders.
  await page.getByRole('searchbox').or(page.getByPlaceholder(/search/i)).first().fill('goulash')
  await expect(page.getByText(/goulash/i).first()).toBeVisible()
})

test('scales a recipe by portions without mutating it', async ({ page }) => {
  await page.goto('/recipes')
  await page.getByPlaceholder(/search/i).first().fill('goulash')
  await page.getByRole('link', { name: /goulash/i }).first().click()

  await expect(page.getByRole('heading', { name: /goulash/i })).toBeVisible()

  // Beef goulash is seeded with 800 g of beef at 6 portions.
  await expect(page.getByText('800 g')).toBeVisible()

  const increase = page.getByRole('button', { name: /increase portions/i })
  for (let i = 0; i < 6; i++) await increase.click()

  // 800 g doubled promotes to 1.6 kg; "to taste" never scales.
  await expect(page.getByText('1.6 kg')).toBeVisible()
  await expect(page.getByText('to taste').first()).toBeVisible()

  // Reloading shows the unscaled base again — scaling is view-only.
  await page.reload()
  await expect(page.getByText('800 g')).toBeVisible()
})

test('suggests a meal matching the chosen ingredient', async ({ page }) => {
  await page.goto('/suggest')

  await page.getByRole('radio', { name: /dinner/i }).click()
  await page.getByRole('combobox').first().fill('garlic')
  await page.getByRole('option', { name: /garlic/i }).first().click()

  await page.getByRole('button', { name: /^suggest/i }).click()

  await expect(page.getByRole('link').filter({ hasText: /\w/ }).first()).toBeVisible()
})

test('creates a recipe and persists it across a reload', async ({ page }) => {
  const name = 'Playwright Test Soup'

  await page.goto('/recipes/new')

  await page.getByLabel('Name', { exact: true }).fill(name)
  await page.getByRole('checkbox', { name: /lunch/i }).check()

  await page.getByLabel(/amount$/i).first().fill('2')
  await page.getByLabel(/ name$/i).first().fill('carrot')
  await page.getByLabel(/^step 1$/i).fill('Simmer everything gently.')

  await page.getByRole('button', { name: /save recipe/i }).click()

  await expect(page.getByRole('heading', { name })).toBeVisible()

  // IndexedDB round-trip.
  await page.reload()
  await expect(page.getByRole('heading', { name })).toBeVisible()
})

test('remembers a dark theme choice across a reload', async ({ page }) => {
  await page.goto('/recipes')

  await page.getByRole('button', { name: 'Switch to dark theme' }).click()

  const body = page.locator('body')
  await expect(body).toHaveCSS('background-color', 'rgb(23, 18, 15)')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  // Applied by the inline boot script, before React has mounted.
  await page.reload()
  await expect(body).toHaveCSS('background-color', 'rgb(23, 18, 15)')
  await expect(page.getByRole('button', { name: 'Switch to light theme' })).toBeVisible()
})
