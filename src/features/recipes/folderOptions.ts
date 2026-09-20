import type { Folder } from '../../types'

export type FolderOption = {
  id: string
  name: string
  /** Nesting depth, 0 for root-level folders. */
  depth: number
  /** Full path, e.g. "Main dishes / Pasta". */
  path: string
  /** Path indented for use as a <Select> option label. */
  label: string
}

const INDENT = '  '

/**
 * Flattens the folder tree into a depth-first list suitable for pickers.
 * Cycle-safe: a folder is emitted at most once.
 */
export function flattenFolderOptions(folders: Folder[]): FolderOption[] {
  const byParent = new Map<string | null, Folder[]>()
  for (const folder of folders) {
    const siblings = byParent.get(folder.parentId) ?? []
    siblings.push(folder)
    byParent.set(folder.parentId, siblings)
  }
  for (const siblings of byParent.values()) {
    siblings.sort((a, b) => a.name.localeCompare(b.name))
  }

  const out: FolderOption[] = []
  const seen = new Set<string>()

  const walk = (parentId: string | null, depth: number, prefix: string) => {
    for (const folder of byParent.get(parentId) ?? []) {
      if (seen.has(folder.id)) continue
      seen.add(folder.id)
      const path = prefix ? `${prefix} / ${folder.name}` : folder.name
      out.push({
        id: folder.id,
        name: folder.name,
        depth,
        path,
        label: INDENT.repeat(depth) + folder.name,
      })
      walk(folder.id, depth + 1, path)
    }
  }

  walk(null, 0, '')
  return out
}

/** Direct children of `parentId`, sorted by name. */
export function childFolders(folders: Folder[], parentId: string | null): Folder[] {
  return folders
    .filter((folder) => folder.parentId === parentId)
    .sort((a, b) => a.name.localeCompare(b.name))
}
