/** Design tokens. Mobile-first, warm kitchen palette, light and dark. */

export type ThemeMode = 'light' | 'dark'

export type ThemeColors = {
  bg: string
  surface: string
  surfaceAlt: string
  border: string
  text: string
  textMuted: string
  primary: string
  primaryHover: string
  primarySoft: string
  /** Text/icon colour on a `primary` fill — never assume `surface` is white. */
  onPrimary: string
  accent: string
  accentSoft: string
  danger: string
  dangerSoft: string
  /** Text/icon colour on a `danger` fill. */
  onDanger: string
  overlay: string
  focus: string
  /** `<meta name="theme-color">` — the browser/PWA chrome around the app. */
  browserChrome: string
}

export type ThemeShadows = {
  sm: string
  md: string
  lg: string
}

/** Everything that does not change between light and dark. */
const base = {
  space: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    xxl: '32px',
  },
  radius: {
    sm: '6px',
    md: '10px',
    lg: '16px',
    pill: '999px',
  },
  font: {
    body: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    size: {
      xs: '12px',
      sm: '14px',
      md: '16px',
      lg: '20px',
      xl: '26px',
    },
    weight: {
      regular: 400,
      medium: 500,
      bold: 700,
    },
  },
  layout: {
    maxWidth: '760px',
    tabBarHeight: '64px',
    /** Minimum comfortable touch target. */
    touch: '44px',
  },
  z: {
    tabBar: 20,
    sheet: 40,
    modal: 50,
    toast: 60,
  },
} as const

export type AppTheme = typeof base & {
  mode: ThemeMode
  color: ThemeColors
  shadow: ThemeShadows
}

export const lightTheme: AppTheme = {
  ...base,
  mode: 'light',
  color: {
    bg: '#fffaf4',
    surface: '#ffffff',
    surfaceAlt: '#fdf2e6',
    border: '#e9dccc',
    text: '#2b2118',
    textMuted: '#7a6a5b',
    primary: '#b4451f',
    primaryHover: '#9a3916',
    primarySoft: '#fbe7dd',
    onPrimary: '#ffffff',
    accent: '#3f6f4a',
    accentSoft: '#e3f0e5',
    danger: '#b3261e',
    dangerSoft: '#fbe4e2',
    onDanger: '#ffffff',
    overlay: 'rgba(43, 33, 24, 0.45)',
    focus: '#2f6fb0',
    browserChrome: '#b4451f',
  },
  shadow: {
    sm: '0 1px 2px rgba(43, 33, 24, 0.08)',
    md: '0 4px 14px rgba(43, 33, 24, 0.12)',
    lg: '0 12px 32px rgba(43, 33, 24, 0.20)',
  },
}

/**
 * Dark palette. Same warm hues, inverted lightness. Two rules keep the shared
 * components working unchanged: `surfaceAlt` stays the *recessed* tone (so the
 * lifted `surface` still reads as raised — segmented control, hover states), and
 * the saturated fills are light, so `onPrimary`/`onDanger` flip to near-black.
 */
export const darkTheme: AppTheme = {
  ...base,
  mode: 'dark',
  color: {
    bg: '#17120f',
    surface: '#221b16',
    surfaceAlt: '#1c1613',
    border: '#3b302a',
    text: '#f3e9de',
    textMuted: '#b3a396',
    primary: '#ff8a5c',
    primaryHover: '#ffa47c',
    primarySoft: '#3a231a',
    onPrimary: '#20140d',
    accent: '#8fd39f',
    accentSoft: '#1e2f24',
    danger: '#ff8a80',
    dangerSoft: '#3a1f1d',
    onDanger: '#2a1210',
    overlay: 'rgba(0, 0, 0, 0.62)',
    focus: '#7db6ec',
    browserChrome: '#221b16',
  },
  /* Shadows carry little on a dark background — they lean on opacity, not hue. */
  shadow: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.5)',
    md: '0 4px 14px rgba(0, 0, 0, 0.55)',
    lg: '0 12px 32px rgba(0, 0, 0, 0.65)',
  },
}

export const themes: Record<ThemeMode, AppTheme> = {
  light: lightTheme,
  dark: darkTheme,
}
