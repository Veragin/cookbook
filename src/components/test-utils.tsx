import { render, type RenderOptions, type RenderResult } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { ThemeProvider } from 'styled-components'

import { themes, type ThemeMode } from '../theme/theme'

/** Wraps a tree in the app `ThemeProvider` — styled-components needs it or every token is undefined. */
export function ThemeWrapper({
  children,
  mode = 'light',
}: {
  children: ReactNode
  mode?: ThemeMode
}) {
  return <ThemeProvider theme={themes[mode]}>{children}</ThemeProvider>
}

/** `render` from @testing-library/react with the app theme already in place. */
export function renderWithTheme(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { mode?: ThemeMode },
): RenderResult {
  const { mode = 'light', ...rest } = options ?? {}
  return render(ui, {
    wrapper: ({ children }) => <ThemeWrapper mode={mode}>{children}</ThemeWrapper>,
    ...rest,
  })
}
