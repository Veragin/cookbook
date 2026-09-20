import { describe, expect, it } from 'vitest'

import { hasAllIngredients, normalize, searchRecipes } from './search'
import type { Ingredient, Recipe } from '../types'

let counter = 0

function item(name: string): Ingredient {
  counter += 1
  return { id: `i${counter}`, name, quantity: 1, unit: null }
}

function recipe(name: string, ingredients: string[][], id = name): Recipe {
  return {
    id,
    name,
    folderId: null,
    servings: 4,
    groups: ingredients.map((names, index) => ({
      id: `g${index}`,
      title: index === 0 ? undefined : `Group ${index}`,
      items: names.map(item),
    })),
    instructions: ['Cook it.'],
    meals: ['dinner'],
    taste: 'salty',
    origin: 'seed',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }
}

const svickova = recipe('Svíčková na smetaně', [
  ['hovězí svíčková', 'kořenová zelenina'],
  ['smetana ke šlehání', 'brusinky'],
])
const gulas = recipe('Beef Goulash', [['beef shoulder', 'onion', 'sweet paprika']])
const rizek = recipe('Smažený řízek', [['vepřová kotleta', 'strouhanka', 'vejce']])
const salad = recipe('Tomato Salad', [['tomato', 'red onion', 'olive oil']])

const all = [svickova, gulas, rizek, salad]

describe('normalize', () => {
  it('lowercases and trims', () => {
    expect(normalize('  Beef Goulash  ')).toBe('beef goulash')
  })

  it('strips Czech and European diacritics', () => {
    expect(normalize('ěščřžýáíéůúňťďó')).toBe('escrzyaieuuntdo')
    expect(normalize('Svíčková')).toBe('svickova')
    expect(normalize('Smažený řízek')).toBe('smazeny rizek')
    expect(normalize('Crème Brûlée')).toBe('creme brulee')
    expect(normalize('JALAPEÑO')).toBe('jalapeno')
  })

  it('collapses internal whitespace', () => {
    expect(normalize('hovězí\t svíčková')).toBe('hovezi svickova')
  })

  it('handles the empty string', () => {
    expect(normalize('')).toBe('')
    expect(normalize('   ')).toBe('')
  })
})

describe('searchRecipes', () => {
  it('returns the input unchanged for an empty or whitespace query', () => {
    expect(searchRecipes(all, '')).toBe(all)
    expect(searchRecipes(all, '   ')).toBe(all)
    expect(searchRecipes(all, '\n\t ')).toBe(all)
  })

  it('finds a diacritics-heavy name from an ASCII query', () => {
    expect(searchRecipes(all, 'svickova')).toEqual([svickova])
    expect(searchRecipes(all, 'rizek')).toEqual([rizek])
  })

  it('is case-insensitive', () => {
    expect(searchRecipes(all, 'GOULASH')).toEqual([gulas])
    expect(searchRecipes(all, 'gOuLaSh')).toEqual([gulas])
    expect(searchRecipes(all, 'SVÍČKOVÁ')).toEqual([svickova])
  })

  it('matches partial substrings of the name', () => {
    expect(searchRecipes(all, 'gou')).toEqual([gulas])
  })

  it('matches ingredient names in any group', () => {
    expect(searchRecipes(all, 'brusinky')).toEqual([svickova])
    expect(searchRecipes(all, 'strouhanka')).toEqual([rizek])
    expect(searchRecipes(all, 'paprika')).toEqual([gulas])
  })

  it('matches across several recipes and preserves input order', () => {
    expect(searchRecipes(all, 'onion')).toEqual([gulas, salad])
    expect(searchRecipes([salad, gulas], 'onion')).toEqual([salad, gulas])
  })

  it('AND-s multi-word queries across name and ingredients', () => {
    expect(searchRecipes(all, 'beef onion')).toEqual([gulas])
    expect(searchRecipes(all, 'tomato onion')).toEqual([salad])
    // Both tokens exist, but not in the same recipe.
    expect(searchRecipes(all, 'goulash tomato')).toEqual([])
  })

  it('matches multi-word queries irrespective of token order', () => {
    expect(searchRecipes(all, 'onion beef')).toEqual([gulas])
  })

  it('does not match across a field boundary', () => {
    // "goulash beef" as a single phrase spans name → ingredient; it must not match.
    expect(searchRecipes(all, 'goulashbeef')).toEqual([])
  })

  it('returns an empty array when nothing matches', () => {
    expect(searchRecipes(all, 'chocolate')).toEqual([])
  })

  it('handles an empty recipe list', () => {
    expect(searchRecipes([], 'anything')).toEqual([])
  })
})

describe('hasAllIngredients', () => {
  it('is true for an empty list', () => {
    expect(hasAllIngredients(gulas, [])).toBe(true)
    expect(hasAllIngredients(gulas, ['  '])).toBe(true)
  })

  it('is true when every requested ingredient is present', () => {
    expect(hasAllIngredients(gulas, ['beef'])).toBe(true)
    expect(hasAllIngredients(gulas, ['beef', 'onion', 'paprika'])).toBe(true)
  })

  it('is false when one is missing', () => {
    expect(hasAllIngredients(gulas, ['beef', 'tomato'])).toBe(false)
    expect(hasAllIngredients(gulas, ['chocolate'])).toBe(false)
  })

  it('ignores case and diacritics', () => {
    expect(hasAllIngredients(svickova, ['SVÍČKOVÁ'])).toBe(true)
    expect(hasAllIngredients(svickova, ['smetana', 'brusinky'])).toBe(true)
    expect(hasAllIngredients(rizek, ['veprova kotleta'])).toBe(true)
  })

  it('looks across all ingredient groups', () => {
    expect(hasAllIngredients(svickova, ['hovezi', 'brusinky'])).toBe(true)
  })

  it('matches on a substring of an ingredient name', () => {
    expect(hasAllIngredients(salad, ['oli'])).toBe(true)
  })
})
