import type { ComponentPropsWithoutRef } from 'react'
import styled from 'styled-components'

import { controlStyles } from './controlStyles'

export type TextAreaProps = ComponentPropsWithoutRef<'textarea'>

/** Full-width multi-line input; vertical resize only so it can't break the layout. */
export const TextArea = styled.textarea<TextAreaProps>`
  ${controlStyles}
  min-height: calc(${({ theme }) => theme.layout.touch} * 2);
  resize: vertical;
`
