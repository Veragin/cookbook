import { describe, expect, it } from 'vitest'

import {
  collectIngredientNames,
  folderDescendants,
  folderPath,
  mergeFolders,
  mergeRecipes,
} from './merge'
import type { Folder, Recipe } from '../types'

function recipe(id: string, name: string, ingredients: string[] = []): Recipe {
  return {
    id,
    name,
    folderId: null,
    servings: 4,
    groups: [
      {
        id: `${id}:g0`,
        items: ingredients.map((ingredientName, index) => ({
          id: `${id}:g0:i${index}`,
          name: ingredientName,
          quantity: null,
          unit: null,
        })),
      },
    ],
    instructions: [],
    meals: [],
    taste: 'salty',
    origin: id.startsWith('seed:') ? 'seed' : 'user',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }
}

function folder(id: string, name: string, parentId: string | null = null): Folder {
  return { id, name, parentId }
}

describe('mergeRecipes', () => {
  it('lets a stored copy override the seed recipe with the same id', () => {
    const seed = [recipe('seed:goulash', 'Beef Goulash')]
    const stored = [{ ...recipe('seed:goulash', 'Beef Goulash (mine)'), origin: 'seed' as const }]

    const merged = mergeRecipes(seed, stored, new Set())

    expect(merged).toHaveLength(1)
    expect(merged[0].name).toBe('Beef Goulash (mine)')
  })

  it('removes tombstoned ids from both seed and stored recipes', () => {
    const seed = [recipe('seed:a', 'Apple pie'), recipe('seed:b', 'Bread')]
    const stored = [recipe('rec:1', 'Cake')]

    const merged = mergeRecipes(seed, stored, new Set(['seed:a', 'rec:1']))

    expect(merged.map((entry) => entry.id)).toEqual(['seed:b'])
  })

  it('includes user-only recipes that have no seed counterpart', () => {
    const merged = mergeRecipes([recipe('seed:a', 'Apple pie')], [recipe('rec:1', 'Brownies')], new Set())

    expect(merged.map((entry) => entry.id)).toEqual(['seed:a', 'rec:1'])
  })

  it('sorts by name with localeCompare', () => {
    const merged = mergeRecipes(
      [recipe('seed:z', 'Zucchini soup'), recipe('seed:e', 'Éclair')],
      [recipe('rec:1', 'apple crumble')],
      new Set(),
    )

    expect(merged.map((entry) => entry.name)).toEqual(['apple crumble', 'Éclair', 'Zucchini soup'])
  })

  it('handles empty seed data', () => {
    expect(mergeRecipes([], [], new Set())).toEqual([])
  })
})

describe('mergeFolders', () => {
  it('overrides seed folders by id and keeps user-only folders', () => {
    const merged = mergeFolders(
      [folder('mains', 'Main dishes'), folder('sweets', 'Sweets')],
      [folder('mains', 'Mains'), folder('fld:1', 'Weeknight')],
    )

    expect(merged.map((entry) => entry.name)).toEqual(['Mains', 'Sweets', 'Weeknight'])
  })
})

describe('collectIngredientNames', () => {
  it('dedupes case-insensitively, keeping the most common casing', () => {
    const names = collectIngredientNames([
      recipe('rec:1', 'One', ['Salt', 'salt', 'Olive oil']),
      recipe('rec:2', 'Two', ['salt', 'SALT', 'olive oil']),
    ])

    // "salt" appears 3× vs "Salt" 1× and "SALT" 1×.
    expect(names).toContain('salt')
    expect(names).not.toContain('Salt')
    expect(names).not.toContain('SALT')
  })

  it('breaks casing ties alphabetically (localeCompare order)', () => {
    const names = collectIngredientNames([recipe('rec:1', 'One', ['Butter', 'butter'])])

    expect(names).toHaveLength(1)
    // Same count for both spellings, so the alphabetically first one wins. The whole
    // app orders strings with `localeCompare`, which ranks 'butter' before 'Butter'.
    expect(names).toEqual(['butter'])
  })

  it('sorts alphabetically and ignores blank names', () => {
    const names = collectIngredientNames([
      recipe('rec:1', 'One', ['pepper', '   ', 'basil', 'Carrot']),
    ])

    expect(names).toEqual(['basil', 'Carrot', 'pepper'])
  })

  it('returns an empty array for no recipes', () => {
    expect(collectIngredientNames([])).toEqual([])
  })
})

describe('folderDescendants', () => {
  const tree = [
    folder('mains', 'Mains'),
    folder('pasta', 'Pasta', 'mains'),
    folder('baked', 'Baked pasta', 'pasta'),
    folder('sweets', 'Sweets'),
  ]

  it('returns every nested folder id at any depth', () => {
    expect(folderDescendants(tree, 'mains').sort()).toEqual(['baked', 'pasta'])
  })

  it('returns an empty array for a leaf or unknown folder', () => {
    expect(folderDescendants(tree, 'baked')).toEqual([])
    expect(folderDescendants(tree, 'nope')).toEqual([])
  })

  it('is cycle-safe', () => {
    const cyclic = [
      folder('a', 'A', 'c'),
      folder('b', 'B', 'a'),
      folder('c', 'C', 'b'),
    ]

    const descendants = folderDescendants(cyclic, 'a')

    expect(descendants.sort()).toEqual(['b', 'c'])
  })
})

describe('folderPath', () => {
  const tree = [
    folder('mains', 'Mains'),
    folder('pasta', 'Pasta', 'mains'),
    folder('baked', 'Baked pasta', 'pasta'),
  ]

  it('returns a root → leaf breadcrumb', () => {
    expect(folderPath(tree, 'baked').map((entry) => entry.id)).toEqual(['mains', 'pasta', 'baked'])
  })

  it('returns just the folder when it is at the root', () => {
    expect(folderPath(tree, 'mains').map((entry) => entry.id)).toEqual(['mains'])
  })

  it('returns an empty array for an unknown folder', () => {
    expect(folderPath(tree, 'nope')).toEqual([])
  })

  it('stops instead of looping forever on a cycle', () => {
    const cyclic = [folder('a', 'A', 'b'), folder('b', 'B', 'a')]

    const path = folderPath(cyclic, 'a')

    expect(path.map((entry) => entry.id)).toEqual(['b', 'a'])
  })

  it('stops at a missing parent', () => {
    const orphan = [folder('child', 'Child', 'ghost')]

    expect(folderPath(orphan, 'child').map((entry) => entry.id)).toEqual(['child'])
  })
})
