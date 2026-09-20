# Cookbook — Implementation Plan

Frontend-only recipe manager (React + Vite + styled-components), PWA, mobile-first.
Derived from `README.md` plus four confirmed design decisions.

## Confirmed decisions

| Topic | Decision |
|---|---|
| Ingredient amount | Structured (`quantity` + `unit`), not free text |
| Portions | `servings` on every recipe + scaling control in recipe view |
| Persistence | IndexedDB (overrides the README's mention of localStorage) |
| Folder structure | Nested tree |
| Seed recipe edits | Copy-on-write |

### Assumptions

- **TypeScript**, because the `Makefile` wires `typescript-language-server` for `.ts/.tsx/.js/.jsx`.
- Dev server binds `host: true, port: 8170, strictPort: true` — `docker-compose.yml` publishes `8170:8170`.
- "prepare a skill for adding new recept to data" = a Claude Code skill at `.claude/skills/add-recipe/`.
- Metric units with a fixed list plus free-text fallback; new recipes default to `servings: 4`.

---

## Data model

```ts
type Unit = 'g' | 'kg' | 'ml' | 'l' | 'tsp' | 'tbsp' | 'cup' | 'pcs' | 'pinch' | null

type Ingredient = {
  id: string
  name: string
  quantity: number | null   // null = "to taste" → never scales
  unit: Unit
  note?: string             // "finely chopped"
}

type IngredientGroup = {
  id: string
  title?: string            // optional group heading, e.g. "Dough"
  items: Ingredient[]
}

type Recipe = {
  id: string
  name: string
  folderId: string | null
  servings: number          // base portions the stored quantities refer to
  imageId?: string          // → images store (Blob)
  groups: IngredientGroup[]
  instructions: string[]
  meals: ('lunch' | 'dinner')[]
  origin: 'seed' | 'user'
  createdAt: string
  updatedAt: string
}

type Folder = {
  id: string
  name: string
  parentId: string | null   // nested tree
}
```

### Scaling rules

- Stored quantities always refer to `recipe.servings` (the base).
- The view renders `quantity * target / base` through `formatQuantity`.
- `formatQuantity` rounds kitchen-friendly: fractions (`½`, `¼`, `⅓`) for `tsp`/`tbsp`/`cup`, otherwise ≤2 significant decimals.
- Unit promotion when it reads better: `1500 g → 1.5 kg`, `1000 ml → 1 l`.
- `quantity: null` rows pass through unscaled — "salt, to taste" stays "to taste".
- Scaled state is **view-only**, never written back; the stepper resets on navigation.
- Search matches ingredient `name` only, so scaling never affects search.

---

## Persistence — IndexedDB

DB `cookbook`, version 1, accessed through the `idb` wrapper (~1 kB gz; avoids raw request plumbing).

| Store | Key | Indexes | Contents |
|---|---|---|---|
| `recipes` | `id` | `folderId` | user recipes **and** copy-on-write overrides of seed recipes |
| `folders` | `id` | `parentId` | nested folder tree |
| `tombstones` | `id` | — | ids of deleted seed recipes |
| `images` | `id` | — | image **Blobs** (not base64) |
| `meta` | `key` | — | `schemaVersion` for future migrations |

- **Copy-on-write merge:** view = seed recipes ← overridden by `recipes` entries with the same id ← minus `tombstones`. Add/edit/remove then work identically for bundled and user recipes.
- **Images as Blobs** is the payoff over localStorage: no ~5 MB ceiling, no base64 bloat. Downscale only to ≤1600 px for sanity. UI uses `URL.createObjectURL` and revokes on unmount; blobs are deleted when a recipe is deleted or its image replaced.
- **Async hydration:** the provider loads IndexedDB → in-memory once at boot (skeleton while loading), then reads/search stay synchronous and fast while writes go write-through to IndexedDB.
- Call `navigator.storage.persist()` on first write — for a PWA this store is the user's only copy and may otherwise be evicted.
- If IndexedDB is unavailable (some private-browsing modes), degrade to in-memory with a visible "changes won't be saved" banner rather than throwing.
- `meta.schemaVersion` + an upgrade handler exist from day one even though this is greenfield.

---

## Directory layout

```
src/
  app/          router, AppShell, TabBar
  theme/        tokens, GlobalStyle, styled.d.ts
  components/   Button, Input, Modal, Chip, Autocomplete, MultiAutocomplete, Sheet, Stepper
  features/
    recipes/    List, FolderTree, SearchBar, RecipeView, RecipeForm, useRecipes
    suggest/    SuggestPage, MealToggle, IngredientPicker, ResultCard
  lib/          db.ts, repository.ts, merge.ts, search.ts, quantity.ts, export.ts, image.ts, id.ts
  data/
    recipes/*.json
    folders.json
.claude/skills/add-recipe/SKILL.md
scripts/validate-recipes.mjs
```

---

## Phases

### 1. Scaffold
Vite + React + TS, styled-components theme tokens / `GlobalStyle` / `styled.d.ts`, `host: true, port: 8170, strictPort`, react-router-dom (deep-linkable recipe routes matter for a PWA), `AppShell` with bottom tab bar for the two tabs.

### 2. Domain & IndexedDB
Types, `idb` schema + upgrade handler, seed loader via `import.meta.glob('../data/recipes/*.json', { eager: true })`, merge layer (seed ← overrides ← tombstones), `RecipesProvider` with async hydration and write-through, derived deduped/normalized ingredient-name index powering every autocomplete, `persist()` request, no-IndexedDB fallback.

### 3. Recipe list
Nested folder navigation with breadcrumbs, recipe cards, search across name + ingredient names (diacritics- and case-insensitive, flattens all folders while searching), empty states.

### 4. Recipe view + scaling
Hero image from blob URL, **portion stepper** (`− 4 +`), grouped ingredients rendered through `formatQuantity`, instructions, meal badges, actions (edit / export / delete).

### 5. Recipe editor
Shared add/edit form: servings field, dynamic ingredient groups, per-row quantity + unit select (free-text fallback, unit autocompleted from existing units) + name autocomplete, instruction bullets with reorder, image picker → downscale → Blob, meal flags, folder picker, validation, unsaved-changes guard.

### 6. Folders
Create / rename / delete (children reparent to grandparent), move-recipe tree picker.

### 7. Export
Recipe → `{ schemaVersion, recipe }`; folder → `{ schemaVersion, folder, recipes[] }` including nested subfolders. Images exported as data URLs so the file is self-contained.

### 8. Suggest meal
Lunch/dinner toggle, multi-autocomplete ingredient chips, random pick among recipes that carry the meal flag **and** contain all chosen ingredients, "suggest another" excluding the last pick, explicit no-match state.

### 9. PWA & mobile
`vite-plugin-pwa`: manifest, maskable icons, service worker precaching the app shell + seed JSON, iOS meta tags. Safe-area insets, 44 px touch targets, tablet two-column grid.

### 10. `add-recipe` skill
`.claude/skills/add-recipe/SKILL.md` documenting the structured-amount + servings schema and file naming, and running `scripts/validate-recipes.mjs` to verify its own output.

### 11. Seed data
10–12 recipes across 2–3 nested folders, mixed lunch/dinner, several with titled ingredient groups and "to taste" rows to exercise the scaling edge cases.

### 12. Verification
`tsc --noEmit`, eslint, vitest for `formatQuantity` / scaling / search / IndexedDB merge + tombstones, one Playwright smoke run (add → search → scale → suggest — Chrome and ffmpeg are already in the dev image), README dev instructions.
