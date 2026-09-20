import { useMemo } from 'react'
import styled from 'styled-components'

import { Sheet } from '../../components'
import { flattenFolderOptions } from './folderOptions'
import { useRecipes } from './RecipesProvider'

export type FolderPickerProps = {
  open: boolean
  /** Folder the item currently lives in; `null` is the root. Marked as current. */
  currentFolderId: string | null
  /** Sheet heading. Defaults to `Move to folder`. */
  title?: string
  onSelect: (folderId: string | null) => void
  onClose: () => void
}

const List = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};
  list-style: none;
  margin: 0;
  padding: 0;
`

const Option = styled.button<{ $depth: number; $current: boolean }>`
  width: 100%;
  min-height: ${({ theme }) => theme.layout.touch};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  padding-left: ${({ theme, $depth }) =>
    `calc(${theme.space.md} + ${$depth} * ${theme.space.lg})`};
  background: ${({ theme, $current }) =>
    $current ? theme.color.primarySoft : theme.color.surface};
  color: ${({ theme, $current }) => ($current ? theme.color.primary : theme.color.text)};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.md};
  font-family: ${({ theme }) => theme.font.body};
  font-size: ${({ theme }) => theme.font.size.md};
  text-align: left;

  &:hover {
    background: ${({ theme, $current }) =>
      $current ? theme.color.primarySoft : theme.color.surfaceAlt};
  }
`

const Label = styled.span`
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
`

const Badge = styled.span`
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.color.textMuted};
`

/**
 * Bottom sheet listing every folder (plus the root) so an item can be moved.
 * Self-contained: it reads the folder tree from the provider itself.
 */
export function FolderPicker({
  open,
  currentFolderId,
  title = 'Move to folder',
  onSelect,
  onClose,
}: FolderPickerProps) {
  const { folders } = useRecipes()
  const options = useMemo(() => flattenFolderOptions(folders), [folders])

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <List>
        <li>
          <Option
            type="button"
            $depth={0}
            $current={currentFolderId === null}
            aria-current={currentFolderId === null ? 'true' : undefined}
            onClick={() => onSelect(null)}
          >
            <Label>No folder (root)</Label>
            {currentFolderId === null && <Badge>Current</Badge>}
          </Option>
        </li>
        {options.map((option) => {
          const current = option.id === currentFolderId
          return (
            <li key={option.id}>
              <Option
                type="button"
                $depth={option.depth + 1}
                $current={current}
                aria-current={current ? 'true' : undefined}
                onClick={() => onSelect(option.id)}
              >
                <Label>{option.name}</Label>
                {current && <Badge>Current</Badge>}
              </Option>
            </li>
          )
        })}
      </List>
    </Sheet>
  )
}
