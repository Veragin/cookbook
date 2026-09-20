import { Children, cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react'
import styled from 'styled-components'

/**
 * Children API — ONE approach, on purpose:
 *
 * `Field` takes a **single plain child element** (no render prop). It generates an id,
 * points the `<label htmlFor>` at it and clones the child to inject `id`,
 * `aria-describedby` (hint and/or error) and `aria-invalid` when there is an error.
 * Any explicit `id` on the child wins, so controlled ids keep working.
 *
 *     <Field label="Servings" hint="Base portions">
 *       <Input inputMode="numeric" />
 *     </Field>
 *
 * Anything that is not a single element (raw text, fragments, several nodes) is rendered
 * untouched and only gets the visual label/hint/error treatment.
 */
export type FieldProps = {
  label: string
  /** Helper copy shown under the control. */
  hint?: string
  /** When set the control is marked invalid and the message replaces nothing — both show. */
  error?: string
  /** Visually hide the label but keep it for screen readers. */
  labelHidden?: boolean
  children: ReactNode
  className?: string
}

/** Props `Field` is allowed to inject into its child control. */
type InjectedControlProps = {
  id?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};
  width: 100%;
`

const Label = styled.label<{ $hidden?: boolean }>`
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  color: ${({ theme }) => theme.color.text};

  ${({ $hidden }) =>
    $hidden
      ? `
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  `
      : ''}
`

const Hint = styled.p`
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.color.textMuted};
`

const ErrorText = styled.p`
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  color: ${({ theme }) => theme.color.danger};
`

export function Field({ label, hint, error, labelHidden, children, className }: FieldProps) {
  const generatedId = useId()
  const hintId = `${generatedId}-hint`
  const errorId = `${generatedId}-error`

  const child = Children.toArray(children).filter(isValidElement)[0] as
    | ReactElement<InjectedControlProps>
    | undefined
  const single = Children.count(children) === 1 && child !== undefined

  const controlId = single ? (child.props.id ?? generatedId) : generatedId
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')

  const control = single
    ? cloneElement(child, {
        id: controlId,
        'aria-describedby': describedBy || child.props['aria-describedby'],
        'aria-invalid': error ? true : child.props['aria-invalid'],
      })
    : children

  return (
    <Wrapper className={className}>
      <Label htmlFor={controlId} $hidden={labelHidden}>
        {label}
      </Label>
      {control}
      {hint && <Hint id={hintId}>{hint}</Hint>}
      {error && (
        <ErrorText id={errorId} role="alert">
          {error}
        </ErrorText>
      )}
    </Wrapper>
  )
}
