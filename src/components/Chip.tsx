import styled from 'styled-components'

export type ChipProps = {
  label: string
  /** When provided a × button is rendered, labelled `Remove <label>`. */
  onRemove?: () => void
  /** Soft accent styling for "selected" chips. */
  $selected?: boolean
  className?: string
}

const Root = styled.span<{ $selected?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.xs};
  max-width: 100%;
  padding: ${({ theme }) => theme.space.xs} ${({ theme }) => theme.space.sm};
  background: ${({ theme, $selected }) =>
    $selected ? theme.color.primarySoft : theme.color.surfaceAlt};
  color: ${({ theme, $selected }) => ($selected ? theme.color.primary : theme.color.text)};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: ${({ theme }) => theme.font.size.sm};
  line-height: 1.3;
`

const Label = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Remove = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ theme }) => theme.font.size.lg};
  height: ${({ theme }) => theme.font.size.lg};
  margin: 0;
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.pill};
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.font.size.md};
  line-height: 1;

  &:hover {
    background: ${({ theme }) => theme.color.border};
    color: ${({ theme }) => theme.color.text};
  }
`

export function Chip({ label, onRemove, $selected, className }: ChipProps) {
  return (
    <Root $selected={$selected} className={className}>
      <Label>{label}</Label>
      {onRemove && (
        <Remove type="button" aria-label={`Remove ${label}`} onClick={onRemove}>
          <span aria-hidden="true">×</span>
        </Remove>
      )}
    </Root>
  )
}
