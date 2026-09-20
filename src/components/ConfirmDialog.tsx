import styled from 'styled-components'

import { Button } from './Button'
import { Modal } from './Modal'

export type ConfirmDialogProps = {
  open: boolean
  title: string
  message: string
  /** Defaults to `Confirm`. */
  confirmLabel?: string
  /** Defaults to `Cancel`. */
  cancelLabel?: string
  /** Renders the confirm button in the danger variant. */
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const Message = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.font.size.md};
`

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space.sm};
  margin-top: ${({ theme }) => theme.space.xl};

  > * {
    flex: 1;
  }
`

/** Yes/no dialog built on `Modal`. Cancelling is always the Escape/overlay outcome. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} hideCloseButton>
      <Message>{message}</Message>
      <Actions>
        <Button variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </Actions>
    </Modal>
  )
}
