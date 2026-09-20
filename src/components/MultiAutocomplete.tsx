import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import styled from 'styled-components'

import { Chip } from './Chip'
import { ComboRoot, OptionList, filterOptions, normalizeText } from './combobox'

export type MultiAutocompleteProps = {
  values: string[]
  onChange: (next: string[]) => void
  options: readonly string[]
  placeholder?: string
  /** When `false` only listed options can be added. Defaults to `true`. */
  allowFreeText?: boolean
  id?: string
  name?: string
  disabled?: boolean
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
  className?: string
}

const Control = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space.xs};
  width: 100%;
  min-height: ${({ theme }) => theme.layout.touch};
  padding: ${({ theme }) => theme.space.xs} ${({ theme }) => theme.space.sm};
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.md};

  &:focus-within {
    outline: 2px solid ${({ theme }) => theme.color.focus};
    outline-offset: 1px;
    border-color: ${({ theme }) => theme.color.focus};
  }

  &[aria-invalid='true'] {
    border-color: ${({ theme }) => theme.color.danger};
  }
`

const Field = styled.input`
  flex: 1 1 ${({ theme }) => theme.space.xxl};
  min-width: ${({ theme }) => theme.space.xxl};
  min-height: ${({ theme }) => theme.space.xxl};
  padding: 0 ${({ theme }) => theme.space.xs};
  background: transparent;
  border: 0;
  color: ${({ theme }) => theme.color.text};
  font-family: ${({ theme }) => theme.font.body};
  font-size: ${({ theme }) => theme.font.size.md};

  &::placeholder {
    color: ${({ theme }) => theme.color.textMuted};
  }

  &:focus {
    outline: none;
  }
`

/**
 * Multi-value combobox. Picked values render as `Chip`s inside the control; the input
 * below them filters the remaining options. Duplicates (case/diacritics-insensitive)
 * are rejected and Backspace on an empty input removes the last chip.
 */
export function MultiAutocomplete({
  values,
  onChange,
  options,
  placeholder,
  allowFreeText = true,
  id,
  name,
  disabled = false,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  className,
}: MultiAutocompleteProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const listId = `${inputId}-listbox`
  const optionId = (index: number) => `${inputId}-option-${index}`

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  const matches = useMemo(
    () => filterOptions(options, query, values),
    [options, query, values],
  )

  useEffect(() => {
    setActiveIndex((current) => (current >= matches.length ? -1 : current))
  }, [matches.length])

  const close = () => {
    setOpen(false)
    setActiveIndex(-1)
  }

  const add = (raw: string) => {
    const candidate = raw.trim()
    if (!candidate) return
    const known = options.find((option) => normalizeText(option) === normalizeText(candidate))
    if (!allowFreeText && !known) return
    const next = known ?? candidate
    const duplicate = values.some((value) => normalizeText(value) === normalizeText(next))
    if (!duplicate) onChange([...values, next])
    setQuery('')
    close()
    inputRef.current?.focus()
  }

  const remove = (value: string) => {
    onChange(values.filter((current) => current !== value))
  }

  const moveActive = (delta: number) => {
    if (matches.length === 0) return
    setActiveIndex((current) => {
      const next = current + delta
      if (next < 0) return matches.length - 1
      if (next >= matches.length) return 0
      return next
    })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (!open) {
          setOpen(true)
          setActiveIndex(matches.length > 0 ? 0 : -1)
        } else {
          moveActive(1)
        }
        break
      case 'ArrowUp':
        event.preventDefault()
        if (!open) {
          setOpen(true)
          setActiveIndex(matches.length - 1)
        } else {
          moveActive(-1)
        }
        break
      case 'Enter':
        event.preventDefault()
        if (open && activeIndex >= 0 && matches[activeIndex] !== undefined) {
          add(matches[activeIndex])
        } else if (query) {
          add(query)
        }
        break
      case 'Escape':
        if (open) {
          event.preventDefault()
          event.stopPropagation()
          close()
        }
        break
      case 'Backspace':
        if (query === '' && values.length > 0) {
          event.preventDefault()
          onChange(values.slice(0, -1))
        }
        break
      case 'Tab':
        if (open && activeIndex >= 0 && matches[activeIndex] !== undefined) {
          add(matches[activeIndex])
        }
        close()
        break
      default:
        break
    }
  }

  return (
    <ComboRoot className={className}>
      <Control aria-invalid={ariaInvalid}>
        {values.map((value) => (
          <Chip key={value} label={value} $selected onRemove={() => remove(value)} />
        ))}
        <Field
          ref={inputRef}
          id={inputId}
          name={name}
          type="text"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={disabled}
          placeholder={values.length === 0 ? placeholder : undefined}
          value={query}
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
            setActiveIndex(-1)
          }}
          onClick={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          onBlur={close}
        />
      </Control>
      {open && (
        <OptionList
          id={listId}
          options={matches}
          activeIndex={activeIndex}
          optionId={optionId}
          onSelect={add}
          onActiveIndexChange={setActiveIndex}
        />
      )}
    </ComboRoot>
  )
}
