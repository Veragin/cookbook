import type { ReactNode } from 'react'

import { DialogBase } from './Dialog'

export type SheetProps = {
  open: boolean
  onClose: () => void
  title: string
  children?: ReactNode
  hideCloseButton?: boolean
  className?: string
}

/**
 * Bottom sheet. Same portal/focus/Escape/overlay behaviour as `Modal` (they share
 * `DialogBase`), but it slides up from the bottom edge, has rounded top corners and
 * pads for `env(safe-area-inset-bottom)`.
 */
export function Sheet({ open, onClose, title, children, hideCloseButton, className }: SheetProps) {
  return (
    <DialogBase
      variant="sheet"
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
