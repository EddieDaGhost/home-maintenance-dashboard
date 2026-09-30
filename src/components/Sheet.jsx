import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

/**
 * The pop-up panel used by the theme picker, the rename form and tag setup —
 * twelve sheets in all, so anything fixed here is fixed everywhere.
 *
 * `aria-modal="true"` is a promise to assistive technology that nothing outside
 * this dialog can be reached. The browser does not keep that promise for you:
 * until this was added, opening a sheet left focus on the button behind it, and
 * fifteen presses of Tab walked the whole page underneath without ever landing
 * inside the dialog. Three things are needed to make the attribute true, and
 * all three are below — move focus in, keep it in, and put it back.
 */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/** Visible, focusable, in document order. A hidden control is not a tab stop. */
function focusableIn(root) {
  if (!root) return []
  return Array.from(root.querySelectorAll(FOCUSABLE)).filter((el) => el.getClientRects().length > 0)
}

export default function Sheet({ open, title, onClose, children, footer }) {
  const dialogRef = useRef(null)
  // Whatever had focus when the sheet opened, so it can be handed back.
  const returnTo = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const dialog = dialogRef.current
    returnTo.current = document.activeElement

    // Focus the dialog itself rather than its first control. Focusing a button
    // would pre-arm whatever it does, and focusing an input opens the keyboard
    // over the sheet on a phone — which is the one screen size that matters.
    dialog?.focus()

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const stops = focusableIn(dialogRef.current)
      if (stops.length === 0) {
        // Nothing to move to, so Tab would leave. It may not.
        event.preventDefault()
        dialogRef.current?.focus()
        return
      }
      const first = stops[0]
      const last = stops[stops.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || active === dialogRef.current)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    // The belt to the Tab handler's braces: a click on the page behind, or a
    // control removed while focused, can still drop focus outside.
    const onFocusIn = (event) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target)) {
        dialogRef.current.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('focusin', onFocusIn)
    // Stop the page behind the sheet from scrolling.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('focusin', onFocusIn)
      document.body.style.overflow = previousOverflow
      // Back where they came from — but only if it is still on the page, and
      // only if focus is not already somewhere deliberate.
      const target = returnTo.current
      if (target && typeof target.focus === 'function' && target.isConnected) {
        target.focus()
      }
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Tapping outside closes it. It is deliberately NOT a button: a
          full-screen "Close" control ahead of the dialog in the tab order is a
          trap of its own, and screen readers would announce it twice over —
          the X below and Escape are the keyboard routes out. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="panel relative m-3 flex max-h-[85vh] w-full max-w-md flex-col p-4 focus:outline-none"
      >
        <div className="mb-3 flex shrink-0 items-center justify-between">
          <h2 className="section-title">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 rounded-lg p-1.5 transition active:scale-90"
            style={{ color: 'var(--ink-3)' }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">{children}</div>

        {footer ? <div className="mt-3 shrink-0">{footer}</div> : null}
      </div>
    </div>
  )
}
