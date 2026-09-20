import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { Stepper } from './Stepper'
import { renderWithTheme } from './test-utils'

function Harness({
  initial = 4,
  min,
  max,
  step,
}: {
  initial?: number
  min?: number
  max?: number
  step?: number
}) {
  const [value, setValue] = useState(initial)
  return <Stepper label="Servings" value={value} onChange={setValue} min={min} max={max} step={step} />
}

describe('Stepper', () => {
  it('renders an accessible group, labelled buttons and a live readout', () => {
    renderWithTheme(<Harness />)

    expect(screen.getByRole('group', { name: 'Servings' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Decrease Servings' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Increase Servings' })).toBeInTheDocument()

    const readout = screen.getByRole('status')
    expect(readout).toHaveTextContent('4')
    expect(readout).toHaveAttribute('aria-live', 'polite')
  })

  it('increments and decrements by step', async () => {
    const user = userEvent.setup()
    renderWithTheme(<Harness initial={4} min={1} max={12} step={2} />)

    await user.click(screen.getByRole('button', { name: 'Increase Servings' }))
    expect(screen.getByRole('status')).toHaveTextContent('6')

    await user.click(screen.getByRole('button', { name: 'Decrease Servings' }))
    expect(screen.getByRole('status')).toHaveTextContent('4')
  })

  it('clamps to max and disables the + button at the bound', async () => {
    const user = userEvent.setup()
    renderWithTheme(<Harness initial={9} min={1} max={10} step={5} />)

    const increase = screen.getByRole('button', { name: 'Increase Servings' })
    await user.click(increase)

    expect(screen.getByRole('status')).toHaveTextContent('10')
    expect(increase).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Decrease Servings' })).toBeEnabled()
  })

  it('clamps to min and disables the − button at the bound', async () => {
    const user = userEvent.setup()
    renderWithTheme(<Harness initial={2} min={1} max={10} step={5} />)

    const decrease = screen.getByRole('button', { name: 'Decrease Servings' })
    await user.click(decrease)

    expect(screen.getByRole('status')).toHaveTextContent('1')
    expect(decrease).toBeDisabled()
  })

  it('clamps an out-of-range incoming value for display and never emits past a bound', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithTheme(<Stepper label="Servings" value={99} onChange={onChange} min={1} max={8} />)

    expect(screen.getByRole('status')).toHaveTextContent('8')
    expect(screen.getByRole('button', { name: 'Increase Servings' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Decrease Servings' }))
    expect(onChange).toHaveBeenCalledWith(7)
  })

  it('supports fractional steps without floating point noise', async () => {
    const user = userEvent.setup()
    renderWithTheme(<Harness initial={0.1} min={0} max={1} step={0.2} />)

    await user.click(screen.getByRole('button', { name: 'Increase Servings' }))
    expect(screen.getByRole('status')).toHaveTextContent('0.3')
  })
})
