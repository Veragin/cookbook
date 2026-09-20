import type { ThemeMode } from './theme'

/** What the user chose. `system` follows `prefers-color-scheme` and keeps following it. */
export type ThemePreference = ThemeMode | 'system'

/**
 * Also read by the inline boot script in `index.html` — it paints the right
 * background before React mounts. Keep the two in sync.
 */
export const THEME_STORAGE_KEY = 'cookbook:theme'

export const DARK_QUERY = '(prefers-color-scheme: dark)'

function isPreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}

/** Stored preference, or `system` when absent or when storage is unavailable. */
export function readPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isPreference(stored) ? stored : 'system'
  } catch {
    // Private-browsing modes can throw on access — fall back, never break boot.
    return 'system'
  }
}

/** Persists the preference. Silently degrades like the rest of the app's storage. */
export function writePreference(preference: ThemePreference): void {
  try {
    if (preference === 'system') window.localStorage.removeItem(THEME_STORAGE_KEY)
    else window.localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    /* not persisted; the session still honours the choice */
  }
}

export function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches
}

export function resolveMode(preference: ThemePreference, systemDark: boolean): ThemeMode {
  if (preference === 'system') return systemDark ? 'dark' : 'light'
  return preference
}
