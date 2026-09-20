import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ThemeModeProvider, useThemeMode } from './ThemeModeProvider'
import { THEME_STORAGE_KEY } from './mode'
import { darkTheme } from './theme'

type Listener = (event: MediaQueryListEvent) => void

/** Controllable `prefers-color-scheme` — jsdom has no real media queries. */
function mockMatchMedia(initialDark: boolean) {
  let dark = initialDark
  const listeners = new Set<Listener>()

  window.matchMedia = ((query: string) => ({
    get matches() {
      return query.includes('dark') ? dark : false
    },
    media: query,
    onchange: null,
    addEventListener: (_: string, listener: Listener) => listeners.add(listener),
    removeEventListener: (_: string, listener: Listener) => listeners.delete(listener),
    addListener: (listener: Listener) => listeners.add(listener),
    removeListener: (listener: Listener) => listeners.delete(listener),
    dispatchEvent: () => false,
  })) as typeof window.matchMedia

  return {
    set(next: boolean) {
      dark = next
      act(() => {
        for (const listener of listeners) listener({ matches: next } as MediaQueryListEvent)
      })
    },
  }
}

function Probe() {
  const { mode, preference, setPreference, toggle } = useThemeMode()
  return (
    <div>
      <p data-testid="state">{`${preference}/${mode}`}</p>
      <button onClick={toggle}>toggle</button>
      <button onClick={() => setPreference('system')}>follow system</button>
    </div>
  )
}

const renderProbe = () => render(<ThemeModeProvider><Probe /></ThemeModeProvider>)
const state = () => screen.getByTestId('state').textContent

describe('ThemeModeProvider', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    window.localStorage.clear()
    delete document.documentElement.dataset.theme
  })

  it('follows the system preference when nothing is stored', () => {
    mockMatchMedia(true)
    renderProbe()

    expect(state()).toBe('system/dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
  })

  it('reacts to the system flipping while the preference is "system"', () => {
    const media = mockMatchMedia(false)
    renderProbe()
    expect(state()).toBe('system/light')

    media.set(true)
    expect(state()).toBe('system/dark')
  })

  it('lets a stored preference override the system', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    mockMatchMedia(false)
    renderProbe()

    expect(state()).toBe('dark/dark')
  })

  it('toggles from the effective mode and persists the choice', async () => {
    const user = userEvent.setup()
    mockMatchMedia(true)
    renderProbe()

    // Effective mode is dark (from the system), so the first toggle must go light.
    await user.click(screen.getByRole('button', { name: 'toggle' }))
    expect(state()).toBe('light/light')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')

    await user.click(screen.getByRole('button', { name: 'toggle' }))
    expect(state()).toBe('dark/dark')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('clears the stored choice when handed back to the system', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light')
    mockMatchMedia(true)
    renderProbe()
    expect(state()).toBe('light/light')

    await user.click(screen.getByRole('button', { name: 'follow system' }))
    expect(state()).toBe('system/dark')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
  })

  it('keeps the browser chrome colour in step', () => {
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    meta.content = '#b4451f'
    document.head.append(meta)
    mockMatchMedia(true)

    renderProbe()
    expect(meta.content).toBe(darkTheme.color.browserChrome)

    meta.remove()
  })
})
