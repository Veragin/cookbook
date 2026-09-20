import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { RecipeListPage } from './RecipeListPage'
import { RecipesProvider } from './RecipesProvider'
import { renderWithTheme } from '../../components/test-utils'

function renderList(path = '/recipes') {
  return renderWithTheme(
    <MemoryRouter initialEntries={[path]}>
      <RecipesProvider>
        <Routes>
          <Route path="/recipes" element={<RecipeListPage />} />
          <Route path="/recipes/folder/:folderId" element={<RecipeListPage />} />
          <Route path="/recipes/:id" element={<p>recipe view</p>} />
          <Route path="/recipes/new" element={<p>recipe form</p>} />
        </Routes>
      </RecipesProvider>
    </MemoryRouter>,
  )
}

/** The page starts in `loading`, so the first query always waits for hydration. */
async function heading(name: string) {
  return screen.findByRole('heading', { level: 1, name })
}

describe('RecipeListPage', () => {
  it('lists root folders and root recipes', async () => {
    renderList()

    expect(await heading('Recipes')).toBeInTheDocument()

    const folders = within(screen.getByRole('region', { name: 'Folders' }))
    expect(folders.getByRole('link', { name: /Main dishes/ })).toHaveAttribute(
      'href',
      '/recipes/folder/mains',
    )
    expect(folders.getByRole('link', { name: /Baking/ })).toBeInTheDocument()
    expect(folders.getByRole('link', { name: /Quick & easy/ })).toBeInTheDocument()
    // Nested folders are not shown at the root.
    expect(folders.queryByRole('link', { name: /Pasta/ })).not.toBeInTheDocument()

    // Counts include nested subfolders: mains + pasta + soups = 5 recipes.
    expect(folders.getByRole('link', { name: /Main dishes/ })).toHaveTextContent('5 recipes')

    const list = within(screen.getByRole('region', { name: 'Recipes' }))
    expect(list.getByRole('link', { name: /Banana Bread/ })).toHaveAttribute(
      'href',
      '/recipes/seed:banana-bread',
    )
    expect(list.getByRole('link', { name: /Lemon and Garlic Chicken Traybake/ })).toBeInTheDocument()
    // A recipe filed under a folder does not appear at the root.
    expect(list.queryByRole('link', { name: /Mushroom Risotto/ })).not.toBeInTheDocument()
  })

  it('shows a recipe card with meals, servings and the ingredient count', async () => {
    renderList()
    await heading('Recipes')

    const card = screen.getByRole('link', { name: /Banana Bread/ })
    expect(card).toHaveTextContent('Lunch')
    expect(card).toHaveTextContent('8 servings')
    expect(card).toHaveTextContent('11 ingredients')
  })

  it('navigates into a folder and shows its children', async () => {
    const user = userEvent.setup()
    renderList()
    await heading('Recipes')

    await user.click(screen.getByRole('link', { name: /Main dishes/ }))

    expect(await heading('Main dishes')).toBeInTheDocument()

    const folders = within(screen.getByRole('region', { name: 'Folders' }))
    expect(folders.getByRole('link', { name: /Pasta/ })).toBeInTheDocument()
    expect(folders.getByRole('link', { name: /Soups & stews/ })).toBeInTheDocument()

    const list = within(screen.getByRole('region', { name: 'Recipes' }))
    expect(list.getByRole('link', { name: /Mushroom Risotto/ })).toBeInTheDocument()
    // Recipes of a subfolder stay in that subfolder.
    expect(list.queryByRole('link', { name: /Beef Goulash/ })).not.toBeInTheDocument()

    // Breadcrumbs: root link plus the current folder marked as the current page.
    const crumbs = within(screen.getByRole('navigation', { name: 'Breadcrumb' }))
    expect(crumbs.getByRole('link', { name: 'Recipes' })).toHaveAttribute('href', '/recipes')
    expect(crumbs.getByRole('link', { name: 'Main dishes' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('renders a breadcrumb trail for a nested folder', async () => {
    renderList('/recipes/folder/mains-pasta')
    await heading('Pasta')

    const crumbs = within(screen.getByRole('navigation', { name: 'Breadcrumb' }))
    expect(crumbs.getByRole('link', { name: 'Recipes' })).toBeInTheDocument()
    expect(crumbs.getByRole('link', { name: 'Main dishes' })).toHaveAttribute(
      'href',
      '/recipes/folder/mains',
    )
    expect(crumbs.getByRole('link', { name: 'Pasta' })).toHaveAttribute('aria-current', 'page')
  })

  it('searches across every folder and shows each result folder path', async () => {
    const user = userEvent.setup()
    // Start inside a folder to prove search ignores the current folder.
    renderList('/recipes/folder/quick')
    await heading('Quick & easy')

    await user.type(screen.getByRole('searchbox', { name: 'Search recipes' }), 'goulash')

    expect(await screen.findByText(/1 result for/)).toBeInTheDocument()

    const results = within(screen.getByRole('region', { name: 'Search results' }))
    const card = results.getByRole('link', { name: /Beef Goulash/ })
    expect(card).toHaveTextContent('Main dishes / Soups & stews')
    // Folder browsing is replaced by the flat result list.
    expect(screen.queryByRole('region', { name: 'Folders' })).not.toBeInTheDocument()
    expect(results.queryByRole('link', { name: /Shakshuka/ })).not.toBeInTheDocument()
  })

  it('matches on ingredient names too', async () => {
    const user = userEvent.setup()
    renderList()
    await heading('Recipes')

    await user.type(screen.getByRole('searchbox'), 'arborio')

    expect(await screen.findByText(/1 result for/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Mushroom Risotto/ })).toBeInTheDocument()
  })

  it('restores folder browsing when the query is cleared', async () => {
    const user = userEvent.setup()
    renderList()
    await heading('Recipes')

    const input = screen.getByRole('searchbox')
    await user.type(input, 'goulash')
    expect(await screen.findByText(/1 result for/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear search' }))

    expect(input).toHaveValue('')
    expect(screen.queryByRole('region', { name: 'Search results' })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Folders' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Banana Bread/ })).toBeInTheDocument()
  })

  it('shows the empty-result state when nothing matches', async () => {
    const user = userEvent.setup()
    renderList()
    await heading('Recipes')

    await user.type(screen.getByRole('searchbox'), 'zzzzz')

    expect(await screen.findByText('No recipes found')).toBeInTheDocument()
    expect(screen.getByText(/0 results for/)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Recipes' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show all recipes' }))
    expect(screen.getByRole('region', { name: 'Folders' })).toBeInTheDocument()
  })

  it('shows the empty-folder state for a folder with no content', async () => {
    const user = userEvent.setup()
    renderList()
    await heading('Recipes')

    // Create an empty subfolder, then open it.
    await user.click(screen.getByRole('button', { name: 'Folder actions' }))
    await user.click(screen.getByRole('button', { name: 'New folder' }))
    await user.type(screen.getByLabelText('Folder name'), 'Empty shelf')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    await user.click(await screen.findByRole('link', { name: /Empty shelf/ }))

    expect(await heading('Empty shelf')).toBeInTheDocument()
    expect(screen.getByText('This folder is empty')).toBeInTheDocument()
  })

  it('moves a recipe into a folder through the folder picker', async () => {
    const user = userEvent.setup()
    renderList()
    await heading('Recipes')

    await user.click(screen.getByRole('button', { name: 'Move Banana Bread' }))

    const picker = await screen.findByRole('dialog', { name: 'Move Banana Bread' })
    expect(within(picker).getByRole('button', { name: /No folder \(root\)/ })).toHaveAttribute(
      'aria-current',
      'true',
    )
    await user.click(within(picker).getByRole('button', { name: 'Baking' }))

    // It leaves the root listing and the Baking count goes up (2 → 3).
    expect(
      within(screen.getByRole('region', { name: 'Recipes' })).queryByRole('link', {
        name: /Banana Bread/,
      }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Baking/ })).toHaveTextContent('3 recipes')
  })

  it('links the add-recipe action at the current folder', async () => {
    const user = userEvent.setup()
    renderList('/recipes/folder/quick')
    await heading('Quick & easy')

    await user.click(screen.getByRole('button', { name: 'Add recipe' }))
    expect(screen.getByText('recipe form')).toBeInTheDocument()
  })
})
