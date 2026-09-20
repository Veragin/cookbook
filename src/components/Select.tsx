import type { ComponentPropsWithoutRef } from 'react'
import styled from 'styled-components'

import { controlStyles } from './controlStyles'

export type SelectProps = ComponentPropsWithoutRef<'select'>

/**
 * Full-width native select. The platform chevron is kept on purpose — it is free,
 * themed by the OS and always readable on mobile.
 */
export const Select = styled.select<SelectProps>`
  ${controlStyles}
  padding-right: ${({ theme }) => theme.space.sm};
  cursor: pointer;
`
