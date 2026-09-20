import { useState, type FormEvent } from 'react'
import styled from 'styled-components'

import { Button, ConfirmDialog, Field, IconButton, Input, Modal, Sheet } from '../../components'
import { blobToDataUrl, buildFolderExport, downloadJson, toFilename } from '../../lib/export'
import { folderDescendants } from '../../lib/merge'
import { useRecipes } from './RecipesProvider'
import type { Folder, Recipe } from '../../types'

export type FolderActionsProps = {
  /** Folder the menu acts on. `null` = the cookbook root: only "New folder" is offered. */
  folder: Folder | null
  /** Called after a successful delete with the folder's parent id (contents move there). */
  onDeleted?: (parentId: string | null) => void
  className?: string
}

type OpenDialog = 'none' | 'create' | 'rename' | 'delete'

const MenuList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.lg};
`

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space.sm};

  > * {
    flex: 1;
  }
`

const ErrorText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.color.danger};
  font-size: ${({ theme }) => theme.font.size.sm};
`

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

/**
 * Overflow menu for folder management: create a subfolder, rename, delete (contents
 * move up to the parent — the provider's behaviour) and export to JSON.
 */
export function FolderActions({ folder, onDeleted, className }: FolderActionsProps) {
  const { folders, recipes, createFolder, renameFolder, deleteFolder, getImageBlob } = useRecipes()

  const [menuOpen, setMenuOpen] = useState(false)
  const [dialog, setDialog] = useState<OpenDialog>('none')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parentId = folder?.id ?? null
  const closeDialog = () => {
    setDialog('none')
    setError(null)
  }

  const openDialog = (next: OpenDialog) => {
    setError(null)
    setMenuOpen(false)
    if (next === 'rename') setName(folder?.name ?? '')
    if (next === 'create') setName('')
    setDialog(next)
  }

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Please enter a folder name.')
      return
    }
    setBusy(true)
    try {
      await createFolder(trimmed, parentId)
      closeDialog()
    } catch (cause) {
      setError(messageOf(cause, 'Could not create the folder.'))
    } finally {
      setBusy(false)
    }
  }

  const handleRename = async (event: FormEvent) => {
    event.preventDefault()
    if (busy || !folder) return
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Please enter a folder name.')
      return
    }
    setBusy(true)
    try {
      await renameFolder(folder.id, trimmed)
      closeDialog()
    } catch (cause) {
      setError(messageOf(cause, 'Could not rename the folder.'))
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (busy || !folder) return
    setBusy(true)
    try {
      await deleteFolder(folder.id)
      closeDialog()
      onDeleted?.(folder.parentId)
    } catch (cause) {
      setError(messageOf(cause, 'Could not delete the folder.'))
    } finally {
      setBusy(false)
    }
  }

  const handleExport = async () => {
    if (busy || !folder) return
    setBusy(true)
    setError(null)
    try {
      const subtree = new Set([folder.id, ...folderDescendants(folders, folder.id)])
      const inSubtree = recipes.filter(
        (recipe: Recipe) => recipe.folderId !== null && subtree.has(recipe.folderId),
      )

      const entries = await Promise.all(
        inSubtree.map(async (recipe) => {
          if (!recipe.imageId) return { recipe }
          try {
            const blob = await getImageBlob(recipe.imageId)
            return blob ? { recipe, image: await blobToDataUrl(blob) } : { recipe }
          } catch {
            // An unreadable image must never sink the whole export.
            return { recipe }
          }
        }),
      )

      downloadJson(toFilename(folder.name), buildFolderExport(folder, folders, entries))
      setMenuOpen(false)
    } catch (cause) {
      setError(messageOf(cause, 'Could not export the folder.'))
    } finally {
      setBusy(false)
    }
  }

  const menuLabel = folder ? `Actions for ${folder.name}` : 'Folder actions'

  return (
    <div className={className}>
      <IconButton aria-label={menuLabel} onClick={() => setMenuOpen(true)}>
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      </IconButton>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title={folder?.name ?? 'Recipes'}>
        <MenuList>
          <Button $fullWidth onClick={() => openDialog('create')}>
            {folder ? 'New subfolder' : 'New folder'}
          </Button>
          {folder && (
            <>
              <Button $fullWidth onClick={() => openDialog('rename')}>
                Rename folder
              </Button>
              <Button $fullWidth disabled={busy} onClick={() => void handleExport()}>
                {busy ? 'Exporting…' : 'Export folder to JSON'}
              </Button>
              <Button variant="danger" $fullWidth onClick={() => openDialog('delete')}>
                Delete folder
              </Button>
            </>
          )}
          {error && <ErrorText role="alert">{error}</ErrorText>}
        </MenuList>
      </Sheet>

      <Modal
        open={dialog === 'create'}
        onClose={closeDialog}
        title={folder ? `New subfolder in ${folder.name}` : 'New folder'}
      >
        <Form onSubmit={(event) => void handleCreate(event)}>
          <Field label="Folder name" error={error ?? undefined}>
            <Input
              value={name}
              placeholder="e.g. Desserts"
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Actions>
            <Button variant="secondary" onClick={closeDialog}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={busy}>
              Create
            </Button>
          </Actions>
        </Form>
      </Modal>

      <Modal open={dialog === 'rename'} onClose={closeDialog} title="Rename folder">
        <Form onSubmit={(event) => void handleRename(event)}>
          <Field label="Folder name" error={error ?? undefined}>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Actions>
            <Button variant="secondary" onClick={closeDialog}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={busy}>
              Save
            </Button>
          </Actions>
        </Form>
      </Modal>

      <ConfirmDialog
        open={dialog === 'delete'}
        title={`Delete ${folder?.name ?? 'folder'}?`}
        message="The folder is removed. Its recipes and subfolders are not deleted — they move up to the parent folder."
        confirmLabel="Delete folder"
        destructive
        onConfirm={() => void handleDelete()}
        onCancel={closeDialog}
      />
    </div>
  )
}
