/**
 * Bundled seed data.
 *
 * Recipe JSON files (`./recipes/<slug>.json`) carry no ids and no timestamps — this
 * loader derives stable ones (`seed:<slug>`, `seed:<slug>:g0`, `seed:<slug>:g0:i1`) so
 * the copy-on-write override in IndexedDB always lines up after a reload.
 *
 * Every file is validated defensively: a malformed one is skipped with a warning
 * rather than taking the whole app down. Zero seed files is a valid state.
 */

import { UNITS } from '../types'
import type { Folder, Ingredient, IngredientGroup, Meal, Recipe, Unit } from '../types'

/**
 * Fixed timestamps for bundled content. Deliberately a constant — seed recipes must
 * look identical on every reload, so `Date.now()` must never be involved.
 */
export const SEED_TIMESTAMP = '2024-01-01T00:00:00.000Z'

const MEALS: readonly Meal[] = ['lunch', 'dinner']
const UNIT_SET: ReadonlySet<string> = new Set(UNITS)

type Json = Record<string, unknown>

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Vite `?json` modules may be the object itself or `{ default: object }`. */
function unwrap(module: unknown): unknown {
  if (isObject(module) && 'default' in module) return module.default
  return module
}

function slugFromPath(path: string): string {
  const file = path.split('/').pop() ?? path
  return file.replace(/\.json$/i, '')
}

function parseUnit(value: unknown): Unit {
  if (typeof value !== 'string') return null
  return UNIT_SET.has(value) ? (value as Unit) : null
}

function parseQuantity(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return value
}

function parseMeals(value: unknown): Meal[] {
  if (!Array.isArray(value)) return []
  const out: Meal[] = []
  for (const entry of value) {
    if (typeof entry === 'string' && (MEALS as readonly string[]).includes(entry)) {
      const meal = entry as Meal
      if (!out.includes(meal)) out.push(meal)
    }
  }
  return out
}

function parseInstructions(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((line): line is string => typeof line === 'string' && line.trim() !== '')
}

function parseGroups(raw: unknown, recipeId: string): IngredientGroup[] {
  if (!Array.isArray(raw)) return []

  const groups: IngredientGroup[] = []

  raw.forEach((groupRaw, groupIndex) => {
    if (!isObject(groupRaw)) return

    const groupId = `${recipeId}:g${groupIndex}`
    const itemsRaw = Array.isArray(groupRaw.items) ? groupRaw.items : []
    const items: Ingredient[] = []

    itemsRaw.forEach((itemRaw, itemIndex) => {
      if (!isObject(itemRaw)) return
      const name = typeof itemRaw.name === 'string' ? itemRaw.name.trim() : ''
      if (!name) return

      const item: Ingredient = {
        id: `${groupId}:i${itemIndex}`,
        name,
        quantity: parseQuantity(itemRaw.quantity),
        unit: parseUnit(itemRaw.unit),
      }
      if (typeof itemRaw.note === 'string' && itemRaw.note.trim() !== '') {
        item.note = itemRaw.note.trim()
      }
      items.push(item)
    })

    const group: IngredientGroup = { id: groupId, items }
    if (typeof groupRaw.title === 'string' && groupRaw.title.trim() !== '') {
      group.title = groupRaw.title.trim()
    }
    groups.push(group)
  })

  return groups
}

function normaliseRecipe(raw: unknown, path: string): Recipe | null {
  if (!isObject(raw)) {
    console.warn(`[seed] ${path}: not a JSON object — skipped`)
    return null
  }

  const slug = typeof raw.slug === 'string' && raw.slug.trim() !== '' ? raw.slug.trim() : slugFromPath(path)
  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  if (!name) {
    console.warn(`[seed] ${path}: missing "name" — skipped`)
    return null
  }

  const id = `seed:${slug}`
  const servings =
    typeof raw.servings === 'number' && Number.isFinite(raw.servings) && raw.servings >= 1
      ? Math.round(raw.servings)
      : 4

  return {
    id,
    name,
    folderId: typeof raw.folderId === 'string' && raw.folderId !== '' ? raw.folderId : null,
    servings,
    groups: parseGroups(raw.groups, id),
    instructions: parseInstructions(raw.instructions),
    meals: parseMeals(raw.meals),
    origin: 'seed',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  }
}

function normaliseFolder(raw: unknown, index: number): Folder | null {
  if (!isObject(raw)) {
    console.warn(`[seed] folders.json[${index}]: not an object — skipped`)
    return null
  }
  const id = typeof raw.id === 'string' ? raw.id.trim() : ''
  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  if (!id || !name) {
    console.warn(`[seed] folders.json[${index}]: missing "id" or "name" — skipped`)
    return null
  }
  return {
    id,
    name,
    parentId: typeof raw.parentId === 'string' && raw.parentId !== '' ? raw.parentId : null,
  }
}

function loadRecipes(): Recipe[] {
  const modules = import.meta.glob('./recipes/*.json', { eager: true })
  const paths = Object.keys(modules).sort()

  const out: Recipe[] = []
  const seenIds = new Set<string>()

  for (const path of paths) {
    let recipe: Recipe | null = null
    try {
      recipe = normaliseRecipe(unwrap(modules[path]), path)
    } catch (error) {
      console.warn(`[seed] ${path}: failed to parse — skipped`, error)
      continue
    }
    if (!recipe) continue

    if (seenIds.has(recipe.id)) {
      console.warn(`[seed] ${path}: duplicate slug "${recipe.id}" — skipped`)
      continue
    }
    seenIds.add(recipe.id)
    out.push(recipe)
  }

  return out
}

function loadFolders(): Folder[] {
  // Globbed rather than statically imported so the app still builds while the seed
  // JSON is absent (see loadRecipes — same tolerance).
  const modules = import.meta.glob('./folders.json', { eager: true })
  const path = Object.keys(modules)[0]
  if (!path) return []

  let raw: unknown
  try {
    raw = unwrap(modules[path])
  } catch (error) {
    console.warn('[seed] folders.json: failed to parse — ignored', error)
    return []
  }

  if (!Array.isArray(raw)) {
    console.warn('[seed] folders.json: expected an array — ignored')
    return []
  }

  const out: Folder[] = []
  const seenIds = new Set<string>()

  raw.forEach((entry, index) => {
    const folder = normaliseFolder(entry, index)
    if (!folder) return
    if (seenIds.has(folder.id)) {
      console.warn(`[seed] folders.json: duplicate id "${folder.id}" — skipped`)
      return
    }
    seenIds.add(folder.id)
    out.push(folder)
  })

  return out
}

export const seedRecipes: Recipe[] = loadRecipes()
export const seedFolders: Folder[] = loadFolders()

/** True when `id` belongs to bundled content (as opposed to a user-created recipe). */
export function isSeedId(id: string): boolean {
  return id.startsWith('seed:')
}
