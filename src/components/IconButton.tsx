import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import styled, { css } from 'styled-components'

export type IconButtonVariant = 'plain' | 'solid' | 'danger'

export type IconButtonProps = Omit<ComponentPropsWithoutRef<'button'>, 'aria-label'> & {
  /** Icon-only controls carry no text, so an accessible name is mandatory. */
  'aria-label': string
  variant?: IconButtonVariant
}

const variantStyles = {
  plain: css`
    background: transparent;
    color: ${({ theme }) => theme.color.text};
    border-color: transparent;

    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.color.surfaceAlt};
    }
  `,
  solid: css`
    background: ${({ theme }) => theme.color.primary};
    color: ${({ theme }) => theme.color.onPrimary};
    border-color: ${({ theme }) => theme.color.primary};

    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.color.primaryHover};
    }
  `,
  danger: css`
    background: transparent;
    color: ${({ theme }) => theme.color.danger};
    border-color: transparent;

    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.color.dangerSoft};
    }
  `,
} satisfies Record<IconButtonVariant, ReturnType<typeof css>>

const StyledIconButton = styled.button<{ $variant: IconButtonVariant }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: ${({ theme }) => theme.layout.touch};
  height: ${({ theme }) => theme.layout.touch};
  min-width: ${({ theme }) => theme.layout.touch};
  min-height: ${({ theme }) => theme.layout.touch};
  padding: 0;
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radius.md};
  line-height: 0;
  transition:
    background 120ms ease,
    color 120ms ease;

  ${({ $variant }) => variantStyles[$variant]}

  svg {
    width: ${({ theme }) => theme.font.size.lg};
    height: ${({ theme }) => theme.font.size.lg};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

/** Square, icon-only button with a guaranteed 44x44 touch target. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = 'plain', type = 'button', ...rest },
  ref,
) {
  return <StyledIconButton ref={ref} type={type} $variant={variant} {...rest} />
})
