import { Link } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'

import { Chip } from '../../components'
import type { Meal, Recipe } from '../../types'

export type ResultCardProps = {
  recipe: Recipe
  /** Object URL from `getImageUrl`; a themed placeholder is shown when absent. */
  imageUrl?: string
  /** The recipe's own ingredient names that matched the filter — the "why". */
  matched?: string[]
  className?: string
}

const MEAL_LABELS: Record<Meal, string> = { lunch: 'Lunch', dinner: 'Dinner' }

const appear = keyframes`
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.99);
  }
  to {
    opacity: 1;
    transform: none;
  }
`

const Card = styled(Link)`
  display: block;
  overflow: hidden;
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadow.md};
  color: inherit;
  text-decoration: none;
  animation: ${appear} 260ms ease-out both;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.focus};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const Media = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  background: ${({ theme }) => theme.color.surfaceAlt};
`

const Photo = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`

const Placeholder = styled.div`
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: ${({ theme }) => theme.color.primary};
  background: ${({ theme }) => theme.color.primarySoft};

  svg {
    width: ${({ theme }) => theme.space.xxl};
    height: ${({ theme }) => theme.space.xxl};
  }
`

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => theme.space.lg};
`

const Name = styled.h2`
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: ${({ theme }) => theme.font.weight.bold};
  color: ${({ theme }) => theme.color.text};
  line-height: 1.25;
`

const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
`

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: ${({ theme }) => theme.space.xs} ${({ theme }) => theme.space.sm};
  background: ${({ theme }) => theme.color.accentSoft};
  color: ${({ theme }) => theme.color.accent};
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: ${({ theme }) => theme.font.weight.medium};
`

const Servings = styled.span`
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.color.textMuted};
`

const MatchedBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};
`

const MatchedTitle = styled.span`
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  color: ${({ theme }) => theme.color.textMuted};
`

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.xs};
`

const Open = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: ${({ theme }) => theme.layout.touch};
  color: ${({ theme }) => theme.color.primary};
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
`

/** Bowl-and-steam glyph, matching the tab bar's "Suggest meal" icon family. */
function PlaceholderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 13h16a8 8 0 0 1-16 0Z" strokeLinejoin="round" />
      <path d="M3 17h18M9 5c0-1 1-1.5 1.5-2M14 5c0-1 1-1.5 1.5-2" strokeLinecap="round" />
    </svg>
  )
}

/** The suggested recipe. The whole card is one link through to `/recipes/:id`. */
export function ResultCard({ recipe, imageUrl, matched = [], className }: ResultCardProps) {
  const meals = recipe.meals ?? []

  return (
    <Card to={`/recipes/${recipe.id}`} className={className} aria-label={`Open ${recipe.name}`}>
      <Media>
        {imageUrl ? (
          <Photo src={imageUrl} alt="" />
        ) : (
          <Placeholder>
            <PlaceholderIcon />
          </Placeholder>
        )}
      </Media>
      <Body>
        <Name>{recipe.name}</Name>
        <Meta>
          {meals.map((meal) => (
            <Badge key={meal}>{MEAL_LABELS[meal]}</Badge>
          ))}
          <Servings>
            Serves {recipe.servings}
          </Servings>
        </Meta>
        {matched.length > 0 && (
          <MatchedBlock>
            <MatchedTitle>Matched ingredients</MatchedTitle>
            <Chips>
              {matched.map((name) => (
                <Chip key={name} label={name} $selected />
              ))}
            </Chips>
          </MatchedBlock>
        )}
        <Open>View recipe →</Open>
      </Body>
    </Card>
  )
}
