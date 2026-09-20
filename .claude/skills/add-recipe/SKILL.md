---
name: add-recipe
description: Use when adding or creating a new recipe (or seed recipe file) in the cookbook's data folder, i.e. a new src/data/recipes/<slug>.json.
---

# Add a recipe to the seed data

One recipe = one file at `src/data/recipes/<slug>.json`. Never edit `src/lib`,
`src/features` or the loader — the seed loader derives ids, `origin`, timestamps
and `imageId` from the file. Work through the steps in order.

## 1. Pick the slug and folder

- `slug` = the filename stem, lowercase, hyphenated, unique across the folder.
  `src/data/recipes/beef-goulash.json` → `"slug": "beef-goulash"`.
- `folderId` must be an existing id from `src/data/folders.json`, or `null` for
  the root level. List the available folders first:

```bash
jq -r '.[] | "\(.id)\t\(.name)\tparent=\(.parentId)"' src/data/folders.json
```

Only add a folder if the user asked for one; new folders need a slug `id`, a
human `name`, and a `parentId` (`null` = root, folders nest arbitrarily deep).

## 2. REUSE existing ingredient names (mandatory)

The ingredient autocomplete and the "suggest a meal" filter are built from these
strings, so a new spelling silently breaks matching. Always check the existing
vocabulary before inventing a name:

```bash
# every ingredient name already in use, with how many recipes use it
jq -r '[.groups[].items[].name] | unique | .[]' src/data/recipes/*.json \
  | sort | uniq -c | sort -rn
```

- Reuse an existing name verbatim whenever it means the same thing
  (`onion`, `garlic`, `olive oil`, `butter`, `flour`, `egg`, `milk`, `salt`,
  `black pepper`, …).
- Names must be **lowercase and singular** — `egg`, not `Eggs`.
- Put the preparation in `note`, not the name: `{"name": "onion", "note": "finely diced"}`,
  never `"finely diced onion"`.

## 3. Write the file

Exact shape — copy this and replace the values:

```jsonc
{
  "slug": "beef-goulash",            // == filename stem, unique
  "name": "Beef Goulash",            // human title, any capitalisation
  "folderId": "mains-soups",         // folder id from folders.json, or null
  "servings": 6,                     // integer >= 1; the BASE all quantities refer to
  "meals": ["lunch", "dinner"],      // non-empty subset of lunch | dinner | cake
  "taste": "salty",                  // exactly one of sweet | salty
  "groups": [
    {
      "title": "Stew",               // OMIT the key entirely for ungrouped items
      "items": [
        { "name": "beef shoulder", "quantity": 800, "unit": "g", "note": "cubed" },
        { "name": "onion", "quantity": 3, "unit": "pcs", "note": "sliced" },
        { "name": "beef stock", "quantity": 1.5, "unit": "l" },
        { "name": "smoked paprika", "quantity": 0.5, "unit": "tbsp" },
        { "name": "salt", "quantity": null, "unit": null }   // "to taste"
      ]
    },
    {
      "title": "To serve",
      "items": [{ "name": "parsley", "quantity": 3, "unit": "tbsp", "note": "chopped" }]
    }
  ],
  "instructions": [
    "Brown the beef in batches and set aside.",
    "Soften the onion, then stir in the paprika off the heat.",
    "Return the beef with the stock and simmer covered for 90 minutes."
  ]
}
```

Field rules:

- **`unit`** — exactly one of `g`, `kg`, `ml`, `l`, `tsp`, `tbsp`, `cup`, `pcs`,
  `pinch`, or `null`. This is `UNITS` in `src/types.ts`; nothing else is legal
  (no `oz`, `clove`, `slice` — use `pcs` plus a `note`).
- **`quantity`** — a positive number, or `null` for "to taste" (salt, pepper).
  `null` never scales and must be paired with `"unit": null`. Fractions are
  written as decimals (`0.5 tsp`, `1.5 tsp`).
- **`meals`** — which slots the recipe is offered for in "Suggest meal". `cake` is
  for bakes and desserts; a cake-only recipe never shows up under lunch or dinner,
  so list `["lunch", "cake"]` when it works as both.
- **`taste`** — `"sweet"` or `"salty"`, required, exactly one. This is `TASTES` in
  `src/types.ts` (`MEALS` lives right above it).
- **`servings`** — the base the quantities are written for. The UI scales every
  non-null quantity by `target / servings`, so write honest base amounts and
  prefer the smaller unit (`800 g`, not `0.8 kg`) — the formatter promotes
  upward on its own.
- **`groups`** — at least one, each with at least one item. Use titled groups
  ("Dough" / "Filling" / "Sauce") only when the recipe really has components;
  otherwise use a single group with no `title` key.
- **`instructions`** — 4 to 8 imperative sentences, no `1.` / `-` / `*` prefixes;
  the UI numbers them.
- **Never include** `id`, `origin`, `createdAt`, `updatedAt` or `imageId`, and no
  `id` on groups or items either — the loader derives them.

## 4. Validate (mandatory, do not skip)

```bash
npm run validate:recipes
```

It prints one `file: message` line per problem and exits 1. Fix every reported
line and re-run until it prints the `OK — N recipes, …` summary. Done only then.
