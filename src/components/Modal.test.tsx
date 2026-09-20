import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { Button } from './Button'
import { ConfirmDialog } from './ConfirmDialog'
import { Modal } from './Modal'
import { Sheet } from './Sheet'
import { renderWithTheme } from './test-utils'

function Harness({ variant = 'modal' as 'modal' | 'sheet' }) {
  const [open, setOpen] = useState(false)
  const Dialog = variant === 'sheet' ? Sheet : Modal
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Move recipe">
        <Button>Inside</Button>
      </Dialog>
    </>
  )
}

describe('Modal', () => {
  it('renders nothing while closed', () => {
    renderWithTheme(<Harness />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('portals into document.body with dialog semantics and a title', async () => {
    const user = userEvent.setup()
    renderWithTheme(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Open' }))

    const dialog = screen.getByRole('dialog', { name: 'Move recipe' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(document.body.contains(dialog)).toBe(true)
    expect(screen.getByRole('heading', { name: 'Move recipe' })).toBeInTheDocument()
  })

  it('moves focus in on open and back to the trigger on close', async () => {
    const user = userEvent.setup()
    renderWithTheme(<Harness />)

    const trigger = screen.getByRole('button', { name: 'Open' })
    await user.click(trigger)

    await waitFor(() => expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus())

    await user.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    renderWithTheme(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('closes on an overlay click but not on a click inside the panel', async () => {
    const user = userEvent.setup()
    renderWithTheme(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Open' }))

    await user.click(screen.getByRole('button', { name: 'Inside' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.click(screen.getByTestId('dialog-overlay'))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('traps Tab inside the dialog', async () => {
    const user = userEvent.setup()
    renderWithTheme(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Open' }))

    const close = screen.getByRole('button', { name: 'Close' })
    const inside = screen.getByRole('button', { name: 'Inside' })

    await waitFor(() => expect(close).toHaveFocus())
    await user.tab()
    expect(inside).toHaveFocus()
    await user.tab()
    expect(close).toHaveFocus()
    await user.tab({ shift: true })
    expect(inside).toHaveFocus()
  })

  it('locks background scrolling while open', async () => {
    const user = userEvent.setup()
    renderWithTheme(<Harness />)

    expect(document.body.style.overflow).not.toBe('hidden')
    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(document.body.style.overflow).toBe('hidden')

    await user.keyboard('{Escape}')
    await waitFor(() => expect(document.body.style.overflow).not.toBe('hidden'))
  })
})

describe('Sheet', () => {
  it('shares Modal behaviour: Escape and overlay close it', async () => {
    const user = userEvent.setup()
    renderWithTheme(<Harness variant="sheet" />)

    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(screen.getByRole('dialog', { name: 'Move recipe' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Open' }))
    await user.click(screen.getByTestId('dialog-overlay'))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

describe('ConfirmDialog', () => {
  it('calls onConfirm and onCancel from its buttons', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    renderWithTheme(
      <ConfirmDialog
        open
        title="Delete recipe"
        message="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Delete recipe' })).toBeInTheDocument()
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('treats Escape as cancel', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()

    renderWithTheme(
      <ConfirmDialog
        open
        title="Delete recipe"
        message="This cannot be undone."
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    )

    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
