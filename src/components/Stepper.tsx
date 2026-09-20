import { useId } from 'react'
import styled from 'styled-components'

import { IconButton } from './IconButton'

export type StepperProps = {
  value: number
  onChange: (next: number) => void
  /** Defaults to 0. */
  min?: number
  /** Defaults to 99. */
  max?: number
  /** Defaults to 1. */
  step?: number
  /** Used for the group name and the − / + button labels, e.g. "Servings". */
  label: string
  id?: string
  'aria-describedby'?: string
  disabled?: boolean
  className?: string
}

const Group = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.xs};
  padding: ${({ theme }) => theme.space.xs};
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.pill};
`

const Value = styled.span`
  min-width: ${({ theme }) => theme.space.xxl};
  text-align: center;
  font-size: ${({ theme }) => theme.font.size.md};
  font-weight: ${({ theme }) => theme.font.weight.bold};
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.color.text};
`

/** Round a stepped value to a sane precision so 0.1 + 0.2 never leaks into the UI. */
function roundish(value: number): number {
  return Math.round(value * 1e6) / 1e6
}

/** − / + numeric stepper. Always clamps to `min`/`max` and disables at the bounds. */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  label,
  id,
  'aria-describedby': describedBy,
  disabled = false,
  className,
}: StepperProps) {
  const generatedId = useId()
  const groupId = id ?? generatedId
  const valueId = `${groupId}-value`

  const clamp = (next: number) => roundish(Math.min(max, Math.max(min, next)))
  const current = clamp(value)

  const atMin = current <= min
  const atMax = current >= max

  const emit = (next: number) => {
    const clamped = clamp(next)
    if (clamped !== current) onChange(clamped)
  }

  return (
    <Group
      id={groupId}
      role="group"
      aria-label={label}
      aria-describedby={describedBy}
      className={className}
    >
      <IconButton
        aria-label={`Decrease ${label}`}
        aria-controls={valueId}
        disabled={disabled || atMin}
        onClick={() => emit(current - step)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M5 12h14" strokeLinecap="round" />
        </svg>
      </IconButton>

      <Value id={valueId} role="status" aria-live="polite" aria-atomic="true">
        {current}
      </Value>

      <IconButton
        aria-label={`Increase ${label}`}
        aria-controls={valueId}
        disabled={disabled || atMax}
        onClick={() => emit(current + step)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </IconButton>
    </Group>
  )
}
