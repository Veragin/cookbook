import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ThemeProvider } from 'styled-components'

import { GlobalStyle } from './GlobalStyle'
import {
  DARK_QUERY,
  readPreference,
  resolveMode,
  systemPrefersDark,
  writePreference,
  type ThemePreference,
} from './mode'
import { themes, type ThemeMode } from './theme'

export type ThemeModeApi = {
  /** What the user chose: an explicit mode, or `system`. */
  preference: ThemePreference
  /** The mode actually in effect — `system` already resolved. */
  mode: ThemeMode
  setPreference: (preference: ThemePreference) => void
  /** Flips light ⇄ dark and pins the result (leaves `system`). */
  toggle: () => void
}

const ThemeModeContext = createContext<ThemeModeApi | null>(null)

/** Keeps the browser chrome (iOS status bar, Android toolbar) in step with the theme. */
function syncThemeColor(color: string) {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (meta) meta.content = color
}

/**
 * Owns the light/dark mode: resolves the stored preference against
 * `prefers-color-scheme`, persists explicit choices and provides the
 * styled-components theme. Wrap the app in this instead of `ThemeProvider`.
 */
export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => readPreference())
  const [systemDark, setSystemDark] = useState<boolean>(() => systemPrefersDark())

  /* Follow the OS while (and only while) the preference is `system`. */
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia(DARK_QUERY)
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    query.addEventListener('change', onChange)
    setSystemDark(query.matches)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const mode = resolveMode(preference, systemDark)
  const theme = themes[mode]

  useEffect(() => {
    document.documentElement.dataset.theme = mode
    syncThemeColor(theme.color.browserChrome)
  }, [mode, theme.color.browserChrome])

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next)
    writePreference(next)
  }, [])

  const toggle = useCallback(() => {
    setPreferenceState((current) => {
      const next: ThemePreference =
        resolveMode(current, systemPrefersDark()) === 'dark' ? 'light' : 'dark'
      writePreference(next)
      return next
    })
  }, [])

  const value = useMemo<ThemeModeApi>(
    () => ({ preference, mode, setPreference, toggle }),
    [preference, mode, setPreference, toggle],
  )

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <GlobalStyle />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  )
}

export function useThemeMode(): ThemeModeApi {
  const value = useContext(ThemeModeContext)
  if (!value) throw new Error('useThemeMode must be used inside a ThemeModeProvider')
  return value
}
