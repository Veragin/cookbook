/**
 * JSON export. The builders are pure so they can be unit-tested; the only impure
 * bits are `new Date()` for `exportedAt`, the DOM download helper and `FileReader`.
 *
 * Images are never exported as ids — the caller resolves a Blob and passes a data
 * URL, which is inlined under `image` while `imageId` is stripped.
 */

import { SCHEMA_VERSION } from '../types'
import type { ExportedFolder, ExportedRecipe, Folder, Recipe } from '../types'
import { normalize } from './search'

/** A recipe as it appears inside an export file: no `imageId`, optional inline `image`. */
type ExportedRecipeBody = Omit<Recipe, 'imageId'> & { image?: string }

const MAX_FILENAME = 60
const FILENAME_FALLBACK = 'recipe'

/** Drops `imageId` and inlines the data URL (when there is one). */
function toExportedRecipe(recipe: Recipe, image?: string): ExportedRecipeBody {
  const { imageId: _imageId, ...rest } = recipe
  return image ? { ...rest, image } : { ...rest }
}

/** Single-recipe export envelope. */
export function buildRecipeExport(recipe: Recipe, image?: string): ExportedRecipe {
  return {
    schemaVersion: SCHEMA_VERSION,
    kind: 'recipe',
    exportedAt: new Date().toISOString(),
    recipe: toExportedRecipe(recipe, image),
  }
}

/**
 * Ids of `rootId` and every folder nested below it, at any depth. Cycle-safe.
 */
function collectSubtreeIds(rootId: string, folders: Folder[]): Set<string> {
  const ids = new Set<string>([rootId])
  const childrenOf = new Map<string, Folder[]>()

  for (const folder of folders) {
    const key = folder.parentId ?? ''
    const bucket = childrenOf.get(key)
    if (bucket) bucket.push(folder)
    else childrenOf.set(key, [folder])
  }

  const queue = [rootId]
  while (queue.length > 0) {
    const current = queue.shift() as string
    for (const child of childrenOf.get(current) ?? []) {
      if (ids.has(child.id)) continue
      ids.add(child.id)
      queue.push(child.id)
    }
  }

  return ids
}

/**
 * Folder export envelope: the folder itself plus all nested descendants (flattened,
 * `parentId` intact) and every recipe anywhere in that subtree. Input order is kept.
 */
export function buildFolderExport(
  folder: Folder,
  folders: Folder[],
  recipes: Array<{ recipe: Recipe; image?: string }>,
): ExportedFolder {
  const ids = collectSubtreeIds(folder.id, folders)
  const subtree = folders.filter((item) => ids.has(item.id) && item.id !== folder.id)

  return {
    schemaVersion: SCHEMA_VERSION,
    kind: 'folder',
    exportedAt: new Date().toISOString(),
    folder,
    folders: [folder, ...subtree],
    recipes: recipes
      .filter((entry) => entry.recipe.folderId !== null && ids.has(entry.recipe.folderId))
      .map((entry) => toExportedRecipe(entry.recipe, entry.image)),
  }
}

/**
 * Safe, lowercase, hyphenated filename stem: diacritics stripped, runs of
 * non-alphanumerics collapsed to a single `-`, trimmed and capped at 60 chars.
 * Falls back to `recipe` when nothing usable is left.
 */
export function toFilename(name: string): string {
  const slug = normalize(name ?? '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_FILENAME)
    .replace(/-+$/g, '')

  return slug || FILENAME_FALLBACK
}

/** Triggers a browser download of pretty-printed JSON. */
export function downloadJson(filename: string, data: unknown): void {
  const name = filename.toLowerCase().endsWith('.json') ? filename : `${filename}.json`
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.rel = 'noopener'
  anchor.style.display = 'none'

  document.body.appendChild(anchor)
  try {
    anchor.click()
  } finally {
    anchor.remove()
    URL.revokeObjectURL(url)
  }
}

/** Reads a Blob as a `data:` URL (used to inline images into an export). */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') resolve(result)
      else reject(new Error('Unexpected FileReader result'))
    }
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob'))
    reader.readAsDataURL(blob)
  })
}
