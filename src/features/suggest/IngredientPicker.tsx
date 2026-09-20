import { useId } from 'react'
import styled from 'styled-components'

import { MultiAutocomplete } from '../../components'

export type IngredientPickerProps = {
  values: string[]
  onChange: (next: string[]) => void
  /** Vocabulary from the provider; free text is still allowed. */
  options: readonly string[]
  /** How many recipes currently match — rendered as live feedback under the picker. */
  matchCount: number
  disabled?: boolean
  className?: string
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};
  width: 100%;
`

const Label = styled.label`
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  color: ${({ theme }) => theme.color.text};
`

const Feedback = styled.p<{ $empty: boolean }>`
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme, $empty }) => ($empty ? theme.color.danger : theme.color.textMuted)};
`

function matchLabel(count: number): string {
  if (count === 0) return 'No recipes match right now'
  if (count === 1) return '1 recipe matches'
  return `${count} recipes match`
}

/**
 * Multi-select over the shared ingredient vocabulary. Picked ingredients become chips
 * and the match count below updates as the filter narrows.
 */
export function IngredientPicker({
  values,
  onChange,
  options,
  matchCount,
  disabled = false,
  className,
}: IngredientPickerProps) {
  const inputId = useId()
  const countId = `${inputId}-count`

  return (
    <Wrapper className={className}>
      <Label htmlFor={inputId}>Ingredients</Label>
      <MultiAutocomplete
        id={inputId}
        values={values}
        onChange={onChange}
        options={options}
        placeholder="e.g. garlic, tomato"
        allowFreeText
        disabled={disabled}
        aria-describedby={countId}
      />
      <Feedback id={countId} role="status" $empty={matchCount === 0}>
        {matchLabel(matchCount)}
      </Feedback>
    </Wrapper>
  )
}
