import { css } from 'styled-components'

/**
 * Internal (not exported from the barrel): the shared look of every native form
 * control — Input, TextArea, Select and the Autocomplete text field.
 */
export const controlStyles = css`
  display: block;
  width: 100%;
  min-height: ${({ theme }) => theme.layout.touch};
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.text};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.md};
  font-family: ${({ theme }) => theme.font.body};
  font-size: ${({ theme }) => theme.font.size.md};
  line-height: 1.4;
  transition:
    border-color 120ms ease,
    box-shadow 120ms ease;

  &::placeholder {
    color: ${({ theme }) => theme.color.textMuted};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.focus};
    outline-offset: 1px;
    border-color: ${({ theme }) => theme.color.focus};
  }

  &[aria-invalid='true'] {
    border-color: ${({ theme }) => theme.color.danger};
    background: ${({ theme }) => theme.color.dangerSoft};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: ${({ theme }) => theme.color.surfaceAlt};
  }
`
