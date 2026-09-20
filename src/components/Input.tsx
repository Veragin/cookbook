import type { ComponentPropsWithoutRef } from 'react'
import styled from 'styled-components'

import { controlStyles } from './controlStyles'

export type InputProps = ComponentPropsWithoutRef<'input'>

/** Full-width text input with a 44px touch target and `aria-invalid` styling. */
export const Input = styled.input<InputProps>`
  ${controlStyles}
`
