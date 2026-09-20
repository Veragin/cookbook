import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import { ThemeToggle } from './ThemeToggle'
import { ThemeModeProvider } from '../theme/ThemeModeProvider'
import { THEME_STORAGE_KEY } from '../theme/mode'
import { darkTheme, lightTheme } from '../theme/theme'

describe('ThemeToggle', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  it('switches the palette and names the mode it switches to', async () => {
    const user = userEvent.setup()
    render(
      <ThemeModeProvider>
        <ThemeToggle />
      </ThemeModeProvider>,
    )

    // jsdom's matchMedia shim reports light.
    const toDark = screen.getByRole('button', { name: 'Switch to dark theme' })
    expect(toDark).toHaveStyle({ color: lightTheme.color.text })

    await user.click(toDark)

    const toLight = screen.getByRole('button', { name: 'Switch to light theme' })
    expect(toLight).toHaveStyle({ color: darkTheme.color.text })
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })
})
