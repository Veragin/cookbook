import { Blob as NodeBlob } from 'node:buffer'
import { beforeEach, describe, expect, it } from 'vitest'

import { getDb, resetDbForTests } from './db'
import {
  addTombstone,
  deleteImage,
  deleteStoredFolder,
  deleteStoredRecipe,
  getImage,
  getRecipesByFolder,
  loadAll,
  putFolder,
  putImage,
  putRecipe,
  removeTombstone,
} from './repository'
import type { Folder, Recipe } from '../types'

function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'rec:test-1',
    name: 'Test Recipe',
    folderId: 'mains',
    servings: 4,
    groups: [
      {
        id: 'rec:test-1:g0',
        title: 'Stew',
        items: [
          { id: 'rec:test-1:g0:i0', name: 'beef', quantity: 800, unit: 'g', note: 'cubed' },
          { id: 'rec:test-1:g0:i1', name: 'salt', quantity: null, unit: null },
        ],
      },
    ],
    instructions: ['Brown the beef.', 'Simmer for 2 hours.'],
    meals: ['dinner'],
    origin: 'user',
    createdAt: '2024-05-01T10:00:00.000Z',
    updatedAt: '2024-05-01T10:00:00.000Z',
    ...overrides,
  }
}

/**
 * fake-indexeddb stores values with Node's `structuredClone`, which does not know how
 * to clone jsdom's `Blob` (it degrades to `{}`). Node's own `Blob` — structurally the
 * same object a browser hands to IndexedDB — clones correctly, so image tests use it.
 */
function makeBlob(content: string, type?: string): Blob {
  return new NodeBlob([content], type ? { type } : undefined) as unknown as Blob
}

async function wipe(): Promise<void> {
  const db = await getDb()
  if (!db) throw new Error('expected fake-indexeddb to be available')
  await Promise.all([
    db.clear('recipes'),
    db.clear('folders'),
    db.clear('tombstones'),
    db.clear('images'),
  ])
}

describe('repository', () => {
  beforeEach(async () => {
    resetDbForTests()
    await wipe()
  })

  it('round-trips a recipe through IndexedDB', async () => {
    const recipe = makeRecipe()

    expect(await putRecipe(recipe)).toBe(true)

    const loaded = await loadAll()
    expect(loaded.available).toBe(true)
    expect(loaded.recipes).toHaveLength(1)
    expect(loaded.recipes[0]).toEqual(recipe)
    expect(loaded.recipes[0].groups[0].items[1].quantity).toBeNull()
  })

  it('replaces a recipe with the same id (copy-on-write override)', async () => {
    await putRecipe(makeRecipe({ id: 'seed:goulash', origin: 'seed' }))
    await putRecipe(makeRecipe({ id: 'seed:goulash', origin: 'seed', name: 'My Goulash' }))

    const loaded = await loadAll()
    expect(loaded.recipes).toHaveLength(1)
    expect(loaded.recipes[0].name).toBe('My Goulash')
  })

  it('deletes a stored recipe', async () => {
    await putRecipe(makeRecipe())
    expect(await deleteStoredRecipe('rec:test-1')).toBe(true)

    expect((await loadAll()).recipes).toEqual([])
  })

  it('serves recipes from the folderId index', async () => {
    await putRecipe(makeRecipe({ id: 'rec:a', folderId: 'mains' }))
    await putRecipe(makeRecipe({ id: 'rec:b', folderId: 'sweets' }))

    const mains = await getRecipesByFolder('mains')
    expect(mains.map((entry) => entry.id)).toEqual(['rec:a'])
  })

  it('round-trips a folder', async () => {
    const folder: Folder = { id: 'fld:1', name: 'Weeknight', parentId: 'mains' }

    expect(await putFolder(folder)).toBe(true)
    expect((await loadAll()).folders).toEqual([folder])

    expect(await deleteStoredFolder('fld:1')).toBe(true)
    expect((await loadAll()).folders).toEqual([])
  })

  it('round-trips a tombstone and can remove it', async () => {
    expect(await addTombstone('seed:goulash')).toBe(true)

    const loaded = await loadAll()
    expect(loaded.tombstones).toHaveLength(1)
    expect(loaded.tombstones[0].id).toBe('seed:goulash')
    expect(typeof loaded.tombstones[0].deletedAt).toBe('string')

    expect(await removeTombstone('seed:goulash')).toBe(true)
    expect((await loadAll()).tombstones).toEqual([])
  })

  it('stores an image as a real Blob and reads it back', async () => {
    const blob = makeBlob('not-really-a-jpeg', 'image/jpeg')

    const id = await putImage(blob)
    expect(id).toBeTruthy()

    const roundTripped = await getImage(id as string)
    expect(roundTripped).toBeInstanceOf(NodeBlob)
    expect(roundTripped).not.toBeInstanceOf(ArrayBuffer)
    expect(typeof roundTripped?.arrayBuffer).toBe('function')
    expect(roundTripped?.type).toBe('image/jpeg')
    expect(roundTripped?.size).toBe(blob.size)
    expect(await roundTripped?.text()).toBe('not-really-a-jpeg')

    const loaded = await loadAll()
    expect(loaded.images).toHaveLength(1)
    expect(loaded.images[0].id).toBe(id)
    expect(loaded.images[0].blob).toBeInstanceOf(NodeBlob)

    expect(await deleteImage(id as string)).toBe(true)
    expect(await getImage(id as string)).toBeUndefined()
  })

  it('gives every stored image a distinct id', async () => {
    const a = await putImage(makeBlob('a'))
    const b = await putImage(makeBlob('b'))

    expect(a).not.toBe(b)
    expect((await loadAll()).images).toHaveLength(2)
  })

  it('returns undefined for an unknown image', async () => {
    expect(await getImage('img:missing')).toBeUndefined()
  })
})
