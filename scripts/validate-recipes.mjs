#!/usr/bin/env node
/**
 * Seed data validator — dependency free, Node ESM.
 *
 *   npm run validate:recipes
 *
 * Checks `src/data/folders.json` and every `src/data/recipes/*.json` against the
 * shape documented in `docs/CONTRACT.md` ("Seed data") and the domain types in
 * `src/types.ts`. Prints one `file: message` line per problem and exits 1 if any
 * were found; otherwise prints a short summary.
 *
 * The unit / meal / taste enums are parsed out of `src/types.ts` at runtime (see
 * readEnum) so they can never drift from the constants the app codes against.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname, basename, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const TYPES_FILE = join(ROOT, 'src', 'types.ts')
const FOLDERS_FILE = join(ROOT, 'src', 'data', 'folders.json')
const RECIPES_DIR = join(ROOT, 'src', 'data', 'recipes')

const FORBIDDEN_RECIPE_FIELDS = ['id', 'origin', 'createdAt', 'updatedAt', 'imageId']
const RECIPE_FIELDS = [
  'slug',
  'name',
  'folderId',
  'servings',
  'meals',
  'taste',
  'groups',
  'instructions',
]
const FOLDER_FIELDS = ['id', 'name', 'parentId']
const GROUP_FIELDS = ['id', 'title', 'items']
const ITEM_FIELDS = ['id', 'name', 'quantity', 'unit', 'note']

const problems = []
/** @param {string} file @param {string} message */
function fail(file, message) {
  problems.push(`${file}: ${message}`)
}

const rel = (p) => relative(ROOT, p).split('\\').join('/')

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Parse `export const NAME = ['a', 'b', ...] as const` out of src/types.ts. */
function readEnum(name) {
  const source = readFileSync(TYPES_FILE, 'utf8')
  const match = source.match(new RegExp(`export const ${name}\\s*=\\s*\\[([^\\]]*)\\]`))
  if (!match) {
    fail(rel(TYPES_FILE), `could not find \`export const ${name} = [...]\``)
    return []
  }
  return match[1]
    .split(',')
    .map((raw) => raw.trim().replace(/^['"`]|['"`]$/g, ''))
    .filter(Boolean)
}

const isPlainObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v)
const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0

/** Report any own property not in `allowed`. */
function checkUnknownFields(file, where, value, allowed) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) fail(file, `${where} has unknown field "${key}"`)
  }
}

function readJson(path) {
  const file = rel(path)
  let text
  try {
    text = readFileSync(path, 'utf8')
  } catch (err) {
    fail(file, `cannot be read (${err.message})`)
    return undefined
  }
  try {
    return JSON.parse(text)
  } catch (err) {
    fail(file, `is not valid JSON (${err.message})`)
    return undefined
  }
}

/* ------------------------------------------------------------------ */
/* Folders                                                             */
/* ------------------------------------------------------------------ */

function validateFolders() {
  const file = rel(FOLDERS_FILE)
  const data = readJson(FOLDERS_FILE)
  if (data === undefined) return new Map()
  if (!Array.isArray(data)) {
    fail(file, 'must be a JSON array of folders')
    return new Map()
  }
  if (data.length === 0) fail(file, 'is empty — at least one folder is expected')

  /** @type {Map<string, {id: string, name: string, parentId: string|null}>} */
  const folders = new Map()

  data.forEach((folder, index) => {
    const where = `folder #${index}`
    if (!isPlainObject(folder)) {
      fail(file, `${where} must be an object`)
      return
    }
    checkUnknownFields(file, where, folder, FOLDER_FIELDS)

    if (!isNonEmptyString(folder.id)) {
      fail(file, `${where} is missing a non-empty string "id"`)
      return
    }
    const label = `folder "${folder.id}"`
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(folder.id)) {
      fail(file, `${label} id must be a lowercase slug (a-z, 0-9, hyphens)`)
    }
    if (folders.has(folder.id)) fail(file, `${label} id is duplicated`)
    if (!isNonEmptyString(folder.name)) fail(file, `${label} is missing a non-empty string "name"`)
    if (!(folder.parentId === null || isNonEmptyString(folder.parentId))) {
      fail(file, `${label} "parentId" must be null or a folder id string`)
    }
    folders.set(folder.id, folder)
  })

  // Dangling parents + cycles.
  for (const folder of folders.values()) {
    const label = `folder "${folder.id}"`
    if (typeof folder.parentId === 'string') {
      if (!folders.has(folder.parentId)) {
        fail(file, `${label} has dangling parentId "${folder.parentId}"`)
        continue
      }
      if (folder.parentId === folder.id) {
        fail(file, `${label} is its own parent`)
        continue
      }
    }
    const seen = new Set([folder.id])
    let cursor = folder
    while (typeof cursor.parentId === 'string' && folders.has(cursor.parentId)) {
      if (seen.has(cursor.parentId)) {
        fail(file, `${label} is part of a parentId cycle via "${cursor.parentId}"`)
        break
      }
      seen.add(cursor.parentId)
      cursor = folders.get(cursor.parentId)
    }
  }

  return folders
}

/* ------------------------------------------------------------------ */
/* Recipes                                                             */
/* ------------------------------------------------------------------ */

function validateRecipe(path, folders, enums, seenSlugs, ingredientNames) {
  const { units, meals: MEALS, tastes: TASTES } = enums
  const file = rel(path)
  const stem = basename(path, '.json')
  const recipe = readJson(path)
  if (recipe === undefined) return
  if (!isPlainObject(recipe)) {
    fail(file, 'must be a JSON object')
    return
  }

  checkUnknownFields(file, 'recipe', recipe, RECIPE_FIELDS)
  for (const forbidden of FORBIDDEN_RECIPE_FIELDS) {
    if (forbidden in recipe) {
      fail(file, `must not contain "${forbidden}" — the seed loader derives it`)
    }
  }

  // slug
  if (!isNonEmptyString(recipe.slug)) {
    fail(file, 'is missing a non-empty string "slug"')
  } else {
    if (recipe.slug !== stem) fail(file, `slug "${recipe.slug}" does not match the filename stem "${stem}"`)
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(recipe.slug)) {
      fail(file, `slug "${recipe.slug}" must be a lowercase slug (a-z, 0-9, hyphens)`)
    }
    if (seenSlugs.has(recipe.slug)) fail(file, `slug "${recipe.slug}" is already used by ${seenSlugs.get(recipe.slug)}`)
    else seenSlugs.set(recipe.slug, file)
  }

  // name
  if (!isNonEmptyString(recipe.name)) fail(file, 'is missing a non-empty string "name"')

  // folderId
  if (recipe.folderId === undefined) {
    fail(file, 'is missing "folderId" (use null for the root level)')
  } else if (recipe.folderId !== null) {
    if (!isNonEmptyString(recipe.folderId)) fail(file, '"folderId" must be null or a folder id string')
    else if (!folders.has(recipe.folderId)) fail(file, `folderId "${recipe.folderId}" is not a folder in folders.json`)
  }

  // servings
  if (!Number.isInteger(recipe.servings) || recipe.servings < 1) {
    fail(file, `"servings" must be an integer >= 1 (got ${JSON.stringify(recipe.servings)})`)
  }

  // meals
  if (!Array.isArray(recipe.meals) || recipe.meals.length === 0) {
    fail(file, '"meals" must be a non-empty array')
  } else {
    const seen = new Set()
    for (const meal of recipe.meals) {
      if (!MEALS.includes(meal)) fail(file, `meal ${JSON.stringify(meal)} is not one of ${MEALS.join(', ')}`)
      else if (seen.has(meal)) fail(file, `meal "${meal}" is listed twice`)
      seen.add(meal)
    }
  }

  // taste
  if (!('taste' in recipe)) {
    fail(file, `is missing "taste" (one of ${TASTES.join(', ')})`)
  } else if (!TASTES.includes(recipe.taste)) {
    fail(file, `taste ${JSON.stringify(recipe.taste)} is not one of ${TASTES.join(', ')}`)
  }

  // groups
  if (!Array.isArray(recipe.groups) || recipe.groups.length === 0) {
    fail(file, '"groups" must be a non-empty array')
  } else {
    recipe.groups.forEach((group, gi) => {
      const where = `group #${gi}`
      if (!isPlainObject(group)) {
        fail(file, `${where} must be an object`)
        return
      }
      checkUnknownFields(file, where, group, GROUP_FIELDS)
      if ('id' in group) fail(file, `${where} must not contain "id" — the seed loader derives it`)
      if ('title' in group && !isNonEmptyString(group.title)) {
        fail(file, `${where} "title" must be a non-empty string when present (omit it for ungrouped items)`)
      }
      if (!Array.isArray(group.items) || group.items.length === 0) {
        fail(file, `${where} must have a non-empty "items" array`)
        return
      }
      group.items.forEach((item, ii) => {
        const at = `${where} item #${ii}`
        if (!isPlainObject(item)) {
          fail(file, `${at} must be an object`)
          return
        }
        checkUnknownFields(file, at, item, ITEM_FIELDS)
        if ('id' in item) fail(file, `${at} must not contain "id" — the seed loader derives it`)

        if (!isNonEmptyString(item.name)) {
          fail(file, `${at} is missing a non-empty string "name"`)
        } else {
          if (item.name !== item.name.toLowerCase()) fail(file, `${at} name "${item.name}" must be lowercase`)
          if (item.name !== item.name.trim()) fail(file, `${at} name "${item.name}" has leading/trailing whitespace`)
          ingredientNames.add(item.name.trim().toLowerCase())
        }

        if (!('quantity' in item)) {
          fail(file, `${at} is missing "quantity" (use null for "to taste")`)
        } else if (item.quantity !== null) {
          if (typeof item.quantity !== 'number' || !Number.isFinite(item.quantity) || item.quantity <= 0) {
            fail(file, `${at} "quantity" must be null or a positive finite number (got ${JSON.stringify(item.quantity)})`)
          }
        }

        if (!('unit' in item)) {
          fail(file, `${at} is missing "unit" (use null for no unit)`)
        } else if (item.unit !== null && !units.includes(item.unit)) {
          fail(file, `${at} unit ${JSON.stringify(item.unit)} is not null or one of: ${units.join(', ')}`)
        }

        // A number with `"unit": null` is fine (e.g. `2 eggs`); a null quantity with a
        // unit is not — "to taste" renders no amount at all.
        if (item.quantity === null && item.unit !== null && item.unit !== undefined) {
          fail(file, `${at} has a unit but a null quantity — "to taste" items must have "unit": null`)
        }

        if ('note' in item && !isNonEmptyString(item.note)) {
          fail(file, `${at} "note" must be a non-empty string when present`)
        }
      })
    })
  }

  // instructions
  if (!Array.isArray(recipe.instructions) || recipe.instructions.length === 0) {
    fail(file, '"instructions" must be a non-empty array of strings')
  } else {
    recipe.instructions.forEach((step, si) => {
      if (!isNonEmptyString(step)) fail(file, `instruction #${si} must be a non-empty string`)
      else if (/^\s*(\d+[.)]|[-*•])\s/.test(step)) {
        fail(file, `instruction #${si} starts with a list marker — the UI numbers steps itself`)
      }
    })
  }
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

const enums = {
  units: readEnum('UNITS'),
  meals: readEnum('MEALS'),
  tastes: readEnum('TASTES'),
}
const folders = validateFolders()

let recipeFiles = []
if (!existsSync(RECIPES_DIR)) {
  fail(rel(RECIPES_DIR), 'directory does not exist')
} else {
  recipeFiles = readdirSync(RECIPES_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => join(RECIPES_DIR, f))
  if (recipeFiles.length === 0) fail(rel(RECIPES_DIR), 'contains no recipe JSON files')
}

const seenSlugs = new Map()
const ingredientNames = new Set()
for (const path of recipeFiles) {
  validateRecipe(path, folders, enums, seenSlugs, ingredientNames)
}

if (problems.length > 0) {
  for (const problem of problems) console.error(problem)
  console.error(`\n${problems.length} problem${problems.length === 1 ? '' : 's'} found.`)
  process.exit(1)
}

console.log(
  `OK — ${recipeFiles.length} recipes, ${folders.size} folders, ` +
    `${ingredientNames.size} unique ingredient names.`,
)
