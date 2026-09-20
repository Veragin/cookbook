/**
 * The single source of truth for recipes, folders and images.
 *
 * Reads are synchronous: the provider hydrates once at boot (bundled seed data +
 * IndexedDB) and keeps the merged view in React state. Writes update that state
 * optimistically and write through to IndexedDB.
 *
 * Bundled ("seed") recipes are never mutated in place — editing one stores a full copy
 * under the same id (copy-on-write) and deleting one stores a tombstone.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactElement, ReactNode } from 'react'

import { seedFolders, seedRecipes } from '../../data/seed'
import { newId } from '../../lib/id'
import {
  collectIngredientNames,
  folderDescendants,
  mergeFolders,
  mergeRecipes,
} from '../../lib/merge'
import * as repository from '../../lib/repository'
import { requestPersistence } from '../../lib/db'
import type { Folder, Ingredient, IngredientGroup, Recipe } from '../../types'

export type RecipesStatus = 'loading' | 'ready' | 'degraded'

export type RecipeDraft = Omit<Recipe, 'id' | 'origin' | 'createdAt' | 'updatedAt'>

export type RecipesApi = {
  status: RecipesStatus

  /** Merged view: seed recipes ← overridden by stored copies ← minus tombstoned ids. */
  recipes: Recipe[]
  /** Flat array; nesting is expressed by `parentId`. */
  folders: Folder[]
  /** Deduped, normalised, alphabetically sorted ingredient names across all recipes. */
  ingredientNames: string[]

  getRecipe(id: string): Recipe | undefined
  createRecipe(draft: RecipeDraft): Promise<Recipe>
  /** Update. For a seed recipe this writes a copy-on-write override. */
  updateRecipe(id: string, patch: Partial<RecipeDraft>): Promise<Recipe>
  /** Seed recipe → tombstone; user recipe → hard delete. Also deletes its image. */
  deleteRecipe(id: string): Promise<void>
  moveRecipe(id: string, folderId: string | null): Promise<void>

  getFolder(id: string): Folder | undefined
  createFolder(name: string, parentId: string | null): Promise<Folder>
  renameFolder(id: string, name: string): Promise<void>
  /** Child folders and recipes reparent to the deleted folder's parent. */
  deleteFolder(id: string): Promise<void>

  /** Object URL for a stored image; undefined when absent. Provider owns revocation. */
  getImageUrl(imageId: string | undefined): string | undefined
  /** Stores a Blob, returns its new imageId. */
  putImage(blob: Blob): Promise<string>
  /** Raw Blob — used by export. */
  getImageBlob(id: string): Promise<Blob | undefined>
}

/**
 * Folders have no dedicated tombstone store in schema v1, so deleted *seed* folders are
 * recorded in the shared `tombstones` store under a namespaced key. Recipe ids never
 * start with this prefix, so the two cannot collide.
 */
const FOLDER_TOMBSTONE = 'folder:'

type Stored = {
  recipes: Recipe[]
  folders: Folder[]
  tombstones: Set<string>
}

const EMPTY_STORED: Stored = { recipes: [], folders: [], tombstones: new Set() }

const RecipesContext = createContext<RecipesApi | null>(null)

function now(): string {
  return new Date().toISOString()
}

/** Guarantees every group/item carries an id, without disturbing ids that exist. */
function withIds(groups: IngredientGroup[]): IngredientGroup[] {
  return (groups ?? []).map((group) => ({
    ...group,
    id: group.id || newId('grp'),
    items: (group.items ?? []).map(
      (item): Ingredient => ({ ...item, id: item.id || newId('ing') }),
    ),
  }))
}

function upsert<T extends { id: string }>(list: T[], entry: T): T[] {
  const index = list.findIndex((candidate) => candidate.id === entry.id)
  if (index === -1) return [...list, entry]
  const next = list.slice()
  next[index] = entry
  return next
}

function removeById<T extends { id: string }>(list: T[], id: string): T[] {
  return list.filter((entry) => entry.id !== id)
}

export function RecipesProvider({ children }: { children: ReactNode }): ReactElement {
  const [status, setStatus] = useState<RecipesStatus>('loading')
  const [stored, setStored] = useState<Stored>(EMPTY_STORED)
  const [imageUrls, setImageUrls] = useState<ReadonlyMap<string, string>>(
    () => new Map<string, string>(),
  )

  const urlsRef = useRef<ReadonlyMap<string, string>>(imageUrls)
  const blobsRef = useRef<Map<string, Blob>>(new Map())
  const persistenceRequested = useRef(false)

  /* ---------------------------------------------------------------- */
  /* Derived, synchronous view                                        */
  /* ---------------------------------------------------------------- */

  const recipes = useMemo(
    () => mergeRecipes(seedRecipes, stored.recipes, stored.tombstones),
    [stored.recipes, stored.tombstones],
  )

  const folders = useMemo(() => {
    const merged = mergeFolders(seedFolders, stored.folders)
    if (stored.tombstones.size === 0) return merged
    return merged.filter((folder) => !stored.tombstones.has(`${FOLDER_TOMBSTONE}${folder.id}`))
  }, [stored.folders, stored.tombstones])

  const ingredientNames = useMemo(() => collectIngredientNames(recipes), [recipes])

  const recipeIndex = useMemo(
    () => new Map(recipes.map((recipe) => [recipe.id, recipe])),
    [recipes],
  )
  const folderIndex = useMemo(
    () => new Map(folders.map((folder) => [folder.id, folder])),
    [folders],
  )

  // Mirrors for async callbacks, which must see the values from the current render.
  const recipesRef = useRef(recipes)
  const foldersRef = useRef(folders)
  recipesRef.current = recipes
  foldersRef.current = folders

  /* ---------------------------------------------------------------- */
  /* Image URL bookkeeping                                            */
  /* ---------------------------------------------------------------- */

  const commitUrls = useCallback((mutate: (map: Map<string, string>) => void) => {
    const next = new Map(urlsRef.current)
    mutate(next)
    urlsRef.current = next
    setImageUrls(next)
  }, [])

  const trackImage = useCallback(
    (id: string, blob: Blob) => {
      blobsRef.current.set(id, blob)
      const previous = urlsRef.current.get(id)
      if (previous) URL.revokeObjectURL(previous)
      const url = URL.createObjectURL(blob)
      commitUrls((map) => map.set(id, url))
    },
    [commitUrls],
  )

  const forgetImage = useCallback(
    (id: string) => {
      blobsRef.current.delete(id)
      const previous = urlsRef.current.get(id)
      if (previous) URL.revokeObjectURL(previous)
      commitUrls((map) => map.delete(id))
    },
    [commitUrls],
  )

  /* ---------------------------------------------------------------- */
  /* Hydration                                                        */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const loaded = await repository.loadAll()
      if (cancelled) return

      for (const image of loaded.images) {
        if (image?.id && image.blob) trackImage(image.id, image.blob)
      }

      setStored({
        recipes: loaded.recipes,
        folders: loaded.folders,
        tombstones: new Set(loaded.tombstones.map((tombstone) => tombstone.id)),
      })
      setStatus(loaded.available ? 'ready' : 'degraded')
    })()

    return () => {
      cancelled = true
    }
  }, [trackImage])

  // Release every object URL we own when the provider goes away.
  useEffect(() => {
    return () => {
      for (const url of urlsRef.current.values()) URL.revokeObjectURL(url)
      urlsRef.current = new Map()
    }
  }, [])

  /** First successful write is a good moment to ask for persistent storage. */
  const markWrite = useCallback(() => {
    if (persistenceRequested.current) return
    persistenceRequested.current = true
    void requestPersistence()
  }, [])

  /* ---------------------------------------------------------------- */
  /* Recipes                                                          */
  /* ---------------------------------------------------------------- */

  const getRecipe = useCallback((id: string) => recipeIndex.get(id), [recipeIndex])

  const persistRecipe = useCallback(
    async (recipe: Recipe) => {
      setStored((prev) => ({ ...prev, recipes: upsert(prev.recipes, recipe) }))
      await repository.putRecipe(recipe)
      markWrite()
    },
    [markWrite],
  )

  const createRecipe = useCallback(
    async (draft: RecipeDraft): Promise<Recipe> => {
      const timestamp = now()
      const recipe: Recipe = {
        ...draft,
        id: newId('rec'),
        groups: withIds(draft.groups ?? []),
        instructions: draft.instructions ?? [],
        meals: draft.meals ?? [],
        servings: draft.servings >= 1 ? draft.servings : 1,
        origin: 'user',
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      await persistRecipe(recipe)
      return recipe
    },
    [persistRecipe],
  )

  const updateRecipe = useCallback(
    async (id: string, patch: Partial<RecipeDraft>): Promise<Recipe> => {
      const current = recipesRef.current.find((recipe) => recipe.id === id)
      if (!current) throw new Error(`No such recipe: ${id}`)

      const next: Recipe = {
        ...current,
        ...patch,
        // Seed recipes keep `origin: 'seed'` — this row *is* the copy-on-write override.
        id: current.id,
        origin: current.origin,
        createdAt: current.createdAt,
        groups: withIds(patch.groups ?? current.groups),
        updatedAt: now(),
      }

      // Replacing (or clearing) the image drops the blob it used to point at.
      if ('imageId' in patch && current.imageId && current.imageId !== next.imageId) {
        forgetImage(current.imageId)
        await repository.deleteImage(current.imageId)
      }

      await persistRecipe(next)
      return next
    },
    [forgetImage, persistRecipe],
  )

  const deleteRecipe = useCallback(
    async (id: string): Promise<void> => {
      const current = recipesRef.current.find((recipe) => recipe.id === id)
      const isSeed = current?.origin === 'seed'

      setStored((prev) => ({
        ...prev,
        recipes: removeById(prev.recipes, id),
        tombstones: isSeed ? new Set(prev.tombstones).add(id) : prev.tombstones,
      }))

      if (current?.imageId) {
        forgetImage(current.imageId)
        await repository.deleteImage(current.imageId)
      }

      // A seed recipe may also have an override row — remove it either way.
      await repository.deleteStoredRecipe(id)
      if (isSeed) await repository.addTombstone(id)
      markWrite()
    },
    [forgetImage, markWrite],
  )

  const moveRecipe = useCallback(
    async (id: string, folderId: string | null): Promise<void> => {
      await updateRecipe(id, { folderId })
    },
    [updateRecipe],
  )

  /* ---------------------------------------------------------------- */
  /* Folders                                                          */
  /* ---------------------------------------------------------------- */

  const getFolder = useCallback((id: string) => folderIndex.get(id), [folderIndex])

  const persistFolder = useCallback(
    async (folder: Folder) => {
      setStored((prev) => ({ ...prev, folders: upsert(prev.folders, folder) }))
      await repository.putFolder(folder)
      markWrite()
    },
    [markWrite],
  )

  const createFolder = useCallback(
    async (name: string, parentId: string | null): Promise<Folder> => {
      const folder: Folder = { id: newId('fld'), name: name.trim() || 'Untitled', parentId }
      await persistFolder(folder)
      return folder
    },
    [persistFolder],
  )

  const renameFolder = useCallback(
    async (id: string, name: string): Promise<void> => {
      const current = foldersRef.current.find((folder) => folder.id === id)
      if (!current) throw new Error(`No such folder: ${id}`)
      await persistFolder({ ...current, name: name.trim() || current.name })
    },
    [persistFolder],
  )

  const deleteFolder = useCallback(
    async (id: string): Promise<void> => {
      const allFolders = foldersRef.current
      const current = allFolders.find((folder) => folder.id === id)
      if (!current) return

      // Reparent to the grandparent — guarding against a corrupt tree that would
      // otherwise let a folder become its own ancestor.
      const descendants = new Set(folderDescendants(allFolders, id))
      const parentId =
        current.parentId && !descendants.has(current.parentId) && current.parentId !== id
          ? current.parentId
          : null

      // Only DIRECT children move up; deeper nesting stays intact underneath them.
      const movedFolders = allFolders
        .filter((folder) => folder.parentId === id)
        .map((folder): Folder => ({ ...folder, parentId }))

      const timestamp = now()
      const movedRecipes = recipesRef.current
        .filter((recipe) => recipe.folderId === id)
        .map((recipe): Recipe => ({ ...recipe, folderId: parentId, updatedAt: timestamp }))

      const isSeedFolder = seedFolders.some((folder) => folder.id === id)

      setStored((prev) => {
        let nextFolders = prev.folders
        for (const folder of movedFolders) nextFolders = upsert(nextFolders, folder)
        nextFolders = removeById(nextFolders, id)

        let nextRecipes = prev.recipes
        for (const recipe of movedRecipes) nextRecipes = upsert(nextRecipes, recipe)

        const tombstones = isSeedFolder
          ? new Set(prev.tombstones).add(`${FOLDER_TOMBSTONE}${id}`)
          : prev.tombstones

        return { recipes: nextRecipes, folders: nextFolders, tombstones }
      })

      for (const folder of movedFolders) await repository.putFolder(folder)
      for (const recipe of movedRecipes) await repository.putRecipe(recipe)
      await repository.deleteStoredFolder(id)
      if (isSeedFolder) await repository.addTombstone(`${FOLDER_TOMBSTONE}${id}`)
      markWrite()
    },
    [markWrite],
  )

  /* ---------------------------------------------------------------- */
  /* Images                                                           */
  /* ---------------------------------------------------------------- */

  const getImageUrl = useCallback(
    (imageId: string | undefined) => (imageId ? imageUrls.get(imageId) : undefined),
    [imageUrls],
  )

  const putImage = useCallback(
    async (blob: Blob): Promise<string> => {
      // `null` means storage is unavailable — keep the blob in memory so the session
      // still works, it simply will not survive a reload.
      const id = (await repository.putImage(blob)) ?? newId('img')
      trackImage(id, blob)
      markWrite()
      return id
    },
    [markWrite, trackImage],
  )

  const getImageBlob = useCallback(async (id: string): Promise<Blob | undefined> => {
    const cached = blobsRef.current.get(id)
    if (cached) return cached
    const blob = await repository.getImage(id)
    if (blob) blobsRef.current.set(id, blob)
    return blob
  }, [])

  /* ---------------------------------------------------------------- */

  const api = useMemo<RecipesApi>(
    () => ({
      status,
      recipes,
      folders,
      ingredientNames,
      getRecipe,
      createRecipe,
      updateRecipe,
      deleteRecipe,
      moveRecipe,
      getFolder,
      createFolder,
      renameFolder,
      deleteFolder,
      getImageUrl,
      putImage,
      getImageBlob,
    }),
    [
      status,
      recipes,
      folders,
      ingredientNames,
      getRecipe,
      createRecipe,
      updateRecipe,
      deleteRecipe,
      moveRecipe,
      getFolder,
      createFolder,
      renameFolder,
      deleteFolder,
      getImageUrl,
      putImage,
      getImageBlob,
    ],
  )

  return <RecipesContext.Provider value={api}>{children}</RecipesContext.Provider>
}

export function useRecipes(): RecipesApi {
  const api = useContext(RecipesContext)
  if (!api) {
    throw new Error('useRecipes() must be used inside a <RecipesProvider>.')
  }
  return api
}
