import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  Button,
  Chip,
  EmptyState,
  Field,
  IconButton,
  Input,
  SegmentedControl,
  Select,
  Spinner,
  TextArea,
} from './index'
import { renderWithTheme } from './test-utils'

describe('smoke', () => {
  it('Button variants + fullWidth + ref', async () => {
    const onClick = vi.fn()
    renderWithTheme(
      <>
        <Button variant="primary" size="sm" $fullWidth onClick={onClick}>
          Save
        </Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger" disabled>
          Del
        </Button>
        <IconButton aria-label="Add">+</IconButton>
      </>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onClick).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
  })

  it('Field wires label/hint/error onto the control', () => {
    renderWithTheme(
      <Field label="Recipe name" hint="Keep it short" error="Required">
        <Input placeholder="e.g. Goulash" />
      </Field>,
    )
    const input = screen.getByLabelText('Recipe name')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Keep it short Required')
  })

  it('Field leaves multi-child content alone', () => {
    renderWithTheme(
      <Field label="Amount">
        <Input aria-label="qty" />
        <Select aria-label="unit">
          <option>g</option>
        </Select>
      </Field>,
    )
    expect(screen.getByLabelText('qty')).toBeInTheDocument()
    expect(screen.getByLabelText('unit')).toBeInTheDocument()
  })

  it('TextArea renders', () => {
    renderWithTheme(<TextArea aria-label="steps" defaultValue="hi" />)
    expect(screen.getByLabelText('steps')).toHaveValue('hi')
  })

  it('SegmentedControl: click + arrow keys', async () => {
    const user = userEvent.setup()
    function H() {
      const [value, setValue] = useState('lunch')
      return (
        <SegmentedControl
          label="Meal"
          value={value}
          onChange={setValue}
          options={[
            { value: 'lunch', label: 'Lunch' },
            { value: 'dinner', label: 'Dinner' },
            { value: 'both', label: 'Both' },
          ]}
        />
      )
    }
    renderWithTheme(<H />)
    const group = screen.getByRole('radiogroup', { name: 'Meal' })
    expect(group).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Dinner' }))
    expect(screen.getByRole('radio', { name: 'Dinner' })).toBeChecked()

    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'Both' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Both' })).toHaveFocus()

    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'Lunch' })).toBeChecked()

    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('radio', { name: 'Both' })).toBeChecked()
  })

  it('Chip remove', async () => {
    const onRemove = vi.fn()
    renderWithTheme(<Chip label="tomato" onRemove={onRemove} />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove tomato' }))
    expect(onRemove).toHaveBeenCalled()
  })

  it('EmptyState + Spinner', () => {
    renderWithTheme(
      <>
        <EmptyState title="No recipes" description="Add one" action={<Button>New</Button>} />
        <Spinner />
      </>,
    )
    expect(screen.getByRole('heading', { name: 'No recipes' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Loading')
  })
})
