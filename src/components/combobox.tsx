import { useEffect, useRef, type MouseEvent } from 'react'
import styled from 'styled-components'

/**
 * Internal (not exported from the barrel): the filtering + listbox rendering shared by
 * `Autocomplete` and `MultiAutocomplete`.
 */

/** Roughly how many options stay visible before the list scrolls. */
export const VISIBLE_OPTIONS = 8

/** Hard cap on rendered nodes — the list scrolls, nobody reads option 400. */
const MAX_RENDERED_OPTIONS = 50

/** Lowercase + strip diacritics, so "creme" matches "Crème". */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Diacritics-insensitive substring filter. Options whose start matches come first,
 * the original order is preserved inside each bucket, and `exclude` (already-picked
 * values) is dropped.
 */
export function filterOptions(
  options: readonly string[],
  query: string,
  exclude: readonly string[] = [],
): string[] {
  const excluded = new Set(exclude.map(normalizeText))
  const available = options.filter((option) => !excluded.has(normalizeText(option)))
  const needle = normalizeText(query)

  if (!needle) return available.slice(0, MAX_RENDERED_OPTIONS)

  const startsWith: string[] = []
  const contains: string[] = []
  for (const option of available) {
    const haystack = normalizeText(option)
    if (haystack.startsWith(needle)) startsWith.push(option)
    else if (haystack.includes(needle)) contains.push(option)
  }
  return [...startsWith, ...contains].slice(0, MAX_RENDERED_OPTIONS)
}

export const ComboRoot = styled.div`
  position: relative;
  width: 100%;
`

const List = styled.ul`
  position: absolute;
  top: calc(100% + ${({ theme }) => theme.space.xs});
  left: 0;
  right: 0;
  z-index: ${({ theme }) => theme.z.sheet};
  max-height: calc(${({ theme }) => theme.layout.touch} * ${VISIBLE_OPTIONS});
  margin: 0;
  padding: ${({ theme }) => theme.space.xs};
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: ${({ theme }) => theme.shadow.md};
  list-style: none;
`

const Option = styled.li<{ $active: boolean }>`
  display: flex;
  align-items: center;
  min-height: ${({ theme }) => theme.layout.touch};
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.sm};
  font-size: ${({ theme }) => theme.font.size.md};
  color: ${({ theme, $active }) => ($active ? theme.color.primary : theme.color.text)};
  background: ${({ theme, $active }) => ($active ? theme.color.primarySoft : 'transparent')};
  cursor: pointer;
`

const Empty = styled.li`
  display: flex;
  align-items: center;
  min-height: ${({ theme }) => theme.layout.touch};
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.color.textMuted};
`

export type OptionListProps = {
  id: string
  options: readonly string[]
  activeIndex: number
  /** Builds the DOM id of an option so the input can point `aria-activedescendant` at it. */
  optionId: (index: number) => string
  onSelect: (option: string) => void
  onActiveIndexChange: (index: number) => void
  emptyMessage?: string
}

export function OptionList({
  id,
  options,
  activeIndex,
  optionId,
  onSelect,
  onActiveIndexChange,
  emptyMessage = 'No matches',
}: OptionListProps) {
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (activeIndex < 0) return
    const node = listRef.current?.children[activeIndex]
    if (node instanceof HTMLElement) node.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  // Keep focus on the input: a mousedown inside the list must never blur it,
  // otherwise the list closes before the click lands.
  const keepFocus = (event: MouseEvent) => event.preventDefault()

  return (
    <List id={id} role="listbox" ref={listRef} onMouseDown={keepFocus}>
      {options.length === 0 ? (
        <Empty role="presentation">{emptyMessage}</Empty>
      ) : (
        options.map((option, index) => (
          <Option
            key={option}
            id={optionId(index)}
            role="option"
            aria-selected={index === activeIndex}
            $active={index === activeIndex}
            onMouseEnter={() => onActiveIndexChange(index)}
            onClick={() => onSelect(option)}
          >
            {option}
          </Option>
        ))
      )}
    </List>
  )
}
