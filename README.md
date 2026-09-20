# Cookbook

> **Running it:** `make start` then `make bash`, and inside the container `npm install && npm run dev`.
> The app is served on <http://localhost:8170>. See [Development](#development) at the bottom,
> the implementation plan in [PLAN.md](PLAN.md), and the module contract in [docs/CONTRACT.md](docs/CONTRACT.md).

## Requirements

- Service for managing resepies
- only frontend implementation in react, vite, styled-components
- supports pwa and mobile resolution
- Tabs
    - Recepie list
    - Suggest meal
- prepare a skill for adding new recept to data

## Recepie list

- display list of all recepies
- search recept by name or ingrediencis
- be able to add/edit/remove/view(readonly) recepie
- on click open the recepie
- support folders
- recepies are loaded as jsons from data folder and loaded from localstorage
- recept added by user are stored in localstorage
- user can export recept/folder to json file

## Recept

- Name
- Ingredients
    - bullet points,
    - can be splited to groups with an title
    - amount and name
    - make the name as autocomplete filter generated from other recept ingrediencies
- Can have an image
- instructions as bullet point text
- Lunch/Dinner/Cake flag
- Taste flag: sweet/salty

## Suggest meal

- User can pick Lunch/Dinner/Cake
- User can pick multiple ingrediencis as autocomplete multiple input
- Suggest buttons that will give the user random meal from recepies that has required ingrediencies

---

# Development

## Getting started

Everything runs inside the container defined in `docker-compose.yml`:

```bash
make start          # build + start the cookbook container
make bash           # shell into it (working dir /app, user node)

npm install
npm run dev         # http://localhost:8170
```

The Vite dev server binds `0.0.0.0:8170` (`strictPort`) to match the port compose publishes.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server on port 8170 |
| `npm run build` | Type-check and produce a production build (incl. the service worker) |
| `npm run preview` | Serve the production build on 8170 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (vitest + jsdom) |
| `npm run test:e2e` | Playwright smoke test against the dev server |
| `npm run validate:recipes` | Validate the seed JSON in `src/data/` |

## How it is built

- **React 19 + TypeScript + Vite**, styled with **styled-components** against the tokens in
  `src/theme/theme.ts`. No component library — the shared primitives live in `src/components/`.
- **Light and dark themes** are the same token names with two palettes. `ThemeModeProvider`
  follows `prefers-color-scheme` until the user taps the toggle in the top bar, after which the
  choice is pinned in `localStorage` (`cookbook:theme`) and re-applied by a tiny inline script in
  `index.html` before first paint, so a dark launch never flashes white.
- **IndexedDB is the only persistence layer** (`src/lib/db.ts`, `src/lib/repository.ts`). It stores
  user recipes, folders, deletion tombstones and image **Blobs**. The app requests
  `navigator.storage.persist()` so the browser does not evict the user's only copy of their data,
  and degrades to an in-memory session with a visible banner where IndexedDB is unavailable.
- **Seed recipes are bundled**, not stored: `src/data/recipes/*.json` is loaded at build time by
  `src/data/seed.ts`. Editing or deleting a bundled recipe is **copy-on-write** — the edit is saved
  as an override keyed by the same id, and a delete writes a tombstone. `src/lib/merge.ts` merges
  seed ← overrides ← tombstones into the single list the UI renders.
- **Amounts are structured** (`quantity` + `unit`, with `null` meaning "to taste") and every recipe
  declares the `servings` its amounts refer to. That is what makes the portion scaler in the recipe
  view possible; `src/lib/quantity.ts` handles the rounding, vulgar fractions and unit promotion
  (1500 g → 1.5 kg). Scaling never writes back to the recipe.
- **Folders nest arbitrarily** via `Folder.parentId`. Deleting a folder reparents its contents.
- **PWA** via `vite-plugin-pwa`: precached app shell and seed data, offline-capable, installable.

`docs/CONTRACT.md` is the module contract — the API every feature codes against. Read it before
changing a shared signature. `PLAN.md` records the implementation plan and the design decisions.

## Adding recipes to the seed data

Use the `add-recipe` skill (`.claude/skills/add-recipe/SKILL.md`), or write
`src/data/recipes/<slug>.json` by hand and run `npm run validate:recipes`. Reuse existing
ingredient names — the autocomplete and the meal suggester are generated from them.
