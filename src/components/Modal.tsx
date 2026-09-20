import type { ReactNode } from 'react'

import { DialogBase } from './Dialog'

export type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  children?: ReactNode
  /** Hide the header × (the dialog then needs its own dismiss control). */
  hideCloseButton?: boolean
  className?: string
}

/**
 * Centred modal dialog rendered into `document.body` via a portal.
 * Escape and an overlay click close it, focus moves in on open and returns to the
 * trigger on close, and background scrolling is locked while it is open.
 */
export function Modal({ open, onClose, title, children, hideCloseButton, className }: ModalProps) {
  return (
    <DialogBase
      variant="center"
      open={open}
      onClose={onClose}
      title={title}
      hideCloseButton={hideCloseButton}
      className={className}
    >
      {children}
    </DialogBase>
  )
}
