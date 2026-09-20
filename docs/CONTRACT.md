# Module contract

Every module in this app codes against the APIs below. **Do not change a signature that
another module depends on** — implement exactly what is written here. If something is
genuinely missing, add to it rather than altering existing names.

Stack: React 19 + TypeScript + Vite + styled-components v6 + react-router-dom v7 + `idb`.
Persistence is **IndexedDB only**. Mobile-first, PWA.

Domain types live in `src/types.ts` — read that file first. Path alias `@/*` → `src/*` is
configured but relative imports are fine; match whatever the file already uses.

## House style

- `styled-components` with theme tokens from `src/theme/theme.ts`. Never hardcode colours,
  spacing, radii, or font sizes — use `theme.color.*`, `theme.space.*`, `theme.radius.*`,
  `theme.font.*`, `theme.shadow.*`, `theme.layout.*`, `theme.z.*`. Tokens are the *only*
  thing that changes between light and dark, so a hardcoded colour is a dark-mode bug.
- Transient styled-props are prefixed with `$` (e.g. `$active`).
- Named exports only (no `export default`).
- Mobile-first: touch targets ≥ `theme.layout.touch` (44px), respect `env(safe-area-inset-*)`.
- Accessible: real `<button>`/`<label>`, `aria-label` on icon-only controls, visible focus.
- No new npm dependencies. Everything needed is already installed.

---

## `src/features/recipes/RecipesProvider.tsx`

```ts
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

export function RecipesProvider({ children }: { children: ReactNode }): ReactElement
export function useRecipes(): RecipesApi
```

Notes:
- `status: 'degraded'` means IndexedDB is unavailable (e.g. some private-browsing modes);
  the app still works in memory and `AppShell` shows a banner. Never throw for this.
- Reads (`recipes`, `folders`, `getRecipe`, `getImageUrl`) are **synchronous** — the
  provider hydrates once at boot and keeps an in-memory cache. Writes are async and
  write through to IndexedDB.

## `src/lib/quantity.ts`

```ts
/** Scaled quantity; `null` (to taste) stays `null`. */
export function scaleQuantity(quantity: number | null, factor: number): number | null
/** Kitchen-friendly rendering incl. unit promotion (1500 g → 1.5 kg) and fractions. */
export function formatQuantity(quantity: number, unit: Unit): string
/** Full amount text for an ingredient at a scale factor, e.g. "1½ tsp" or "to taste". */
export function formatAmount(ingredient: Ingredient, factor?: number): string
/** Guarded target/base ratio; returns 1 for a non-positive or non-finite base. */
export function scaleFactor(targetServings: number, baseServings: number): number
```

**Both formatters return the number *and* its unit** — `formatQuantity(1500, 'g') === '1.5 kg'`,
`formatAmount(ing) === '1½ tsp'`, and `'to taste'` when `quantity` is `null`. Promotion can
change the unit, so UI code must render the returned string as-is and **never append
`ingredient.unit` on top of it**.

## `src/lib/search.ts`

```ts
/** Lowercase + strip diacritics. */
export function normalize(value: string): string
/** Matches on recipe name and ingredient names; empty query returns all. */
export function searchRecipes(recipes: Recipe[], query: string): Recipe[]
/** True when the recipe contains every one of `names` (normalised substring match). */
export function hasAllIngredients(recipe: Recipe, names: string[]): boolean
```

## `src/lib/export.ts`

```ts
export function buildRecipeExport(recipe: Recipe, image?: string): ExportedRecipe
export function buildFolderExport(
  folder: Folder, folders: Folder[], recipes: Array<{ recipe: Recipe; image?: string }>,
): ExportedFolder
/** Triggers a browser download of pretty-printed JSON. */
export function downloadJson(filename: string, data: unknown): void
/** Safe, lowercase, hyphenated filename stem. */
export function toFilename(name: string): string
export function blobToDataUrl(blob: Blob): Promise<string>
```

## `src/lib/id.ts`

```ts
export function newId(prefix?: string): string
```

## `src/lib/image.ts`

```ts
/** Downscales to fit `maxPx` on the long edge and re-encodes; returns a Blob for IndexedDB. */
export function downscaleImage(file: File, maxPx?: number): Promise<Blob>
```

## `src/components/index.ts`

Shared UI, all exported from the barrel:

```ts
Button          // props: variant 'primary'|'secondary'|'ghost'|'danger', size 'sm'|'md', $fullWidth
IconButton      // icon-only button, requires aria-label
Input, TextArea, Select
Field           // label + optional hint/error wrapper around any control
Chip            // props: label, onRemove?
SegmentedControl// props: options {value,label}[], value, onChange
Stepper         // props: value, onChange, min?, max?, step?, label
Autocomplete    // props: value, onChange, options: string[], placeholder?, allowFreeText?
MultiAutocomplete // props: values: string[], onChange(next: string[]), options: string[], placeholder?
Modal           // props: open, onClose, title, children  (focus trap, Esc, overlay click)
Sheet           // bottom sheet, same props as Modal
ConfirmDialog   // props: open, title, message, confirmLabel?, destructive?, onConfirm, onCancel
EmptyState      // props: title, description?, action?
Spinner
```

## `src/theme/` — light and dark

```ts
// theme.ts
export type ThemeMode = 'light' | 'dark'
export const lightTheme: AppTheme
export const darkTheme: AppTheme
export const themes: Record<ThemeMode, AppTheme>

// ThemeModeProvider.tsx — wraps the app (styled-components ThemeProvider + GlobalStyle)
export type ThemePreference = ThemeMode | 'system'
export function ThemeModeProvider({ children }: { children: ReactNode }): ReactElement
export function useThemeMode(): {
  preference: ThemePreference   // what the user chose; 'system' follows prefers-color-scheme
  mode: ThemeMode               // what is actually rendering
  setPreference(next: ThemePreference): void
  toggle(): void                // flips light ⇄ dark and pins the result
}
```

Both palettes carry the **same token names**, so components never branch on the mode —
write against `theme.color.*` and both modes work. Two rules make that hold:

- `surfaceAlt` is always the *recessed* tone and `surface` the *raised* one (in dark,
  `surfaceAlt` is therefore darker than `surface`, not lighter).
- `surface` is **not** "white". Text on a `primary` or `danger` fill uses
  `color.onPrimary` / `color.onDanger`.

The preference lives in `localStorage` under `cookbook:theme` (absent = follow the system),
read once more by the inline boot script in `index.html` so a dark launch does not flash
white. `color.browserChrome` feeds `<meta name="theme-color">`.

In tests, `renderWithTheme(ui, { mode: 'dark' })` renders the dark palette; default is light.

## Routes (already wired in `src/app/App.tsx` — do not edit that file)

| Path | Page |
|---|---|
| `/recipes` | `RecipeListPage` (root folder) |
| `/recipes/folder/:folderId` | `RecipeListPage` (inside a folder) |
| `/recipes/new` | `RecipeFormPage mode="create"` (accepts `?folderId=` query param) |
| `/recipes/:id` | `RecipeViewPage` |
| `/recipes/:id/edit` | `RecipeFormPage mode="edit"` |
| `/suggest` | `SuggestPage` |

## Seed data

`src/data/folders.json` is an array of `Folder` with human-readable slug ids:

```json
[
  { "id": "mains", "name": "Main dishes", "parentId": null },
  { "id": "mains-pasta", "name": "Pasta", "parentId": "mains" }
]
```

`src/data/recipes/<slug>.json` is one recipe per file in this exact shape:

```json
{
  "slug": "beef-goulash",
  "name": "Beef Goulash",
  "folderId": "mains",
  "servings": 4,
  "meals": ["lunch", "dinner"],
  "groups": [
    {
      "title": "Stew",
      "items": [
        { "name": "beef shoulder", "quantity": 800, "unit": "g", "note": "cubed" },
        { "name": "salt", "quantity": null, "unit": null }
      ]
    }
  ],
  "instructions": ["Brown the beef in batches.", "Simmer covered for 2 hours."]
}
```

Rules: `slug` is the filename stem and must be unique; `folderId` is a folder id from
`folders.json` or `null`; `unit` is one of `src/types.ts`'s `UNITS` or `null`; `quantity`
is a number or `null` ("to taste"); a group `title` may be omitted for ungrouped items.
The seed loader derives stable ids (`seed:<slug>`, `seed:<slug>:g0`, `seed:<slug>:g0:i1`)
— seed JSON never contains `id`, `origin`, `createdAt`, `updatedAt`, or `imageId`.
