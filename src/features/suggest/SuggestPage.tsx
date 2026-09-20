import { useCallback, useMemo, useState } from 'react'
import styled from 'styled-components'

import { Button, EmptyState, Spinner } from '../../components'
import { useRecipes } from '../recipes/RecipesProvider'
import type { Meal } from '../../types'
import { IngredientPicker } from './IngredientPicker'
import { MealPicker } from './MealPicker'
import { ResultCard } from './ResultCard'
import { findCandidates, matchedIngredients, pickRandom } from './suggest'

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.lg};
`

const Header = styled.header`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};
`

const Title = styled.h1`
  font-size: ${({ theme }) => theme.font.size.xl};
  font-weight: ${({ theme }) => theme.font.weight.bold};
  color: ${({ theme }) => theme.color.text};
`

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.color.textMuted};
`

const Filters = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.lg};
  padding: ${({ theme }) => theme.space.lg};
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadow.sm};
`

const Result = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
  min-height: ${({ theme }) => theme.layout.touch};
`

const Notice = styled.p`
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.color.textMuted};
  text-align: center;
`

const Loading = styled.div`
  display: grid;
  place-items: center;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => theme.space.xxl};
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.font.size.sm};
`

const MEAL_NAMES: Record<Meal, string> = { lunch: 'lunch', dinner: 'dinner', cake: 'cake' }

/** Human summary of the active filters, used in the no-match copy. */
function describeCriteria(meal: Meal | null, ingredients: string[]): string {
  const parts: string[] = []
  if (meal) parts.push(MEAL_NAMES[meal])
  if (ingredients.length > 0) parts.push(ingredients.join(', '))
  return parts.join(' with ')
}

/**
 * "Suggest meal" tab: pick a meal and any number of ingredients, then get a random
 * recipe that satisfies all of it. Pressing the button again suggests a different one.
 */
export function SuggestPage() {
  const { recipes, ingredientNames, getImageUrl, status } = useRecipes()

  const [meal, setMeal] = useState<Meal | null>(null)
  const [ingredients, setIngredients] = useState<string[]>([])
  const [resultId, setResultId] = useState<string | null>(null)
  const [repeated, setRepeated] = useState(false)
  /** Bumped on every pick so the card re-animates even for the same recipe. */
  const [nonce, setNonce] = useState(0)

  const candidates = useMemo(
    () => findCandidates(recipes, { meal, ingredients }),
    [recipes, meal, ingredients],
  )

  // A suggestion only stands while it still satisfies the current filters.
  const result = useMemo(
    () => candidates.find((recipe) => recipe.id === resultId) ?? null,
    [candidates, resultId],
  )

  const matched = useMemo(
    () => (result ? matchedIngredients(result, ingredients) : []),
    [result, ingredients],
  )

  const suggest = useCallback(() => {
    const next = pickRandom(candidates, result?.id)
    if (!next) {
      setResultId(null)
      setRepeated(false)
      return
    }
    setRepeated(result !== null && next.id === result.id)
    setResultId(next.id)
    setNonce((current) => current + 1)
  }, [candidates, result])

  const clearIngredients = useCallback(() => setIngredients([]), [])
  const clearMeal = useCallback(() => setMeal(null), [])

  if (status === 'loading') {
    return (
      <Loading>
        <Spinner label="Loading your cookbook…" />
        <span aria-hidden="true">Loading your cookbook…</span>
      </Loading>
    )
  }

  const hasCandidates = candidates.length > 0

  return (
    <Page>
      <Header>
        <Title>Suggest meal</Title>
        <Subtitle>
          Tell us what you fancy and what you have in, and we&apos;ll pick something for you.
        </Subtitle>
      </Header>

      <Filters aria-label="Suggestion filters">
        <MealPicker value={meal} onChange={setMeal} />
        <IngredientPicker
          values={ingredients}
          onChange={setIngredients}
          options={ingredientNames}
          matchCount={candidates.length}
        />
        <Button
          variant="primary"
          $fullWidth
          onClick={suggest}
          disabled={!hasCandidates}
          aria-disabled={!hasCandidates}
        >
          {result ? 'Suggest another' : 'Suggest a meal'}
        </Button>
      </Filters>

      <Result aria-label="Suggestion" aria-live="polite">
        {!hasCandidates ? (
          <EmptyState
            title="Nothing matches"
            description={`No recipe matches ${describeCriteria(meal, ingredients) || 'those filters'}. Try removing an ingredient or switching the meal.`}
            action={
              ingredients.length > 0 ? (
                <Button onClick={clearIngredients}>Clear ingredients</Button>
              ) : (
                <Button onClick={clearMeal}>Show any meal</Button>
              )
            }
          />
        ) : result ? (
          <>
            <ResultCard
              key={`${result.id}-${nonce}`}
              recipe={result}
              imageUrl={getImageUrl(result.imageId)}
              matched={matched}
            />
            {repeated && (
              <Notice>
                That&apos;s the only recipe matching your filters — here it is again.
              </Notice>
            )}
          </>
        ) : (
          <EmptyState
            title="Ready when you are"
            description={`Press “Suggest a meal” and we'll pick ${
              candidates.length === 1
                ? 'the only matching recipe'
                : `one of the ${candidates.length} matching recipes at random`
            }.`}
          />
        )}
      </Result>
    </Page>
  )
}
