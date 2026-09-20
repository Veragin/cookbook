import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { RecipeViewPage } from './RecipeViewPage'
import { RecipesProvider } from './RecipesProvider'
import { renderWithTheme } from '../../components/test-utils'

/**
 * `seed:beef-goulash` is bundled seed data, so its id and quantities are stable:
 * 6 portions, `800 g` beef shoulder, and two `to taste` items (salt, black pepper).
 */
const RECIPE_ID = 'seed:beef-goulash'

function renderView(id = RECIPE_ID) {
  return renderWithTheme(
    <MemoryRouter initialEntries={[`/recipes/${id}`]}>
      <RecipesProvider>
        <Routes>
          <Route path="/recipes" element={<h1>Recipe list</h1>} />
          <Route path="/recipes/:id" element={<RecipeViewPage />} />
          <Route path="/recipes/:id/edit" element={<h1>Edit recipe</h1>} />
        </Routes>
      </RecipesProvider>
    </MemoryRouter>,
  )
}

/** Waits for the provider to hydrate and the page to appear. */
async function renderReady(id = RECIPE_ID) {
  const result = renderView(id)
  await screen.findByRole('heading', { level: 1 })
  return result
}

async function setPortionsTo(target: number, from: number) {
  const user = userEvent.setup()
  const increase = screen.getByRole('button', { name: 'Increase Portions' })
  const decrease = screen.getByRole('button', { name: 'Decrease Portions' })
  const steps = Math.abs(target - from)
  for (let index = 0; index < steps; index += 1) {
    await user.click(target > from ? increase : decrease)
  }
}

describe('RecipeViewPage', () => {
  it('renders the recipe at its base servings', async () => {
    await renderReady()

    expect(screen.getByRole('heading', { level: 1, name: 'Beef Goulash' })).toBeInTheDocument()
    expect(screen.getByText('Serves 6 portions')).toBeInTheDocument()
    expect(screen.getByText('Lunch')).toBeInTheDocument()
    expect(screen.getByText('Dinner')).toBeInTheDocument()

    // Amounts come straight from formatAmount — number *and* unit in one string.
    expect(screen.getByText('beef shoulder')).toBeInTheDocument()
    expect(screen.getByText('800 g')).toBeInTheDocument()
    expect(screen.getByText('1.5 l')).toBeInTheDocument()
    expect(screen.getByText('1 tsp')).toBeInTheDocument()
    // Olive oil and smoked paprika are both 2 tbsp at the base servings.
    expect(screen.getAllByText('2 tbsp')).toHaveLength(2)
    expect(screen.getByText('cubed')).toBeInTheDocument()

    // Group headings.
    expect(screen.getByRole('heading', { name: 'Stew' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'To serve' })).toBeInTheDocument()

    // Not scaled yet, so no reset affordance.
    expect(screen.queryByRole('button', { name: /^Reset/ })).not.toBeInTheDocument()
  })

  it('doubling the portions doubles every numeric amount', async () => {
    await renderReady()

    await setPortionsTo(12, 6)

    // 800 g × 2 = 1600 g, which formatQuantity promotes to kilograms.
    expect(screen.getByText('1.6 kg')).toBeInTheDocument()
    // 150 ml × 2, 3 tbsp × 2, 1.5 l × 2.
    expect(screen.getByText('300 ml')).toBeInTheDocument()
    expect(screen.getByText('6 tbsp')).toBeInTheDocument()
    expect(screen.getByText('3 l')).toBeInTheDocument()

    expect(screen.getByText('Scaled from 6 portions')).toBeInTheDocument()
    expect(screen.getByText('×2')).toBeInTheDocument()
  })

  it('halves amounts into kitchen fractions', async () => {
    await renderReady()

    await setPortionsTo(3, 6)

    expect(screen.getByText('400 g')).toBeInTheDocument()
    expect(screen.getAllByText('1 tbsp')).toHaveLength(2)
    expect(screen.getByText('1½ tbsp')).toBeInTheDocument()
    // 1 tsp of caraway halved.
    expect(screen.getByText('½ tsp')).toBeInTheDocument()
    expect(screen.getByText('×0.5')).toBeInTheDocument()
  })

  it('keeps "to taste" ingredients unscaled', async () => {
    await renderReady()

    expect(screen.getAllByText('to taste')).toHaveLength(2)

    await setPortionsTo(12, 6)
    expect(screen.getAllByText('to taste')).toHaveLength(2)

    await setPortionsTo(1, 12)
    expect(screen.getAllByText('to taste')).toHaveLength(2)
  })

  it('resets back to the base servings', async () => {
    const user = userEvent.setup()
    await renderReady()

    await setPortionsTo(12, 6)
    expect(screen.getByText('1.6 kg')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reset to 6 portions' }))

    expect(screen.getByText('800 g')).toBeInTheDocument()
    expect(screen.queryByText('1.6 kg')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reset to 6 portions' })).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Portions' })).toHaveTextContent('6')
  })

  it('never scales below one portion', async () => {
    await renderReady()

    await setPortionsTo(1, 6)
    expect(screen.getByRole('button', { name: 'Decrease Portions' })).toBeDisabled()
    expect(screen.getByRole('group', { name: 'Portions' })).toHaveTextContent('1')
  })

  it('renders the instructions as a numbered list', async () => {
    await renderReady()

    const list = within(
      screen.getByRole('region', { name: 'Instructions' }),
    ).getByRole('list')
    const steps = within(list).getAllByRole('listitem')

    expect(steps).toHaveLength(6)
    expect(steps[0]).toHaveTextContent('1')
    expect(steps[0]).toHaveTextContent('Pat the beef dry')
    expect(steps[5]).toHaveTextContent('6')
  })

  it('navigates to the edit form', async () => {
    const user = userEvent.setup()
    await renderReady()

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByRole('heading', { name: 'Edit recipe' })).toBeInTheDocument()
  })

  it('deletes after confirmation and returns to the list', async () => {
    const user = userEvent.setup()
    await renderReady()

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByRole('heading', { name: 'Recipe list' })).toBeInTheDocument()
  })

  it('shows an empty state for an unknown id instead of crashing', async () => {
    renderView('seed:does-not-exist')

    expect(await screen.findByRole('heading', { name: 'Recipe not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to all recipes' })).toHaveAttribute(
      'href',
      '/recipes',
    )
  })
})
