import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import type { Folder } from '../../types'

export type FolderRowProps = {
  folder: Folder
  /** Recipes inside this folder *including* every nested subfolder. */
  recipeCount: number
  /** Overflow menu / controls, rendered next to (never inside) the link. */
  actions?: ReactNode
  className?: string
}

const Root = styled.div`
  display: flex;
  align-items: stretch;
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  overflow: hidden;
`

const RowLink = styled(Link)`
  flex: 1;
  min-width: 0;
  min-height: ${({ theme }) => theme.layout.touch};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => theme.space.md};
  color: ${({ theme }) => theme.color.text};
  text-decoration: none;

  &:hover {
    background: ${({ theme }) => theme.color.surfaceAlt};
  }
`

const Icon = styled.span`
  display: inline-flex;
  color: ${({ theme }) => theme.color.primary};

  svg {
    width: ${({ theme }) => theme.font.size.lg};
    height: ${({ theme }) => theme.font.size.lg};
  }
`

const Text = styled.span`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};
`

const Name = styled.span`
  font-size: ${({ theme }) => theme.font.size.md};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  overflow-wrap: anywhere;
`

const Count = styled.span`
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.color.textMuted};
`

const Chevron = styled.span`
  display: inline-flex;
  color: ${({ theme }) => theme.color.textMuted};

  svg {
    width: ${({ theme }) => theme.font.size.md};
    height: ${({ theme }) => theme.font.size.md};
  }
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  padding-right: ${({ theme }) => theme.space.xs};
`

/** Tappable folder row linking into the folder, with an optional overflow menu. */
export function FolderRow({ folder, recipeCount, actions, className }: FolderRowProps) {
  return (
    <Root className={className}>
      <RowLink to={`/recipes/folder/${folder.id}`}>
        <Icon aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path
              d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.5h9A1.5 1.5 0 0 1 21 10v7.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z"
              strokeLinejoin="round"
            />
          </svg>
        </Icon>
        <Text>
          <Name>{folder.name}</Name>
          <Count>
            {recipeCount} {recipeCount === 1 ? 'recipe' : 'recipes'}
          </Count>
        </Text>
        <Chevron aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Chevron>
      </RowLink>
      {actions && <Actions>{actions}</Actions>}
    </Root>
  )
}
