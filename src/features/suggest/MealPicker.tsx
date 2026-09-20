import styled from 'styled-components'

import { SegmentedControl } from '../../components'
import type { SegmentedOption } from '../../components'
import type { Meal } from '../../types'

/** `'any'` is the UI-only value for "no meal constraint". */
type MealOption = 'any' | Meal

export type MealPickerProps = {
  /** `null` = Any. */
  value: Meal | null
  onChange: (next: Meal | null) => void
  disabled?: boolean
  className?: string
}

const OPTIONS: ReadonlyArray<SegmentedOption<MealOption>> = [
  { value: 'any', label: 'Any' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'cake', label: 'Cake' },
]

const Wrapper = styled.div<{ $disabled: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};
  width: 100%;
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  pointer-events: ${({ $disabled }) => ($disabled ? 'none' : 'auto')};
`

const Label = styled.span`
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  color: ${({ theme }) => theme.color.text};
`

/** Any / Lunch / Dinner / Cake. Clearing back to "Any" is just picking the first segment. */
export function MealPicker({ value, onChange, disabled = false, className }: MealPickerProps) {
  return (
    <Wrapper className={className} $disabled={disabled}>
      <Label aria-hidden="true">Meal</Label>
      <SegmentedControl
        options={OPTIONS}
        value={value ?? 'any'}
        onChange={(next) => onChange(next === 'any' ? null : next)}
        label="Meal"
      />
    </Wrapper>
  )
}
