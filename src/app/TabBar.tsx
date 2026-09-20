import { NavLink, useLocation } from 'react-router-dom'
import styled from 'styled-components'

const Bar = styled.nav`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: ${({ theme }) => theme.z.tabBar};
  display: flex;
  background: ${({ theme }) => theme.color.surface};
  border-top: 1px solid ${({ theme }) => theme.color.border};
  padding-bottom: env(safe-area-inset-bottom);
  box-shadow: ${({ theme }) => theme.shadow.sm};
`

const Tab = styled(NavLink)<{ $active: boolean }>`
  flex: 1;
  min-height: ${({ theme }) => theme.layout.tabBarHeight};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space.xs};
  text-decoration: none;
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  color: ${({ theme, $active }) => ($active ? theme.color.primary : theme.color.textMuted)};

  svg {
    width: 24px;
    height: 24px;
  }
`

export function TabBar() {
  const { pathname } = useLocation()
  const onRecipes = pathname === '/' || pathname.startsWith('/recipes')
  const onSuggest = pathname.startsWith('/suggest')

  return (
    <Bar aria-label="Main">
      <Tab to="/recipes" $active={onRecipes} aria-current={onRecipes ? 'page' : undefined}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H18a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.5.5H6a2 2 0 0 1-2-2z" />
          <path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" />
        </svg>
        Recipes
      </Tab>
      <Tab to="/suggest" $active={onSuggest} aria-current={onSuggest ? 'page' : undefined}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M4 13h16a8 8 0 0 0-16 0Z" strokeLinejoin="round" />
          <path d="M3 17h18M9 5c0-1 1-1.5 1.5-2M14 5c0-1 1-1.5 1.5-2" strokeLinecap="round" />
        </svg>
        Suggest meal
      </Tab>
    </Bar>
  )
}
