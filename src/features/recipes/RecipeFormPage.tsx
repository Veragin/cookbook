/**
 * Add / edit recipe.
 *
 * `RecipeFormPage` resolves the route (`/recipes/new?folderId=…` or
 * `/recipes/:id/edit`) and then hands off to `RecipeForm`, which is mounted with a
 * `key` so its initial state is built exactly once per recipe. All mutable state lives
 * in `useRecipeForm`; everything below is presentation, validation feedback and the
 * save/cancel plumbing.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'

import {
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  IconButton,
  Input,
  SegmentedControl,
  Select,
  Spinner,
  Stepper,
  TextArea,
} from '../../components'
import type { Recipe } from '../../types'
import { ImagePicker } from './ImagePicker'
import { IngredientGroupEditor } from './IngredientGroupEditor'
import { flattenFolderOptions } from './folderOptions'
import { useRecipes } from './RecipesProvider'
import {
  MAX_SERVINGS,
  MEAL_OPTIONS,
  MIN_SERVINGS,
  TASTE_OPTIONS,
  formFieldIds,
  useRecipeForm,
} from './useRecipeForm'

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

const Header = styled.header`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  margin-bottom: ${({ theme }) => theme.space.lg};
`

const Title = styled.h1`
  font-size: ${({ theme }) => theme.font.size.xl};
  font-weight: ${({ theme }) => theme.font.weight.bold};
  color: ${({ theme }) => theme.color.text};
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xl};
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

const Fieldset = styled.fieldset`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};
  border: 0;
  padding: 0;
  margin: 0;
`

const Legend = styled.legend`
  padding: 0;
  margin-bottom: ${({ theme }) => theme.space.xs};
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  color: ${({ theme }) => theme.color.text};
`

const Toggles = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.sm};
`

const Toggle = styled.label<{ $checked: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  min-height: ${({ theme }) => theme.layout.touch};
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.lg};
  background: ${({ theme, $checked }) =>
    $checked ? theme.color.primarySoft : theme.color.surface};
  color: ${({ theme, $checked }) => ($checked ? theme.color.primary : theme.color.text)};
  border: 1px solid
    ${({ theme, $checked }) => ($checked ? theme.color.primary : theme.color.border)};
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: ${({ theme }) => theme.font.size.md};
  font-weight: ${({ theme, $checked }) =>
    $checked ? theme.font.weight.bold : theme.font.weight.medium};
  cursor: pointer;

  input {
    width: ${({ theme }) => theme.font.size.md};
    height: ${({ theme }) => theme.font.size.md};
    accent-color: ${({ theme }) => theme.color.primary};
  }

  &:focus-within {
    outline: 2px solid ${({ theme }) => theme.color.focus};
    outline-offset: 1px;
  }
`

const Hint = styled.p`
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.color.textMuted};
`

const ErrorText = styled.p`
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  color: ${({ theme }) => theme.color.danger};
`

const Alert = styled.p`
  padding: ${({ theme }) => theme.space.md};
  background: ${({ theme }) => theme.color.dangerSoft};
  color: ${({ theme }) => theme.color.danger};
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
`

const Steps = styled.ol`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
  list-style: none;
  padding: 0;
  margin: 0;
`

const Step = styled.li`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space.xs};
`

const StepField = styled(Field)`
  flex: 1 1 auto;
  min-width: 0;
`

const StepActions = styled.div`
  display: flex;
  flex-direction: column;
`

const Footer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space.sm};

  > * {
    flex: 1;
  }
`

const SrOnly = styled.div`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
`

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

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

/* ------------------------------------------------------------------ */
/* Route wrapper                                                       */
/* ------------------------------------------------------------------ */

export function RecipeFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { status, getRecipe } = useRecipes()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Stored recipes only exist after hydration, so don't decide "not found" too early.
  if (status === 'loading') {
    return <Spinner label="Loading the recipe…" />
  }

  const recipe = mode === 'edit' && id ? getRecipe(id) : undefined

  if (mode === 'edit' && !recipe) {
    return (
      <EmptyState
        title="Recipe not found"
        description="It may have been deleted on this device."
        action={
          <Button variant="primary" onClick={() => navigate('/recipes')}>
            Back to recipes
          </Button>
        }
      />
    )
  }

  return (
    <RecipeForm
      key={recipe?.id ?? 'new'}
      mode={mode}
      recipe={recipe}
      initialFolderId={searchParams.get('folderId')}
    />
  )
}

/* ------------------------------------------------------------------ */
/* The form itself                                                     */
/* ------------------------------------------------------------------ */

type RecipeFormProps = {
  mode: 'create' | 'edit'
  recipe?: Recipe
  initialFolderId: string | null
}

function RecipeForm({ mode, recipe, initialFolderId }: RecipeFormProps) {
  const navigate = useNavigate()
  const { folders, ingredientNames, createRecipe, updateRecipe, putImage, getImageUrl } =
    useRecipes()

  const form = useRecipeForm({ recipe, initialFolderId })
  const { state, errors } = form

  const [submitting, setSubmitting] = useState(false)
  const [saveError, setSaveError] = useState<string | undefined>(undefined)
  const [announcement, setAnnouncement] = useState('')
  const [confirmLeave, setConfirmLeave] = useState(false)

  const folderOptions = useMemo(() => flattenFolderOptions(folders), [folders])
  const storedUrl = getImageUrl(state.image.kind === 'stored' ? state.image.imageId : undefined)

  const dirty = form.isDirty

  // Reloading or closing the tab mid-edit is the one navigation the router cannot
  // intercept for us, so guard it natively.
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const goBack = useCallback(() => {
    if (mode === 'edit' && recipe) navigate(`/recipes/${recipe.id}`)
    else navigate('/recipes')
  }, [mode, navigate, recipe])

  const requestLeave = useCallback(() => {
    if (dirty) {
      setConfirmLeave(true)
      return
    }
    goBack()
  }, [dirty, goBack])

  const handleSubmit = async () => {
    if (submitting) return
    setSaveError(undefined)

    const result = form.validate()
    if (!result.ok) {
      setAnnouncement(
        `${result.messages.length} ${
          result.messages.length === 1 ? 'problem' : 'problems'
        } to fix before saving: ${result.messages.join(' ')}`,
      )
      const target = document.getElementById(result.firstErrorId)
      target?.focus()
      target?.scrollIntoView({ block: 'center' })
      return
    }

    setAnnouncement('')
    setSubmitting(true)
    try {
      let imageId: string | undefined
      if (state.image.kind === 'stored') imageId = state.image.imageId
      else if (state.image.kind === 'pending') imageId = await putImage(state.image.blob)

      const draft = { ...result.draft, imageId }
      const saved =
        mode === 'edit' && recipe
          ? await updateRecipe(recipe.id, draft)
          : await createRecipe(draft)

      form.markPristine()
      navigate(`/recipes/${saved.id}`, { replace: true })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown error.'
      setSaveError(`Could not save this recipe: ${detail}`)
      setAnnouncement(`Could not save this recipe: ${detail}`)
      setSubmitting(false)
    }
  }

  const mealsErrorId = 'recipe-meals-error'
  const mealsHintId = 'recipe-meals-hint'
  const tasteHintId = 'recipe-taste-hint'

  return (
    <>
      <Header>
        <IconButton aria-label="Back" onClick={requestLeave}>
          <BackIcon />
        </IconButton>
        <Title>{mode === 'edit' ? 'Edit recipe' : 'New recipe'}</Title>
      </Header>

      <SrOnly role="status" aria-live="assertive">
        {announcement}
      </SrOnly>

      <Form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void handleSubmit()
        }}
      >
        {saveError && <Alert role="alert">{saveError}</Alert>}

        <Section>
          <Field label="Name" error={errors.name}>
            <Input
              id={formFieldIds.name}
              type="text"
              autoComplete="off"
              placeholder="Beef goulash"
              disabled={submitting}
              value={state.name}
              onChange={(event) => form.setName(event.target.value)}
            />
          </Field>

          <Field
            label="Portions"
            hint="The base these amounts are written for — scaling on the recipe page works from it."
          >
            <Stepper
              label="Portions"
              min={MIN_SERVINGS}
              max={MAX_SERVINGS}
              disabled={submitting}
              value={state.servings}
              onChange={form.setServings}
            />
          </Field>

          <Fieldset aria-describedby={errors.meals ? mealsErrorId : mealsHintId}>
            <Legend>Meals</Legend>
            <Toggles>
              {MEAL_OPTIONS.map((option) => {
                const checked = state.meals.includes(option.value)
                return (
                  <Toggle key={option.value} $checked={checked}>
                    <input
                      id={formFieldIds.meal(option.value)}
                      type="checkbox"
                      checked={checked}
                      disabled={submitting}
                      onChange={() => form.toggleMeal(option.value)}
                    />
                    {option.label}
                  </Toggle>
                )
              })}
            </Toggles>
            {errors.meals ? (
              <ErrorText id={mealsErrorId} role="alert">
                {errors.meals}
              </ErrorText>
            ) : (
              <Hint id={mealsHintId}>
                Drives the meal suggestions. Pick any combination.
              </Hint>
            )}
          </Fieldset>

          <Fieldset disabled={submitting} aria-describedby={tasteHintId}>
            <Legend>Taste</Legend>
            <SegmentedControl
              id={formFieldIds.taste}
              label="Taste"
              aria-describedby={tasteHintId}
              options={TASTE_OPTIONS}
              value={state.taste}
              onChange={form.setTaste}
            />
            <Hint id={tasteHintId}>Is this a sweet or a salty recipe?</Hint>
          </Fieldset>

          <Field label="Folder" hint="Where this recipe is filed in your cookbook.">
            <Select
              id={formFieldIds.folder}
              disabled={submitting}
              value={state.folderId ?? ''}
              onChange={(event) => form.setFolderId(event.target.value || null)}
            >
              <option value="">No folder (root)</option>
              {folderOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.path}
                </option>
              ))}
            </Select>
          </Field>

          <ImagePicker
            image={state.image}
            storedUrl={storedUrl}
            disabled={submitting}
            onSelect={form.setImage}
            onClear={form.clearImage}
          />
        </Section>

        <Section>
          <SectionTitle>Ingredients</SectionTitle>
          <Hint>
            Leave an amount empty for &quot;to taste&quot;. Amounts scale with the portions set
            above.
          </Hint>
          <IngredientGroupEditor
            groups={state.groups}
            itemErrors={errors.items}
            options={ingredientNames}
            disabled={submitting}
            onAddGroup={form.addGroup}
            onRemoveGroup={form.removeGroup}
            onMoveGroup={form.moveGroup}
            onGroupTitleChange={form.setGroupTitle}
            onAddItem={form.addItem}
            onRemoveItem={form.removeItem}
            onMoveItem={form.moveItem}
            onItemChange={form.updateItem}
          />
        </Section>

        <Section>
          <SectionTitle>Instructions</SectionTitle>
          <Steps>
            {state.instructions.map((step, index) => (
              <Step key={step.id}>
                <StepField
                  label={`Step ${index + 1}`}
                  labelHidden
                  error={index === 0 ? errors.instructions : undefined}
                >
                  <TextArea
                    id={formFieldIds.instruction(step.id)}
                    rows={2}
                    placeholder={`Step ${index + 1}`}
                    disabled={submitting}
                    value={step.text}
                    onChange={(event) => form.updateInstruction(step.id, event.target.value)}
                  />
                </StepField>
                <StepActions>
                  <IconButton
                    aria-label={`Move step ${index + 1} up`}
                    disabled={submitting || index === 0}
                    onClick={() => form.moveInstruction(step.id, -1)}
                  >
                    <UpIcon />
                  </IconButton>
                  <IconButton
                    aria-label={`Move step ${index + 1} down`}
                    disabled={submitting || index === state.instructions.length - 1}
                    onClick={() => form.moveInstruction(step.id, 1)}
                  >
                    <DownIcon />
                  </IconButton>
                  <IconButton
                    variant="danger"
                    aria-label={`Remove step ${index + 1}`}
                    disabled={submitting}
                    onClick={() => form.removeInstruction(step.id)}
                  >
                    <TrashIcon />
                  </IconButton>
                </StepActions>
              </Step>
            ))}
          </Steps>
          <div>
            <Button variant="ghost" size="sm" disabled={submitting} onClick={form.addInstruction}>
              + Add step
            </Button>
          </div>
        </Section>

        <Footer>
          <Button variant="secondary" disabled={submitting} onClick={requestLeave}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save recipe'}
          </Button>
        </Footer>
      </Form>

      <ConfirmDialog
        open={confirmLeave}
        title="Discard your changes?"
        message="This recipe has unsaved changes. Leaving now throws them away."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onConfirm={() => {
          setConfirmLeave(false)
          goBack()
        }}
        onCancel={() => setConfirmLeave(false)}
      />
    </>
  )
}
