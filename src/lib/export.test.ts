import { describe, expect, it } from 'vitest'

import {
  blobToDataUrl,
  buildFolderExport,
  buildRecipeExport,
  downloadJson,
  toFilename,
} from './export'
import { SCHEMA_VERSION } from '../types'
import type { Folder, Recipe } from '../types'

function makeRecipe(id: string, folderId: string | null, extra: Partial<Recipe> = {}): Recipe {
  return {
    id,
    name: id,
    folderId,
    servings: 4,
    imageId: `img:${id}`,
    groups: [
      { id: `${id}:g0`, items: [{ id: `${id}:g0:i0`, name: 'flour', quantity: 300, unit: 'g' }] },
    ],
    instructions: ['Mix.'],
    meals: ['dinner'],
    origin: 'seed',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
    ...extra,
  }
}

const folders: Folder[] = [
  { id: 'mains', name: 'Main dishes', parentId: null },
  { id: 'mains-pasta', name: 'Pasta', parentId: 'mains' },
  { id: 'mains-pasta-baked', name: 'Baked', parentId: 'mains-pasta' },
  { id: 'desserts', name: 'Desserts', parentId: null },
  { id: 'desserts-cakes', name: 'Cakes', parentId: 'desserts' },
]

describe('buildRecipeExport', () => {
  const recipe = makeRecipe('goulash', 'mains')

  it('wraps the recipe in an envelope with the schema version', () => {
    const result = buildRecipeExport(recipe)
    expect(result.schemaVersion).toBe(SCHEMA_VERSION)
    expect(result.kind).toBe('recipe')
    expect(result.recipe.id).toBe('goulash')
    expect(result.recipe.name).toBe('goulash')
    expect(result.recipe.groups).toEqual(recipe.groups)
    expect(result.recipe.instructions).toEqual(['Mix.'])
  })

  it('stamps exportedAt as an ISO timestamp', () => {
    const before = Date.now()
    const result = buildRecipeExport(recipe)
    const stamp = Date.parse(result.exportedAt)
    expect(result.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/)
    expect(stamp).toBeGreaterThanOrEqual(before - 1000)
    expect(stamp).toBeLessThanOrEqual(Date.now() + 1000)
  })

  it('strips imageId and omits image when none is given', () => {
    const result = buildRecipeExport(recipe)
    expect('imageId' in result.recipe).toBe(false)
    expect(result.recipe.image).toBeUndefined()
    expect('image' in result.recipe).toBe(false)
  })

  it('inlines the image as a data URL when provided', () => {
    const result = buildRecipeExport(recipe, 'data:image/jpeg;base64,AAAA')
    expect('imageId' in result.recipe).toBe(false)
    expect(result.recipe.image).toBe('data:image/jpeg;base64,AAAA')
  })

  it('does not mutate the input recipe', () => {
    const input = makeRecipe('untouched', null)
    buildRecipeExport(input, 'data:image/png;base64,BBBB')
    expect(input.imageId).toBe('img:untouched')
  })

  it('survives a recipe with no image id', () => {
    const input = makeRecipe('plain', null)
    delete input.imageId
    const result = buildRecipeExport(input)
    expect('imageId' in result.recipe).toBe(false)
  })

  it('round-trips through JSON', () => {
    const result = buildRecipeExport(recipe, 'data:image/png;base64,CCCC')
    expect(JSON.parse(JSON.stringify(result))).toEqual(result)
  })
})

describe('buildFolderExport', () => {
  const pastaRecipe = makeRecipe('carbonara', 'mains-pasta')
  const bakedRecipe = makeRecipe('lasagne', 'mains-pasta-baked')
  const mainsRecipe = makeRecipe('goulash', 'mains')
  const cakeRecipe = makeRecipe('cheesecake', 'desserts-cakes')
  const looseRecipe = makeRecipe('toast', null)

  const entries = [
    { recipe: mainsRecipe },
    { recipe: pastaRecipe, image: 'data:image/png;base64,PP' },
    { recipe: bakedRecipe },
    { recipe: cakeRecipe },
    { recipe: looseRecipe },
  ]

  it('builds the envelope', () => {
    const result = buildFolderExport(folders[0], folders, entries)
    expect(result.schemaVersion).toBe(SCHEMA_VERSION)
    expect(result.kind).toBe('folder')
    expect(result.folder).toEqual(folders[0])
    expect(Date.parse(result.exportedAt)).not.toBeNaN()
  })

  it('includes the folder itself plus every nested descendant, parentId intact', () => {
    const result = buildFolderExport(folders[0], folders, entries)
    expect(result.folders.map((f) => f.id)).toEqual(['mains', 'mains-pasta', 'mains-pasta-baked'])
    expect(result.folders[1].parentId).toBe('mains')
    expect(result.folders[2].parentId).toBe('mains-pasta')
  })

  it('includes every recipe in the subtree, at any depth', () => {
    const result = buildFolderExport(folders[0], folders, entries)
    expect(result.recipes.map((r) => r.id)).toEqual(['goulash', 'carbonara', 'lasagne'])
  })

  it('excludes recipes from sibling trees and from the root', () => {
    const result = buildFolderExport(folders[0], folders, entries)
    const ids = result.recipes.map((r) => r.id)
    expect(ids).not.toContain('cheesecake')
    expect(ids).not.toContain('toast')
  })

  it('exports a leaf folder as just itself', () => {
    const baked = folders[2]
    const result = buildFolderExport(baked, folders, entries)
    expect(result.folders).toEqual([baked])
    expect(result.recipes.map((r) => r.id)).toEqual(['lasagne'])
  })

  it('strips imageId and inlines images per recipe', () => {
    const result = buildFolderExport(folders[0], folders, entries)
    for (const exported of result.recipes) {
      expect('imageId' in exported).toBe(false)
    }
    expect(result.recipes.find((r) => r.id === 'carbonara')?.image).toBe('data:image/png;base64,PP')
    expect(result.recipes.find((r) => r.id === 'goulash')?.image).toBeUndefined()
  })

  it('handles an empty recipe list and a folder with no children', () => {
    const result = buildFolderExport(folders[4], folders, [])
    expect(result.folders).toEqual([folders[4]])
    expect(result.recipes).toEqual([])
  })

  it('does not loop forever on a cyclic parent chain', () => {
    const cyclic: Folder[] = [
      { id: 'a', name: 'A', parentId: 'b' },
      { id: 'b', name: 'B', parentId: 'a' },
    ]
    const result = buildFolderExport(cyclic[0], cyclic, [])
    expect(result.folders.map((f) => f.id).sort()).toEqual(['a', 'b'])
  })
})

describe('toFilename', () => {
  it('lowercases and hyphenates', () => {
    expect(toFilename('Beef Goulash')).toBe('beef-goulash')
  })

  it('strips diacritics', () => {
    expect(toFilename('Svíčková na smetaně')).toBe('svickova-na-smetane')
    expect(toFilename('Crème Brûlée')).toBe('creme-brulee')
  })

  it('collapses runs of punctuation into a single hyphen', () => {
    expect(toFilename('Grandma\'s  "Best"  Cake!!!')).toBe('grandma-s-best-cake')
    expect(toFilename('a___b---c...d')).toBe('a-b-c-d')
  })

  it('trims leading and trailing hyphens', () => {
    expect(toFilename('  ...Cake...  ')).toBe('cake')
    expect(toFilename('---hello---')).toBe('hello')
  })

  it('keeps digits', () => {
    expect(toFilename('Recipe 2 for 4 people')).toBe('recipe-2-for-4-people')
  })

  it('falls back for empty or unusable input', () => {
    expect(toFilename('')).toBe('recipe')
    expect(toFilename('   ')).toBe('recipe')
    expect(toFilename('!!!')).toBe('recipe')
    expect(toFilename('日本語')).toBe('recipe')
  })

  it('caps the length and never ends in a hyphen', () => {
    const long = toFilename('a very long recipe name that just keeps going and going and going forever')
    expect(long.length).toBeLessThanOrEqual(60)
    expect(long.endsWith('-')).toBe(false)
    expect(long.startsWith('a-very-long-recipe-name')).toBe(true)
  })
})

describe('downloadJson', () => {
  it('creates, clicks and cleans up a temporary anchor', () => {
    const created: string[] = []
    const revoked: string[] = []
    const originalCreate = URL.createObjectURL
    const originalRevoke = URL.revokeObjectURL

    let captured: Blob | undefined
    URL.createObjectURL = ((blob: Blob) => {
      captured = blob
      const url = `blob:mock/${created.length}`
      created.push(url)
      return url
    }) as typeof URL.createObjectURL
    URL.revokeObjectURL = ((url: string) => {
      revoked.push(url)
    }) as typeof URL.revokeObjectURL

    const clicks: HTMLAnchorElement[] = []
    const originalClick = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function click(this: HTMLAnchorElement) {
      clicks.push(this)
    }

    try {
      downloadJson('beef-goulash', { a: 1 })
    } finally {
      HTMLAnchorElement.prototype.click = originalClick
      URL.createObjectURL = originalCreate
      URL.revokeObjectURL = originalRevoke
    }

    expect(clicks).toHaveLength(1)
    expect(clicks[0].download).toBe('beef-goulash.json')
    expect(clicks[0].getAttribute('href')).toBe('blob:mock/0')
    expect(created).toEqual(revoked)
    expect(captured?.type).toBe('application/json')
    expect(document.querySelectorAll('a')).toHaveLength(0)
  })

  it('pretty-prints with 2-space indentation', async () => {
    const originalCreate = URL.createObjectURL
    let captured: Blob | undefined
    URL.createObjectURL = ((blob: Blob) => {
      captured = blob
      return 'blob:mock'
    }) as typeof URL.createObjectURL
    const originalClick = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = () => {}

    try {
      downloadJson('data.json', { a: 1, b: { c: 2 } })
    } finally {
      HTMLAnchorElement.prototype.click = originalClick
      URL.createObjectURL = originalCreate
    }

    // jsdom's Blob has no `.text()`, so read it back through FileReader.
    const dataUrl = await blobToDataUrl(captured as Blob)
    expect(atob(dataUrl.split(',')[1])).toBe('{\n  "a": 1,\n  "b": {\n    "c": 2\n  }\n}')
  })

  it('does not double the .json extension', () => {
    const originalCreate = URL.createObjectURL
    URL.createObjectURL = (() => 'blob:mock') as typeof URL.createObjectURL
    const originalClick = HTMLAnchorElement.prototype.click
    let name = ''
    HTMLAnchorElement.prototype.click = function click(this: HTMLAnchorElement) {
      name = this.download
    }

    try {
      downloadJson('cake.json', {})
    } finally {
      HTMLAnchorElement.prototype.click = originalClick
      URL.createObjectURL = originalCreate
    }

    expect(name).toBe('cake.json')
  })
})

describe('blobToDataUrl', () => {
  it('reads a blob as a data URL', async () => {
    const blob = new Blob(['hello'], { type: 'text/plain' })
    const url = await blobToDataUrl(blob)
    expect(url.startsWith('data:text/plain;base64,')).toBe(true)
    expect(atob(url.split(',')[1])).toBe('hello')
  })
})
