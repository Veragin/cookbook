/**
 * Async persistence layer — thin, typed wrappers over `db.ts`.
 *
 * Every function degrades gracefully when IndexedDB is unavailable: reads return empty
 * collections, writes no-op and report `false` (or `null` for `putImage`) so the caller
 * can flip the provider into `degraded` mode instead of throwing.
 */

import { getDb } from './db'
import type { StoredImage, Tombstone } from './db'
import { newId } from './id'
import type { Folder, Recipe } from '../types'

export type LoadAllResult = {
  recipes: Recipe[]
  folders: Folder[]
  tombstones: Tombstone[]
  images: StoredImage[]
  /** `false` when IndexedDB is unavailable and nothing was actually loaded. */
  available: boolean
}

/** Reads every store in one go. Never throws. */
export async function loadAll(): Promise<LoadAllResult> {
  const empty: LoadAllResult = {
    recipes: [],
    folders: [],
    tombstones: [],
    images: [],
    available: false,
  }

  const db = await getDb()
  if (!db) return empty

  try {
    const [recipes, folders, tombstones, images] = await Promise.all([
      db.getAll('recipes'),
      db.getAll('folders'),
      db.getAll('tombstones'),
      db.getAll('images'),
    ])
    return { recipes, folders, tombstones, images, available: true }
  } catch (error) {
    console.warn('[repository] loadAll failed', error)
    return empty
  }
}

async function write(run: (db: NonNullable<Awaited<ReturnType<typeof getDb>>>) => Promise<unknown>, label: string): Promise<boolean> {
  const db = await getDb()
  if (!db) return false
  try {
    await run(db)
    return true
  } catch (error) {
    console.warn(`[repository] ${label} failed`, error)
    return false
  }
}

/** Insert or replace a recipe (also used for copy-on-write overrides of seed recipes). */
export function putRecipe(recipe: Recipe): Promise<boolean> {
  return write((db) => db.put('recipes', recipe), 'putRecipe')
}

/** Removes the stored row only — seed recipes need a tombstone as well. */
export function deleteStoredRecipe(id: string): Promise<boolean> {
  return write((db) => db.delete('recipes', id), 'deleteStoredRecipe')
}

export function addTombstone(id: string): Promise<boolean> {
  const tombstone: Tombstone = { id, deletedAt: new Date().toISOString() }
  return write((db) => db.put('tombstones', tombstone), 'addTombstone')
}

export function removeTombstone(id: string): Promise<boolean> {
  return write((db) => db.delete('tombstones', id), 'removeTombstone')
}

export function putFolder(folder: Folder): Promise<boolean> {
  return write((db) => db.put('folders', folder), 'putFolder')
}

export function deleteStoredFolder(id: string): Promise<boolean> {
  return write((db) => db.delete('folders', id), 'deleteStoredFolder')
}

/**
 * Stores an image Blob and returns its new id, or `null` when storage is unavailable.
 */
export async function putImage(blob: Blob): Promise<string | null> {
  const db = await getDb()
  if (!db) return null

  const id = newId('img')
  try {
    await db.put('images', { id, blob })
    return id
  } catch (error) {
    console.warn('[repository] putImage failed', error)
    return null
  }
}

/** Raw Blob for an image id; `undefined` when absent or storage is unavailable. */
export async function getImage(id: string): Promise<Blob | undefined> {
  const db = await getDb()
  if (!db) return undefined
  try {
    const row = await db.get('images', id)
    return row?.blob
  } catch (error) {
    console.warn('[repository] getImage failed', error)
    return undefined
  }
}

export function deleteImage(id: string): Promise<boolean> {
  return write((db) => db.delete('images', id), 'deleteImage')
}

/** All recipes filed under a folder, straight from the `folderId` index. */
export async function getRecipesByFolder(folderId: string): Promise<Recipe[]> {
  const db = await getDb()
  if (!db) return []
  try {
    return await db.getAllFromIndex('recipes', 'folderId', folderId)
  } catch (error) {
    console.warn('[repository] getRecipesByFolder failed', error)
    return []
  }
}
