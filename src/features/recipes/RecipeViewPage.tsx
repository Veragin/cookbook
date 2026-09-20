/**
 * Read-only recipe view at `/recipes/:id`.
 *
 * The portion scaling here is purely presentational: it multiplies what is rendered
 * and never touches the stored recipe, so navigating away resets it.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'

import { IngredientList } from './IngredientList'
import { MAX_PORTIONS, MIN_PORTIONS, ScaleControl } from './ScaleControl'
import { useRecipes } from './RecipesProvider'
import { Button, Chip, ConfirmDialog, EmptyState, Spinner } from '../../components'
import { blobToDataUrl, buildRecipeExport, downloadJson, toFilename } from '../../lib/export'
import { scaleFactor } from '../../lib/quantity'
import type { Meal, Taste } from '../../types'

const MEAL_LABEL: Record<Meal, string> = { lunch: 'Lunch', dinner: 'Dinner', cake: 'Cake' }
const TASTE_LABEL: Record<Taste, string> = { sweet: 'Sweet', salty: 'Salty' }

const Page = styled.article`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xl};
`

const TopBar = styled.div`
  display: flex;
  align-items: center;
`

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.xs};
  min-height: ${({ theme }) => theme.layout.touch};
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.sm};
  margin-left: calc(-1 * ${({ theme }) => theme.space.sm});
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.color.primary};
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  text-decoration: none;

  svg {
    width: ${({ theme }) => theme.font.size.lg};
    height: ${({ theme }) => theme.font.size.lg};
  }
`

const Hero = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  max-height: 60vh;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.surfaceAlt};
  border: 1px solid ${({ theme }) => theme.color.border};

  @media (min-width: 600px) {
    aspect-ratio: 16 / 9;
  }
`

const HeroImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const HeroPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  gap: ${({ theme }) => theme.space.sm};
  color: ${({ theme }) => theme.color.primary};
  background: linear-gradient(
    160deg,
    ${({ theme }) => theme.color.primarySoft},
    ${({ theme }) => theme.color.surfaceAlt}
  );

  svg {
    width: ${({ theme }) => theme.space.xxl};
    height: ${({ theme }) => theme.space.xxl};
    opacity: 0.8;
  }
`

const Header = styled.header`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
`

const Title = styled.h1`
  font-size: ${({ theme }) => theme.font.size.xl};
  font-weight: ${({ theme }) => theme.font.weight.bold};
  line-height: 1.2;
  color: ${({ theme }) => theme.color.text};
  overflow-wrap: anywhere;
`

const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
`

const Serves = styled.span`
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.color.textMuted};
`

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};
`

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: ${({ theme }) => theme.font.weight.bold};
  color: ${({ theme }) => theme.color.text};
`

const Steps = styled.ol`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.lg};
`

const Step = styled.li`
  display: grid;
  grid-template-columns: ${({ theme }) => theme.space.xxl} 1fr;
  gap: ${({ theme }) => theme.space.md};
  align-items: start;
`

const StepNumber = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ theme }) => theme.space.xxl};
  height: ${({ theme }) => theme.space.xxl};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.primarySoft};
  color: ${({ theme }) => theme.color.primary};
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.bold};
  font-variant-numeric: tabular-nums;
`

const StepText = styled.p`
  max-width: 60ch;
  color: ${({ theme }) => theme.color.text};
  overflow-wrap: anywhere;
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.sm};
  padding-top: ${({ theme }) => theme.space.sm};
  border-top: 1px solid ${({ theme }) => theme.color.border};

  > * {
    flex: 1 1 auto;
  }
`

const Centered = styled.div`
  display: grid;
  place-items: center;
  padding: ${({ theme }) => theme.space.xxl};
`

function ChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PlaceholderArt() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M4 11h16a8 8 0 0 1-8 8 8 8 0 0 1-8-8Z" strokeLinejoin="round" />
      <path d="M3 11h18M9 4c0 1.2 1.2 1.6 1.2 2.8M14 4c0 1.2 1.2 1.6 1.2 2.8" strokeLinecap="round" />
    </svg>
  )
}

export function RecipeViewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { status, getRecipe, getImageUrl, getImageBlob, deleteRecipe } = useRecipes()

  const recipe = id ? getRecipe(id) : undefined

  /** `null` = "follow the recipe's own servings". Scaling never leaves this component. */
  const [portions, setPortions] = useState<number | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  // A different recipe (or the data finally arriving) always starts from its own base.
  useEffect(() => {
    setPortions(null)
  }, [id])

  const baseServings = recipe?.servings ?? MIN_PORTIONS
  const targetServings = Math.min(MAX_PORTIONS, Math.max(MIN_PORTIONS, portions ?? baseServings))
  const factor = useMemo(
    () => scaleFactor(targetServings, baseServings),
    [targetServings, baseServings],
  )

  const handleExport = useCallback(async () => {
    if (!recipe) return
    setBusy(true)
    try {
      let image: string | undefined
      if (recipe.imageId) {
        const blob = await getImageBlob(recipe.imageId)
        if (blob) image = await blobToDataUrl(blob)
      }
      downloadJson(toFilename(recipe.name), buildRecipeExport(recipe, image))
    } finally {
      setBusy(false)
    }
  }, [getImageBlob, recipe])

  const handleDelete = useCallback(async () => {
    if (!recipe) return
    setBusy(true)
    try {
      await deleteRecipe(recipe.id)
      setConfirmOpen(false)
      navigate('/recipes', { replace: true })
    } finally {
      setBusy(false)
    }
  }, [deleteRecipe, navigate, recipe])

  if (status === 'loading') {
    return (
      <Centered>
        <Spinner />
      </Centered>
    )
  }

  if (!recipe) {
    return (
      <EmptyState
        title="Recipe not found"
        description="It may have been deleted, or the link is out of date."
        action={<BackLink to="/recipes">Back to all recipes</BackLink>}
      />
    )
  }

  const imageUrl = getImageUrl(recipe.imageId)

  return (
    <Page aria-labelledby="recipe-title">
      <TopBar>
        <BackLink to="/recipes">
          <ChevronLeft />
          All recipes
        </BackLink>
      </TopBar>

      <Hero>
        {imageUrl ? (
          <HeroImage src={imageUrl} alt={recipe.name} />
        ) : (
          <HeroPlaceholder>
            <PlaceholderArt />
          </HeroPlaceholder>
        )}
      </Hero>

      <Header>
        <Title id="recipe-title">{recipe.name}</Title>
        <MetaRow>
          {recipe.meals.map((meal) => (
            <Chip key={meal} label={MEAL_LABEL[meal]} />
          ))}
          <Chip label={TASTE_LABEL[recipe.taste]} />
          <Serves>
            Serves {recipe.servings} {recipe.servings === 1 ? 'portion' : 'portions'}
          </Serves>
        </MetaRow>
      </Header>

      <ScaleControl
        baseServings={baseServings}
        servings={targetServings}
        onChange={setPortions}
        onReset={() => setPortions(null)}
      />

      <Section aria-labelledby="ingredients-heading">
        <SectionTitle id="ingredients-heading">Ingredients</SectionTitle>
        <IngredientList groups={recipe.groups} factor={factor} />
      </Section>

      <Section aria-labelledby="instructions-heading">
        <SectionTitle id="instructions-heading">Instructions</SectionTitle>
        <Steps>
          {recipe.instructions.map((step, index) => (
            <Step key={`${index}-${step.slice(0, 24)}`}>
              <StepNumber aria-hidden="true">{index + 1}</StepNumber>
              <StepText>{step}</StepText>
            </Step>
          ))}
        </Steps>
      </Section>

      <Actions>
        <Button variant="primary" onClick={() => navigate(`/recipes/${recipe.id}/edit`)}>
          Edit
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => void handleExport()}>
          Export JSON
        </Button>
        <Button variant="danger" disabled={busy} onClick={() => setConfirmOpen(true)}>
          Delete
        </Button>
      </Actions>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete recipe?"
        message={`“${recipe.name}” will be removed from your cookbook.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmOpen(false)}
      />
    </Page>
  )
}
