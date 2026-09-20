import type { ReactNode } from 'react'
import styled from 'styled-components'

export type EmptyStateProps = {
  title: string
  description?: string
  /** Usually a `<Button>` that gets the user unstuck. */
  action?: ReactNode
  className?: string
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => theme.space.xxl} ${({ theme }) => theme.space.lg};
  text-align: center;
  color: ${({ theme }) => theme.color.textMuted};
`

const Title = styled.h2`
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  color: ${({ theme }) => theme.color.text};
`

const Description = styled.p`
  max-width: 36ch;
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.color.textMuted};
`

const Action = styled.div`
  margin-top: ${({ theme }) => theme.space.sm};
`

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <Root className={className}>
      <Title>{title}</Title>
      {description && <Description>{description}</Description>}
      {action && <Action>{action}</Action>}
    </Root>
  )
}
