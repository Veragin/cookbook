/**
 * Meal-suggestion selection logic.
 *
 * Deliberately pure and IO-free (no React, no storage, no `Math.random` unless you ask
 * for it) so the interesting part of the feature is testable on its own.
 */

import { hasAllIngredients, normalize } from '../../lib/search'
import type { Meal, Recipe } from '../../types'

export type SuggestCriteria = {
  /** `null` = no meal constraint ("Any"). */
  meal: Meal | null
  /** Empty = no ingredient constraint. Matching is AND-ed. */
  ingredients: string[]
}

/** Drops blank entries — a stray empty chip must never narrow the result set. */
function cleanNames(names: readonly string[] | undefined): string[] {
  return (names ?? []).filter((name) => normalize(name) !== '')
}

/**
 * Recipes carrying the meal flag AND containing every requested ingredient.
 *
 * A `null` meal means "any meal", an empty ingredient list means "any ingredients", so
 * empty criteria return every recipe. Ingredient matching delegates to
 * `hasAllIngredients` (normalised substring, AND semantics). Input order is preserved.
 */
export function findCandidates(recipes: Recipe[], criteria: SuggestCriteria): Recipe[] {
  const { meal } = criteria
  const wanted = cleanNames(criteria.ingredients)

  return (recipes ?? []).filter((recipe) => {
    if (meal !== null && !(recipe.meals ?? []).includes(meal)) return false
    return hasAllIngredients(recipe, wanted)
  })
}

/**
 * The recipe's own ingredient names that satisfied `names` — used to show the user
 * *why* a suggestion matched. Original spelling, deduped, recipe order.
 */
export function matchedIngredients(recipe: Recipe, names: readonly string[]): string[] {
  const wanted = cleanNames(names).map(normalize)
  if (wanted.length === 0) return []

  const out: string[] = []
  const seen = new Set<string>()

  for (const group of recipe.groups ?? []) {
    for (const item of group.items ?? []) {
      const name = item?.name ?? ''
      const normalized = normalize(name)
      if (!normalized || seen.has(normalized)) continue
      if (wanted.some((term) => normalized.includes(term))) {
        seen.add(normalized)
        out.push(name)
      }
    }
  }

  return out
}

/** Keeps a hostile/rounding-edge `random()` inside `[0, 1)`. */
function unitInterval(value: number): number {
  if (!Number.isFinite(value)) return 0
  if (value <= 0) return 0
  return value < 1 ? value : 1 - Number.EPSILON
}

/**
 * Uniformly random pick, optionally excluding one id (that is "suggest another").
 *
 * When excluding would empty the pool — i.e. the excluded item is the only candidate —
 * the exclusion is ignored and that item is returned again, so this never returns
 * `undefined` for a non-empty `items`. `random` is injectable for deterministic tests.
 */
export function pickRandom<T extends { id: string }>(
  items: T[],
  excludeId?: string,
  random: () => number = Math.random,
): T | undefined {
  if (!items || items.length === 0) return undefined

  const filtered = excludeId === undefined ? items : items.filter((item) => item.id !== excludeId)
  const pool = filtered.length > 0 ? filtered : items

  const index = Math.floor(unitInterval(random()) * pool.length)
  return pool[Math.min(index, pool.length - 1)]
}
