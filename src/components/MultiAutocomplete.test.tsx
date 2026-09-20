import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { MultiAutocomplete } from './MultiAutocomplete'
import { renderWithTheme } from './test-utils'

const OPTIONS = ['Tomato', 'Tomatillo', 'Crème fraîche', 'Onion', 'Garlic']

function Harness({ initial = [] as string[], allowFreeText }: { initial?: string[]; allowFreeText?: boolean }) {
  const [values, setValues] = useState(initial)
  return (
    <>
      <MultiAutocomplete
        aria-label="Ingredients"
        values={values}
        options={OPTIONS}
        allowFreeText={allowFreeText}
        placeholder="Add an ingredient"
        onChange={setValues}
      />
      <button type="button">after</button>
    </>
  )
}

describe('MultiAutocomplete', () => {
  it('adds a value with the keyboard and renders it as a chip', async () => {
    const user = userEvent.setup()
    renderWithTheme(<Harness />)

    const input = screen.getByRole('combobox', { name: 'Ingredients' })
    await user.type(input, 'tom')
    await user.keyboard('{ArrowDown}{Enter}')

    expect(screen.getByText('Tomato')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove Tomato' })).toBeInTheDocument()
    expect(input).toHaveValue('')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('hides already-selected values from the list and rejects duplicates', async () => {
    const user = userEvent.setup()
    renderWithTheme(<Harness initial={['Tomato']} />)

    const input = screen.getByRole('combobox')
    await user.type(input, 'tom')
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Tomatillo'])

    // Typing the exact duplicate and pressing Enter must not add a second chip.
    await user.clear(input)
    await user.type(input, 'tomato{Enter}')
    expect(screen.getAllByRole('button', { name: /^Remove / })).toHaveLength(1)
  })

  it('matches diacritics-insensitively', async () => {
    const user = userEvent.setup()
    renderWithTheme(<Harness />)

    await user.type(screen.getByRole('combobox'), 'creme{ArrowDown}{Enter}')
    expect(screen.getByRole('button', { name: 'Remove Crème fraîche' })).toBeInTheDocument()
  })

  it('removes a chip via its × button', async () => {
    const user = userEvent.setup()
    renderWithTheme(<Harness initial={['Tomato', 'Onion']} />)

    await user.click(screen.getByRole('button', { name: 'Remove Tomato' }))

    expect(screen.queryByRole('button', { name: 'Remove Tomato' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove Onion' })).toBeInTheDocument()
  })

  it('removes the last chip on Backspace in an empty input', async () => {
    const user = userEvent.setup()
    renderWithTheme(<Harness initial={['Tomato', 'Onion']} />)

    const input = screen.getByRole('combobox')
    await user.click(input)
    await user.keyboard('{Backspace}')

    expect(screen.queryByRole('button', { name: 'Remove Onion' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove Tomato' })).toBeInTheDocument()
  })

  it('does not remove a chip when the input still has text', async () => {
    const user = userEvent.setup()
    renderWithTheme(<Harness initial={['Tomato']} />)

    const input = screen.getByRole('combobox')
    await user.type(input, 'ga')
    await user.keyboard('{Backspace}')

    expect(input).toHaveValue('g')
    expect(screen.getByRole('button', { name: 'Remove Tomato' })).toBeInTheDocument()
  })

  it('adds free text by default and refuses it when allowFreeText is false', async () => {
    const user = userEvent.setup()
    const { unmount } = renderWithTheme(<Harness />)

    await user.type(screen.getByRole('combobox'), 'nduja{Enter}')
    expect(screen.getByRole('button', { name: 'Remove nduja' })).toBeInTheDocument()

    unmount()

    renderWithTheme(<Harness allowFreeText={false} />)
    await user.type(screen.getByRole('combobox'), 'nduja{Enter}')
    expect(screen.queryByRole('button', { name: /^Remove / })).not.toBeInTheDocument()
  })

  it('closes the list on Escape and on blur', async () => {
    const user = userEvent.setup()
    renderWithTheme(<Harness />)

    const input = screen.getByRole('combobox')
    await user.type(input, 'o')
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    await user.type(input, 'n')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'after' }))
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
  })
})
