import { useCallback, useEffect, useId, useRef, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import styled, { css, keyframes } from 'styled-components'

import { IconButton } from './IconButton'

/**
 * Internal (not exported from the barrel): everything `Modal` and `Sheet` share —
 * the portal, the focus trap, focus restore, Escape/overlay close and the scroll lock.
 */

export type DialogVariant = 'center' | 'sheet'

export type DialogBaseProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  variant: DialogVariant
  /** Hide the × in the header (e.g. `ConfirmDialog`, which has explicit buttons). */
  hideCloseButton?: boolean
  className?: string
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (node) => node.getAttribute('aria-hidden') !== 'true',
  )
}

/* Body scroll lock, reference counted so nested dialogs can't unlock too early. */
let lockCount = 0
let previousOverflow = ''

function lockScroll() {
  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  lockCount += 1
}

function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount === 0) document.body.style.overflow = previousOverflow
}

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const slideUp = keyframes`
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
`

const popIn = keyframes`
  from { transform: scale(0.96); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
`

const Overlay = styled.div<{ $variant: DialogVariant }>`
  position: fixed;
  inset: 0;
  z-index: ${({ theme, $variant }) => ($variant === 'sheet' ? theme.z.sheet : theme.z.modal)};
  display: flex;
  justify-content: center;
  align-items: ${({ $variant }) => ($variant === 'sheet' ? 'flex-end' : 'center')};
  padding: ${({ theme, $variant }) => ($variant === 'sheet' ? '0' : theme.space.lg)};
  background: ${({ theme }) => theme.color.overlay};
  animation: ${fadeIn} 140ms ease;
`

const Panel = styled.div<{ $variant: DialogVariant }>`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: ${({ theme }) => theme.layout.maxWidth};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.text};
  box-shadow: ${({ theme }) => theme.shadow.lg};
  outline: none;

  ${({ theme, $variant }) =>
    $variant === 'sheet'
      ? css`
          max-height: 88dvh;
          border-radius: ${theme.radius.lg} ${theme.radius.lg} 0 0;
          padding-bottom: env(safe-area-inset-bottom);
          animation: ${slideUp} 200ms ease;
        `
      : css`
          max-height: calc(100dvh - ${theme.space.xxl});
          border-radius: ${theme.radius.lg};
          animation: ${popIn} 140ms ease;
        `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const Header = styled.header`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => theme.space.md} ${({ theme }) => theme.space.lg};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
`

const Title = styled.h2`
  flex: 1;
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: ${({ theme }) => theme.font.weight.bold};
  overflow-wrap: anywhere;
`

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  padding: ${({ theme }) => theme.space.lg};
`

const Grabber = styled.div`
  width: ${({ theme }) => theme.space.xxl};
  height: ${({ theme }) => theme.space.xs};
  margin: ${({ theme }) => theme.space.sm} auto 0;
  background: ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.pill};
`

export function DialogBase({
  open,
  onClose,
  title,
  children,
  variant,
  hideCloseButton = false,
  className,
}: DialogBaseProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const overlayMouseDown = useRef(false)

  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    lockScroll()

    const panel = panelRef.current
    const first = panel ? getFocusable(panel)[0] : null
    ;(first ?? panel)?.focus()

    return () => {
      unlockScroll()
      previouslyFocused?.focus?.()
    }
  }, [open])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const panel = panelRef.current
      if (!panel) return
      const focusable = getFocusable(panel)
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    },
    [onClose],
  )

  if (!open) return null

  const handleOverlayMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    overlayMouseDown.current = event.target === event.currentTarget
  }

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    // Only a press that both started and ended on the backdrop closes the dialog.
    if (overlayMouseDown.current && event.target === event.currentTarget) onClose()
    overlayMouseDown.current = false
  }

  return createPortal(
    <Overlay
      $variant={variant}
      data-testid="dialog-overlay"
      onMouseDown={handleOverlayMouseDown}
      onClick={handleOverlayClick}
    >
      <Panel
        ref={panelRef}
        $variant={variant}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={className}
        onKeyDown={handleKeyDown}
      >
        {variant === 'sheet' && <Grabber aria-hidden="true" />}
        <Header>
          <Title id={titleId}>{title}</Title>
          {!hideCloseButton && (
            <IconButton aria-label="Close" onClick={onClose}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </IconButton>
          )}
        </Header>
        <Body>{children}</Body>
      </Panel>
    </Overlay>,
    document.body,
  )
}
