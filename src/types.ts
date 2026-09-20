/**
 * Core domain model. Every feature codes against these types — treat this file
 * as the contract between modules.
 */

export const SCHEMA_VERSION = 1

/** Fixed unit list; `null` means "no unit" (e.g. `2 eggs`, or a free-text note). */
export const UNITS = ['g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'pcs', 'pinch'] as const

export type Unit = (typeof UNITS)[number] | null

/** Fixed meal list; a recipe carries one or more of these flags. */
export const MEALS = ['lunch', 'dinner', 'cake'] as const

export type Meal = (typeof MEALS)[number]

/** Fixed taste list; every recipe is exactly one of these. */
export const TASTES = ['sweet', 'salty'] as const

export type Taste = (typeof TASTES)[number]

export type Ingredient = {
  id: string
  name: string
  /** Refers to `Recipe.servings`. `null` = "to taste" → never scales. */
  quantity: number | null
  unit: Unit
  /** Free-text qualifier, e.g. "finely chopped". */
  note?: string
}

export type IngredientGroup = {
  id: string
  /** Optional heading, e.g. "Dough". Ungrouped items live in a group with no title. */
  title?: string
  items: Ingredient[]
}

export type Recipe = {
  id: string
  name: string
  folderId: string | null
  /** Base portions the stored quantities refer to. Always >= 1. */
  servings: number
  /** Key into the `images` object store (a Blob). */
  imageId?: string
  groups: IngredientGroup[]
  instructions: string[]
  meals: Meal[]
  /** Sweet or salty — a single flag, always set. */
  taste: Taste
  origin: 'seed' | 'user'
  createdAt: string
  updatedAt: string
}

export type Folder = {
  id: string
  name: string
  /** `null` = root level. Folders nest arbitrarily deep. */
  parentId: string | null
}

/* ------------------------------------------------------------------ */
/* Export file formats                                                 */
/* ------------------------------------------------------------------ */

export type ExportedRecipe = {
  schemaVersion: number
  kind: 'recipe'
  exportedAt: string
  recipe: Omit<Recipe, 'imageId'> & { image?: string }
}

export type ExportedFolder = {
  schemaVersion: number
  kind: 'folder'
  exportedAt: string
  folder: Folder
  /** Includes nested subfolders, flattened with their `parentId` intact. */
  folders: Folder[]
  recipes: Array<Omit<Recipe, 'imageId'> & { image?: string }>
}
