/**
 * Recipe search. Pure string work — no storage, no React.
 *
 * Matching is diacritics- and case-insensitive so `svickova` finds `Svíčková`, and
 * multi-word queries are AND-ed: every token must match the name or some ingredient.
 */

import type { Recipe } from '../types'

/** Combining marks left behind by NFD decomposition. */
const COMBINING_MARKS = /[\u0300-\u036f]/g

/** Lowercase, trim, collapse whitespace and strip diacritics (ě š č ř ž ý á í é ů ú ň ť ď ó → esczryaieuuntdo). */
export function normalize(value: string): string {
  if (!value) return ''
  return value
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/** Every ingredient name in the recipe, across all groups. */
function ingredientNames(recipe: Recipe): string[] {
  const names: string[] = []
  for (const group of recipe.groups ?? []) {
    for (const item of group.items ?? []) names.push(item.name)
  }
  return names
}

/**
 * Searchable text for a recipe: the name plus every ingredient name, joined by a
 * newline so a query token can never match across two separate fields.
 */
function haystack(recipe: Recipe): string {
  return [recipe.name, ...ingredientNames(recipe)].map(normalize).join('\n')
}

/** Whitespace-separated, normalised query tokens. */
function tokenize(query: string): string[] {
  const normalized = normalize(query)
  if (!normalized) return []
  return normalized.split(' ').filter(Boolean)
}

/**
 * Matches on recipe name and ingredient names; an empty/whitespace-only query
 * returns the input unchanged. Input order is preserved.
 */
export function searchRecipes(recipes: Recipe[], query: string): Recipe[] {
  const tokens = tokenize(query)
  if (tokens.length === 0) return recipes

  return recipes.filter((recipe) => {
    const text = haystack(recipe)
    return tokens.every((token) => text.includes(token))
  })
}

/**
 * True when the recipe contains every one of `names` (normalised substring match
 * against ingredient names). An empty list matches everything.
 */
export function hasAllIngredients(recipe: Recipe, names: string[]): boolean {
  const wanted = names.map(normalize).filter(Boolean)
  if (wanted.length === 0) return true

  const available = ingredientNames(recipe).map(normalize)
  return wanted.every((name) => available.some((item) => item.includes(name)))
}
