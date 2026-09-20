import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import { Chip } from '../../components'
import { useRecipes } from './RecipesProvider'
import type { Meal, Recipe } from '../../types'

export type RecipeCardProps = {
  recipe: Recipe
  /** Small line under the name — used for the folder path in search results. */
  subtitle?: string
  /** Controls rendered next to (never inside) the link, e.g. a "move" button. */
  actions?: ReactNode
  className?: string
}

const MEAL_LABELS: Record<Meal, string> = {
  lunch: 'Lunch',
  dinner: 'Dinner',
}

const Root = styled.article`
  display: flex;
  align-items: stretch;
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadow.sm};
  overflow: hidden;
`

const CardLink = styled(Link)`
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

const Thumb = styled.img`
  flex: 0 0 auto;
  width: ${({ theme }) => theme.layout.touch};
  height: ${({ theme }) => theme.layout.touch};
  object-fit: cover;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surfaceAlt};
`

const Placeholder = styled.span`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ theme }) => theme.layout.touch};
  height: ${({ theme }) => theme.layout.touch};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.primarySoft};
  color: ${({ theme }) => theme.color.primary};

  svg {
    width: ${({ theme }) => theme.font.size.lg};
    height: ${({ theme }) => theme.font.size.lg};
  }
`

const Body = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};
`

const Name = styled.h3`
  font-size: ${({ theme }) => theme.font.size.md};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  line-height: 1.25;
  overflow-wrap: anywhere;
`

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.color.textMuted};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Meta = styled.p`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space.xs} ${({ theme }) => theme.space.sm};
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.color.textMuted};
`

const Badges = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.xs};
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  padding-right: ${({ theme }) => theme.space.xs};
`

/** Total ingredients across every group. */
function countIngredients(recipe: Recipe): number {
  return (recipe.groups ?? []).reduce((total, group) => total + (group.items?.length ?? 0), 0)
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

/** Tappable recipe card linking to the recipe view. */
export function RecipeCard({ recipe, subtitle, actions, className }: RecipeCardProps) {
  const { getImageUrl } = useRecipes()
  const imageUrl = getImageUrl(recipe.imageId)
  const ingredientCount = countIngredients(recipe)

  return (
    <Root className={className}>
      <CardLink to={`/recipes/${recipe.id}`}>
        {imageUrl ? (
          <Thumb src={imageUrl} alt="" loading="lazy" />
        ) : (
          <Placeholder aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 13h16a8 8 0 0 0-16 0Z" strokeLinejoin="round" />
              <path d="M3 17h18" strokeLinecap="round" />
            </svg>
          </Placeholder>
        )}
        <Body>
          <Name>{recipe.name}</Name>
          {subtitle && <Subtitle>{subtitle}</Subtitle>}
          <Meta>
            {recipe.meals.length > 0 && (
              <Badges>
                {recipe.meals.map((meal) => (
                  <Chip key={meal} label={MEAL_LABELS[meal]} />
                ))}
              </Badges>
            )}
            <span>{plural(recipe.servings, 'serving')}</span>
            <span aria-hidden="true">·</span>
            <span>{plural(ingredientCount, 'ingredient')}</span>
          </Meta>
        </Body>
      </CardLink>
      {actions && <Actions>{actions}</Actions>}
    </Root>
  )
}
