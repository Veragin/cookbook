/**
 * The ingredient table of a recipe, rendered at a given scale factor.
 *
 * Amount text comes straight from `formatAmount`, which already contains the unit —
 * unit promotion (1500 g → 1.5 kg) means the unit is part of the formatted string and
 * must never be appended on top of it here.
 */

import styled from 'styled-components'

import { formatAmount } from '../../lib/quantity'
import type { IngredientGroup } from '../../types'

export type IngredientListProps = {
  groups: IngredientGroup[]
  /** Scale factor from `scaleFactor(targetServings, recipe.servings)`. */
  factor: number
  className?: string
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.lg};
`

const Group = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
`

const GroupTitle = styled.h3`
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.bold};
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.textMuted};
`

const Items = styled.ul`
  display: flex;
  flex-direction: column;
`

const Item = styled.li`
  display: grid;
  /* Fixed first column so every amount lines up like a printed recipe. */
  grid-template-columns: minmax(5rem, 26%) 1fr;
  gap: ${({ theme }) => theme.space.md};
  align-items: baseline;
  padding: ${({ theme }) => theme.space.sm} 0;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};

  &:last-child {
    border-bottom: 0;
  }
`

const Amount = styled.span`
  font-size: ${({ theme }) => theme.font.size.md};
  font-weight: ${({ theme }) => theme.font.weight.bold};
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.color.primary};
  overflow-wrap: anywhere;
`

const Body = styled.span`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};
  min-width: 0;
`

const Name = styled.span`
  color: ${({ theme }) => theme.color.text};
  overflow-wrap: anywhere;
`

const Note = styled.span`
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.color.textMuted};
  overflow-wrap: anywhere;
`

/** Ingredient groups at a scale factor. Untitled groups render their items directly. */
export function IngredientList({ groups, factor, className }: IngredientListProps) {
  return (
    <Root className={className}>
      {groups.map((group) => (
        <Group key={group.id} aria-label={group.title}>
          {group.title && <GroupTitle>{group.title}</GroupTitle>}
          <Items>
            {group.items.map((item) => (
              <Item key={item.id}>
                <Amount>{formatAmount(item, factor)}</Amount>
                <Body>
                  <Name>{item.name}</Name>
                  {item.note && <Note>{item.note}</Note>}
                </Body>
              </Item>
            ))}
          </Items>
        </Group>
      ))}
    </Root>
  )
}
