import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'

import { Button, EmptyState, IconButton } from '../../components'
import { folderDescendants, folderPath } from '../../lib/merge'
import { searchRecipes } from '../../lib/search'
import { FolderActions } from './FolderActions'
import { FolderPicker } from './FolderPicker'
import { FolderRow } from './FolderRow'
import { RecipeCard } from './RecipeCard'
import { SearchBar } from './SearchBar'
import { childFolders, flattenFolderOptions } from './folderOptions'
import { useRecipes } from './RecipesProvider'
import type { Recipe } from '../../types'

const ROOT_LABEL = 'Recipes'

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.lg};
`

const Crumbs = styled.nav`
  font-size: ${({ theme }) => theme.font.size.sm};
`

const CrumbList = styled.ol`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space.xs};
  list-style: none;
  margin: 0;
  padding: 0;
`

const Crumb = styled.li`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.xs};
  color: ${({ theme }) => theme.color.textMuted};
`

const CrumbLink = styled(Link)<{ $current: boolean }>`
  display: inline-flex;
  align-items: center;
  min-height: ${({ theme }) => theme.space.xxl};
  color: ${({ theme, $current }) => ($current ? theme.color.text : theme.color.primary)};
  font-weight: ${({ theme, $current }) =>
    $current ? theme.font.weight.medium : theme.font.weight.regular};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
`

const Title = styled.h1`
  flex: 1;
  min-width: 0;
  font-size: ${({ theme }) => theme.font.size.xl};
  font-weight: ${({ theme }) => theme.font.weight.bold};
  overflow-wrap: anywhere;
`

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
`

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  color: ${({ theme }) => theme.color.textMuted};
  text-transform: uppercase;
`

const List = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
  list-style: none;
  margin: 0;
  padding: 0;
`

const ResultCount = styled.p`
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.color.textMuted};
`

const ErrorText = styled.p`
  color: ${({ theme }) => theme.color.danger};
  font-size: ${({ theme }) => theme.font.size.sm};
`

/** Recipe list for the root route and for a single folder, plus flat search results. */
export function RecipeListPage() {
  const { folderId } = useParams<{ folderId: string }>()
  const navigate = useNavigate()
  const { folders, recipes, getFolder, moveRecipe } = useRecipes()

  const [query, setQuery] = useState('')
  const [moving, setMoving] = useState<Recipe | null>(null)
  const [error, setError] = useState<string | null>(null)

  const currentFolderId = folderId ?? null
  const currentFolder = currentFolderId ? (getFolder(currentFolderId) ?? null) : null

  const trimmedQuery = query.trim()
  const searching = trimmedQuery !== ''

  const crumbs = useMemo(
    () => (currentFolderId ? folderPath(folders, currentFolderId) : []),
    [folders, currentFolderId],
  )

  const visibleFolders = useMemo(
    () => childFolders(folders, currentFolderId),
    [folders, currentFolderId],
  )

  const visibleRecipes = useMemo(
    () => recipes.filter((recipe) => (recipe.folderId ?? null) === currentFolderId),
    [recipes, currentFolderId],
  )

  /** Recipe total for a folder, counting every nested subfolder. */
  const countFor = useMemo(() => {
    return (id: string): number => {
      const subtree = new Set([id, ...folderDescendants(folders, id)])
      return recipes.filter((recipe) => recipe.folderId !== null && subtree.has(recipe.folderId))
        .length
    }
  }, [folders, recipes])

  /** Folder id → human-readable path, used as the subtitle of a search result. */
  const pathById = useMemo(() => {
    const map = new Map<string, string>()
    for (const option of flattenFolderOptions(folders)) map.set(option.id, option.path)
    return map
  }, [folders])

  const results = useMemo(
    () => (searching ? searchRecipes(recipes, trimmedQuery) : []),
    [recipes, searching, trimmedQuery],
  )

  const folderPathLabel = (recipe: Recipe): string =>
    (recipe.folderId ? pathById.get(recipe.folderId) : undefined) ?? ROOT_LABEL

  const handleAdd = () => {
    navigate(
      currentFolderId
        ? `/recipes/new?folderId=${encodeURIComponent(currentFolderId)}`
        : '/recipes/new',
    )
  }

  const handleMove = async (target: string | null) => {
    const recipe = moving
    setMoving(null)
    if (!recipe) return
    setError(null)
    try {
      await moveRecipe(recipe.id, target)
    } catch {
      setError(`Could not move ${recipe.name}.`)
    }
  }

  const moveButton = (recipe: Recipe) => (
    <IconButton aria-label={`Move ${recipe.name}`} onClick={() => setMoving(recipe)}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path
          d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.5h9A1.5 1.5 0 0 1 21 10v7.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z"
          strokeLinejoin="round"
        />
        <path d="M12 16.5v-5m0 0-2 2m2-2 2 2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </IconButton>
  )

  const cookbookEmpty = recipes.length === 0 && folders.length === 0
  const folderEmpty = visibleFolders.length === 0 && visibleRecipes.length === 0

  return (
    <Page>
      <Crumbs aria-label="Breadcrumb">
        <CrumbList>
          <Crumb>
            <CrumbLink
              to="/recipes"
              $current={currentFolderId === null}
              aria-current={currentFolderId === null ? 'page' : undefined}
            >
              {ROOT_LABEL}
            </CrumbLink>
          </Crumb>
          {crumbs.map((folder, index) => {
            const isCurrent = index === crumbs.length - 1
            return (
              <Crumb key={folder.id}>
                <span aria-hidden="true">/</span>
                <CrumbLink
                  to={`/recipes/folder/${folder.id}`}
                  $current={isCurrent}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  {folder.name}
                </CrumbLink>
              </Crumb>
            )
          })}
        </CrumbList>
      </Crumbs>

      <TitleRow>
        <Title>{currentFolder?.name ?? ROOT_LABEL}</Title>
        <FolderActions
          folder={currentFolder}
          onDeleted={(parentId) =>
            navigate(parentId ? `/recipes/folder/${parentId}` : '/recipes', { replace: true })
          }
        />
        <Button variant="primary" onClick={handleAdd}>
          Add recipe
        </Button>
      </TitleRow>

      <SearchBar value={query} onChange={setQuery} />

      {error && <ErrorText role="alert">{error}</ErrorText>}

      {searching ? (
        <Section aria-label="Search results">
          <ResultCount role="status">
            {results.length} {results.length === 1 ? 'result' : 'results'} for “{trimmedQuery}”
          </ResultCount>
          {results.length === 0 ? (
            <EmptyState
              title="No recipes found"
              description={`Nothing matches “${trimmedQuery}”. Try another name or ingredient.`}
              action={<Button onClick={() => setQuery('')}>Show all recipes</Button>}
            />
          ) : (
            <List>
              {results.map((recipe) => (
                <li key={recipe.id}>
                  <RecipeCard
                    recipe={recipe}
                    subtitle={folderPathLabel(recipe)}
                    actions={moveButton(recipe)}
                  />
                </li>
              ))}
            </List>
          )}
        </Section>
      ) : (
        <>
          {visibleFolders.length > 0 && (
            <Section aria-label="Folders">
              <SectionTitle>Folders</SectionTitle>
              <List>
                {visibleFolders.map((folder) => (
                  <li key={folder.id}>
                    <FolderRow
                      folder={folder}
                      recipeCount={countFor(folder.id)}
                      actions={<FolderActions folder={folder} />}
                    />
                  </li>
                ))}
              </List>
            </Section>
          )}

          {visibleRecipes.length > 0 && (
            <Section aria-label="Recipes">
              <SectionTitle>Recipes</SectionTitle>
              <List>
                {visibleRecipes.map((recipe) => (
                  <li key={recipe.id}>
                    <RecipeCard recipe={recipe} actions={moveButton(recipe)} />
                  </li>
                ))}
              </List>
            </Section>
          )}

          {folderEmpty &&
            (cookbookEmpty ? (
              <EmptyState
                title="Your cookbook is empty"
                description="Add your first recipe and it will show up here."
                action={
                  <Button variant="primary" onClick={handleAdd}>
                    Add recipe
                  </Button>
                }
              />
            ) : (
              <EmptyState
                title="This folder is empty"
                description="Add a recipe here, or create a subfolder to organise things further."
                action={
                  <Button variant="primary" onClick={handleAdd}>
                    Add recipe
                  </Button>
                }
              />
            ))}
        </>
      )}

      <FolderPicker
        open={moving !== null}
        currentFolderId={moving?.folderId ?? null}
        title={moving ? `Move ${moving.name}` : 'Move to folder'}
        onSelect={(target) => void handleMove(target)}
        onClose={() => setMoving(null)}
      />
    </Page>
  )
}
