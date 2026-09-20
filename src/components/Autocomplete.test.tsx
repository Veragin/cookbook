import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { Autocomplete } from './Autocomplete'
import { renderWithTheme } from './test-utils'

const OPTIONS = ['Tomato', 'Tomatillo', 'Crème fraîche', 'Onion', 'Garlic', 'Basil']

function Harness({
  initial = '',
  allowFreeText,
  onValue,
}: {
  initial?: string
  allowFreeText?: boolean
  onValue?: (value: string) => void
}) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <Autocomplete
        aria-label="Ingredient"
        value={value}
        options={OPTIONS}
        allowFreeText={allowFreeText}
        placeholder="Search"
        onChange={(next) => {
          setValue(next)
          onValue?.(next)
        }}
      />
      <button type="button">after</button>
    </>
  )
}

describe('Autocomplete', () => {
  it('exposes combobox ARIA and opens on typing', async () => {
    const user = userEvent.setup()
    renderWithTheme(<Harness />)

    const input = screen.getByRole('combobox', { name: 'Ingredient' })
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    await user.type(input, 'tom')

    expect(input).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Tomato',
      'Tomatillo',
    ])
  })

  it('filters case- and diacritics-insensitively on substrings', async () => {
    const user = userEvent.setup()
    renderWithTheme(<Harness />)

    const input = screen.getByRole('combobox')
    await user.type(input, 'creme')
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Crème fraîche'])

    await user.clear(input)
    await user.type(input, 'ARL')
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Garlic'])
  })

  it('shows an empty message when nothing matches', async () => {
    const user = userEvent.setup()
    renderWithTheme(<Harness />)

    await user.type(screen.getByRole('combobox'), 'zzz')
    expect(screen.queryAllByRole('option')).toHaveLength(0)
    expect(screen.getByText('No matches')).toBeInTheDocument()
  })

  it('selects with ArrowDown + Enter and tracks aria-activedescendant', async () => {
    const user = userEvent.setup()
    const onValue = vi.fn()
    renderWithTheme(<Harness onValue={onValue} />)

    const input = screen.getByRole('combobox')
    await user.type(input, 'tom')

    await user.keyboard('{ArrowDown}')
    let active = screen.getAllByRole('option')[0]
    expect(input).toHaveAttribute('aria-activedescendant', active.id)
    expect(active).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{ArrowDown}')
    active = screen.getAllByRole('option')[1]
    expect(input).toHaveAttribute('aria-activedescendant', active.id)

    await user.keyboard('{Enter}')
    expect(onValue).toHaveBeenLastCalledWith('Tomatillo')
    expect(input).toHaveValue('Tomatillo')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(input).toHaveFocus()
  })

  it('wraps ArrowUp to the last option', async () => {
    const user = userEvent.setup()
    renderWithTheme(<Harness />)

    const input = screen.getByRole('combobox')
    await user.type(input, 'tom')
    await user.keyboard('{ArrowUp}')

    const options = screen.getAllByRole('option')
    expect(input).toHaveAttribute('aria-activedescendant', options[options.length - 1].id)
  })

  it('selects with the mouse without losing input focus', async () => {
    const user = userEvent.setup()
    renderWithTheme(<Harness />)

    const input = screen.getByRole('combobox')
    await user.type(input, 'o')
    await user.click(screen.getByRole('option', { name: 'Onion' }))

    expect(input).toHaveValue('Onion')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('closes on Escape without clearing the value, and does not trap focus on Tab', async () => {
    const user = userEvent.setup()
    renderWithTheme(<Harness />)

    const input = screen.getByRole('combobox')
    await user.type(input, 'tom')
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(input).toHaveValue('tom')
    expect(input).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    await user.tab()
    // Tab commits the highlighted option and still moves focus out.
    expect(input).toHaveValue('Tomato')
    expect(screen.getByRole('button', { name: 'after' })).toHaveFocus()
  })

  it('closes the list on blur', async () => {
    const user = userEvent.setup()
    renderWithTheme(<Harness />)

    await user.type(screen.getByRole('combobox'), 'tom')
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'after' }))
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
  })

  it('keeps free text by default and clears it when allowFreeText is false', async () => {
    const user = userEvent.setup()
    const { unmount } = renderWithTheme(<Harness />)

    await user.type(screen.getByRole('combobox'), 'nduja')
    await user.click(screen.getByRole('button', { name: 'after' }))
    expect(screen.getByRole('combobox')).toHaveValue('nduja')

    unmount()

    renderWithTheme(<Harness allowFreeText={false} />)
    await user.type(screen.getByRole('combobox'), 'nduja')
    await user.click(screen.getByRole('button', { name: 'after' }))
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue(''))
  })
})
