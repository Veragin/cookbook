import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'

import { renderWithTheme } from '../../components/test-utils'
import { getDb, resetDbForTests } from '../../lib/db'
import type { Recipe } from '../../types'
import { RecipeFormPage } from './RecipeFormPage'
import { RecipesProvider, useRecipes } from './RecipesProvider'

const SEED_ID = 'seed:shakshuka'

/** Renders whatever the form navigated to, straight from the provider. */
function Probe() {
  const { id } = useParams<{ id: string }>()
  const { getRecipe } = useRecipes()
  const recipe = id ? getRecipe(id) : undefined
  if (!recipe) return <p>No such recipe</p>
  return <pre data-testid="saved">{JSON.stringify(recipe)}</pre>
}

function renderForm(path: string) {
  return renderWithTheme(
    <MemoryRouter initialEntries={[path]}>
      <RecipesProvider>
        <Routes>
          <Route path="/recipes" element={<h1>Recipe list</h1>} />
          <Route path="/recipes/new" element={<RecipeFormPage mode="create" />} />
          <Route path="/recipes/:id" element={<Probe />} />
          <Route path="/recipes/:id/edit" element={<RecipeFormPage mode="edit" />} />
        </Routes>
      </RecipesProvider>
    </MemoryRouter>,
  )
}

/** Waits for hydration — the form only renders once the provider leaves `loading`. */
async function waitForForm(): Promise<void> {
  await screen.findByRole('textbox', { name: 'Name' })
}

async function savedRecipe(): Promise<Recipe> {
  const node = await screen.findByTestId('saved')
  return JSON.parse(node.textContent ?? '{}') as Recipe
}

async function wipeDb(): Promise<void> {
  resetDbForTests()
  const db = await getDb()
  if (!db) return
  await Promise.all([
    db.clear('recipes'),
    db.clear('folders'),
    db.clear('tombstones'),
    db.clear('images'),
  ])
}

beforeEach(async () => {
  await wipeDb()
})

describe('RecipeFormPage — create', () => {
  it('creates a recipe end to end and hands it to the provider', async () => {
    const user = userEvent.setup()
    renderForm('/recipes/new')
    await waitForForm()

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Test Soup')

    // 4 (default) → 6
    await user.click(screen.getByRole('button', { name: 'Increase Portions' }))
    await user.click(screen.getByRole('button', { name: 'Increase Portions' }))

    await user.click(screen.getByRole('checkbox', { name: 'Lunch' }))

    await user.type(screen.getByLabelText('Ingredient 1 amount'), '1.5')
    await user.selectOptions(screen.getByLabelText('Ingredient 1 unit'), 'l')
    await user.type(screen.getByLabelText('Ingredient 1 name'), 'water')
    await user.type(screen.getByLabelText('Ingredient 1 note'), 'filtered')

    await user.type(screen.getByLabelText('Step 1'), 'Simmer gently.')

    await user.click(screen.getByRole('button', { name: 'Save recipe' }))

    const recipe = await savedRecipe()
    expect(recipe.name).toBe('Test Soup')
    expect(recipe.servings).toBe(6)
    expect(recipe.meals).toEqual(['lunch'])
    expect(recipe.origin).toBe('user')
    expect(recipe.groups).toHaveLength(1)
    expect(recipe.groups[0].title).toBeUndefined()
    expect(recipe.groups[0].items).toEqual([
      expect.objectContaining({ name: 'water', quantity: 1.5, unit: 'l', note: 'filtered' }),
    ])
    expect(recipe.instructions).toEqual(['Simmer gently.'])
  })

  it('honours the ?folderId= query param as the initial folder', async () => {
    renderForm('/recipes/new?folderId=quick')
    await waitForForm()

    expect(screen.getByLabelText('Folder')).toHaveValue('quick')
  })

  it('saves an empty amount as null ("to taste") and keeps a unit-less row', async () => {
    const user = userEvent.setup()
    renderForm('/recipes/new')
    await waitForForm()

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Seasoned Eggs')
    await user.click(screen.getByRole('checkbox', { name: 'Dinner' }))
    await user.type(screen.getByLabelText('Ingredient 1 name'), 'salt')
    await user.type(screen.getByLabelText('Step 1'), 'Season to taste.')

    await user.click(screen.getByRole('button', { name: 'Save recipe' }))

    const recipe = await savedRecipe()
    expect(recipe.groups[0].items[0]).toEqual(
      expect.objectContaining({ name: 'salt', quantity: null, unit: null }),
    )
    expect(recipe.groups[0].items[0].note).toBeUndefined()
  })

  it('accepts a comma decimal separator', async () => {
    const user = userEvent.setup()
    renderForm('/recipes/new')
    await waitForForm()

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Comma Cake')
    await user.click(screen.getByRole('checkbox', { name: 'Dinner' }))
    await user.type(screen.getByLabelText('Ingredient 1 amount'), '1,5')
    await user.selectOptions(screen.getByLabelText('Ingredient 1 unit'), 'kg')
    await user.type(screen.getByLabelText('Ingredient 1 name'), 'flour')
    await user.type(screen.getByLabelText('Step 1'), 'Mix.')

    await user.click(screen.getByRole('button', { name: 'Save recipe' }))

    const recipe = await savedRecipe()
    expect(recipe.groups[0].items[0]).toEqual(
      expect.objectContaining({ quantity: 1.5, unit: 'kg' }),
    )
  })

  it('offers ingredient names from the other recipes', async () => {
    const user = userEvent.setup()
    renderForm('/recipes/new')
    await waitForForm()

    await user.type(screen.getByLabelText('Ingredient 1 name'), 'garl')

    const listbox = await screen.findByRole('listbox')
    expect(within(listbox).getByRole('option', { name: 'garlic' })).toBeInTheDocument()

    await user.click(within(listbox).getByRole('option', { name: 'garlic' }))
    expect(screen.getByLabelText('Ingredient 1 name')).toHaveValue('garlic')
  })

  it('supports ingredient groups and extra rows', async () => {
    const user = userEvent.setup()
    renderForm('/recipes/new')
    await waitForForm()

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Two Part Bake')
    await user.click(screen.getByRole('checkbox', { name: 'Dinner' }))
    await user.type(screen.getByLabelText('Ingredient 1 name'), 'flour')

    await user.click(screen.getByRole('button', { name: '+ Add ingredient group' }))
    await user.type(screen.getByLabelText('Title for group 2'), 'Filling')
    await user.type(screen.getByLabelText('Ingredient 1 of group Filling name'), 'ricotta')

    await user.type(screen.getByLabelText('Step 1'), 'Assemble.')
    await user.click(screen.getByRole('button', { name: 'Save recipe' }))

    const recipe = await savedRecipe()
    expect(recipe.groups).toHaveLength(2)
    expect(recipe.groups[0].title).toBeUndefined()
    expect(recipe.groups[1].title).toBe('Filling')
    expect(recipe.groups[1].items[0].name).toBe('ricotta')
  })

  it('confirms before removing a group that has content, and removes rows directly', async () => {
    const user = userEvent.setup()
    renderForm('/recipes/new')
    await waitForForm()

    await user.type(screen.getByLabelText('Ingredient 1 name'), 'flour')
    await user.click(screen.getByRole('button', { name: '+ Add ingredient' }))
    await user.type(screen.getByLabelText('Ingredient 2 name'), 'butter')

    await user.click(screen.getByRole('button', { name: 'Remove ingredient 2' }))
    expect(screen.queryByLabelText('Ingredient 2 name')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove group 1' }))
    expect(await screen.findByText('Remove this group?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove' }))
    await waitFor(() =>
      expect(screen.getByLabelText('Ingredient 1 name')).toHaveValue(''),
    )
  })

  it('reorders instruction steps and drops empty lines', async () => {
    const user = userEvent.setup()
    renderForm('/recipes/new')
    await waitForForm()

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Ordered Dish')
    await user.click(screen.getByRole('checkbox', { name: 'Dinner' }))
    await user.type(screen.getByLabelText('Ingredient 1 name'), 'rice')

    await user.type(screen.getByLabelText('Step 1'), 'First.')
    await user.click(screen.getByRole('button', { name: '+ Add step' }))
    await user.type(screen.getByLabelText('Step 2'), 'Second.')
    await user.click(screen.getByRole('button', { name: '+ Add step' })) // left empty

    await user.click(screen.getByRole('button', { name: 'Move step 2 up' }))
    await user.click(screen.getByRole('button', { name: 'Save recipe' }))

    const recipe = await savedRecipe()
    expect(recipe.instructions).toEqual(['Second.', 'First.'])
  })
})

describe('RecipeFormPage — validation', () => {
  it('blocks saving without a name or a meal, and focuses the first problem', async () => {
    const user = userEvent.setup()
    renderForm('/recipes/new')
    await waitForForm()

    await user.click(screen.getByRole('button', { name: 'Save recipe' }))

    expect(await screen.findByText('Give the recipe a name.')).toBeInTheDocument()
    expect(screen.getByText('Pick at least one — lunch, dinner, or both.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus()
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAttribute('aria-invalid', 'true')

    // Nothing was saved: we are still on the form.
    expect(screen.queryByTestId('saved')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save recipe' })).toBeInTheDocument()
  })

  it('announces the problems to screen readers', async () => {
    const user = userEvent.setup()
    renderForm('/recipes/new')
    await waitForForm()

    await user.click(screen.getByRole('button', { name: 'Save recipe' }))

    // The Stepper also exposes a status region, so look across all of them.
    await waitFor(() => {
      const announced = screen
        .getAllByRole('status')
        .map((node) => node.textContent ?? '')
        .join(' ')
      expect(announced).toContain('problems to fix before saving')
      expect(announced).toContain('Give the recipe a name.')
    })
  })

  it('requires at least one instruction step', async () => {
    const user = userEvent.setup()
    renderForm('/recipes/new')
    await waitForForm()

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'No Method')
    await user.click(screen.getByRole('checkbox', { name: 'Lunch' }))
    await user.type(screen.getByLabelText('Ingredient 1 name'), 'rice')

    await user.click(screen.getByRole('button', { name: 'Save recipe' }))

    expect(await screen.findByText('Add at least one instruction step.')).toBeInTheDocument()
    expect(screen.getByLabelText('Step 1')).toHaveFocus()
  })

  it('rejects a negative or non-numeric amount', async () => {
    const user = userEvent.setup()
    renderForm('/recipes/new')
    await waitForForm()

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Bad Maths')
    await user.click(screen.getByRole('checkbox', { name: 'Lunch' }))
    await user.type(screen.getByLabelText('Ingredient 1 amount'), '-2')
    await user.type(screen.getByLabelText('Ingredient 1 name'), 'sugar')
    await user.type(screen.getByLabelText('Step 1'), 'Stir.')

    await user.click(screen.getByRole('button', { name: 'Save recipe' }))
    expect(await screen.findByText('Amount cannot be negative.')).toBeInTheDocument()
    expect(screen.getByLabelText('Ingredient 1 amount')).toHaveFocus()

    await user.clear(screen.getByLabelText('Ingredient 1 amount'))
    await user.type(screen.getByLabelText('Ingredient 1 amount'), 'two')
    await user.click(screen.getByRole('button', { name: 'Save recipe' }))
    expect(
      await screen.findByText('Enter a number like 1.5, or leave it empty for "to taste".'),
    ).toBeInTheDocument()
  })

  it('asks for a name when a row has an amount but no ingredient', async () => {
    const user = userEvent.setup()
    renderForm('/recipes/new')
    await waitForForm()

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Nameless')
    await user.click(screen.getByRole('checkbox', { name: 'Lunch' }))
    await user.type(screen.getByLabelText('Ingredient 1 amount'), '2')
    await user.type(screen.getByLabelText('Step 1'), 'Stir.')

    await user.click(screen.getByRole('button', { name: 'Save recipe' }))
    expect(await screen.findByText('Name this ingredient, or clear the row.')).toBeInTheDocument()
  })
})

describe('RecipeFormPage — edit', () => {
  it('prefills from the recipe and persists an edit to a SEED recipe (copy-on-write)', async () => {
    const user = userEvent.setup()
    renderForm(`/recipes/${SEED_ID}/edit`)
    await waitForForm()

    const nameInput = screen.getByRole('textbox', { name: 'Name' })
    await waitFor(() => expect(nameInput).toHaveValue('Shakshuka'))
    expect(screen.getByRole('checkbox', { name: 'Lunch' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Dinner' })).toBeChecked()
    expect(screen.getByLabelText('Ingredient 1 amount')).toHaveValue('2')
    expect(screen.getByLabelText('Ingredient 1 name')).toHaveValue('olive oil')

    await user.clear(nameInput)
    await user.type(nameInput, 'Shakshuka Deluxe')
    await user.click(screen.getByRole('button', { name: 'Save recipe' }))

    const recipe = await savedRecipe()
    expect(recipe.id).toBe(SEED_ID)
    expect(recipe.name).toBe('Shakshuka Deluxe')
    // Copy-on-write: still flagged as seed content, but now stored in IndexedDB.
    expect(recipe.origin).toBe('seed')
    expect(recipe.groups[0].items[0].name).toBe('olive oil')

    const db = await getDb()
    const stored = await db?.get('recipes', SEED_ID)
    expect(stored?.name).toBe('Shakshuka Deluxe')
  })

  it('shows an empty state for an unknown recipe', async () => {
    renderForm('/recipes/rec:nope/edit')
    expect(await screen.findByText('Recipe not found')).toBeInTheDocument()
  })
})

describe('RecipeFormPage — leaving', () => {
  it('leaves straight away when nothing changed', async () => {
    const user = userEvent.setup()
    renderForm('/recipes/new')
    await waitForForm()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(await screen.findByRole('heading', { name: 'Recipe list' })).toBeInTheDocument()
  })

  it('guards unsaved changes behind a confirm dialog', async () => {
    const user = userEvent.setup()
    renderForm('/recipes/new')
    await waitForForm()

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Half finished')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(await screen.findByText('Discard your changes?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Keep editing' }))
    await waitFor(() => expect(screen.queryByText('Discard your changes?')).not.toBeInTheDocument())
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Half finished')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(await screen.findByRole('button', { name: 'Discard' }))
    expect(await screen.findByRole('heading', { name: 'Recipe list' })).toBeInTheDocument()
  })
})
