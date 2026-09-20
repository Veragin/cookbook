import { describe, expect, it } from 'vitest'

import type { Meal, Recipe } from '../../types'
import { findCandidates, matchedIngredients, pickRandom } from './suggest'

function recipe(
  id: string,
  name: string,
  meals: Meal[],
  ingredients: string[],
): Recipe {
  return {
    id,
    name,
    folderId: null,
    servings: 2,
    groups: [
      {
        id: `${id}:g0`,
        items: ingredients.map((ingredient, index) => ({
          id: `${id}:g0:i${index}`,
          name: ingredient,
          quantity: null,
          unit: null,
        })),
      },
    ],
    instructions: [],
    meals,
    taste: 'salty',
    origin: 'seed',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }
}

const soup = recipe('r1', 'Tomato Soup', ['lunch'], ['tomato', 'onion', 'basil'])
const pasta = recipe('r2', 'Garlic Pasta', ['lunch', 'dinner'], ['spaghetti', 'garlic', 'olive oil'])
const roast = recipe('r3', 'Sunday Roast', ['dinner'], ['beef', 'potato', 'carrot'])
const svickova = recipe('r4', 'Svíčková', ['dinner'], ['svíčková beef', 'Smetana', 'celery root'])
const snack = recipe('r5', 'Odd Snack', [], ['crackers', 'garlic'])
const cake = recipe('r6', 'Walnut Cake', ['cake'], ['flour', 'sugar', 'walnut'])

const all = [soup, pasta, roast, svickova, snack]

/** Deterministic `random` that walks a fixed sequence of values. */
function sequence(values: number[]): () => number {
  let index = 0
  return () => values[index++ % values.length]
}

describe('findCandidates', () => {
  it('returns everything for empty criteria', () => {
    expect(findCandidates(all, { meal: null, ingredients: [] })).toEqual(all)
  })

  it('filters by the lunch flag', () => {
    const found = findCandidates(all, { meal: 'lunch', ingredients: [] })
    expect(found.map((item) => item.id)).toEqual(['r1', 'r2'])
  })

  it('filters by the dinner flag', () => {
    const found = findCandidates(all, { meal: 'dinner', ingredients: [] })
    expect(found.map((item) => item.id)).toEqual(['r2', 'r3', 'r4'])
  })

  it('filters by the cake flag', () => {
    const withCake = [...all, cake]
    expect(findCandidates(withCake, { meal: 'cake', ingredients: [] })).toEqual([cake])
    // …and a cake-only recipe never turns up under lunch or dinner.
    expect(findCandidates(withCake, { meal: 'lunch', ingredients: [] })).not.toContain(cake)
    expect(findCandidates(withCake, { meal: 'dinner', ingredients: [] })).not.toContain(cake)
  })

  it('excludes recipes with no meal flags once a meal is chosen', () => {
    const lunch = findCandidates(all, { meal: 'lunch', ingredients: [] })
    const dinner = findCandidates(all, { meal: 'dinner', ingredients: [] })
    expect(lunch).not.toContain(snack)
    expect(dinner).not.toContain(snack)
    expect(findCandidates(all, { meal: null, ingredients: [] })).toContain(snack)
  })

  it('AND-s multiple ingredients', () => {
    expect(
      findCandidates(all, { meal: null, ingredients: ['garlic', 'olive oil'] }).map((r) => r.id),
    ).toEqual(['r2'])
    expect(
      findCandidates(all, { meal: null, ingredients: ['garlic', 'tomato'] }),
    ).toEqual([])
  })

  it('combines the meal and the ingredient constraints', () => {
    expect(findCandidates(all, { meal: 'dinner', ingredients: ['garlic'] }).map((r) => r.id)).toEqual(
      ['r2'],
    )
    expect(findCandidates(all, { meal: 'lunch', ingredients: ['beef'] })).toEqual([])
  })

  it('matches on substrings, case and diacritics insensitively', () => {
    expect(findCandidates(all, { meal: null, ingredients: ['TOMATO'] })).toEqual([soup])
    expect(findCandidates(all, { meal: null, ingredients: ['svickova'] })).toEqual([svickova])
    expect(findCandidates(all, { meal: null, ingredients: ['smetana'] })).toEqual([svickova])
    // substring: "potato" lives inside no other ingredient, but "carrot" partial does
    expect(findCandidates(all, { meal: null, ingredients: ['carr'] })).toEqual([roast])
  })

  it('ignores blank ingredient entries', () => {
    expect(findCandidates(all, { meal: null, ingredients: ['', '   '] })).toEqual(all)
  })

  it('returns an empty array rather than throwing for no recipes', () => {
    expect(findCandidates([], { meal: 'lunch', ingredients: ['garlic'] })).toEqual([])
  })
})

describe('matchedIngredients', () => {
  it('returns the recipe spelling of every matched ingredient', () => {
    expect(matchedIngredients(pasta, ['garlic', 'oil'])).toEqual(['garlic', 'olive oil'])
    expect(matchedIngredients(svickova, ['smetana'])).toEqual(['Smetana'])
  })

  it('returns nothing when no ingredients were requested', () => {
    expect(matchedIngredients(pasta, [])).toEqual([])
  })
})

describe('pickRandom', () => {
  it('returns undefined for an empty list', () => {
    expect(pickRandom([], undefined, () => 0)).toBeUndefined()
  })

  it('is deterministic with an injected random', () => {
    expect(pickRandom(all, undefined, () => 0)).toBe(soup)
    expect(pickRandom(all, undefined, () => 0.5)).toBe(roast)
    expect(pickRandom(all, undefined, () => 0.99)).toBe(snack)
  })

  it('never reads past the end of the list', () => {
    expect(pickRandom(all, undefined, () => 1)).toBe(snack)
    expect(pickRandom(all, undefined, () => Number.NaN)).toBe(soup)
  })

  it('walks the injected sequence independently on each call', () => {
    const random = sequence([0, 0.5, 0.99])
    expect(pickRandom(all, undefined, random)).toBe(soup)
    expect(pickRandom(all, undefined, random)).toBe(roast)
    expect(pickRandom(all, undefined, random)).toBe(snack)
  })

  it('excludes the given id', () => {
    // Without the exclusion index 0 would be `soup`; excluding it shifts the pool.
    expect(pickRandom(all, 'r1', () => 0)).toBe(pasta)
    expect(pickRandom(all, 'r5', () => 0.99)).toBe(svickova)
  })

  it('never returns the excluded id while another candidate exists', () => {
    for (const value of [0, 0.2, 0.4, 0.6, 0.8, 0.99]) {
      expect(pickRandom(all, 'r3', () => value)?.id).not.toBe('r3')
    }
  })

  it('returns the single remaining item even when it is the excluded one', () => {
    expect(pickRandom([pasta], 'r2', () => 0)).toBe(pasta)
    expect(pickRandom([pasta], 'r2', () => 0.99)).toBe(pasta)
  })
})
