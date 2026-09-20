import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { renderWithTheme } from '../../components/test-utils'
import { seedRecipes } from '../../data/seed'
import { hasAllIngredients } from '../../lib/search'
import { RecipesProvider } from '../recipes/RecipesProvider'
import { SuggestPage } from './SuggestPage'

function renderPage() {
  return renderWithTheme(
    <MemoryRouter initialEntries={['/suggest']}>
      <RecipesProvider>
        <SuggestPage />
      </RecipesProvider>
    </MemoryRouter>,
  )
}

/** Waits out the provider's async hydration — the page shows a spinner until then. */
async function waitForPage() {
  return screen.findByRole('radio', { name: 'Dinner' })
}

async function addIngredient(user: ReturnType<typeof userEvent.setup>, name: string) {
  const input = screen.getByLabelText('Ingredients')
  await user.click(input)
  await user.type(input, `${name}{Enter}`)
}

function suggestionRegion() {
  return screen.getByRole('region', { name: 'Suggestion' })
}

describe('SuggestPage', () => {
  it('suggests a recipe that really carries the chosen meal and ingredient', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await waitForPage())
    await addIngredient(user, 'garlic')

    expect(screen.getByRole('button', { name: 'Suggest a meal' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Suggest a meal' }))

    const link = await within(suggestionRegion()).findByRole('link')
    const name = (link.getAttribute('aria-label') ?? '').replace(/^Open /, '')

    const suggested = seedRecipes.find((recipe) => recipe.name === name)
    expect(suggested, `no seed recipe named "${name}"`).toBeDefined()
    expect(suggested?.meals).toContain('dinner')
    expect(hasAllIngredients(suggested!, ['garlic'])).toBe(true)

    // The card explains why it matched, and opens the full recipe.
    expect(link).toHaveAttribute('href', `/recipes/${suggested!.id}`)
    expect(within(link).getByText('Matched ingredients')).toBeInTheDocument()
    expect(within(link).getByText('garlic')).toBeInTheDocument()
  })

  it('shows the no-match state for an impossible combination and can clear it', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitForPage()
    await addIngredient(user, 'garlic')
    await addIngredient(user, 'banana')

    expect(await screen.findByText('Nothing matches')).toBeInTheDocument()
    expect(screen.getByText('No recipes match right now')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Suggest a meal' })).toBeDisabled()
    expect(within(suggestionRegion()).queryByRole('link')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Clear ingredients' }))

    await waitFor(() => {
      expect(screen.queryByText('Nothing matches')).toBeNull()
    })
    expect(screen.getByRole('button', { name: 'Suggest a meal' })).toBeEnabled()
    expect(screen.getByText(`${seedRecipes.length} recipes match`)).toBeInTheDocument()
  })

  it('keeps the meal filter honest — lunch-only filters never offer a dinner-only recipe', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitForPage()
    await user.click(screen.getByRole('radio', { name: 'Lunch' }))
    await addIngredient(user, 'banana')

    await user.click(screen.getByRole('button', { name: 'Suggest a meal' }))

    const link = await within(suggestionRegion()).findByRole('link')
    expect(link).toHaveAttribute('href', '/recipes/seed:banana-bread')
    expect(within(link).getByText('Banana Bread')).toBeInTheDocument()
  })

  it('says so instead of silently repeating when only one recipe matches', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitForPage()
    await addIngredient(user, 'arborio')

    expect(screen.getByText('1 recipe matches')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Suggest a meal' }))

    const link = await within(suggestionRegion()).findByRole('link')
    expect(link).toHaveAttribute('href', '/recipes/seed:mushroom-risotto')

    // Second press: "suggest another" has nowhere else to go and must admit it.
    await user.click(screen.getByRole('button', { name: 'Suggest another' }))
    expect(
      await screen.findByText(/only recipe matching your filters/i),
    ).toBeInTheDocument()
    expect(within(suggestionRegion()).getByRole('link')).toHaveAttribute(
      'href',
      '/recipes/seed:mushroom-risotto',
    )
  })
})
