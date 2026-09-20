import type { ReactNode } from 'react'
import styled from 'styled-components'

import { TabBar } from './TabBar'
import { ThemeToggle } from './ThemeToggle'
import { useRecipes } from '../features/recipes/RecipesProvider'

const Shell = styled.div`
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
`

/** Full-width strip for app-level controls; its content tracks `Main`'s column. */
const TopBar = styled.header`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.maxWidth};
  margin: 0 auto;
  display: flex;
  justify-content: flex-end;
  padding: 0 ${({ theme }) => theme.space.lg};
  padding-top: calc(${({ theme }) => theme.space.sm} + env(safe-area-inset-top));
`

const Main = styled.main`
  flex: 1;
  width: 100%;
  max-width: ${({ theme }) => theme.layout.maxWidth};
  margin: 0 auto;
  padding: ${({ theme }) => theme.space.lg};
  padding-top: ${({ theme }) => theme.space.sm};
  padding-bottom: calc(
    ${({ theme }) => theme.layout.tabBarHeight} + ${({ theme }) => theme.space.xl} +
      env(safe-area-inset-bottom)
  );
`

const Banner = styled.div`
  background: ${({ theme }) => theme.color.dangerSoft};
  color: ${({ theme }) => theme.color.danger};
  font-size: ${({ theme }) => theme.font.size.sm};
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.lg};
  text-align: center;
  padding-top: calc(${({ theme }) => theme.space.sm} + env(safe-area-inset-top));
`

const Loading = styled.div`
  flex: 1;
  display: grid;
  place-items: center;
  color: ${({ theme }) => theme.color.textMuted};
  padding: ${({ theme }) => theme.space.xxl};
`

export function AppShell({ children }: { children: ReactNode }) {
  const { status } = useRecipes()

  return (
    <Shell>
      {status === 'degraded' && (
        <Banner role="status">
          Storage is unavailable — changes made now won&apos;t be saved.
        </Banner>
      )}
      <TopBar>
        <ThemeToggle />
      </TopBar>
      {status === 'loading' ? <Loading>Loading your cookbook…</Loading> : <Main>{children}</Main>}
      <TabBar />
    </Shell>
  )
}
