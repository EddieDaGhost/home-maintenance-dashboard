import { useEffect } from 'react'
import { X } from 'lucide-react'

/**
 * The pop-up panel used by the theme picker, the rename form and tag setup.
 * Sits at the bottom of the screen on a phone, centered on a wider screen.
 */
export default function Sheet({ open, title, onClose, children, footer }) {
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    // Stop the page behind the sheet from scrolling.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="panel relative m-3 flex max-h-[85vh] w-full max-w-md flex-col p-4"
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
