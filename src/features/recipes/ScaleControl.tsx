/**
 * Portion scaling — the headline feature.
 *
 * View-only: it owns nothing but a target portion count and hands it back to the page,
 * which turns it into a scale factor. Nothing here writes to the recipe.
 */

import styled from 'styled-components'

import { Button, Stepper } from '../../components'

export type ScaleControlProps = {
  /** The recipe's stored portion count — what the quantities refer to. */
  baseServings: number
  /** Currently displayed portion count. */
  servings: number
  onChange: (next: number) => void
  onReset: () => void
  className?: string
}

export const MIN_PORTIONS = 1
export const MAX_PORTIONS = 99

const Root = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => theme.space.md};
  background: ${({ theme }) => theme.color.surfaceAlt};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.lg};
`

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.md};
`

const Label = styled.span`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};
  font-size: ${({ theme }) => theme.font.size.md};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  color: ${({ theme }) => theme.color.text};
`

const Hint = styled.span`
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.regular};
  color: ${({ theme }) => theme.color.textMuted};
`

const ScaledRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  padding-top: ${({ theme }) => theme.space.sm};
  border-top: 1px solid ${({ theme }) => theme.color.border};
`

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: ${({ theme }) => theme.space.xs} ${({ theme }) => theme.space.sm};
  background: ${({ theme }) => theme.color.primarySoft};
  color: ${({ theme }) => theme.color.primary};
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.bold};
  font-variant-numeric: tabular-nums;
`

const ScaledText = styled.span`
  flex: 1;
  min-width: 0;
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.color.textMuted};
`

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
`

/** `×1.5`, `×2`, `×0.33` — at most two decimals, trailing zeros stripped. */
export function formatFactor(factor: number): string {
  if (!Number.isFinite(factor)) return '×1'
  const rounded = Math.round(factor * 100) / 100
  return `×${String(rounded)}`
}

function portionWord(count: number): string {
  return count === 1 ? 'portion' : 'portions'
}

/** "Portions" stepper plus the scaled-away-from-base affordance and its reset. */
export function ScaleControl({
  baseServings,
  servings,
  onChange,
  onReset,
  className,
}: ScaleControlProps) {
  const scaled = servings !== baseServings
  const factorText = formatFactor(baseServings > 0 ? servings / baseServings : 1)

  return (
    <Root className={className} aria-label="Portion scaling">
      <Row>
        <Label>
          Portions
          <Hint>
            Recipe written for {baseServings} {portionWord(baseServings)}
          </Hint>
        </Label>
        <Stepper
          label="Portions"
          value={servings}
          onChange={onChange}
          min={MIN_PORTIONS}
          max={MAX_PORTIONS}
        />
      </Row>

      {scaled && (
        <ScaledRow>
          <Badge aria-hidden="true">{factorText}</Badge>
          <ScaledText>
            Scaled from {baseServings} {portionWord(baseServings)}
          </ScaledText>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            aria-label={`Reset to ${baseServings} ${portionWord(baseServings)}`}
          >
            Reset
          </Button>
        </ScaledRow>
      )}

      <VisuallyHidden role="status" aria-live="polite">
        {scaled
          ? `Ingredients scaled to ${servings} ${portionWord(servings)}, from ${baseServings}.`
          : `Ingredients shown for the recipe's ${baseServings} ${portionWord(baseServings)}.`}
      </VisuallyHidden>
    </Root>
  )
}
