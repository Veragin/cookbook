/**
 * All of the add/edit recipe form's state lives here so the page components stay
 * presentational.
 *
 * The form model is deliberately *not* `Recipe`: every text control keeps its raw
 * string while the user types (an amount is `''` until it parses, a group with no
 * items is still shown), and `validate()` is the single place where that loose shape
 * is turned into a strict `RecipeDraft`.
 */

import { useCallback, useMemo, useState } from 'react'

import { newId } from '../../lib/id'
import type { Ingredient, IngredientGroup, Meal, Recipe, Unit } from '../../types'
import type { RecipeDraft } from './RecipesProvider'

export const MIN_SERVINGS = 1
export const MAX_SERVINGS = 99
export const DEFAULT_SERVINGS = 4

export const MEAL_OPTIONS: ReadonlyArray<{ value: Meal; label: string }> = [
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
]

/* ------------------------------------------------------------------ */
/* Form shape                                                          */
/* ------------------------------------------------------------------ */

export type FormIngredient = {
  id: string
  /** Raw text — parsed by {@link parseQuantityInput}; empty means "to taste". */
  quantity: string
  unit: Unit
  name: string
  note: string
}

export type FormGroup = {
  id: string
  /** Empty string means "untitled group" (the ungrouped bucket). */
  title: string
  items: FormIngredient[]
}

export type FormInstruction = { id: string; text: string }

/** A photo is either absent, already in IndexedDB, or picked but not yet stored. */
export type FormImage =
  | { kind: 'none' }
  | { kind: 'stored'; imageId: string }
  | { kind: 'pending'; token: string; blob: Blob }

export type RecipeFormState = {
  name: string
  servings: number
  meals: Meal[]
  folderId: string | null
  image: FormImage
  groups: FormGroup[]
  instructions: FormInstruction[]
}

export type ItemErrors = { quantity?: string; name?: string }

export type FormErrors = {
  name?: string
  meals?: string
  instructions?: string
  /** Keyed by `FormIngredient.id`. */
  items: Record<string, ItemErrors>
}

export type ValidationResult =
  | { ok: true; errors: FormErrors; draft: Omit<RecipeDraft, 'imageId'> }
  | { ok: false; errors: FormErrors; firstErrorId: string; messages: string[] }

/* ------------------------------------------------------------------ */
/* Stable DOM ids — shared by the field that renders an error and the  */
/* focus-the-first-problem logic.                                      */
/* ------------------------------------------------------------------ */

/** Ids end up in `htmlFor`/`getElementById`, so keep them to a safe alphabet. */
function slugId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-')
}

export const formFieldIds = {
  name: 'recipe-name',
  folder: 'recipe-folder',
  image: 'recipe-image',
  /** The first meal toggle doubles as the focus target for the group's error. */
  meals: 'recipe-meal-lunch',
  meal: (meal: Meal) => `recipe-meal-${meal}`,
  groupTitle: (groupId: string) => `group-title-${slugId(groupId)}`,
  quantity: (itemId: string) => `ing-qty-${slugId(itemId)}`,
  unit: (itemId: string) => `ing-unit-${slugId(itemId)}`,
  ingredientName: (itemId: string) => `ing-name-${slugId(itemId)}`,
  note: (itemId: string) => `ing-note-${slugId(itemId)}`,
  instruction: (stepId: string) => `step-${slugId(stepId)}`,
} as const

/* ------------------------------------------------------------------ */
/* Quantity parsing                                                    */
/* ------------------------------------------------------------------ */

export type QuantityResult =
  | { ok: true; value: number | null }
  | { ok: false; message: string }

const NEGATIVE_MESSAGE = 'Amount cannot be negative.'
const INVALID_MESSAGE = 'Enter a number like 1.5, or leave it empty for "to taste".'

/** Trims float noise introduced by fraction division (0.1 + 0.2 territory). */
function roundish(value: number): number {
  return Math.round(value * 1e6) / 1e6
}

/**
 * Lenient, kitchen-friendly amount parser.
 *
 * - `''` (or blank) → `null`, i.e. "to taste"
 * - `1,5` → `1.5` (comma decimal separator)
 * - `1/2` and `1 1/2` → `0.5` / `1.5`
 * - anything negative, non-numeric or non-finite → an error message
 */
export function parseQuantityInput(raw: string): QuantityResult {
  const text = raw.trim()
  if (text === '') return { ok: true, value: null }

  const normalized = text.replace(/,/g, '.').replace(/\s+/g, ' ')
  if (normalized.startsWith('-')) return { ok: false, message: NEGATIVE_MESSAGE }

  const mixed = /^(\d+) (\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(normalized)
  if (mixed) {
    const denominator = Number(mixed[3])
    if (denominator <= 0) return { ok: false, message: INVALID_MESSAGE }
    return { ok: true, value: roundish(Number(mixed[1]) + Number(mixed[2]) / denominator) }
  }

  const fraction = /^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(normalized)
  if (fraction) {
    const denominator = Number(fraction[2])
    if (denominator <= 0) return { ok: false, message: INVALID_MESSAGE }
    return { ok: true, value: roundish(Number(fraction[1]) / denominator) }
  }

  if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) {
    return { ok: false, message: INVALID_MESSAGE }
  }

  const value = Number(normalized)
  if (!Number.isFinite(value)) return { ok: false, message: INVALID_MESSAGE }
  return { ok: true, value: roundish(value) }
}

/** Existing quantity → the text the input starts with. */
export function quantityToText(quantity: number | null | undefined): string {
  return typeof quantity === 'number' && Number.isFinite(quantity) ? String(quantity) : ''
}

/* ------------------------------------------------------------------ */
/* Factories                                                           */
/* ------------------------------------------------------------------ */

export function emptyIngredient(): FormIngredient {
  return { id: newId('ing'), quantity: '', unit: null, name: '', note: '' }
}

export function emptyGroup(): FormGroup {
  return { id: newId('grp'), title: '', items: [emptyIngredient()] }
}

export function emptyInstruction(): FormInstruction {
  return { id: newId('step'), text: '' }
}

function clampServings(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SERVINGS
  return Math.min(MAX_SERVINGS, Math.max(MIN_SERVINGS, Math.round(value)))
}

function blankState(folderId: string | null): RecipeFormState {
  return {
    name: '',
    servings: DEFAULT_SERVINGS,
    meals: [],
    folderId,
    image: { kind: 'none' },
    groups: [emptyGroup()],
    instructions: [emptyInstruction()],
  }
}

function stateFromRecipe(recipe: Recipe): RecipeFormState {
  const groups: FormGroup[] = recipe.groups.map((group) => ({
    id: group.id || newId('grp'),
    title: group.title ?? '',
    items: group.items.map((item) => ({
      id: item.id || newId('ing'),
      quantity: quantityToText(item.quantity),
      unit: item.unit ?? null,
      name: item.name,
      note: item.note ?? '',
    })),
  }))

  const instructions: FormInstruction[] = recipe.instructions.map((text) => ({
    id: newId('step'),
    text,
  }))

  return {
    name: recipe.name,
    servings: clampServings(recipe.servings),
    meals: MEAL_OPTIONS.filter((option) => recipe.meals.includes(option.value)).map(
      (option) => option.value,
    ),
    folderId: recipe.folderId,
    image: recipe.imageId ? { kind: 'stored', imageId: recipe.imageId } : { kind: 'none' },
    groups: groups.length > 0 ? groups : [emptyGroup()],
    instructions: instructions.length > 0 ? instructions : [emptyInstruction()],
  }
}

/** Order-insensitive for meals, blob-safe for the image — used only for `isDirty`. */
function signatureOf(state: RecipeFormState): string {
  return JSON.stringify({
    name: state.name.trim(),
    servings: state.servings,
    meals: [...state.meals].sort(),
    folderId: state.folderId,
    image:
      state.image.kind === 'stored'
        ? `stored:${state.image.imageId}`
        : state.image.kind === 'pending'
          ? `pending:${state.image.token}`
          : 'none',
    groups: state.groups.map((group) => ({
      title: group.title.trim(),
      items: group.items.map((item) => [
        item.quantity.trim(),
        item.unit,
        item.name.trim(),
        item.note.trim(),
      ]),
    })),
    instructions: state.instructions.map((step) => step.text.trim()).filter(Boolean),
  })
}

/* ------------------------------------------------------------------ */
/* Generic list helpers                                                */
/* ------------------------------------------------------------------ */

function moveWithin<T>(list: T[], index: number, delta: number): T[] {
  const target = index + delta
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return list
  const next = list.slice()
  const [entry] = next.splice(index, 1)
  next.splice(target, 0, entry)
  return next
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

export type UseRecipeFormOptions = {
  /** Present in edit mode; the form is prefilled from it. */
  recipe?: Recipe
  /** Create mode only — usually the `?folderId=` the user came from. */
  initialFolderId?: string | null
}

export type RecipeFormApi = {
  state: RecipeFormState
  errors: FormErrors
  isDirty: boolean

  setName(name: string): void
  setServings(servings: number): void
  toggleMeal(meal: Meal): void
  setFolderId(folderId: string | null): void
  setImage(blob: Blob): void
  clearImage(): void

  addGroup(): void
  removeGroup(groupId: string): void
  moveGroup(groupId: string, delta: number): void
  setGroupTitle(groupId: string, title: string): void

  addItem(groupId: string): void
  removeItem(groupId: string, itemId: string): void
  moveItem(groupId: string, itemId: string, delta: number): void
  updateItem(groupId: string, itemId: string, patch: Partial<Omit<FormIngredient, 'id'>>): void

  addInstruction(): void
  removeInstruction(stepId: string): void
  moveInstruction(stepId: string, delta: number): void
  updateInstruction(stepId: string, text: string): void

  /** Validates, stores the resulting field errors and returns them. */
  validate(): ValidationResult
  /** Makes the current values the new "clean" baseline (after a successful save). */
  markPristine(): void
}

export function useRecipeForm({
  recipe,
  initialFolderId = null,
}: UseRecipeFormOptions): RecipeFormApi {
  const [state, setState] = useState<RecipeFormState>(() =>
    recipe ? stateFromRecipe(recipe) : blankState(initialFolderId),
  )
  const [baseline, setBaseline] = useState<string>(() =>
    signatureOf(recipe ? stateFromRecipe(recipe) : blankState(initialFolderId)),
  )
  const [errors, setErrors] = useState<FormErrors>({ items: {} })

  const signature = useMemo(() => signatureOf(state), [state])
  const isDirty = signature !== baseline

  /* -- scalars ----------------------------------------------------- */

  const setName = useCallback((name: string) => {
    setState((prev) => ({ ...prev, name }))
    setErrors((prev) => ({ ...prev, name: undefined }))
  }, [])

  const setServings = useCallback((servings: number) => {
    setState((prev) => ({ ...prev, servings: clampServings(servings) }))
  }, [])

  const toggleMeal = useCallback((meal: Meal) => {
    setState((prev) => {
      const has = prev.meals.includes(meal)
      const next = has ? prev.meals.filter((entry) => entry !== meal) : [...prev.meals, meal]
      // Keep the canonical lunch-before-dinner order regardless of click order.
      return { ...prev, meals: MEAL_OPTIONS.filter((o) => next.includes(o.value)).map((o) => o.value) }
    })
    setErrors((prev) => ({ ...prev, meals: undefined }))
  }, [])

  const setFolderId = useCallback((folderId: string | null) => {
    setState((prev) => ({ ...prev, folderId }))
  }, [])

  const setImage = useCallback((blob: Blob) => {
    setState((prev) => ({ ...prev, image: { kind: 'pending', token: newId('img'), blob } }))
  }, [])

  const clearImage = useCallback(() => {
    setState((prev) => ({ ...prev, image: { kind: 'none' } }))
  }, [])

  /* -- groups ------------------------------------------------------ */

  const mapGroups = useCallback(
    (project: (groups: FormGroup[]) => FormGroup[]) =>
      setState((prev) => ({ ...prev, groups: project(prev.groups) })),
    [],
  )

  const addGroup = useCallback(() => {
    mapGroups((groups) => [...groups, emptyGroup()])
  }, [mapGroups])

  const removeGroup = useCallback(
    (groupId: string) => {
      mapGroups((groups) => {
        const next = groups.filter((group) => group.id !== groupId)
        return next.length > 0 ? next : [emptyGroup()]
      })
    },
    [mapGroups],
  )

  const moveGroup = useCallback(
    (groupId: string, delta: number) => {
      mapGroups((groups) => moveWithin(groups, groups.findIndex((g) => g.id === groupId), delta))
    },
    [mapGroups],
  )

  const setGroupTitle = useCallback(
    (groupId: string, title: string) => {
      mapGroups((groups) =>
        groups.map((group) => (group.id === groupId ? { ...group, title } : group)),
      )
    },
    [mapGroups],
  )

  /* -- items ------------------------------------------------------- */

  const mapItems = useCallback(
    (groupId: string, project: (items: FormIngredient[]) => FormIngredient[]) => {
      mapGroups((groups) =>
        groups.map((group) =>
          group.id === groupId ? { ...group, items: project(group.items) } : group,
        ),
      )
    },
    [mapGroups],
  )

  const addItem = useCallback(
    (groupId: string) => {
      mapItems(groupId, (items) => [...items, emptyIngredient()])
    },
    [mapItems],
  )

  const removeItem = useCallback(
    (groupId: string, itemId: string) => {
      mapItems(groupId, (items) => items.filter((item) => item.id !== itemId))
      setErrors((prev) => {
        if (!prev.items[itemId]) return prev
        const items = { ...prev.items }
        delete items[itemId]
        return { ...prev, items }
      })
    },
    [mapItems],
  )

  const moveItem = useCallback(
    (groupId: string, itemId: string, delta: number) => {
      mapItems(groupId, (items) =>
        moveWithin(items, items.findIndex((item) => item.id === itemId), delta),
      )
    },
    [mapItems],
  )

  const updateItem = useCallback(
    (groupId: string, itemId: string, patch: Partial<Omit<FormIngredient, 'id'>>) => {
      mapItems(groupId, (items) =>
        items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
      )
      setErrors((prev) => {
        if (!prev.items[itemId]) return prev
        const items = { ...prev.items }
        delete items[itemId]
        return { ...prev, items }
      })
    },
    [mapItems],
  )

  /* -- instructions ------------------------------------------------ */

  const mapInstructions = useCallback(
    (project: (steps: FormInstruction[]) => FormInstruction[]) =>
      setState((prev) => ({ ...prev, instructions: project(prev.instructions) })),
    [],
  )

  const addInstruction = useCallback(() => {
    mapInstructions((steps) => [...steps, emptyInstruction()])
  }, [mapInstructions])

  const removeInstruction = useCallback(
    (stepId: string) => {
      mapInstructions((steps) => {
        const next = steps.filter((step) => step.id !== stepId)
        return next.length > 0 ? next : [emptyInstruction()]
      })
    },
    [mapInstructions],
  )

  const moveInstruction = useCallback(
    (stepId: string, delta: number) => {
      mapInstructions((steps) =>
        moveWithin(steps, steps.findIndex((step) => step.id === stepId), delta),
      )
    },
    [mapInstructions],
  )

  const updateInstruction = useCallback(
    (stepId: string, text: string) => {
      mapInstructions((steps) =>
        steps.map((step) => (step.id === stepId ? { ...step, text } : step)),
      )
      setErrors((prev) => ({ ...prev, instructions: undefined }))
    },
    [mapInstructions],
  )

  /* -- validation --------------------------------------------------- */

  const validate = useCallback((): ValidationResult => {
    const nextErrors: FormErrors = { items: {} }
    const messages: string[] = []
    let firstErrorId: string | null = null

    const fail = (id: string, message: string) => {
      messages.push(message)
      if (firstErrorId === null) firstErrorId = id
    }

    const name = state.name.trim()
    if (name === '') {
      nextErrors.name = 'Give the recipe a name.'
      fail(formFieldIds.name, nextErrors.name)
    }

    if (state.meals.length === 0) {
      nextErrors.meals = 'Pick at least one — lunch, dinner, or both.'
      fail(formFieldIds.meals, nextErrors.meals)
    }

    const groups: IngredientGroup[] = []
    for (const group of state.groups) {
      const items: Ingredient[] = []

      for (const item of group.items) {
        const itemName = item.name.trim()
        const note = item.note.trim()
        const rawQuantity = item.quantity.trim()

        // A completely untouched row is a placeholder, not a mistake — drop it.
        if (itemName === '' && rawQuantity === '' && note === '' && item.unit === null) continue

        const parsed = parseQuantityInput(rawQuantity)
        const itemErrors: ItemErrors = {}

        if (!parsed.ok) {
          itemErrors.quantity = parsed.message
          fail(formFieldIds.quantity(item.id), parsed.message)
        }
        if (itemName === '') {
          itemErrors.name = 'Name this ingredient, or clear the row.'
          fail(formFieldIds.ingredientName(item.id), itemErrors.name)
        }

        if (itemErrors.quantity || itemErrors.name) {
          nextErrors.items[item.id] = itemErrors
          continue
        }

        const ingredient: Ingredient = {
          id: item.id,
          name: itemName,
          quantity: parsed.ok ? parsed.value : null,
          unit: item.unit,
        }
        if (note !== '') ingredient.note = note
        items.push(ingredient)
      }

      if (items.length === 0) continue
      const group_: IngredientGroup = { id: group.id, items }
      const title = group.title.trim()
      if (title !== '') group_.title = title
      groups.push(group_)
    }

    const instructions = state.instructions
      .map((step) => step.text.trim())
      .filter((text) => text !== '')

    if (instructions.length === 0) {
      nextErrors.instructions = 'Add at least one instruction step.'
      fail(
        formFieldIds.instruction(state.instructions[0]?.id ?? ''),
        nextErrors.instructions,
      )
    }

    setErrors(nextErrors)

    if (firstErrorId !== null) {
      return { ok: false, errors: nextErrors, firstErrorId, messages }
    }

    return {
      ok: true,
      errors: nextErrors,
      draft: {
        name,
        folderId: state.folderId,
        servings: clampServings(state.servings),
        groups,
        instructions,
        meals: state.meals,
      },
    }
  }, [state])

  const markPristine = useCallback(() => {
    setBaseline(signatureOf(state))
  }, [state])

  return {
    state,
    errors,
    isDirty,
    setName,
    setServings,
    toggleMeal,
    setFolderId,
    setImage,
    clearImage,
    addGroup,
    removeGroup,
    moveGroup,
    setGroupTitle,
    addItem,
    removeItem,
    moveItem,
    updateItem,
    addInstruction,
    removeInstruction,
    moveInstruction,
    updateInstruction,
    validate,
    markPristine,
  }
}
