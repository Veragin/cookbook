import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import styled from 'styled-components'

import { ComboRoot, OptionList, filterOptions, normalizeText } from './combobox'
import { controlStyles } from './controlStyles'

export type AutocompleteProps = {
  value: string
  onChange: (next: string) => void
  options: readonly string[]
  placeholder?: string
  /**
   * When `false` a value that does not match an option is cleared on blur.
   * Defaults to `true` — free text is the norm for ingredient names.
   */
  allowFreeText?: boolean
  id?: string
  name?: string
  disabled?: boolean
  autoFocus?: boolean
  inputMode?: 'text' | 'search'
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
  onBlur?: () => void
  className?: string
}

const Field = styled.input`
  ${controlStyles}
`

/**
 * Single-value combobox: a plain text input with a filtered dropdown.
 *
 * Deliberately NOT a focus trap — Tab always leaves (selecting the highlighted
 * option on the way out) and Escape only closes the list, stopping propagation so a
 * surrounding Modal/Sheet stays open.
 */
export function Autocomplete({
  value,
  onChange,
  options,
  placeholder,
  allowFreeText = true,
  id,
  name,
  disabled = false,
  autoFocus = false,
  inputMode = 'text',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  onBlur,
  className,
}: AutocompleteProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const listId = `${inputId}-listbox`
  const optionId = (index: number) => `${inputId}-option-${index}`

  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  const matches = useMemo(() => filterOptions(options, value), [options, value])

  // Never point aria-activedescendant at an option that filtering just removed.
  useEffect(() => {
    setActiveIndex((current) => (current >= matches.length ? -1 : current))
  }, [matches.length])

  const close = () => {
    setOpen(false)
    setActiveIndex(-1)
  }

  const select = (option: string) => {
    onChange(option)
    close()
    inputRef.current?.focus()
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
        if (open && activeIndex >= 0 && matches[activeIndex] !== undefined) {
          event.preventDefault()
          select(matches[activeIndex])
        } else if (open) {
          event.preventDefault()
          close()
        }
        break
      case 'Escape':
        if (open) {
          // Don't let a surrounding dialog treat this as "close me".
          event.preventDefault()
          event.stopPropagation()
          close()
        }
        break
      case 'Tab':
        // Commit the highlighted option but let focus move on — no trap.
        if (open && activeIndex >= 0 && matches[activeIndex] !== undefined) {
          onChange(matches[activeIndex])
        }
        close()
        break
      default:
        break
    }
  }

  const handleBlur = () => {
    close()
    if (!allowFreeText && value) {
      const exact = options.find((option) => normalizeText(option) === normalizeText(value))
      onChange(exact ?? '')
    }
    onBlur?.()
  }

  return (
    <ComboRoot className={className}>
      <Field
        ref={inputRef}
        id={inputId}
        name={name}
        type="text"
        inputMode={inputMode}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        autoFocus={autoFocus}
        disabled={disabled}
        placeholder={placeholder}
        value={value}
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
          onChange(event.target.value)
          setOpen(true)
          setActiveIndex(-1)
        }}
        onClick={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
      {open && (
        <OptionList
          id={listId}
          options={matches}
          activeIndex={activeIndex}
          optionId={optionId}
          onSelect={select}
          onActiveIndexChange={setActiveIndex}
        />
      )}
    </ComboRoot>
  )
}
