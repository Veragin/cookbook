/**
 * The ingredients section of the recipe form: an ordered list of groups
 * ("Dough", "Filling", …), each holding an ordered list of {@link IngredientRow}s.
 *
 * A recipe with no sub-sections simply has one untitled group, which renders exactly
 * like a plain ingredient list.
 */

import { useState } from 'react'
import styled from 'styled-components'

import { Button, ConfirmDialog, Field, IconButton, Input } from '../../components'
import { IngredientRow } from './IngredientRow'
import { formFieldIds } from './useRecipeForm'
import type { FormGroup, FormIngredient, ItemErrors } from './useRecipeForm'

export type IngredientGroupEditorProps = {
  groups: FormGroup[]
  /** Keyed by ingredient id. */
  itemErrors: Record<string, ItemErrors>
  options: readonly string[]
  disabled?: boolean
  onAddGroup: () => void
  onRemoveGroup: (groupId: string) => void
  onMoveGroup: (groupId: string, delta: number) => void
  onGroupTitleChange: (groupId: string, title: string) => void
  onAddItem: (groupId: string) => void
  onRemoveItem: (groupId: string, itemId: string) => void
  onMoveItem: (groupId: string, itemId: string, delta: number) => void
  onItemChange: (
    groupId: string,
    itemId: string,
    patch: Partial<Omit<FormIngredient, 'id'>>,
  ) => void
}

const List = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.lg};
  list-style: none;
  padding: 0;
  margin: 0;
`

const GroupCard = styled.li`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => theme.space.md};
  background: ${({ theme }) => theme.color.surfaceAlt};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.lg};
`

const GroupHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space.xs};
`

const TitleField = styled(Field)`
  flex: 1 1 auto;
  min-width: 0;
`

const Rows = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
  list-style: none;
  padding: 0;
  margin: 0;
`

const Empty = styled.p`
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.font.size.sm};
`

const GroupActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.sm};
`

function UpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 19V5M6 11l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 5v14M6 13l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 7h16M10 11v6M14 11v6" strokeLinecap="round" />
      <path
        d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Human label for a group, used for the icon buttons' accessible names. */
function groupLabel(group: FormGroup, index: number): string {
  const title = group.title.trim()
  return title !== '' ? `group ${title}` : `group ${index + 1}`
}

export function IngredientGroupEditor({
  groups,
  itemErrors,
  options,
  disabled = false,
  onAddGroup,
  onRemoveGroup,
  onMoveGroup,
  onGroupTitleChange,
  onAddItem,
  onRemoveItem,
  onMoveItem,
  onItemChange,
}: IngredientGroupEditorProps) {
  const [pendingRemoval, setPendingRemoval] = useState<FormGroup | null>(null)
  const multipleGroups = groups.length > 1

  const requestRemoveGroup = (group: FormGroup) => {
    const hasContent = group.items.some(
      (item) => item.name.trim() !== '' || item.quantity.trim() !== '',
    )
    if (hasContent) {
      setPendingRemoval(group)
      return
    }
    onRemoveGroup(group.id)
  }

  return (
    <>
      <List>
        {groups.map((group, groupIndex) => {
          const label = groupLabel(group, groupIndex)
          return (
            <GroupCard key={group.id}>
              <GroupHeader>
                <TitleField label={`Title for ${label}`} labelHidden>
                  <Input
                    id={formFieldIds.groupTitle(group.id)}
                    type="text"
                    autoComplete="off"
                    placeholder="Group title (optional)"
                    disabled={disabled}
                    value={group.title}
                    onChange={(event) => onGroupTitleChange(group.id, event.target.value)}
                  />
                </TitleField>
                <IconButton
                  aria-label={`Move ${label} up`}
                  disabled={disabled || groupIndex === 0}
                  onClick={() => onMoveGroup(group.id, -1)}
                >
                  <UpIcon />
                </IconButton>
                <IconButton
                  aria-label={`Move ${label} down`}
                  disabled={disabled || groupIndex === groups.length - 1}
                  onClick={() => onMoveGroup(group.id, 1)}
                >
                  <DownIcon />
                </IconButton>
                <IconButton
                  variant="danger"
                  aria-label={`Remove ${label}`}
                  disabled={disabled}
                  onClick={() => requestRemoveGroup(group)}
                >
                  <TrashIcon />
                </IconButton>
              </GroupHeader>

              {group.items.length === 0 ? (
                <Empty>No ingredients in this group yet.</Empty>
              ) : (
                <Rows>
                  {group.items.map((item, itemIndex) => (
                    <IngredientRow
                      key={item.id}
                      item={item}
                      rowLabel={
                        multipleGroups
                          ? `Ingredient ${itemIndex + 1} of ${label}`
                          : `Ingredient ${itemIndex + 1}`
                      }
                      errors={itemErrors[item.id]}
                      options={options}
                      canMoveUp={itemIndex > 0}
                      canMoveDown={itemIndex < group.items.length - 1}
                      disabled={disabled}
                      onChange={(patch) => onItemChange(group.id, item.id, patch)}
                      onRemove={() => onRemoveItem(group.id, item.id)}
                      onMove={(delta) => onMoveItem(group.id, item.id, delta)}
                    />
                  ))}
                </Rows>
              )}

              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  onClick={() => onAddItem(group.id)}
                >
                  + Add ingredient{multipleGroups ? ` to ${label}` : ''}
                </Button>
              </div>
            </GroupCard>
          )
        })}
      </List>

      <GroupActions>
        <Button variant="secondary" size="sm" disabled={disabled} onClick={onAddGroup}>
          + Add ingredient group
        </Button>
      </GroupActions>

      <ConfirmDialog
        open={pendingRemoval !== null}
        title="Remove this group?"
        message={
          pendingRemoval
            ? `"${pendingRemoval.title.trim() || 'Untitled group'}" and its ${
                pendingRemoval.items.length
              } ingredient line(s) will be removed from the form.`
            : ''
        }
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          if (pendingRemoval) onRemoveGroup(pendingRemoval.id)
          setPendingRemoval(null)
        }}
        onCancel={() => setPendingRemoval(null)}
      />
    </>
  )
}
