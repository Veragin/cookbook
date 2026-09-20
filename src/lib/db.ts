/**
 * IndexedDB access layer. Everything here is defensive: when IndexedDB is missing or
 * blocked (private browsing, disabled storage, SSR) `getDb()` resolves `null` and the
 * app degrades to an in-memory cookbook instead of throwing.
 */

import { openDB } from 'idb'
import type { IDBPDatabase, DBSchema } from 'idb'

import { SCHEMA_VERSION } from '../types'
import type { Folder, Recipe } from '../types'

export const DB_NAME = 'cookbook'
export const DB_VERSION = 1

/** Marker row for a deleted seed recipe — the id is the seed recipe's id. */
export type Tombstone = {
  id: string
  deletedAt: string
}

/** Image payload — a real Blob, never base64. */
export type StoredImage = {
  id: string
  blob: Blob
}

export type MetaRow = {
  key: string
  value: unknown
}

export interface CookbookDB extends DBSchema {
  recipes: {
    key: string
    value: Recipe
    indexes: { folderId: string }
  }
  folders: {
    key: string
    value: Folder
    indexes: { parentId: string }
  }
  tombstones: {
    key: string
    value: Tombstone
  }
  images: {
    key: string
    value: StoredImage
  }
  meta: {
    key: string
    value: MetaRow
  }
}

export type CookbookDatabase = IDBPDatabase<CookbookDB>

/**
 * Creates stores idempotently. Structured as a fallthrough switch on `oldVersion` so a
 * future version N only has to add its own `case N - 1:` block.
 */
function upgrade(db: IDBPDatabase<CookbookDB>, oldVersion: number): void {
  switch (oldVersion) {
    case 0: {
      if (!db.objectStoreNames.contains('recipes')) {
        const recipes = db.createObjectStore('recipes', { keyPath: 'id' })
        recipes.createIndex('folderId', 'folderId')
      }
      if (!db.objectStoreNames.contains('folders')) {
        const folders = db.createObjectStore('folders', { keyPath: 'id' })
        folders.createIndex('parentId', 'parentId')
      }
      if (!db.objectStoreNames.contains('tombstones')) {
        db.createObjectStore('tombstones', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' })
      }
    }
    // Future migrations: `case 1: { …to v2… }` — no `break`, so an old DB walks up.
  }
}

/** True when this environment exposes a usable IndexedDB factory. */
export function isStorageAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null
  } catch {
    // Accessing `indexedDB` itself throws in some locked-down browsers.
    return false
  }
}

let dbPromise: Promise<CookbookDatabase | null> | null = null

async function open(): Promise<CookbookDatabase | null> {
  if (!isStorageAvailable()) return null

  let handle: CookbookDatabase | null = null

  try {
    const db = await openDB<CookbookDB>(DB_NAME, DB_VERSION, {
      upgrade(database, oldVersion) {
        upgrade(database, oldVersion)
      },
      blocked() {
        console.warn('[db] upgrade blocked by another open tab')
      },
      blocking() {
        // A newer version wants in; let go so the other tab can upgrade.
        try {
          handle?.close()
          dbPromise = null
        } catch {
          /* ignore */
        }
      },
      terminated() {
        console.warn('[db] connection terminated unexpectedly')
        dbPromise = null
      },
    })

    handle = db

    // Record the schema version for future migrations. Best-effort only.
    try {
      await db.put('meta', { key: 'schemaVersion', value: SCHEMA_VERSION })
    } catch {
      /* ignore */
    }

    return db
  } catch (error) {
    console.warn('[db] IndexedDB unavailable, running in memory', error)
    return null
  }
}

/**
 * Memoized database handle. Resolves `null` — never rejects — when storage is
 * unavailable, so callers can simply check for null.
 */
export function getDb(): Promise<CookbookDatabase | null> {
  if (!dbPromise) dbPromise = open()
  return dbPromise
}

/** Test/HMR helper: drop the memoized connection. */
export function resetDbForTests(): void {
  dbPromise = null
}

/**
 * Ask the browser to make this origin's storage persistent. Safe to call anywhere —
 * resolves `false` when the API is missing or refuses.
 */
export async function requestPersistence(): Promise<boolean> {
  try {
    const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined
    if (!storage || typeof storage.persist !== 'function') return false
    if (typeof storage.persisted === 'function') {
      const already = await storage.persisted()
      if (already) return true
    }
    return (await storage.persist()) === true
  } catch {
    return false
  }
}
