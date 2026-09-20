import { IconButton } from '../components'
import { useThemeMode } from '../theme/ThemeModeProvider'

const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <circle cx="12" cy="12" r="4.2" />
    <path
      d="M12 2.8v2.2M12 19v2.2M4.4 4.4l1.6 1.6M18 18l1.6 1.6M2.8 12H5M19 12h2.2M4.4 19.6 6 18M18 6l1.6-1.6"
      strokeLinecap="round"
    />
  </svg>
)

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z" strokeLinejoin="round" />
  </svg>
)

/** Flips the app between the light and dark palettes. Shows the mode it switches to. */
export function ThemeToggle({ className }: { className?: string }) {
  const { mode, toggle } = useThemeMode()
  const label = mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'

  return (
    <IconButton aria-label={label} title={label} onClick={toggle} className={className}>
      {mode === 'dark' ? <SunIcon /> : <MoonIcon />}
    </IconButton>
  )
}
