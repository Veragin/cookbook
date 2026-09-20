import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import styled, { css } from 'styled-components'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'

export type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  /** Visual weight. Defaults to `secondary`. */
  variant?: ButtonVariant
  /** `md` (default) keeps the 44px touch target; `sm` is for dense inline actions. */
  size?: ButtonSize
  /** Stretch to the full width of the parent. */
  $fullWidth?: boolean
}

const variantStyles = {
  primary: css`
    background: ${({ theme }) => theme.color.primary};
    color: ${({ theme }) => theme.color.onPrimary};
    border-color: ${({ theme }) => theme.color.primary};

    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.color.primaryHover};
      border-color: ${({ theme }) => theme.color.primaryHover};
    }
  `,
  secondary: css`
    background: ${({ theme }) => theme.color.surface};
    color: ${({ theme }) => theme.color.text};
    border-color: ${({ theme }) => theme.color.border};

    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.color.surfaceAlt};
    }
  `,
  ghost: css`
    background: transparent;
    color: ${({ theme }) => theme.color.primary};
    border-color: transparent;

    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.color.primarySoft};
    }
  `,
  danger: css`
    background: ${({ theme }) => theme.color.danger};
    color: ${({ theme }) => theme.color.onDanger};
    border-color: ${({ theme }) => theme.color.danger};

    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.color.danger};
      filter: brightness(0.92);
    }
  `,
} satisfies Record<ButtonVariant, ReturnType<typeof css>>

const StyledButton = styled.button<{
  $variant: ButtonVariant
  $size: ButtonSize
  $fullWidth?: boolean
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space.sm};
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
  min-height: ${({ theme, $size }) =>
    $size === 'sm' ? theme.space.xxl : theme.layout.touch};
  padding: ${({ theme, $size }) =>
    $size === 'sm'
      ? `${theme.space.xs} ${theme.space.md}`
      : `${theme.space.sm} ${theme.space.lg}`};
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radius.md};
  font-family: ${({ theme }) => theme.font.body};
  font-size: ${({ theme, $size }) => ($size === 'sm' ? theme.font.size.sm : theme.font.size.md)};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  line-height: 1.2;
  text-align: center;
  text-decoration: none;
  transition:
    background 120ms ease,
    color 120ms ease,
    border-color 120ms ease;

  ${({ $variant }) => variantStyles[$variant]}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

/** Primary action button. Forwards every native button prop plus its ref. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', $fullWidth = false, type = 'button', ...rest },
  ref,
) {
  return (
    <StyledButton
      ref={ref}
      type={type}
      $variant={variant}
      $size={size}
      $fullWidth={$fullWidth}
      {...rest}
    />
  )
})
