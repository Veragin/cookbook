import { useId, useRef, type KeyboardEvent } from 'react'
import styled from 'styled-components'

export type SegmentedOption<T extends string = string> = {
  value: T
  label: string
}

export type SegmentedControlProps<T extends string = string> = {
  options: ReadonlyArray<SegmentedOption<T>>
  value: T
  onChange: (next: T) => void
  /** Accessible name for the group. */
  label?: string
  id?: string
  'aria-describedby'?: string
  className?: string
}

const Group = styled.div`
  display: flex;
  width: 100%;
  padding: ${({ theme }) => theme.space.xs};
  gap: ${({ theme }) => theme.space.xs};
  background: ${({ theme }) => theme.color.surfaceAlt};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.pill};
`

const Segment = styled.button<{ $active: boolean }>`
  flex: 1 1 0;
  min-height: ${({ theme }) => theme.layout.touch};
  padding: ${({ theme }) => theme.space.xs} ${({ theme }) => theme.space.sm};
  background: ${({ theme, $active }) => ($active ? theme.color.surface : 'transparent')};
  color: ${({ theme, $active }) => ($active ? theme.color.primary : theme.color.textMuted)};
  border: 0;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme, $active }) =>
    $active ? theme.font.weight.bold : theme.font.weight.medium};
  box-shadow: ${({ theme, $active }) => ($active ? theme.shadow.sm : 'none')};
  transition:
    background 120ms ease,
    color 120ms ease;
`

/**
 * Radiogroup with roving tabindex: only the checked segment is tabbable and the
 * arrow keys move (and select) through the options, wrapping at both ends.
 */
export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  label,
  id,
  'aria-describedby': describedBy,
  className,
}: SegmentedControlProps<T>) {
  const generatedId = useId()
  const groupId = id ?? generatedId
  const groupRef = useRef<HTMLDivElement>(null)

  const selectedIndex = options.findIndex((option) => option.value === value)

  const focusIndex = (index: number) => {
    const buttons = groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
    buttons?.[index]?.focus()
  }

  const move = (from: number, delta: number) => {
    if (options.length === 0) return
    const base = from < 0 ? 0 : from
    const next = (base + delta + options.length) % options.length
    onChange(options[next].value)
    focusIndex(next)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault()
        move(index, 1)
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        move(index, -1)
        break
      case 'Home':
        event.preventDefault()
        move(-1, 0)
        break
      case 'End':
        event.preventDefault()
        move(-1, options.length - 1)
        break
      default:
        break
    }
  }

  return (
    <Group
      ref={groupRef}
      id={groupId}
      role="radiogroup"
      aria-label={label}
      aria-describedby={describedBy}
      className={className}
    >
      {options.map((option, index) => {
        const active = option.value === value
        return (
          <Segment
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active || (selectedIndex === -1 && index === 0) ? 0 : -1}
            $active={active}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {option.label}
          </Segment>
        )
      })}
    </Group>
  )
}
