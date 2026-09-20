import styled, { keyframes } from 'styled-components'

export type SpinnerProps = {
  /** Accessible name announced by screen readers. Defaults to `Loading…`. */
  label?: string
  size?: 'sm' | 'md'
  className?: string
}

const spin = keyframes`
  to { transform: rotate(360deg); }
`

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
`

const Root = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
`

const Circle = styled.span<{ $size: 'sm' | 'md' }>`
  display: block;
  width: ${({ theme, $size }) => ($size === 'sm' ? theme.font.size.md : theme.font.size.xl)};
  height: ${({ theme, $size }) => ($size === 'sm' ? theme.font.size.md : theme.font.size.xl)};
  border: 2px solid ${({ theme }) => theme.color.border};
  border-top-color: ${({ theme }) => theme.color.primary};
  border-radius: ${({ theme }) => theme.radius.pill};
  animation: ${spin} 700ms linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: ${pulse} 1.4s ease-in-out infinite;
    border-top-color: ${({ theme }) => theme.color.border};
    background: ${({ theme }) => theme.color.primarySoft};
  }
`

const SrOnly = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
`

/** Small accessible loading indicator. */
export function Spinner({ label = 'Loading…', size = 'md', className }: SpinnerProps) {
  return (
    <Root role="status" className={className}>
      <Circle $size={size} aria-hidden="true" />
      <SrOnly>{label}</SrOnly>
    </Root>
  )
}
