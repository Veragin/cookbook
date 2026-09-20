/**
 * Photo field for the recipe form.
 *
 * Picking a file downscales it immediately (so a 12 MP phone photo never reaches
 * IndexedDB) but does *not* store it — the blob is handed back to the form and only
 * written by `putImage` on save. A file that cannot be processed leaves the rest of
 * the form untouched and reports inline.
 */

import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'

import { Button, Field, Spinner } from '../../components'
import { downscaleImage } from '../../lib/image'
import { formFieldIds } from './useRecipeForm'
import type { FormImage } from './useRecipeForm'

export type ImagePickerProps = {
  image: FormImage
  /** Object URL for an already-stored image (edit mode) — from `getImageUrl`. */
  storedUrl?: string
  disabled?: boolean
  onSelect: (blob: Blob) => void
  onClear: () => void
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
`

const Preview = styled.img`
  display: block;
  width: 100%;
  max-height: calc(${({ theme }) => theme.layout.touch} * 5);
  object-fit: cover;
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.surfaceAlt};
`

const FileInput = styled.input`
  display: block;
  width: 100%;
  min-height: ${({ theme }) => theme.layout.touch};
  padding: ${({ theme }) => theme.space.sm};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.text};
  border: 1px dashed ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.md};
  font-family: ${({ theme }) => theme.font.body};
  font-size: ${({ theme }) => theme.font.size.sm};

  /* The UA button ignores the inherited palette, so it is themed by hand. */
  &::file-selector-button {
    margin-right: ${({ theme }) => theme.space.sm};
    padding: ${({ theme }) => theme.space.xs} ${({ theme }) => theme.space.md};
    background: ${({ theme }) => theme.color.surfaceAlt};
    color: ${({ theme }) => theme.color.text};
    border: 1px solid ${({ theme }) => theme.color.border};
    border-radius: ${({ theme }) => theme.radius.sm};
    font: inherit;
    cursor: pointer;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.focus};
    outline-offset: 1px;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const Busy = styled.p`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.font.size.sm};
`

const Row = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space.sm};
`

export function ImagePicker({
  image,
  storedUrl,
  disabled = false,
  onSelect,
  onClear,
}: ImagePickerProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [pendingUrl, setPendingUrl] = useState<string | undefined>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)

  // A freshly picked blob has no stored URL yet, so make (and release) our own.
  useEffect(() => {
    if (image.kind !== 'pending') {
      setPendingUrl(undefined)
      return
    }
    const url = URL.createObjectURL(image.blob)
    setPendingUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [image])

  const previewUrl =
    image.kind === 'pending' ? pendingUrl : image.kind === 'stored' ? storedUrl : undefined

  const handleFile = async (file: File) => {
    setError(undefined)
    if (file.type !== '' && !file.type.startsWith('image/')) {
      setError('That file is not an image.')
      return
    }
    setBusy(true)
    try {
      const blob = await downscaleImage(file)
      onSelect(blob)
    } catch {
      setError('Could not read that image. The rest of the form is untouched.')
    } finally {
      setBusy(false)
      // Allow re-picking the same file (a change event only fires on a new value).
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleClear = () => {
    setError(undefined)
    if (inputRef.current) inputRef.current.value = ''
    onClear()
  }

  return (
    <Wrapper>
      <Field
        label="Photo"
        hint="Optional. Large photos are resized before they are saved."
        error={error}
      >
        <FileInput
          ref={inputRef}
          id={formFieldIds.image}
          type="file"
          accept="image/*"
          disabled={disabled || busy}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void handleFile(file)
          }}
        />
      </Field>

      {busy && (
        <Busy>
          <Spinner size="sm" label="Processing photo…" />
          Processing photo…
        </Busy>
      )}

      {previewUrl && (
        <>
          <Preview src={previewUrl} alt="Selected recipe photo" />
          <Row>
            <Button variant="secondary" size="sm" disabled={disabled} onClick={handleClear}>
              Remove photo
            </Button>
          </Row>
        </>
      )}
    </Wrapper>
  )
}
